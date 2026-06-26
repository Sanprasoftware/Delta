# Copyright (c) 2026, Sanpra Software Solution and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import get_link_to_form

class CombineTestReport(Document):
    def before_save(self):
        self.set_print_summary_from_sample_inward()
        self.check_non_enbl_status_chemical()
        self.check_non_enbl_status_physical()
        self._validate_ulr_uniqueness_on_save()
        self._sync_ulr_counter_before_save()

    def set_print_summary_from_sample_inward(self):
        if not self.sample_inward:
            self.printedready_to_printtotal_test = "0 / 0 / 0"
            return

        sample_inward = frappe.get_doc("Sample Inward", self.sample_inward)
        total_test = len(sample_inward.test_on_sample or [])
        if sample_inward.total_test != total_test:
            frappe.db.set_value("Sample Inward", sample_inward.name, "total_test", total_test)

        self.printedready_to_printtotal_test = (
            f"{sample_inward.printed or 0} / "
            f"{sample_inward.ready_to_print or 0} / "
            f"{total_test or 0}"
        )

    @frappe.whitelist()
    def get_print_summary_from_sample_inward(self):
        self.set_print_summary_from_sample_inward()
        return self.printedready_to_printtotal_test

    def _validate_ulr_uniqueness_on_save(self):
        ulr_values = [value for value in [self.enbl_ulr_no] if value]
        for ulr_no in ulr_values:
            duplicate = frappe.get_all(
                "Combine Test Report",
                filters=[
                    ["name", "!=", self.name or ""],
                    ["docstatus", "<", 2],
                ],
                or_filters={
                    "enbl_ulr_no": ulr_no,
                },
                fields=["name"],
                limit=1,
            )
            if duplicate:
                frappe.throw(
                    f"ULR No. {ulr_no} already exists in Combine Test Report {duplicate[0].name}"
                )
#***********************************************************************************************
    def _sync_ulr_counter_before_save(self):
        increments_needed = self._get_new_ulr_count()
        if increments_needed <= 0:
            return

        company_name = "DELTAA METALLIX SOLUTIONS PRIVATE LIMITED"
        last = frappe.db.get_value("Company", company_name, "custom_ulr_counter") or 0
        updated = int(last) + increments_needed
        frappe.db.set_value("Company", company_name, "custom_ulr_counter", updated)
#*******************************************************************************************
    def _get_new_ulr_count(self):
        current_count = int(bool(self.enbl_ulr_no))
        if current_count == 0:
            return 0
        saved_count = 0
        if not self.is_new():
            saved_doc = frappe.db.get_value(
                "Combine Test Report",
                self.name,
                ["enbl_ulr_no"],
                as_dict=True,
            )
            if saved_doc:
                saved_count = int(bool(saved_doc.enbl_ulr_no)) 
        return max(0, current_count - saved_count)
