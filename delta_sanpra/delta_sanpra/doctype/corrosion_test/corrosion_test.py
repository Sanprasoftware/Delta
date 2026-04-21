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
				area = (2 * 3.14 * R * T) + (2 * 3.14 * R * R)

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