// Copyright (c) 2025, Sanpra Software Solution and contributors
// For license information, please see license.txt

let item1 = []
let description = []
function validate_challan_date(frm) {
    if (frm.doc.challan_date && frm.doc.sample_received_date &&
        frm.doc.challan_date > frm.doc.sample_received_date) {

        frappe.msgprint("Challan Date cannot be greater than Sample Received Date");
    }
}
// **************************************************************************************************
frappe.ui.form.on("Sample Inward", {
    validate(frm) {
        let qty = frm.doc.quantity || 0;
        let rows = (frm.doc.material_details || []).length;

        if (rows !== qty) {
            frappe.throw(`Material Details rows must be exactly ${qty}`);
        }
    },
    date(frm) {
        validate_challan_date(frm);
    },

    challan_date(frm) {
        validate_challan_date(frm);
    },
    quantity(frm) {
        if (!frm.doc.quantity) return;
        frm.call({
            method: "update_material_rows",
            doc: frm.doc,
            callback: function () {
                frm.refresh_field("material_details");
            }
        });
    },
    refresh: function (frm) {
           if (!frm.is_new()) {
            frm.add_custom_button("Sales Invoice", function() {
                frm.call({
                    method: "create_sales_invoice",
                    doc: frm.doc,
                    callback: function(r) {
                        if (r.message) {
                            let doc = frappe.model.sync(r.message)[0];
                            frappe.set_route("Form", doc.doctype, doc.name);
                        }
                    }
                });
            }, "Create"); 
        }
// ************************************************************************
// add row ka button hide
        frm.get_field("sticker_print").grid.cannot_add_rows = true;
        frm.get_field("test_on_sample").grid.cannot_add_rows = true;
// ************************************************************************
// duplicate row ka button hide karne ka code 
        setTimeout(() => {
            let grid = frm.get_field("material_details").grid;
            // hide bottom duplicate button
            grid.wrapper.find('.grid-duplicate-rows').hide();
            // also hide when checkbox selected
            grid.wrapper.on("change", ".grid-row-check", function () {
                grid.wrapper.find('.grid-duplicate-rows').hide();
            });

        }, 300);
// ************************************************************************
        frm.refresh_field("sticker_print");
        frm.refresh_field("test_on_sample");
        capture_material_idx_snapshot(frm);
        frm.set_query("material_specification", "test_on_sample", function () {
            return {
                filters: {
                    name: ["in", (frm.doc.material_details || [])
                        .map(d => d.material_specification)
                        .filter(Boolean)
                    ]
                }
            };
        });
        frm.set_query("materials", "machining_charge_table", function (doc, cdt, cdn) {
            let materials = (doc.material_details || [])
                .map(d => d.material_specification)
                .filter(Boolean);

            return {
                filters: [
                    ["Item", "name", "in", materials]
                ]
            };
        });


        
        frm.set_query("test_method", "test_on_sample", function(doc, cdt, cdn) {
            let row = locals[cdt][cdn];
            return {
                filters: {
                    test_group: row.test_group
                }
            };
        });
        // frm.set_query("test_description", "test_on_sample", function(doc, cdt, cdn) {
        //     let row = locals[cdt][cdn];
        //     return {
        //         filters: {
        //             test_method: row.test_method,
        //             customer_name: doc.customer
        //         }
        //     };
        // });
        frm.set_query("test_description", "test_on_sample", function(doc, cdt, cdn) {
            let row = locals[cdt][cdn];

            return {
                filters: {
                    test_method: row.test_method
                },
                or_filters: {
                    customer_name: doc.customer,
                    is_standard: 1
                }
            };
        });

        frm.set_query("customer_requirement", "sticker_print", function(doc, cdt, cdn) {
            let row = locals[cdt][cdn];
            return {
                filters: {
                    test_method: row.test_method
                }
            };
        });
        frm.set_query("customer_requirement", "test_on_sample", function(doc, cdt, cdn) {
            let row = locals[cdt][cdn];
            return {
                filters: {
                    test_method: row.test_method
                }
            };
        });
        ensure_test_description_titles(frm);

    },
    onload(frm) {
        frm.page.sidebar.hide();
        capture_material_idx_snapshot(frm);
    },
    get_sample: function(frm) {
        frm.call({
            method: "get_material_details",
            doc: frm.doc,
            callback: function() {
                frm.refresh_field("test_on_sample");
                frm.refresh_field("material_details");
                ensure_test_description_titles(frm);
            }
        });
    },
    select_all(frm) {
        let rows = frm.doc.sticker_print || [];
        let first_checked = rows[0].print_this ? 1 : 0;
        rows.forEach(row => {
            row.print_this = first_checked ? 0 : 1;
        });
        frm.refresh_field("sticker_print");
    },
    print_sticker: function(frm) {
        let selected_rows = (frm.doc.sticker_print || [])
            .filter(r => r.print_this)
            .map(r => r.name);
        if (!selected_rows.length) {
            frappe.msgprint("Please select at least one row to print.");
            return;
        }
        let encoded_name = encodeURIComponent(frm.doc.name);
        let row_string = selected_rows.join(",");
        window.open(
            `/printview?doctype=${frm.doctype}` +
            `&name=${encoded_name}` +
            `&format=Sticker Print` +
            `&no_letterhead=1` +
            `&_selected_rows=${row_string}`,
            "_blank"
        );
    }
});
// **************************************************************************************************
frappe.ui.form.on("Material Details", {
    material_shape(frm, cdt, cdn) {
        set_sample_description_from_shape_if_empty(cdt, cdn);
    },
    material_details_remove(frm, cdt, cdn) {
        const removed_row = (locals[cdt] || {})[cdn];
        const parse_sample_num = (val) => {
            const v = String(val || "").trim();
            if (!v) return 0;
            return parseInt(v.replace("S", ""), 10) || 0;
        };
        const current_material_idx = (frm.doc.material_details || [])
            .map((r) => parseInt(r.idx || 0, 10))
            .filter((n) => n > 0);
        const prev_material_idx = frm._material_idx_snapshot || [];
        const removed_sample_num = parse_sample_num(
            (removed_row && (removed_row.sample_id || removed_row.counter)) || ""
        );

        let removed_idx = parseInt((removed_row && removed_row.idx) || 0, 10);
        if (!removed_idx && prev_material_idx.length) {
            removed_idx = prev_material_idx.find((n) => !current_material_idx.includes(n)) || 0;
        }

        if (removed_idx > 0) {
            frm.doc.test_on_sample = (frm.doc.test_on_sample || [])
                .filter((r) => parseInt(r.index_id || 0, 10) !== removed_idx)
                .map((r) => {
                    const current_idx = parseInt(r.index_id || 0, 10);
                    if (current_idx > removed_idx) {
                        r.index_id = current_idx - 1;
                    }
                    return r;
                })
                .filter((r) => current_material_idx.includes(parseInt(r.index_id || 0, 10)));
        }

        if (removed_sample_num > 0) {
            (frm.doc.material_details || []).forEach((r) => {
                const current_num = parse_sample_num(r.sample_id || r.counter);
                if (current_num > removed_sample_num) {
                    const new_sample = `S${current_num - 1}`;
                    r.counter = new_sample;
                    r.sample_id = new_sample;
                }
            });

            (frm.doc.test_on_sample || []).forEach((r) => {
                const current_num = parse_sample_num(r.sample_id);
                if (current_num > removed_sample_num) {
                    r.sample_id = `S${current_num - 1}`;
                    r.sample_idtest_id = r.test_id ? `${r.sample_id}/${r.test_id}` : r.sample_id;
                }
            });
        }

        capture_material_idx_snapshot(frm);
        call_cutting_row_update(frm);
        frm.refresh_field("material_details");
        frm.refresh_field("test_on_sample");
    },
    material_dimension(frm, cdt, cdn) {
        // frappe.model.set_value(cdt, cdn, "new_record_flag", 0);
        call_cutting_row_update(frm);
    },
    material_specification(frm, cdt, cdn) {
        // frappe.model.set_value(cdt, cdn, "new_record_flag", 0);
        const row = locals[cdt][cdn];
        if (row && row.counter && !row.sample_id) {
            frappe.model.set_value(cdt, cdn, "sample_id", row.counter);
        }
        if (row && row.material_specification && !row.counter) {
            get_next_sample_id_from_company(frm, function (next_sample_id) {
                frappe.model.set_value(cdt, cdn, "counter", next_sample_id);
                frappe.model.set_value(cdt, cdn, "sample_id", next_sample_id);
                call_cutting_row_update(frm);
                frm.refresh_field("test_on_sample");
            });
            return;
        }
        call_cutting_row_update(frm);
        frm.refresh_field("test_on_sample");
    },
    material_details_add: function (frm, cdt, cdn) {
        frappe.model.set_value(cdt, cdn, "new_record_flag", 0);
        let qty = frm.doc.quantity || 0;
        let rows = frm.doc.material_details.length;
        if (rows > qty) {
            frappe.msgprint(
                __("You cannot add more than {0} Material Details rows because Quantity is {0}", [qty])
            );
            frm.doc.material_details.pop();
            frm.refresh_field("material_details");
            return false;
        }
        capture_material_idx_snapshot(frm);
    },
    is_duplicate: function(frm, cdt, cdn) {

        let row = locals[cdt][cdn];

        let d = new frappe.ui.Dialog({
            fields: [

           {
                label: "Test Group",
                fieldname: "test_group",
                fieldtype: "Link",
                options: "Test Group",
                onchange() {

                    let group = d.get_value("test_group");

                    if (!group) return;

                    // Test Method filter based on Test Group
                    d.fields_dict.test_method.get_query = function () {
                        return {
                            filters: {
                                test_group: group
                            }
                        };
                    };
                }
            },
            {
                label: "Test Method",
                fieldname: "test_method",
                fieldtype: "Link",
                options: "Test Method",
                onchange() {

                    let method = d.get_value("test_method");

                    if (!method) return;

                        // 1️⃣ Auto fetch Test Description
                        frappe.db.get_value(
                            "Test Description",
                            {
                                test_method: method,
                                customer_name: frm.doc.customer
                            },
                            ["name","rate"],
                            function(r) {

                                if (r && r.name) {
                                    d.set_value("test_description", r.name);
                                    d.set_value("price", r.rate || 0);
                                }
                            }
                        );

                        // 2️⃣ Customer Requirement filter
                        d.fields_dict.customer_requirement.get_query = function() {
                            return {
                                filters: {
                                    test_method: method
                                }
                            };
                        };

                        // 3️⃣ Test Description filter
                        d.fields_dict.test_description.get_query = function() {
                            return {
                                filters: {
                                    test_method: method,
                                    is_standard: 1
                                }
                            };
                        };
                    }
                },

                {
                    label: "Test Description",
                    fieldname: "test_description",
                    fieldtype: "Link",
                    options: "Test Description",
                    onchange() {

                        let desc = d.get_value("test_description");

                        if (!desc) return;

                        // Price auto fetch
                        frappe.db.get_value(
                            "Test Description",
                            desc,
                            "rate",
                            function(r) {
                                if (r && r.rate) {
                                    d.set_value("price", r.rate);
                                }
                            }
                        );
                    }
                },

                {
                    label: "Price",
                    fieldname: "price",
                    fieldtype: "Currency",
                    read_only: 1
                },
                {
                    label: "Customer Requirement",
                    fieldname: "customer_requirement",
                    fieldtype: "Link",
                    options: "Customer Requirement"
                }


            ],

            primary_action_label: "Add Row",

            primary_action(values) {
                get_next_test_id(frm, function(next_test_id) {
                    let child = frm.add_child("test_on_sample");

                    // auto copy from original row
                    child.material_specification = row.material_specification;
                    child.heat_number = row.heat_number;
                    child.material_shape = row.material_shape;
                    child.sample_description = row.sample_description;

                    child.test_group = values.test_group;
                    child.test_method = values.test_method;
                    child.test_description = values.test_description;
                    child.customer_requirement = values.customer_requirement;
                    child.price = values.price;

                    // sample id copy
                    child.sample_id = row.sample_id;
                    child.test_id = next_test_id;
                    child.sample_idtest_id = child.sample_id + "/" + child.test_id;

                    frm.refresh_field("test_on_sample");
                    ensure_test_description_titles(frm);
                    d.hide();
                });
            }


        });

        d.show();
    }


});
// **************************************************************************************************
function capture_material_idx_snapshot(frm) {
    frm._material_idx_snapshot = (frm.doc.material_details || [])
        .map((r) => parseInt(r.idx || 0, 10))
        .filter((n) => n > 0);
}
// **************************************************************************************************
function get_next_sample_id_from_company(frm, callback) {
    const company_name = "DELTAA METALLIX SOLUTIONS PRIVATE LIMITED";
    if (typeof frm._sample_counter_seed === "number") {
        frm._sample_counter_seed += 1;
        callback(`S${frm._sample_counter_seed}`);
        return;
    }
    frappe.call({
        method: "frappe.client.get_value",
        args: {
            doctype: "Company",
            filters: { name: company_name },
            fieldname: ["custom_sample_counter"]
        },
        callback: function (r) {
            const current = (r.message && r.message.custom_sample_counter) || "S0";
            const num = parseInt(String(current).replace("S", ""), 10) || 0;
            frm._sample_counter_seed = num + 1;
            callback(`S${frm._sample_counter_seed}`);
        }
    });
}
// **************************************************************************************************
function get_next_test_id(frm, callback) {
    const rows = frm.doc.test_on_sample || [];
    const last_row_with_test_id = [...rows]
        .reverse()
        .find((r) => parseInt(r.test_id || 0, 10) > 0);

    if (last_row_with_test_id) {
        callback((parseInt(last_row_with_test_id.test_id, 10) || 0) + 1);
        return;
    }

    frappe.call({
        method: "frappe.client.get_value",
        args: {
            doctype: "Company",
            filters: { name: "DELTAA METALLIX SOLUTIONS PRIVATE LIMITED" },
            fieldname: ["custom_test_counter"]
        },
        callback: function (r) {
            const company_test_counter = parseInt((r.message && r.message.custom_test_counter) || 0, 10) || 0;
            callback(company_test_counter + 1);
        }
    });
}
// **************************************************************************************************
function call_cutting_row_update(frm) {
    frm.call({
        method: "update_processing_charges",
        doc: frm.doc,
        callback: function () {
            frm.refresh_field("cutting_charge");
            frm.refresh_field("machining_charge");
        }
    });
}
// **************************************************************************************************
function set_sample_description_from_shape_if_empty(cdt, cdn) {
    const row = locals[cdt][cdn];
    if (!row || !row.material_shape) return;

    const current_description = String(row.sample_description || "").trim();
    if (current_description) return;

    frappe.db.get_value("Material Shape", row.material_shape, "description", function (r) {
        const fetched = (r && r.description) || "";
        frappe.model.set_value(cdt, cdn, "sample_description", fetched);
    });
}
// **************************************************************************************************
function ensure_test_description_titles(frm) {
    const rows = frm.doc.test_on_sample || [];
    const names = [...new Set(rows.map((r) => r.test_description).filter(Boolean))];

    const pending = names.filter(
        (name) => !frappe.utils.get_link_title("Test Description", name)
    );

    if (!pending.length) return;

    Promise.all(
        pending.map((name) =>
            frappe.utils.fetch_link_title("Test Description", name).catch(() => null)
        )
    ).then(() => {
        frm.refresh_field("test_on_sample");
    });
}
// **************************************************************************************************

