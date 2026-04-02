// // Copyright (c) 2025, Sanpra Software Solution and contributors
// // For license information, please see license.txt
let items = []
frappe.ui.form.on("Lab Analyst", {
    // Form load
    onload(frm) {
        frm.page.sidebar.hide();
        let original_print = frm.print_doc || frm.print_preview;

        frm.print_doc = function () {
            frm.set_value("is_print", 1);
            frm.save_or_update();
            original_print.call(frm);
        };
    },
    refresh(frm) {
        apply_highlight_from_backend(frm);
        set_test_method_filter(frm);
        frm.set_query("parameter", "test_details", function () {
            return {
                filters: [
                    ["Chemical Parameter", "name", "in", items]
                ]
            }
        })
    },
    test_group(frm) {
        frm.set_value('test_method', null);
        set_test_method_filter(frm);
    },
    upload_excel_file(frm) {
        if (frm.doc.upload_excel_file) {
            frm.call({
                method: "create_rate_chart_from_excel",
                doc: frm.doc,
            }).then(() => {
                frm.refresh_field("test_details");
                apply_highlight_from_backend(frm);
            });
        }
    },
    chemical_test_template(frm) {
        frappe.call({
            method: "get_parameters",
            doc: frm.doc,
            callback: function (r) {
                frm.refresh_field("chemical_test_details");
            }
        });
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
    no_of_fields(frm) {
        if (frm.doc.no_of_fields == null) return;

        frm.call({
            method: "update_metallography_rows",
            doc: frm.doc,
            callback() {
                frm.refresh_field("metallography_test_pp");
            }
        });
    },
    // no_of_field(frm) {
    //     if (frm.doc.no_of_field == null) return;

    //     frm.call({
    //         method: "update_metallography_test_table_rows",
    //         doc: frm.doc,
    //         callback() {
    //             frm.refresh_field("metallography_test_table");
    //         }
    //     });
    // }
    range1: calc_avg,
    range2: calc_avg,
    range3: calc_avg,
    range4: calc_avg,
    range5: calc_avg,
    range6: calc_avg
});
function calc_avg(frm) {
    let total = 0;
    let count = 0;
    if (frm.doc.range1) { total += frm.doc.range1; count++; }
    if (frm.doc.range2) { total += frm.doc.range2; count++; }
    if (frm.doc.range3) { total += frm.doc.range3; count++; }
    if (frm.doc.range4) { total += frm.doc.range4; count++; }
    if (frm.doc.range5) { total += frm.doc.range5; count++; }
    if (frm.doc.range6) { total += frm.doc.range6; count++; }

    let avg = 0;
    if (count > 0) {
        avg = total / count;
    }

    frm.set_value("average_aboserbed_energy_of_one_set", avg);
}
function set_test_method_filter(frm) {
    frm.set_query('test_method', function () {
        return {
            filters: {
                test_group: frm.doc.test_group || ''
            }
        };
    });
}
//*****************************************************************************************************
frappe.ui.form.on("Metallography Test PP Table", {
    metallography_test_pp_add(frm, cdt, cdn) {
        let qty = frm.doc.no_of_fields || 0;
        let rows = frm.doc.metallography_test_pp.length;

        if (rows > qty) {
            frappe.msgprint(
                __("You cannot add more than {0} rows because No of Fields is {0}", [qty])
            );
            frm.doc.metallography_test_pp.pop();
            frm.refresh_field("metallography_test_pp");
            return false;
        }
        calculate_avg(frm);
    },
    pp(frm, cdt, cdn) {
        calculate_avg(frm);
    },
    value(frm, cdt, cdn) {
        let row = locals[cdt][cdn];

        if (row.value && frm.doc.grid_size_number_of_points) {
            row.pp = (flt(row.value) / flt(frm.doc.grid_size_number_of_points)) * 100;
        } else {
            row.pp = 0;
        }

        frm.refresh_field("metallography_test_pp");
        calculate_avg(frm);
    },
    metallography_test_pp_remove(frm) {
        calculate_avg(frm);
    }
});
function calculate_avg(frm) {
    let total = 0, count = 0;
    (frm.doc.metallography_test_pp || []).forEach(r => {
        if (r.pp) { total += flt(r.pp); count++; }
    });
    frm.set_value('pp_average', count ? total / count : 0);
    frm.set_value('pp_i_no_of_fields', total);
}
//*****************************************************************************************************
frappe.ui.form.on("Metallography Test", {
    metallography_test_table_add(frm, cdt, cdn) {
        let qty = frm.doc.no_of_field || 0;
        let rows = frm.doc.metallography_test_table.length;
        if (rows > qty) {
            frappe.msgprint(
                __("You cannot add more than {0} rows because No of Field is {0}", [qty])
            );
            frm.doc.metallography_test_table.pop();
            frm.refresh_field("metallography_test_table");
            return false;
        }
    }
});
// *****************************************************************************************************
frappe.ui.form.on("Test Details", {
    value(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.value && row.method_min_range && row.method_max_range) {
            let val = parseFloat(row.value);
            let min = parseFloat(row.method_min_range);
            let max = parseFloat(row.method_max_range);
            let status = (val < min || val > max) ? "NON NABL" : "NABL";
            frappe.model.set_value(cdt, cdn, "status", status);
        }
        apply_highlight_from_backend(frm);
    },
    //*************************************************************
    test_method(frm, cdt, cdn) {
        let child = locals[cdt][cdn];
        frappe.model.set_value(cdt, cdn, "parameter", "");
        items = []
        frappe.call({
            method: "get_test_method",
            doc: frm.doc,
            args: { test_method: child.test_method },
            callback: function (r) {
                console.log(r)
                if (r.message && r.message.length > 0) {
                    // items.push(r.message)
                    r.message.forEach(row => {
                        items.push(row)
                    });
                    frm.refresh_field("test_details");
                }
            }
        });
    },
    parameter(frm, cdt, cdn) {
        let child = locals[cdt][cdn];
        frappe.call({
            method: "get_minmax_range",
            doc: frm.doc,
            args: { test_method: child.test_method, parameter: child.parameter, material_specification: frm.doc.material_specification },
            callback: function (r) {
                console.log(r)
                if (r.message && r.message.length > 0) {
                    let data = r.message[0];
                    frappe.model.set_value(cdt, cdn, "method_min_range", data.method_min_range || "");
                    frappe.model.set_value(cdt, cdn, "method_max_range", data.method_max_range || "");
                    frappe.model.set_value(cdt, cdn, "min_range", data.min_range || "");
                    frappe.model.set_value(cdt, cdn, "max_range", data.max_range || "");
                    if (child.value) {
                        let val = parseFloat(child.value);
                        let min = parseFloat(data.method_min_range);
                        let max = parseFloat(data.method_max_range);

                        let status = (val < min || val > max) ? "NON NABL" : "NABL";
                        frappe.model.set_value(cdt, cdn, "status", status);
                    }
                    frm.refresh_field("test_details");
                }
            }
        });
    },
});
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
                            "transition": "background-color 0.2s ease"
                        });
                    } else {
                        cell.css({
                            "background-color": color,
                            "transition": "background-color 0.2s ease"
                        });
                    }
                });
            });
        }
    });
}

//******************************************************************************************************
frappe.ui.form.on("Absorbed Energy in Joules of Each Specimen", {
    range(frm, cdt, cdn) {
        // frappe.throw("Hii")
        calculate_absorbed_energy(frm);
    }
})
function calculate_absorbed_energy(frm) {
    frappe.call({
        method: "get_avg_absorbed_energy",
        doc: frm.doc,
        callback: function (r) {
            console.log(r.massege)
            frm.refresh_field("average_aboserbed_energy_of_one_set");
        }
    })
}
//**********************************************************************************************************
frappe.ui.form.on("Ferrite By Ferritoscope Items", {
    measurement_1: calc,measurement_2: calc,measurement_3: calc,measurement_4: calc,
    measurement_5: calc,measurement_6: calc
});
function calc(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    let sum = 0, count = 0;

    for (let i = 1; i <= 6; i++) {
        let field = "measurement_" + i;

        if (row[field] !== null && row[field] !== "") {
            sum += parseFloat(row[field]);
            count++;
        }
    }
    let avg = count ? (sum / count) : 0;
    frappe.model.set_value(cdt, cdn, "avg", avg);
}
