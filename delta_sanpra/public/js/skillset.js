frappe.ui.form.on('Interview', {
    refresh(frm) {
        frm.trigger("load_expected_skillset");
    },
    interview_round(frm) {
        frm.trigger("load_expected_skillset");
    },
    load_expected_skillset(frm) {
        if (!frm.doc.interview_round) return;
        let existing = {};
        (frm.doc.custom_expected_skillset || []).forEach(row => {
            if (row.skill) {
                existing[row.skill] = row.marks;
            }
        });
        frappe.call({
            method: "delta_sanpra.public.py.skillset.get_expected_skillset",
            args: { interview_round: frm.doc.interview_round },
            callback: function (r) {
                frm.clear_table("custom_expected_skillset");
                (r.message || []).forEach(row => {
                    let child = frm.add_child("custom_expected_skillset");
                    child.skill = row.skill;
                    child.description = row.description;
                    child.marks = existing[row.skill] || row.custom_marks;
                });
                frm.refresh_field("custom_expected_skillset");
            }
        });
    }
});
//*************************************************************************************
frappe.ui.form.on('Expected Skillset', {
    marks: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.marks > frm.doc.custom_each_points_marks) {
            frappe.msgprint(`Marks cannot be greater than ${frm.doc.custom_each_points_marks}`);
            frappe.model.set_value(cdt, cdn, 'marks', frm.doc.custom_each_points_marks);
        }
        let total = 0;
        frm.doc.custom_expected_skillset.forEach(r => {
            total += r.marks || 0;
        });
        frm.set_value('custom_total_marks', total);
    }
});