frappe.ui.form.on("Test On sample", {
    material_specification(frm, cdt, cdn) {

    let row = locals[cdt][cdn];

    // Heat Number set karo material_details se
    let mat = (frm.doc.material_details || []).find(
        r => r.material_specification === row.material_specification
    );

    if (mat) {
        frappe.model.set_value(cdt, cdn, "heat_number", mat.heat_number);
    }

    // Sample ID set karo material_details counter se
    if (mat && mat.counter) {
        frappe.model.set_value(cdt, cdn, "sample_id", mat.counter);
    }

},
    test_group(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        frappe.model.set_value(cdt, cdn, "test_method", "");
        // frappe.model.set_value(cdt, cdn, "test_description", "");
        frappe.model.set_value(cdt, cdn, "price", "");
        
    },
    test_description(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.test_description) return;
        frappe.db.get_value("Test Description",row.test_description,"rate",
            function(r) {
                if (r && r.rate) {
                    frappe.model.set_value(cdt, cdn, "price", r.rate);
                }
            }
        );
    },
    test_method(frm, cdt, cdn) {

    let row = locals[cdt][cdn];

    if (!row.test_method) return;

        frappe.db.get_value(
            "Test Description",
            {
                test_method: row.test_method,
                customer_name: frm.doc.customer
            },
            "name",
            function(r) {
                if (r && r.name) {
                    frappe.model.set_value(cdt, cdn, "test_description", r.name);
                    ensure_test_description_titles(frm);
                }
            }
        );
    },
});
// **************************************************************************************************
frappe.ui.form.on("Machining Charge", {
    processing_charges(frm, cdt, cdn) {
        set_machining_charge(frm, cdt, cdn);
        let row = locals[cdt][cdn];
        if (!row.processing_charges || !row.material_type || !row.thik_dia) return;

        frappe.call({
            method: "frappe.client.get",
            args: {
                doctype: "Material Type",
                name: row.material_type
            },
            callback(r) {
                if (!r.message) return;

                let charge = 0;

                (r.message.sample_preparation_charges || []).some(d => {
                    if (d.processing_charges !== row.processing_charges) {
                        return false;
                    }

                    // IF-ELSE Structure
                    if (d.is_fix) {
                        charge = d.charges;
                        return true;
                    } else if (row.thik_dia >= d.from_range && row.thik_dia <= d.to_range) {
                        charge = d.charges;
                        return true;
                    } else {
                        return false;
                    }
                });

                frappe.model.set_value(cdt, cdn, "machining_charge", charge);
                calculate_total(cdt, cdn);
            }
        });
    },
    machining_charge(frm, cdt, cdn) {
        calculate_total(cdt, cdn);
    },

    quantity(frm, cdt, cdn) {
        calculate_total(cdt, cdn);
    },

    materials(frm, cdt, cdn) {
        let cur = locals[cdt][cdn];
        if (!cur.materials) return;

        (frm.doc.machining_charge || []).forEach(r => {
            if (r.name === cur.name) return;

            if (r.materials === cur.materials) {
                cur.material_type = r.material_type;
                cur.description = r.description;
                cur.processing_charges = r.processing_charges;
                cur.thik_dia = r.thik_dia;
                cur.machining_charge = r.machining_charge;
                calculate_total(cdt, cdn);
                frm.refresh_field("machining_charge");
            }
        });
    },
    
    thik_dia(frm, cdt, cdn) {
        set_machining_charge(frm, cdt, cdn);
    },
    materials(frm,cdt,cdn){
        set_machining_charge(frm, cdt, cdn);
    }
});

