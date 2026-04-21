// Copyright (c) 2026, Sanpra Software Solution and contributors
// For license information, please see license.txt
let items = [];
frappe.ui.form.on("Chemical Test", {
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
	},
    upload_excel_file(frm) {
        if (frm.doc.upload_excel_file) {
            frm.call({
                method: "create_rate_chart_from_excel",
                doc: frm.doc,
            }).then(() => {
                frm.refresh_field("test_details_chemical");
                apply_highlight_from_backend(frm);
            });
        }
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
    test_method(frm) {
        if (!frm.doc.test_method) return;

        (frm.doc.test_details_chemical || []).forEach(row => {
            // child test_method update
            row.test_method = frm.doc.test_method;

            // trigger parameter logic again to fetch min/max
            frappe.call({
                method: "get_minmax_range",
                doc: frm.doc,
                args: {
                    test_method: row.test_method,
                    parameter: row.parameter,
                    material_specification: frm.doc.material_specification
                },
                callback: function (r) {
                    if (r.message && r.message.length > 0) {
                        let data = r.message[0] || {};

                        frappe.model.set_value(row.doctype, row.name, "method_min_range", data.method_min_range || "");
                        frappe.model.set_value(row.doctype, row.name, "method_max_range", data.method_max_range || "");
                        frappe.model.set_value(row.doctype, row.name, "min_range", data.min_range || "");
                        frappe.model.set_value(row.doctype, row.name, "max_range", data.max_range || "");
                    }
                }
            });
        });

        frm.refresh_field("test_details_chemical");
    },
    excel_attach(frm) {
        if (frm.doc.excel_attach) {
            frm.call({
                method: "read_pmi_excel",
                doc: frm.doc,
            }).then(() => {
                frm.refresh_field("pmi_test_table");
                frappe.msgprint("PMI Data Imported Successfully");
            });
        } else {
            frm.clear_table("pmi_test_table");
            frm.refresh_field("pmi_test_table");
        }
    },
    setup(frm) {
        frm.set_query("test_method", function() {
            return {
                filters: {
                    test_group: frm.doc.test_group || ""
                }
            };
        });
        frm.set_query("parameter", "test_details_chemical", function() {
        return {};
    });
    }
    
});

