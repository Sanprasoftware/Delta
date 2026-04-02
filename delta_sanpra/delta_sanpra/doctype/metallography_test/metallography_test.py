# Copyright (c) 2026, Sanpra Software Solution and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import cint
from frappe.model.document import Document


class MetallographyTest(Document):
	@frappe.whitelist()
	def update_metallography_rows(self):
		qty = cint(self.no_of_fields or 0)
		existing = len(self.metallography_test_pp or [])
		if qty > existing:
			for _ in range(qty - existing):
				self.append("metallography_test_pp", {})
		elif qty < existing:
			self.set(
				"metallography_test_pp",
				self.metallography_test_pp[:qty]
			)
		return qty
#***************************************************************************
	@frappe.whitelist()
	def set_ulr_counter(self):
		if self.ulr_no:
			return
     	# frappe.msgprint("Setting ULR Counter")
		company_name = "DELTAA METALLIX SOLUTIONS PRIVATE LIMITED"
		last = frappe.db.get_value("Company", company_name, "custom_ulr_counter") or 0
		count = int(last) + 1
		frappe.db.set_value("Company", company_name, "custom_ulr_counter", count)
		return count
