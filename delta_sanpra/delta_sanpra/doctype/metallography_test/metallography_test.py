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
#************************************************************
	def on_update(self):
		self.update_sample_inward_printed()
		self.update_sample_inward_counters()

	def update_sample_inward_printed(self):
		# SAME code as above
		inward = self.inward_number
		if not inward:
			return
		
		test_doctypes = [
			"Physical Test",
			"Chemical Test", 
			"Corrosion Test",
			"Metallography Test",
			"Other Test"
		]
		
		printed_count = 0
		for dt in test_doctypes:
			tests = frappe.get_all(dt, filters={"inward_number": inward, "is_print": 1}, fields=["name"])
			printed_count += len(tests)
		
		frappe.db.set_value("Sample Inward", inward, "printed", printed_count)
		frappe.db.commit()
#***********************************************************************
	def update_sample_inward_counters(self):
		"""Dono counters update karo - NO RECURSION"""
		
		inward = self.inward_number
		if not inward:
			return
		
		# =========================================
		# 1. PRINTED COUNT
		# =========================================
		test_doctypes = [
			"Physical Test",
			"Chemical Test",
			"Corrosion Test",
			"Metallography Test",
			"Other Test"
		]
		
		printed_count = 0
		for dt in test_doctypes:
			count = frappe.db.count(dt, {
				"inward_number": inward,
				"is_print": 1
			})
			printed_count += count
		
		frappe.db.set_value("Sample Inward", inward, "printed", printed_count)
		
		# =========================================
		# 2. READY TO PRINT COUNT (NEW)
		# =========================================
		ready_count = 0
		for dt in test_doctypes:
			count = frappe.db.count(dt, {
				"inward_number": inward,
				"workflow_state": ["in", ["Approved"]]
			})
			ready_count += count
		
		frappe.db.set_value("Sample Inward", inward, "ready_to_print", ready_count)
		
		# Commit karo
		frappe.db.commit()