function set_test_method_filter(frm) {
    frm.fields_dict["test_details_chemical"].grid.get_field("test_method").get_query = function(doc, cdt, cdn) {
        let row = locals[cdt][cdn];
        return {
            filters: {
                test_group: row.test_group || frm.doc.test_group || ''
            }
        };
    };
}
frappe.ui.form.on("Test Details", {
    test_method(frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    if (!row.test_method || !row.parameter) return;

    frappe.call({
        method: "get_minmax_range",
        doc: frm.doc,
        args: {
            test_method: row.test_method,
            parameter: row.parameter
        },
        callback: function (r) {
            if (r.message && r.message.length) {
                let d = r.message[0];

                frappe.model.set_value(cdt, cdn, "method_min_range", d.method_min_range || "");
                frappe.model.set_value(cdt, cdn, "method_max_range", d.method_max_range || "");
            }
        }
    });
},
    value(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        calculate_pren(frm);
        if (row.value && row.method_min_range && row.method_max_range) {
            let val = parseFloat(row.value);
            let min = parseFloat(row.method_min_range);
            let max = parseFloat(row.method_max_range);
            let status;
            if (min === 0 && max === 0) {
                status = "NON NABL";
            }
            else if (val < min || val > max) {
                status = "NON NABL";
            }
            else {
                status = "NABL";
            }
                frappe.model.set_value(cdt, cdn, "status", status);
        }
        apply_highlight_from_backend(frm);
    },
    //*************************************************************
    parameter(frm, cdt, cdn) {
        let child = locals[cdt][cdn];

        frappe.call({
            method: "get_minmax_range",
            doc: frm.doc,
            args: {
                test_method: child.test_method,
                parameter: child.parameter,
                material_specification: frm.doc.material_specification
            },
            callback: function (r) {

                if (r.message && r.message.length > 0) {

                    let data = r.message[0] || {};

                    // frappe.model.set_value(cdt, cdn, "method_min_range", data.method_min_range || "");
                    // frappe.model.set_value(cdt, cdn, "method_max_range", data.method_max_range || "");
                    frappe.model.set_value(cdt, cdn, "min_range", data.min_range || "");
                    frappe.model.set_value(cdt, cdn, "max_range", data.max_range || "");

                    if (child.value) {

                        let val = parseFloat(child.value);

                        let min = parseFloat(data.min_range ?? data.method_min_range ?? 0);
                        let max = parseFloat(data.max_range ?? data.method_max_range ?? 0);

                        if (!isNaN(val) && !isNaN(min) && !isNaN(max)) {
                            let status;
                            if (min === 0 && max === 0) {
                                status = "NON NABL";
                            }
                            else if (val < min || val > max) {
                                status = "NON NABL";
                            }
                            else {
                                status = "NABL";
                            }
                            frappe.model.set_value(cdt, cdn, "status", status);
                        }
                    }
                    
                    frm.refresh_field("test_details_chemical");
                }
            }
        });
        calculate_pren(frm);
    },
});
// function calculate_pren(frm) {
//     let cr = 0, mo = 0, w = 0, n = 0;
//     (frm.doc.test_details_chemical || []).forEach(r => {
//         let val = parseFloat(r.value) || 0;
//         if (r.parameter == "Chromium(Cr)") cr = val;
//         if (r.parameter == "Molybdenum(Mo)") mo = val;
//         if (r.parameter == "Tungsten(W)") w = val;
//         if (r.parameter == "Nitrogen(N)") n = val;
//     });
//     let row = locals[cdt][cdn];
//     if (row.parameter == "PREN (With W)") {
//         frappe.model.set_value(cdt, cdn, "value",
//             cr + 3.3 * (mo + 0.5 * w + 16 * n)
//         );
//     }
//     if (row.parameter == "PREN (Without W)") {
//         frappe.model.set_value(cdt, cdn, "value",
//             cr + 3.3 * (mo + 16 * n)
//         );
//     }
//     frm.refresh_field("test_details_chemical");
// }
function calculate_pren(frm) {

    let cr = 0, mo = 0, w = 0, n = 0;
    let c = 0, mn = 0, v = 0, ni = 0, cu = 0;

    (frm.doc.test_details_chemical || []).forEach(r => {
        let val = parseFloat(r.value) || 0;

        // PREN
        if (r.parameter == "Chromium(Cr)") cr = val;
        if (r.parameter == "Molybdenum(Mo)") mo = val;
        if (r.parameter == "Tungsten(W)") w = val;
        if (r.parameter == "Nitrogen(N)") n = val;

        // CE
        if (r.parameter == "Carbon(C)") c = val;
        if (r.parameter == "Manganese(Mn)") mn = val;
        if (r.parameter == "Vanadium(V)") v = val;
        if (r.parameter == "Nickel(Ni)") ni = val;
        if (r.parameter == "Copper(Cu)") cu = val;
    });

    (frm.doc.test_details_chemical || []).forEach(r => {

        // ---------- PREN WITH W ----------
        if (r.parameter == "PREN (With W)") {
            frappe.model.set_value(
                r.doctype,
                r.name,
                "value",
                cr + 3.3 * (mo + 0.5 * w + 16 * n)
            );
        }

        // ---------- PREN WITHOUT W ----------
        if (r.parameter == "PREN (Without W)") {
            frappe.model.set_value(
                r.doctype,
                r.name,
                "value",
                cr + 3.3 * (mo + 16 * n)
            );
        }

        // ---------- CE ----------
        if (r.parameter == "CE") {
            let ce =
                c +(mn / 6) +((cr + mo + v) / 5) +((ni + cu) / 15);
            ce = parseFloat(ce.toFixed(2)); 
            frappe.model.set_value(
                r.doctype,
                r.name,
                "value",
                ce
            );
        }

    });
    frm.refresh_field("test_details_chemical");
}
function apply_highlight_from_backend(frm) {
    if (!frm || !frm.docname) return;

    frm.call({
        method: "get_highlight_colors",
        doc: frm.doc,
        callback: function (r) {
            if (!r.message) return;
            const colors = r.message;
            // Apply for both tables
            const tables = ["test_details_chemical"];

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

