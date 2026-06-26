frappe.pages['chemical-test-view'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Chemical Test View',
		single_column: true
	});

	$(frappe.render_template("chemical_test_view")).appendTo(page.body);

	const state = {
		page_length: 20,
		page: 1,
		has_next: false
	};

	const $body = $(page.body);
	const $tbody = $body.find(".sample-inward-table tbody");
	const $id = $body.find("#sample-inward-id");
	const $from_date = $body.find("#sample-inward-from-date");
	const $to_date = $body.find("#sample-inward-to-date");
	const $customer_name = $body.find("#sample-inward-customer");
	const $challan_no = $body.find("#sample-inward-challan_no");
	const $material_specification = $body.find("#sample-inward-material_specification");
	const $document_id = $body.find("#sample-inward-document_id");
	const $workflow_state = $body.find("#sample-inward-workflow_state");
	const $test_method = $body.find("#sample-inward-test_method");
	const $count = $body.find(".sample-inward-count");
	const $page = $body.find(".sample-inward-page");
	const $prev = $body.find(".sample-inward-prev");
	const $next = $body.find(".sample-inward-next");

	const fields = [
		"name",
		"inward_number",
		"customer_name",
		"challan_no",
		"document_id",
		"heat_number",
		"material_specification",
		"test_method",
		"witness_name",
		"docstatus",
		"test_description",
		"report_date",
	];

	function set_default_dates() {
		$to_date.val(frappe.datetime.get_today());
		$from_date.val(frappe.datetime.add_months(frappe.datetime.get_today(), -2));
	}

	function get_filters() {
		const filters = [];
		const chemical_test = ($id.val() || "").trim();
		const from_date = $from_date.val();
		const to_date = $to_date.val();
		const customer_name = $customer_name.val();
		const challan_no = $challan_no.val();
		const document_id = $document_id.val();
		const material_specification = $material_specification.val();
		const workflow_state = $workflow_state.val();
		const test_method = $test_method.val();

		if (chemical_test) {
			filters.push(["Chemical Test", "inward_number", "like", `%${chemical_test}%`]);
		}

		if (from_date) {
			filters.push(["Chemical Test", "report_date", ">=", from_date]);
		}

		if (to_date) {
			filters.push(["Chemical Test", "report_date", "<=", to_date]);
		}
		if (customer_name){
			filters.push(["Chemical Test", "customer_name", "like", `%${customer_name}%`]);
		}
		if (challan_no){
			filters.push(["Chemical Test", "challan_no", "like", `%${challan_no}%`]);
		}
		if (material_specification){
			filters.push(["Chemical Test", "material_specification", "like", `%${material_specification}%`]);
		}
		if (document_id){
			filters.push(["Chemical Test", "document_id", "like", `%${document_id}%`]);
		}
		if (workflow_state){
			filters.push(["Chemical Test", "workflow_state", "like", `%${workflow_state}%`]);
		}
		if (test_method){
			filters.push(["Chemical Test", "test_method", "like", `%${test_method}%`]);
		}

		return filters;
	}

	function value(text) {
		return frappe.utils.escape_html(text == null || text === "" ? "-" : text);
	}

	function render_rows(rows) {
		if (!rows.length) {
			$tbody.html(`<tr><td class="sample-inward-empty" colspan="13">${__("No Chemical Test records found")}</td></tr>`);
			return;
		}

		$tbody.html(rows.map(row => `
			<tr data-name="${value(row.name)}">
				<td title="${value(row.inward_number)}">${value(row.inward_number)}</td>
				<td title="${value(row.customer_name)}">${value(row.customer_name)}</td>
				<td title="${value(row.challan_no)}">${value(row.challan_no)}</td>
				<td title="${value(row.document_id)}">${value(row.document_id)}</td>
				<td title="${value(row.heat_number)}">${value(row.heat_number)}</td>
				<td title="${value(row.material_specification)}">${value(row.material_specification)}</td>
				<td title="${value(row.test_method)}">${value(row.test_method)}</td>
				<td title="${value(row.witness_name)}">${value(row.witness_name)}</td>
				<td title="${value(row.docstatus)}">${value(row.docstatus)}</td>
				<td title="${value(row.test_description_text)}">${value(row.test_description_text)}</td>
				<td title="${value(row.report_date)}">${value(row.report_date)}</td>
				
			</tr>
		`).join(""));
	}

	function set_test_description_text(rows) {
		const test_description_names = [...new Set(rows.map(row => row.test_description).filter(Boolean))];

		if (!test_description_names.length) {
			rows.forEach(row => {
				row.test_description_text = row.test_description;
			});
			return Promise.resolve(rows);
		}

		return frappe.db.get_list("Test Description", {
			fields: ["name", "test_description"],
			filters: {
				name: ["in", test_description_names]
			},
			limit_page_length: test_description_names.length
		}).then(test_descriptions => {
			const description_by_name = {};
			(test_descriptions || []).forEach(test_description => {
				description_by_name[test_description.name] = test_description.test_description;
			});

			rows.forEach(row => {
				row.test_description_text = description_by_name[row.test_description] || row.test_description;
			});

			return rows;
		});
	}

	function update_pagination(rows) {
		state.has_next = rows.length > state.page_length;
		$prev.prop("disabled", state.page <= 1);
		$next.prop("disabled", !state.has_next);
		$page.text(__("Page {0}", [state.page]));
		$count.text(__("Showing {0} records", [Math.min(rows.length, state.page_length)]));
	}

	function load_rows() {
		$tbody.html(`<tr><td class="sample-inward-loading" colspan="13">${__("Loading...")}</td></tr>`);
		$prev.prop("disabled", true);
		$next.prop("disabled", true);

		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "Chemical Test",
				fields,
				filters: get_filters(),
				order_by: "report_date desc, modified desc",
				limit_start: (state.page - 1) * state.page_length,
				limit_page_length: state.page_length + 1
			},
			callback(response) {
				const rows = response.message || [];
				const visible_rows = rows.slice(0, state.page_length);
				set_test_description_text(visible_rows).then(render_rows);
				update_pagination(rows);
			}
		});
	}

	$body.on("click", ".sample-inward-apply", () => {
		state.page = 1;
		load_rows();
	});

	$body.on("click", ".sample-inward-reset", () => {
		$id.val("");
		$customer_name.val("");
		$challan_no.val("");
		$material_specification.val("");
		$document_id.val("");
		$workflow_state.val("");
		$test_method.val("");
		set_default_dates();
		state.page = 1;
		load_rows();
	});

	$body.on("click", ".sample-inward-prev", () => {
		if (state.page > 1) {
			state.page -= 1;
			load_rows();
		}
	});

	$body.on("click", ".sample-inward-next", () => {
		if (state.has_next) {
			state.page += 1;
			load_rows();
		}
	});

	$tbody.on("click", "tr[data-name]", function() {
		frappe.set_route("Form", "Chemical Test", $(this).data("name"));
	});

	set_default_dates();
	load_rows();
};
