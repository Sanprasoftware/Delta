// Copyright (c) 2026, Sanpra Software Solution and contributors
// For license information, please see license.txt

frappe.ui.form.on("Corrosion Test", {
    test_started_datetime: calc_from_duration,
    test_duration_hrs: function(frm){
        calc_from_duration(frm);
        calc_1(frm);
    },
    test_completion_datetime: calc_from_completion,
    // ******************************
    test_method: calc_1,
    length_of_sample: calc_1,
    width_of_sample: calc_1,
    thickness_of_sample: calc_1,
    initial_weight_of_sample:calc_1,
    final_weight_of_sample:calc_1,
    // weight_loss: calc_1,
    total_surface_area_of_sample_dm2: calc_1 ,
    // test_duration_hrs:calc_1,    
    diameter_of_sample: calc_1,
    
    material_shapes(frm) {

    if (frm.doc.material_shapes == "Rectangle") {
        frm.set_value("diameter_of_sample", null);
    }

    if (frm.doc.material_shapes == "Round") {
        frm.set_value("length_of_sample", null);
        frm.set_value("width_of_sample", null);
    }

    frm.set_value("total_surface_area_of_sample", null);
    frm.set_value("total_surface_area_of_sample_dm2", null);
    frm.set_value("corrosion_rate_mmd", null);

    calc_1(frm);
},
// ******************************************************
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

// *****************************************************************
// start + duration → completion
function calc_from_duration(frm) {
    let s = frm.doc.test_started_datetime;
    let d = frm.doc.test_duration_hrs;
    if (s && d) {
        frm.set_value(
            "test_completion_datetime",
            moment(s).add(d, "hours").format("YYYY-MM-DD HH:mm:ss")
        );
    }
}
// start + completion → duration
function calc_from_completion(frm) {
    let s = frm.doc.test_started_datetime;
    let e = frm.doc.test_completion_datetime;
    if (s && e) {
        frm.set_value(
            "test_duration_hrs",
            moment(e).diff(moment(s), "hours", true).toFixed(2)
        );
    }
}
// *****************************************************************
function calc_1(frm) {
    frm.call({
        method: "astm_a923_method_c",
        doc: frm.doc,
        callback: function (r) {
            if (!r.message) return;

            if (r.message.area){
                frm.set_value("total_surface_area_of_sample", r.message.area);
                frm.set_value("total_surface_area_of_sample_dm2", r.message.area/100);
            }

            if (r.message.weight){
                frm.set_value("weight_loss", r.message.weight);
            }

            if (r.message.corrosion){
                frm.set_value("corrosion_rate_mmd", r.message.corrosion);
            }
        }
    });
}
