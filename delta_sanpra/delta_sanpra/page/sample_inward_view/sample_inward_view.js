frappe.pages["sample-inward-view"].on_page_load = function(wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Sample Inward View"),
		single_column: true
	});

	$(frappe.render_template("sample_inward_view")).appendTo(page.body);

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
	const $customer = $body.find("#sample-inward-customer");
	const $count = $body.find(".sample-inward-count");
	const $page = $body.find(".sample-inward-page");
	const $prev = $body.find(".sample-inward-prev");
	const $next = $body.find(".sample-inward-next");
	const $docstatus = $body.find("#sample-inward-docstatus");

	const fields = [
		"name",
		"sample_received_date",
		"customer",
		"sample_received",
		"challan_no",
		"challan_date",
		"quantity",
		"workflow_state",
		"remark_for_accounts"
	];

	function set_default_dates() {
		$to_date.val(frappe.datetime.get_today());
		$from_date.val(frappe.datetime.add_months(frappe.datetime.get_today(), -2));
	}

	function get_filters() {
		const filters = [];
		const inward_id = ($id.val() || "").trim();
		const from_date = $from_date.val();
		const to_date = $to_date.val();
		const customer = $customer.val();
		const docstatus = $docstatus.val(); 

		if (inward_id) {
			filters.push(["Sample Inward", "name", "like", `%${inward_id}%`]);
		}

		if (from_date) {
			filters.push(["Sample Inward", "sample_received_date", ">=", from_date]);
		}

		if (to_date) {
			filters.push(["Sample Inward", "sample_received_date", "<=", to_date]);
		}
		if (customer){
			filters.push(["Sample Inward", "customer", "like", `%${customer}%`]);
		}
		if (docstatus) {
			filters.push(["Sample Inward", "workflow_state", "=", docstatus]);
		}
		return filters;
	}

	function value(text) {
		return frappe.utils.escape_html(text == null || text === "" ? "-" : text);
	}

	function workflow_state_badge(workflow_state) {
		const status = value(workflow_state);
		const status_class = (workflow_state || "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "") || "empty";

		return `<span class="sample-inward-status sample-inward-status-${status_class}">${status}</span>`;
	}

	function render_rows(rows) {
		if (!rows.length) {
			$tbody.html(`<tr><td class="sample-inward-empty" colspan="9">${__("No Sample Inward records found")}</td></tr>`);
			return;
		}

		$tbody.html(rows.map(row => `
			<tr data-name="${value(row.name)}">
				<td class="sample-inward-open" title="${value(row.name)}">${value(row.name)}</td>
				<td title="${value(row.sample_received_date)}">${value(row.sample_received_date)}</td>
				<td title="${value(row.customer)}">${value(row.customer)}</td>
				<td title="${value(row.sample_received)}">${value(row.sample_received)}</td>
				<td title="${value(row.challan_no)}">${value(row.challan_no)}</td>
				<td title="${value(row.challan_date)}">${value(row.challan_date)}</td>
				<td title="${value(row.quantity)}">${value(row.quantity)}</td>
				<td title="${value(row.workflow_state)}">${workflow_state_badge(row.workflow_state)}</td>
				<td title="${value(row.remark_for_accounts)}">${value(row.remark_for_accounts)}</td>
				
			</tr>
		`).join(""));
	}

	function update_pagination(rows) {
		state.has_next = rows.length > state.page_length;
		$prev.prop("disabled", state.page <= 1);
		$next.prop("disabled", !state.has_next);
		$page.text(__("Page {0}", [state.page]));
		$count.text(__("Showing {0} records", [Math.min(rows.length, state.page_length)]));
	}

	function load_rows() {
		$tbody.html(`<tr><td class="sample-inward-loading" colspan=9">${__("Loading...")}</td></tr>`);
		$prev.prop("disabled", true);
		$next.prop("disabled", true);

		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "Sample Inward",
				fields,
				filters: get_filters(),
				order_by: "sample_received_date desc, modified desc",
				limit_start: (state.page - 1) * state.page_length,
				limit_page_length: state.page_length + 1
			},
			callback(response) {
				const rows = response.message || [];
				render_rows(rows.slice(0, state.page_length));
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
		$customer.val("");
		$docstatus.val("");
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

	$tbody.on("click", ".sample-inward-open", function() {
		frappe.set_route("Form", "Sample Inward", $(this).closest("tr").data("name"));
	});

	set_default_dates();
	load_rows();
};
