# Copyright (c) 2026, Sanpra Software Solution and contributors
# For license information, please see license.txt

import frappe
from frappe import _

def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data

def get_columns():
    return [
        {
            "label": _("Sample Inward"),
            "fieldname": "name",
            "fieldtype": "Link",
            "options": "Sample Inward",
            "width": 180
        },
        {
            "label": _("Customer"),
            "fieldname": "customer",
            "fieldtype": "Link",
            "options": "Customer",
            "width": 200
        },
        {
            "label": _("Sample Received Date"),
            "fieldname": "sample_received_date",
            "fieldtype": "Date",
            "width": 150
        },
        # {
        #     "label": _("SI Flag"),
        #     "fieldname": "si_flag",
        #     "fieldtype": "Check",
        #     "width": 100
        # }
    ]

def get_data(filters):
	data = []
	all_data = frappe.get_all("Sample Inward", {"si_flag": 0, "workflow_state" : "Approved"}, ["name","customer","sample_received_date"])
	# frappe.throw(str(data))
	for row in all_data:
		data.append({
				"name": row.name,
				"customer": row.customer,
                "sample_received_date" :row.sample_received_date ,
                # "si_flag": int(row.si_flag or 0)
		})
	return data