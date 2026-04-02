// Copyright (c) 2026, Sanpra Software Solution and contributors
// For license information, please see license.txt

frappe.ui.form.on("Metallography Test", {
	refresh(frm) {
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
frappe.ui.form.on("Ferrite By Ferritoscope Items", {
    measurement_1: calc, measurement_2: calc, measurement_3: calc, measurement_4: calc, measurement_5: calc, measurement_6: calc
});
function calc(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    let avg = 0, count = 0, sum = 0;

    for (let i = 1; i <= 6; i++) {
        let val = parseFloat(row["measurement_" + i]) || 0;
        if (val) { sum += val; count++; }
    }
    avg = count ? sum / count : 0;
    frappe.model.set_value(cdt, cdn, "avg", avg);
}