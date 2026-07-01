// Copyright (c) 2026, Sanpra Software Solution and contributors
// For license information, please see license.txt

frappe.ui.form.on("Physical Test", {
	refresh(frm) {
        apply_highlight_from_backend(frm);
        set_test_method_filter(frm);
        if (!frm.is_new() && !frm.doc.ulr_no) {
            frm.add_custom_button("Generate ULR", function () {
                let btn = $(this);
                btn.prop("disabled", true);
                frm.call({
                    method: "set_ulr_counter",
                    doc: frm.doc,
                    callback: function (r) {
                        if (r.message) {
                            let count = r.message.toString().padStart(9, '0');
                            let prefix = "TC1384426";
                            let suffix = "F";
                            let newCode = prefix + count + suffix;
                            frm.set_value("ulr_no", newCode).then(() => {
                                frappe.msgprint("ULR No Generated Successfully");
                                // frm.save();
                            });
                        }
                    }
                });
            });
        }
        frm.set_query("parameter", "test_details", function () {
            return {
                filters: [
                    ["Chemical Parameter", "name", "in", items]
                ]
            }
        })
	},
    onload(frm) {
        let original_print = frm.print_doc || frm.print_preview;
        frm.print_doc = function () {
            frm.set_value("is_print", 1);
            frm.save_or_update();
            original_print.call(frm);
        };
    },
    test_group(frm){
        frm.set_value('test_method',null),
        set_test_method_filter(frm);
    },
    add_data(frm) {
        frappe.call({
            method: "add_data",
            doc: frm.doc,
            callback: function (r) {
                frm.refresh_field("brinell_hardness_child")
            }
        })
    },
    

    upload_excel(frm) {
        if (frm.doc.excel_file) {
            frm.call({
                method: "upload_excel_file",
                doc: frm.doc,
            }).then(() => {
                frm.refresh_field("test_details_physical");
                apply_highlight_from_backend(frm);
            });
        }
    },
    excel_file: function(frm) {
        if (!frm.doc.excel_file) {
            frm.clear_table("test_details_physical");
            frm.refresh_field("test_details_physical");
        }
    },
    pdf_file: function(frm) {
        if (!frm.doc.pdf_file) {
            // frm.clear_table("test_details_physical");
            frm.refresh_field("test_details_physical");
        }
    }
});
function set_test_method_filter(frm) {
    frm.set_query('test_method', function () {
        return {
            filters: {
                test_group: frm.doc.test_group || ''
            }
        };
    });
}

// ****************************************************************************
frappe.ui.form.on('Test Parameter Details', {
    observed_value: function(frm, cdt, cdn) {
        calculate_compressive_avg(frm);
    },
    avg: function(frm, cdt, cdn) {
        calculate_compressive_avg(frm);
    },
    value: function(frm, cdt, cdn) {
        apply_highlight_from_backend(frm, cdt, cdn);
    }
});
function calculate_compressive_avg(frm) {
    let total = 0;
    let count = 0;
    (frm.doc.test_parameter_details || []).forEach(function(row) {
        if (row.avg == 1 
            // && test_parameters === "Compressive Strength N/mm2" 
            && row.observed_value) {
            total += parseFloat(row.observed_value);
            count++;
        }
    });
    let average = count ? (total / count) : 0;
    frm.set_value("average_compressive_strength", average);
}
// ****************************************************************************
function apply_highlight_from_backend(frm) {
    if (!frm || !frm.docname) return;

    frm.call({
        method: "get_highlight_colors",
        doc: frm.doc,
        callback: function (r) {
            if (!r.message) return;
            const colors = r.message;
            // Apply for both tables
            const tables = ["test_details", "test_details_physical"];

            tables.forEach(table => {
                const grid_field = frm.fields_dict[table];
                if (!grid_field || !grid_field.grid) return;
                const grid = grid_field.grid;

                grid.grid_rows.forEach(row => {
                    const cell = $(row.columns["value"]);
                    const input = cell.find("input");
                    const color = colors[row.doc.name] || "";

                    if (input.length) {
                        input.css({
                            "background-color": color,
                            "transition": "background-color #2ecc71 0.2s ease"
                        });
                    } else {
                        cell.css({
                            "background-color": color,
                            "transition": "background-color #FF7F7F 0.2s ease"
                        });
                    }
                });
            });
        }
    });
}
// **********************************************************************************************
frappe.ui.form.on("Charpy Impact Test Child", {
    range1: calculate_absorbed_average,
    range2: calculate_absorbed_average,
    range3: calculate_absorbed_average,
    range4: calculate_absorbed_average,
    range5: calculate_absorbed_average,
    range6: calculate_absorbed_average,
});

function calculate_absorbed_average(frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    let total = 0;
    let count = 0;

    ["range1", "range2", "range3", "range4", "range5", "range6"].forEach(field => {
      let value = flt(row[field]);

        if (value > 0) {
            total += value;
            count++;
        }
    });

    frappe.model.set_value(
        cdt,
        cdn,
        "average_aboserbed_energy_of_one_set",
        count ? (total / count) : 0
    );
}