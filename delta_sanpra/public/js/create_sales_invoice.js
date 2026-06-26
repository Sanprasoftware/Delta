frappe.ui.form.on("Sales Invoice", {
    posting_date: set_due_date,
    custom_payment_due_days: set_due_date,
    refresh(frm) {
        if (frm.doc.docstatus === 1) {
            frm.add_custom_button(__("Send Mail"), function () {
                frappe.call({
                    method: "delta_sanpra.public.py.create_sales_invoice.send_sales_invoice_mail",
                    args: {
                        invoice_name: frm.doc.name
                    },
                    freeze: true,
                    freeze_message: __("Sending Mail...")
                }).then(r => {
                    if (r.message) {
                        frappe.msgprint(__(r.message));
                    }
                });
            });
        }
    },
    after_save: function(frm) {
        frm.reload_doc();
    },

    on_submit: function(frm) {
        frm.reload_doc();
    },
    customer: function(frm) {
        // frm.set_value("custo
        // m_mrn_no", []);
        if (!frm.doc.customer) return;
        frappe.call({
            method: "delta_sanpra.public.py.create_sales_invoice.get_sample_inward",
            args: {
                customer: frm.doc.customer
            },
            callback: function(r) {
                if (r.message) {

                    r.message.forEach(function(d) {
                        let row = frm.add_child("custom_mrn_no");
                        row.sample_inward = d.sample_inward;
                    });

                    frm.refresh_field("custom_mrn_no");
                }
            }
        });
    },
    // custom_get_data: function(frm) {

    //     frappe.call({
    //         method: "delta_sanpra.public.py.create_sales_invoice.get_test_data",
    //         args: {
    //             sample_list: frm.doc.custom_mrn_no
    //         },
    //         callback: function(r) {

    //             frm.clear_table("items");

    //             r.message.forEach(function(d) {
    //                 let row = frm.add_child("items");
    //                 row.item_name = d.sample_idtest_id;
    //                 row.custom_test_method = d.test_method;
    //                 row.custom_test_description = d.test_description;
    //                 row.custom_heat_no = d.heat_number;
    //                 row.qty = 1;                          // qty set here
    //                 row.rate = d.price;
    //                 row.amount = row.rate * row.qty;  
    //                 row.uom = "Nos";
    //                 row.income_account = "Sales - DM";
    //                 row.gst_hsn_code = 511190;
    //             });

    //             frm.refresh_field("items");
    //         }
    //     });

    // },
    custom_total_amount: function(frm) {

        if (!frm.doc.taxes) return;

        frm.doc.taxes.forEach(function(row) {

            if (row.charge_type === "Actual" && row.account_head === "Service - DM") {
                row.tax_amount = frm.doc.custom_total_amount;
            }

        });

        frm.refresh_field("taxes");
    }
    
});
frappe.ui.form.on("Inward Services", {
    amount: function(frm, cdt, cdn) {
        let total = 0;
        frm.doc.custom_services.forEach(function(row) {
            total += row.amount || 0;
        });
        frm.set_value("custom_total_amount", total);
    }
});
// custom_total_amount ki current total taxes table me ke tax_amount field me add karni hai on change ko but us row me charge_type Actual  and account_head "Service - DM" hona chiaye value change ho gai to table me ke row me bhi value change honi chahiye
frappe.ui.form.on("Sales Taxes and Charges", {
    tax_amount: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.charge_type === "Actual" && row.account_head === "Service - DM") {
            row.tax_amount = frm.doc.custom_total_amount;
            frm.refresh_field("taxes");
        }
    }
});
// ****************************************payment due date calculate***********************************************

function set_due_date(frm) {
    if (!frm.doc.posting_date) {
        frm.set_value("due_date", "");
        return;
    }

    let due_days = cint(frm.doc.custom_payment_due_days || 0);

    let due_date = frappe.datetime.add_days(
        frm.doc.posting_date,
        due_days
    );

    frm.set_value("due_date", due_date);
}