function calculate_total(cdt, cdn) {
    let row = locals[cdt][cdn];
    frappe.model.set_value(
        cdt,
        cdn,
        "total",
        (row.machining_charge || 0) * (row.quantity || 0)
    );
}

frappe.ui.form.on("Cutting Charge", {

    quantity(frm, cdt, cdn) {
        calculate_cutting_total(cdt, cdn);
    },

    total(frm, cdt, cdn) {
        calculate_cutting_total(cdt, cdn);
    }

});

function calculate_cutting_total(cdt, cdn) {
    let row = locals[cdt][cdn];

    frappe.model.set_value(
        cdt,
        cdn,
        "total",
        (row.quantity || 0) * (row.total_charges || 0)
    );
}
function set_machining_charge(frm, cdt, cdn) {
    let row = locals[cdt][cdn];
    if (!row.processing_charges || !row.material_type || !row.thik_dia) return;

    frappe.call({
        method: "frappe.client.get",
        args: {
            doctype: "Material Type",
            name: row.material_type
        },
        callback(r) {
            if (!r.message) return;

            let charge = 0;

            (r.message.sample_preparation_charges || []).some(d => {
                if (d.processing_charges !== row.processing_charges) return false;

                if (d.is_fix) {
                    charge = d.charges;
                    return true;
                }

                if (row.thik_dia >= d.from_range && row.thik_dia <= d.to_range) {
                    charge = d.charges;
                    return true;
                }
            });

            frappe.model.set_value(cdt, cdn, "machining_charge", charge);
            calculate_total(cdt, cdn);
        }
    });
}

