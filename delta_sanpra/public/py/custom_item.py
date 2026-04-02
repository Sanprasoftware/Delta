import frappe

def set_item_name(doc, method=None):
    standard = doc.custom_standard or ""
    year = str(doc.custom_year) if doc.custom_year else ""
    grade = doc.custom_grade or ""

    if standard and year and grade:
        doc.item_name = f"{standard} : {year} {grade}"
    elif standard and year:
        doc.item_name = f"{standard} : {year}"
    elif standard and grade:
        doc.item_name = f"{standard} : {grade}"
    elif standard:
        doc.item_name = standard
    else:
        doc.item_name = ""
