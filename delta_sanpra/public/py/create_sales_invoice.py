import frappe
import json
@frappe.whitelist()
def get_sample_inward(customer):
    data = frappe.get_all("Sample Inward",
        filters={
            "customer": customer,
            # "workflow_state": "Approved",
            "workflow_state": ["in", ["Verified", "Approved"]],
            # "si_flag": ["in", [0, None]]
            "si_flag": ["!=", 1]
        },
        fields=["name"]
    )
    # frappe.throw(str(data))
    result = []
    for d in data:
        result.append({
            "sample_inward": d.name
        })
    return result


@frappe.whitelist()
def get_test_data(sample_list):
    import json
    sample_list = json.loads(sample_list)
    data = []

    for s in sample_list:
        sample_doc = frappe.get_doc("Sample Inward", s.get("sample_inward"))

        for row in sample_doc.test_on_sample:
            data.append({
                "sample_idtest_id": row.sample_idtest_id,
                "test_method": row.test_method,
                "test_description": row.test_description,
                "price": row.price,
                "heat_number": row.heat_number
            })

    return data


def set_inward_flag(doc, method):
    for row in doc.custom_mrn_no:
        frappe.db.set_value("Sample Inward", row.sample_inward, "si_flag", 1)



def re_set_inward_flag(doc, method):
    for row in doc.custom_mrn_no:
        frappe.db.set_value("Sample Inward", row.sample_inward, "si_flag", 0)

