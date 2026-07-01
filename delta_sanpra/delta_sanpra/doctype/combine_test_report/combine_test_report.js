// Copyright (c) 2026, Sanpra Software Solution and contributors
// For license information, please see license.txt
frappe.ui.form.on("Combine Test Report", {
    onload(frm) {
        if (frm.doc.sample_inward) {
            fetch_sample_inward_data(frm);
        }
        $(window).off("focus.combine_test_report").on("focus.combine_test_report", function () {
            if (cur_frm && cur_frm.doctype === "Combine Test Report") {
                color_test_group_id(frm);
            }
        });
        set_test_group_id_realtime_color(frm);
        
        let original_print = frm.print_doc || frm.print_preview;
        
        frm.print_doc = function () {
            update_test_docs_is_print(frm)
                .then(() => {
                    return frm.save_or_update();
                })
                .then(() => {
                    color_test_group_id(frm);
                    original_print.call(frm);
                });
        };
    },
    
        sample_inward(frm) {
        if (frm.doc.sample_inward) {
            fetch_sample_inward_data(frm);
        } else {
            frm.set_value("printedready_to_printtotal_test", "0 / 0 / 0");
        }
    },
    refresh(frm) {
         if (frm.doc.sample_inward) {
            fetch_sample_inward_data(frm);
        }

        frm.set_query("sample_id__test_id", "non_enbl__ysuts_table", function () {
            return {
                filters: {
                    inward_number: frm.doc.sample_inward
                }
            };
        });
        frm.set_query("sample_inward", function () {
            return {
                filters: {
                    docstatus: 1
                }
            };
        });
        color_test_group_id(frm);
    },
    enbl_generate_ulr(frm) {
        generate_ulr(frm, "enbl_ulr_no", "ENBL");
    },
    get_data(frm) {
        frappe.call({
            method: "get_data",
            doc: frm.doc,
            callback: function (r) {
                if (!r.exc) {
                    frm.refresh_field("items");
                    frm.refresh_field("non_enbl__ysuts_table");
                    color_test_group_id(frm);
                }
            }
        });
    },
});

function set_test_group_id_realtime_color(frm) {
    if (frm.__test_group_id_realtime_color) {
        return;
    }

    frm.__test_group_id_realtime_color = true;
    frappe.realtime.on("doc_update", function (data) {
        if (!cur_frm || cur_frm.doctype !== "Combine Test Report") {
            return;
        }

        let doctype = data.doctype || data.doc_type;
        let name = data.name || data.docname;

        let found = ["items", "non_enbl__ysuts_table"].some(table => {
            return (cur_frm.doc[table] || []).some(row => {
                return row.form_name === doctype && row.test_group_id === name;
            });
        });

        if (found) {
            color_test_group_id(cur_frm);
        }
    });
}
frappe.ui.form.on("Print Test Report Item", {
    form_name(frm) {
        color_test_group_id(frm);
    },
    test_group_id(frm) {
        color_test_group_id(frm);
    },
    items_add(frm) {
        color_test_group_id(frm);
    }
});

frappe.ui.form.on("YSUTS NonEnable Table", {
    form_name(frm) {
        color_test_group_id(frm);
    },
    test_group_id(frm) {
        color_test_group_id(frm);
    },
    non_enbl__ysuts_table_add(frm) {
        color_test_group_id(frm);
    }
});

function color_test_group_id(frm) {
    setTimeout(() => {
        ["items", "non_enbl__ysuts_table"].forEach(table => {
            (frm.doc[table] || []).forEach(row => {
                if (!row.form_name || !row.test_group_id) {
                    return;
                }

                frappe.db.get_value(row.form_name, row.test_group_id, "is_print").then(r => {
                    let grid_row = frm.fields_dict[table].grid.grid_rows_by_docname[row.name];
                    let is_print = r.message && r.message.is_print;
                    let color = is_print ? "green" : "red";

                    if (grid_row) {
                        grid_row.row
                            .find('[data-fieldname="test_group_id"], [data-fieldname="test_group_id"] a, [data-fieldname="test_group_id"] input')
                            .css("color", color);
                    }
                });
            });
        });
    }, 100);
}
function fetch_sample_inward_data(frm) {
    frappe.db.get_value("Sample Inward", frm.doc.sample_inward, 
        ["printed", "ready_to_print", "total_test"])
        .then(r => {
            if (r.message) {
                let printed = r.message.printed || 0;
                let ready = r.message.ready_to_print || 0;
                let total = r.message.total_test || 0;
                let summary = `${printed} / ${ready} / ${total}`;
                frm.set_value("printedready_to_printtotal_test", summary);
            }
        });
}
// function update_test_docs_is_print(frm) {
//     return new Promise((resolve, reject) => {
//         let promises = [];
        
//         (frm.doc.items || []).forEach(row => {
//             if (row.test_group_id && row.form_name) {
//                 promises.push(
//                     frappe.db.set_value(row.form_name, row.test_group_id, "is_print", 1)
//                 );
//             }
//         });
        
//         (frm.doc.non_enbl__ysuts_table || []).forEach(row => {
//             if (row.test_group_id && row.form_name) {
//                 promises.push(
//                     frappe.db.set_value(row.form_name, row.test_group_id, "is_print", 1)
//                 );
//             }
//         });
        
//         Promise.all(promises).then(() => resolve()).catch(err => reject(err));
//     });
// }
function update_test_docs_is_print(frm) {
    let promises = [];

    (frm.doc.items || []).forEach(row => {
        if (row.test_group_id && row.form_name && row.workflow_state != "Returned") {
            promises.push(
                frappe.db.set_value(row.form_name, row.test_group_id, "is_print", 1)
            );
        }
    });

    (frm.doc.non_enbl__ysuts_table || []).forEach(row => {
        if (row.test_group_id && row.form_name && row.workflow_state != "Returned") {
            promises.push(
                frappe.db.set_value(row.form_name, row.test_group_id, "is_print", 1)
            );
        }
    });

    return Promise.all(promises);
}
function generate_ulr(frm, fieldname, label) {
    if (frm.doc[fieldname]) {
        frappe.msgprint(`${label} ULR already generated`);
        return;
    }
    if (frm.__ulr_generation_in_progress) {
        return;
    }

    frm.__ulr_generation_in_progress = true;
    frm.call({
        method: "get_next_ulr_counter",
        doc: frm.doc,
        callback: function (r) {
            if (r.message) {
                let count = r.message.toString().padStart(9, "0");
                frm.set_value(fieldname, "TC1384426" + count + "F");
                frappe.msgprint(`${label} ULR Generated Successfully`);
            }
            frm.__ulr_generation_in_progress = false;
        },
        error: function () {
            frm.__ulr_generation_in_progress = false;
        }
    });
}
