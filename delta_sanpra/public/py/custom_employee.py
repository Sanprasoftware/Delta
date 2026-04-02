import frappe

def before_save(doc, method):
    if doc.custom_holidays_list:
        doc.holiday_list = doc.custom_holidays_list