#*******************************************************************************************
    @frappe.whitelist()
    def get_data(self):
        if not self.sample_inward:
            frappe.throw("Please select MRN NO")
        self.set_print_summary_from_sample_inward()
        self.set("items", [])
        self.set("non_enbl__ysuts_table", [])
        test_doctypes = [
            "Chemical Test",
            "Physical Test",
            "Corrosion Test",
            "Metallography Test",
            "Other Test"
        ]
        for dt in test_doctypes:
            filters = {
                "inward_number": self.sample_inward
            }
            if self.print_status == "Printed":
                filters["is_print"] = 1
            elif self.print_status == "Not Printed":
                filters["is_print"] = 0
            if self.sample_id__test_id:
                filters["document_id"] = self.sample_id__test_id
            records = frappe.get_all(
                dt,
                filters=filters,
                fields=[
                    "name",
                    "test_group",
                    "test_method",
                    "test_description",
                    "heat_number",
                    "material_specification",
                    "customer_name",
                    "document_id",
                    "challan_no",
                    "status",
                    "workflow_state",
                    "witness_name",
                    "is_print"
                ])
            for d in records:
                if not d.test_group:
                    continue
                move_to_non_enbl = False
                # -------- Chemical Test NON NABL --------
                if dt == "Chemical Test":
                    chemical_doc = frappe.get_doc("Chemical Test", d.name)
                    for row in chemical_doc.test_details_chemical:
                        if row.status == "NON NABL":
                            move_to_non_enbl = True
                            break
                # -------- Physical Test YS/UTS --------
                if dt == "Physical Test":
                    physical_doc = frappe.get_doc("Physical Test", d.name)
                    for row in physical_doc.test_details_physical:
                        if row.parameter == "YS/UTS":
                            move_to_non_enbl = True
                            break
                if move_to_non_enbl:
                    self.append("non_enbl__ysuts_table", {
                        "form_name": dt,
                        "test_group": d.test_group,
                        "test_method": d.test_method,
                        "test_group_id": d.name,
                        "status" : d.workflow_state,
                        "customer_name": d.customer_name,
                        "challan_no": d.challan_no,
                        "test_description": d.test_description,
                        "heat_number": d.heat_number,
                        "material_specification": d.material_specification,
                        "sample_id__test_id": d.document_id,
                        "witness": d.witness_name or "",
                        "is_print": d.is_print
                    })
                else:
                    self.append("items", {
                        "form_name": dt,
                        "test_group": d.test_group,
                        "test_method": d.test_method,
                        "test_group_id": d.name,
                        "status" : d.workflow_state,
                        "customer_name": d.customer_name,
                        "challan_no": d.challan_no,
                        "test_description": d.test_description,
                        "heat_number": d.heat_number,
                        "material_specification": d.material_specification,
                        "sample_id__test_id": d.document_id,
                        "witness": d.witness_name or "",
                        "is_print": d.is_print
                    })
        return
#*******************************************************************************************
    @frappe.whitelist()
    def check_non_enbl_status_chemical(self):
        for item in self.items:
            if item.form_name == "Chemical Test":
                chemical_test_doc = frappe.get_doc("Chemical Test", item.test_group_id)
                for row in chemical_test_doc.test_details_chemical:
                    if row.status == "NON NABL":
                        item.status = "NON NABL"
                        frappe.throw(f"In {item.form_name} {item.test_group_id} has NON NABL status")  
        return
#******************************************************************************************************
    @frappe.whitelist()
    def check_non_enbl_status_physical(self):
        for item in self.items:
            if item.form_name == "Physical Test":
                physical_test_doc = frappe.get_doc("Physical Test", item.test_group_id)
                for row in physical_test_doc.test_details_physical:
                    if row.parameter == "YS/UTS":
                        item.parameter = "YS/UTS"
                        frappe.throw(f"In {item.form_name} {item.test_group_id} has YS/UTS parameter") 
        return
#********************************************************************************************************
    @frappe.whitelist()
    def get_non_enbl__ysuts_rows(self, selected_rows):
        import json
        if isinstance(selected_rows, str):
            selected_rows = json.loads(selected_rows)
        for row in selected_rows:
            # Chemical Test
            if row.get("form_name") == "Chemical Test":
                chemical_doc = frappe.get_doc("Chemical Test", row.get("test_group_id"))
                found = False
                for d in chemical_doc.test_details_chemical:
                    if d.status == "NON NABL":
                        self.append("non_enbl__ysuts_table", row)
                        found = True
                        break
            # Physical Test
            if row.get("form_name") == "Physical Test":
                physical_doc = frappe.get_doc("Physical Test", row.get("test_group_id"))
                found = False
                for d in physical_doc.test_details_physical:
                    if d.parameter == "YS/UTS":
                        self.append("non_enbl__ysuts_table", row)
                        found = True
                        break
        return
#*****************************************************************************************
    @frappe.whitelist()
    def set_ulr_counter(self):
        company_name = "DELTAA METALLIX SOLUTIONS PRIVATE LIMITED"
        last = frappe.db.get_value("Company", company_name, "custom_ulr_counter") or 0
        count = int(last) + 1
        frappe.db.set_value("Company", company_name, "custom_ulr_counter", count)
        return count
#********************************************************************************************
    @frappe.whitelist()
    def get_next_ulr_counter(self):
        company_name = "DELTAA METALLIX SOLUTIONS PRIVATE LIMITED"
        last = frappe.db.get_value("Company", company_name, "custom_ulr_counter") or 0
        pending_count = self._get_new_ulr_count()
        count = int(last) + int(pending_count) + 1
        return count
