// Copyright (c) 2025, Sanpra Software Solution and contributors
// For license information, please see license.txt

frappe.ui.form.on("Test Description", {
	refresh(frm) {
        toggle_fields(frm);
    },

    customer_specified(frm) {
        toggle_fields(frm);
    },

    is_standard(frm) {
        toggle_fields(frm);
    },
    test_group: function(frm) {
        if (frm.doc.test_group) {
            frm.set_query("test_method", function() {
                return {
                    filters: {
                        test_group: frm.doc.test_group
                    }
                };
            });

        }
        frm.set_value("test_method", "");
    }
});

function toggle_fields(frm) {

    if (frm.doc.customer_specified) {

        frm.set_value("is_standard", 0);

        frm.set_df_property("customer_name", "reqd", 1);
        frm.set_df_property("customer_name", "read_only", 0);

        frm.set_df_property("is_standard", "read_only", 1);
        frm.set_df_property("customer_specified", "read_only", 0);

    } 
    else if (frm.doc.is_standard) {

        frm.set_value("customer_specified", 0);

        frm.set_df_property("customer_name", "read_only", 1);
        frm.set_df_property("customer_name", "reqd", 0);

        frm.set_df_property("customer_specified", "read_only", 1);
        frm.set_df_property("is_standard", "read_only", 0);

    } 
    else {

        frm.set_df_property("customer_name", "read_only", 0);
        frm.set_df_property("customer_name", "reqd", 0);

        frm.set_df_property("customer_specified", "read_only", 0);
        frm.set_df_property("is_standard", "read_only", 0);
    }

}
