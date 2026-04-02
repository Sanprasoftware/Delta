let test = []
description = []
frappe.ui.form.on("Item", {
    onload(frm) {
        frm.page.sidebar.hide();
        frm.set_query("test_method", "custom_material_sample_details", function(doc, cdt, cdn) {
            let row = locals[cdt][cdn];
            return {
                filters: {
                    test_group: row.test_group
                }
            };
        });

        // test_description filter
        frm.set_query("test_description", "custom_material_sample_details", function(doc, cdt, cdn) {
            let row = locals[cdt][cdn];
            return {
                filters: {
                    test_method: row.test_method,
                    is_standard : 1
                }
            };
        });
    },
    custom_standard: set_item_name,
    custom_year: set_item_name,
    custom_grade: set_item_name
});
function set_item_name(frm) {
    let standard = frm.doc.custom_standard || "";
    let year = frm.doc.custom_year || "";
    let grade = frm.doc.custom_grade || "";

    if (standard && year && grade) {
        frm.set_value("item_name", `${standard} : ${year} ${grade}`);
    } else if (standard && year) {
        frm.set_value("item_name", `${standard} : ${year}`);
    } else if (standard && grade) {
        frm.set_value("item_name", `${standard} : ${grade}`);
    } else if (standard) {
        frm.set_value("item_name", standard);
    } else {
        frm.set_value("item_name", "");
    }
}
//**********************************************************************************************************
frappe.ui.form.on("Material Sample Details", {
    test_group(frm, cdt, cdn) {

        frappe.model.set_value(cdt, cdn, "test_method", "");
        frappe.model.set_value(cdt, cdn, "test_description", "");

        frm.set_query("test_method", "custom_material_sample_details", function(doc, cdt, cdn) {
            let row = locals[cdt][cdn];
            return {
                filters: {
                    test_group: row.test_group
                }
            };
        });
    },
    test_method(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    if (!row) return;
    frappe.model.set_value(cdt, cdn, "test_description", "");
    frm.set_query("test_description", "custom_material_sample_details", function(doc, cdt, cdn) {
        let child = locals[cdt][cdn];
        return {
            filters: {
                test_method: child.test_method
            }
        };
    });
    } 
});


