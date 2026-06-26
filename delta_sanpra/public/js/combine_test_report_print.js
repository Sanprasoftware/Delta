frappe.provide("delta_sanpra");

delta_sanpra.patch_combine_test_report_print = function () {
    if (!frappe.ui || !frappe.ui.form || !frappe.ui.form.PrintView) {
        setTimeout(delta_sanpra.patch_combine_test_report_print, 300);
        return;
    }

    if (frappe.ui.form.PrintView.prototype.__delta_sanpra_print_patched) {
        return;
    }

    frappe.ui.form.PrintView.prototype.printit = function () {
        this.render_page("/printview?", true);
    };

    frappe.ui.form.PrintView.prototype.__delta_sanpra_print_patched = true;
};

$(document).on("startup", delta_sanpra.patch_combine_test_report_print);
$(delta_sanpra.patch_combine_test_report_print);
