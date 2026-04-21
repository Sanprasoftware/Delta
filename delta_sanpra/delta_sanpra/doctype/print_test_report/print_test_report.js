// Copyright (c) 2026, Sanpra Software Solution and contributors
// For license information, please see license.txt
frappe.ui.form.on("Print Test Report", {
    refresh(frm) {
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
                }
            }
        });
    },
});
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
