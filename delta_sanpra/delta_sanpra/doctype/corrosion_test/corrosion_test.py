# Copyright (c) 2026, Sanpra Software Solution and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class CorrosionTest(Document):
    
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
#******************************************************************************************
	@frappe.whitelist()
	def astm_a923_method_c(self):
		if self.test_method == "ASTM A 923 : 25 Method C":

			# area
			area = None
			if self.material_shapes == "Rectangle":
				L = float(self.length_of_sample or 0)
				W = float(self.width_of_sample or 0)
				T = float(self.thickness_of_sample or 0)
				area = 2 * ((L * W) + (L * T) + (W * T))

			if self.material_shapes == "Round":
				D = float(self.diameter_of_sample or 0)
				T = float(self.thickness_of_sample or 0)
				R = D / 2
				area = (2 * 3.14 * R * T) + (2 * 3.14 *(R ** 2))

			# weight loss
			I = float(self.initial_weight_of_sample or 0)
			F = float(self.final_weight_of_sample or 0)
			weight = (I - F) * 1000 if (I and F) else None

			# corrosion
			W = float(self.weight_loss or 0)
			S = float(self.total_surface_area_of_sample_dm2 or 0)
			H = float(self.test_duration_hrs or 0)

			days = H / 24

			# corrosion = ((W * days) / S ) if (days and S and W) else None
			corrosion = round((W * days) / S, 2) if (days and S and W) else None

			return {
				"area": area,
				"weight": weight,
				"corrosion": corrosion
			}

		return {}
#****************************************************************************
	@frappe.whitelist()
	def astm_A262_practice_b(self):
		if self.test_method == "IGC: ASTM A262:15(2021) Practice B":

			# area
			area = None
			cor_rate = None
			cor_rate_mpy = None
			if self.material_shapes == "Rectangle":
				L = float(self.length_of_sample or 0)
				W = float(self.width_of_sample or 0)
				T = float(self.thickness_of_sample or 0)
				area = 2 * ((L * W) + (L * T) + (W * T))

				WL = float(self.weight_loss or 0)
				TS = float(self.total_surface_area_of_sample or 0)
				days = 120 / 24
				DN = float(self.pit_density or 0)

				
				if TS and days and DN:
					# cor_rate = (7305 * WL) / (TS * days * DN)
					cor_rate = round((7305 * WL) / (TS * days * DN), 3)
					cor_rate_mpy = round(cor_rate * 472, 3)

			# === YEH ADD KARO ===
			if self.material_shapes == "Round":
				D = float(self.diameter_of_sample or 0)
				T = float(self.thickness_of_sample or 0)
				R = D / 2
				area = (2 * 3.14 * R * T) + (2 * 3.14 * (R ** 2))

				WL = float(self.weight_loss or 0)
				TS = float(self.total_surface_area_of_sample or 0)
				days = 120 / 24
				DN = float(self.pit_density or 0)

				
				if TS and days and DN:
					# cor_rate = (7305 * WL) / (TS * days * DN)
					cor_rate = round((7305 * WL) / (TS * days * DN), 3)
					cor_rate_mpy = round(cor_rate * 472, 3)

			# weight loss
			I = float(self.initial_weight_of_sample or 0)
			F = float(self.final_weight_of_sample or 0)
			weight = (I - F) if (I and F) else None
			# frappe.msgprint(
			# 	f"cor_rate={cor_rate}, cor_rate_mpy={cor_rate_mpy}"
			# )
			return {
				"area": area,
				"weight": weight,
				"cor_rate" : cor_rate,
				"cor_rate_mpy":cor_rate_mpy,
			}

		return {}
#*********************************************************************
	@frappe.whitelist()
	def astm_A262_practice_c(self):
		if self.test_method == "IGC: ASTM A262:15(2021) Practice C":

			area = None
			# cor_rate = None
			# cor_rate_mpy = None
			if self.material_shapes == "Rectangle":
				L = float(self.length_of_sample or 0)
				W = float(self.width_of_sample or 0)
				T = float(self.thickness_of_sample or 0)
				area = 2 * ((L * W) + (L * T) + (W * T))
			# weight loss
			I = float(self.initial_weight_of_sample or 0)
			F = float(self.final_weight_of_sample or 0)
			weight = (I - F) if (I and F) else None
			return {
				"area": area,
				"weight": weight,
				# "cor_rate" : cor_rate,
				# "cor_rate_mpy":cor_rate_mpy,
			}

		return {}
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
#**********************************************************************
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
