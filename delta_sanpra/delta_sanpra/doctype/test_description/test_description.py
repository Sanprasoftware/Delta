# Copyright (c) 2025, Sanpra Software Solution and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import get_link_to_form
class TestDescription(Document):
    def before_save(self):
        # Only one must be selected
        if self.customer_specified == self.is_standard:
            frappe.throw("Select either 'Default' or 'Standard'.")

        # If Default → Customer Mandatory
        if self.customer_specified and not self.customer_name:
            frappe.throw("Customer Name is mandatory when 'Customer Specified' is enabled.")

        # ================= DEFAULT CHECK =================
        if self.customer_specified:
            existing = frappe.db.get_value(
                "Test Description",
                {
                    "test_description": self.test_description,
                    "test_method": self.test_method,
                    "test_group": self.test_group,
                    "customer_name": self.customer_name,
                    "customer_specified": 1,
                    "name": ["!=", self.name],
                },
            )

            if existing:
                frappe.throw(
                    f"'Is Default' is already enabled in {get_link_to_form('Test Description', existing)}."
                )

        # ================= STANDARD CHECK =================
        if self.is_standard:
            existing = frappe.db.get_value(
                "Test Description",
                {
                    "test_description": self.test_description,
                    "test_method": self.test_method,
                    "test_group": self.test_group,
                    "is_standard": 1,
                    "name": ["!=", self.name],
                },
            )

            if existing:
                frappe.throw(
                    f"'Is Standard' is already enabled in {get_link_to_form('Test Description', existing)}."
                )
