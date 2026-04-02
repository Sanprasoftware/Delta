import frappe

@frappe.whitelist()
def get_expected_skillset(interview_round):
    data = frappe.get_all(
        "Expected Skill Set",
        filters={"parent": interview_round},
        fields=["skill", "custom_marks", "description"]
    )
    return data