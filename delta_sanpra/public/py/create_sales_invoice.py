import json
import frappe
from frappe import _
from frappe.utils import cint
from frappe.utils import get_link_to_form

@frappe.whitelist()
def get_sample_inward(customer):
    data = frappe.get_all("Sample Inward",
        filters={
            "customer": customer,
            "workflow_state": ["in", ["Verified", "Approved"]],
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


# @frappe.whitelist()
# def get_test_data(sample_list):
#     import json
#     sample_list = json.loads(sample_list)
#     data = []

#     for s in sample_list:
#         sample_doc = frappe.get_doc("Sample Inward", s.get("sample_inward"))

#         for row in sample_doc.test_on_sample:
#             data.append({
#                 "sample_idtest_id": row.sample_idtest_id,
#                 "test_method": row.test_method,
#                 "test_description": row.test_description,
#                 "price": row.price,
#                 "heat_number": row.heat_number
#             })

#     return data


def set_inward_flag(doc, method):
    if doc.custom_mrn_no:
        frappe.db.set_value(
            "Sample Inward",
            doc.custom_mrn_no,
            "si_flag",
            1
        )


def re_set_inward_flag(doc, method):
    if doc.custom_mrn_no:
        frappe.db.set_value(
            "Sample Inward",
            doc.custom_mrn_no,
            "si_flag",
            0
        )


@frappe.whitelist()
def send_sales_invoice_mail(invoice_name):

    invoice = frappe.get_doc("Sales Invoice", invoice_name)

    email_id = invoice.contact_email

    if not email_id:
        frappe.throw(_("Customer email not found."))

    mrn_no = invoice.custom_mrn_no or ""

    reports = frappe.get_all(
        "Combine Test Report",
        filters={"sample_inward": mrn_no},
        fields=["name", "printedready_to_printtotal_test"]
    )

    # frappe.throw(str(reports))

    if not reports:
        frappe.throw("Not Printed All Test Report")

    # Validate all reports are fully printed (e.g. 4/4/4)
    for report in reports:
        status = (report.printedready_to_printtotal_test or "").strip()

        parts = [p.strip() for p in status.split("/")]

        if len(parts) != 3:
            frappe.throw(
                f"Invalid Print Status: {status}"
            )

        if not (parts[0] == parts[1] == parts[2]):
            frappe.throw(
                f"""
                Still Reports are Pending.

                Report: {get_link_to_form('Combine Test Report', report.name)}<br>
                Status: {status}
                """
            )
        # status = report.printedready_to_printtotal_test or ""

        # parts = status.split("/")

        # if len(parts) != 3 or not (parts[0] == parts[1] == parts[2]):
        #     frappe.throw(
        #         f"""
        #         Not Printed All Test Report

        #         Report: {get_link_to_form('Combine Test Report', report.name)}<br>
        #         Status : {status}
        #         """
        # )

    attachments = []

    try:
        pdf = frappe.get_print(
            "Sales Invoice",
            invoice.name,
            print_format="Sales Invoice",
            as_pdf=True
        )

        attachments.append({
            "fname": f"{invoice.name}.pdf",
            "fcontent": pdf
        })

    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "Sales Invoice PDF Error"
        )
        frappe.throw(_("Sales Invoice PDF generation failed."))

    try:
        ctr_name = frappe.db.sql("""
            SELECT name
            FROM `tabCombine Test Report`
            LIMIT 1
        """, as_dict=True)

        if ctr_name:

            ctr_name = ctr_name[0]["name"]

            ctr_pdf = frappe.get_print(
                "Combine Test Report",
                ctr_name,
                print_format="Combine Test Report",
                as_pdf=True
            )

            attachments.append({
                "fname": f"{ctr_name}.pdf",
                "fcontent": ctr_pdf
            })

    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "Combine Test Report PDF Error"
        )
        frappe.throw(_("Combine Test Report PDF generation failed."))

    customer_name = invoice.customer

    inward = None

    if mrn_no:
        try:
            inward = frappe.get_doc("Sample Inward", mrn_no)
        except Exception:
            pass

    item_rows = ""
    for row in invoice.items:
        item_rows += f"""
        <tr>
            <td>{row.idx or ''}</td>
            <td>{row.item_name or ''}</td>
            <td>{row.item_code or ''}</td>
            <td></td>
            <td>{row.custom_heat_no or ''}</td>
        </tr>
        """
    mrn_parts = (mrn_no or "").split("/")
    mrn_display = mrn_no

    if len(mrn_parts) >= 4:
        mrn_display = f"""
        <b>{mrn_parts[0]}/{mrn_parts[1]}/</b>
        <span style="background-color:#75fd71;padding:2px;">
            {mrn_parts[2]}/{mrn_parts[3]}
        </span>
        """
    message = f"""
        <p>DELTAA METALLIX SOLUTIONS PRIVATE LIMITED.</p>

        <p><b>SAMPLE DISPATCH REPORT ACKNOWLEDGEMENT</b></p>

        <p><br>Customer Details :</p>

        <p><b>Customer Name: {customer_name}</b></p>

        <p>Dear Sir/Madam,</p>

        <p>
        Greetings from DELTAA METALLIX SOLUTIONS PRIVATE LIMITED.
        </p>

        <p>
        Thank you for giving us the opportunity to serve you as your trusted testing partner.
        We are pleased to inform you that the testing activities for the following sample(s)
        have been completed and the test report(s) are being dispatched as per your request.
        </p>

        <p><b>Dispatch Information</b></p>

        <table border="1" cellpadding="6" cellspacing="0" width="100%" style="border-collapse: collapse;">
            <tr>
                <td width="25%"><b>Particulars</b></td>
                <td><b>Details</b></td>
            </tr>

            <tr>
                <td>Dispatch No.</td>
                <td>--</td>
            </tr>

            <tr>
                <td>Dispatch Date</td>
                <td>--</td>
            </tr>

            <tr>
                <td>MRN No.</td>
                <td>{mrn_no or ""}</td>
            </tr>

            <tr>
                <td>Challan No.</td>
                <td>{inward.challan_no if inward else ""}</td>
            </tr>

            <tr>
                <td>Challan Date</td>
                <td>{inward.challan_date if inward else ""}</td>
            </tr>

            <tr>
                <td>Total Samples</td>
                <td>{inward.quantity if inward else ""}</td>
            </tr>

            <tr>
                <td>Dispatch Mode</td>
                <td>Courier / Email / Hand Delivery</td>
            </tr>

            <tr>
                <td>Courier Details</td>
                <td>--</td>
            </tr>
        </table>

        <br><br>

        <p>
        Please find attached reports for your reference.
        </p>

        <p>
        Regards,<br>
        DELTAA METALLIX SOLUTIONS PRIVATE LIMITED
        </p>
        <p>Kindly refer to the above MRN No. for all future communications.</p>
        <p><br><br>Sample Details</p>
        <p>
            <b>MRN No. : </b>
            {mrn_display}
        </p>
        <table border=1 width="100%" style="font-size:11px;">
            <tr>
                <td><b>Sr.No</b></td>
                <td><b>SAMPLE ID</b></td>
                <td><b>MATERIAL GRADE</b></td>
                <td><b>DESCRIPTION PROVIDED BY CUSTOMER</b></td>
                <td><b>ID/HEAT No.</b></td>
            </tr>
             {item_rows}
        </table><br>
        <p>REPORT DISPATCH DETAILS</p>
        <table>
            <tr>
                <td width="25%">Report No.</td>
                <td width="25%">Test Type</td>
                <td width="25%">Status</td>
                <td></td>
            </tr>
            <tr>
                <td>--</td>
                <td>--</td>
                <td>--</td>
                <td></td>
            </tr>
        </table>
        <p>IMPORTANT INFORMATION</p>
        <p>Test reports are issued based on the sample(s) submitted by the customer.</p>

        <p>Results relate only to the tested sample(s) and shall not be reproduced except in full
        without written approval from DELTAA METALLIX SOLUTIONS PRIVATE LIMITED.</p>

        <p>In case any parameter falls outside the NABL accredited scope, a separate report may
        be issued as applicable.</p>

        <p>Any discrepancy regarding the report or dispatch should be communicated within 7
        days from receipt of the report.</p>

        <p>Sample retention period is 15 days from the date of report issue unless otherwise
        agreed in writing.</p><br>

        <p>TERMS CONDITIONS</p>

        <p>DELTAA METALLIX SOLUTIONS PRIVATE LIMITED exercises all reasonable care
        and professional judgment in conducting testing activities.</p>

        <p>Laboratory liability is limited to the value of testing charges applicable to the respective
        sample(s).</p>

        <p>Complaints, feedback, or clarifications shall be communicated through official email
        only.</p>

        <p>Returned sample requests must be clearly specified by the customer during sample
        submission.</p><br>

        <p>CONTACT DETAILS</p>
        <p>DELTAA METALLIX SOLUTIONS PRIVATE LIMITED</p>
        <p>CIN: U71200PN2023PTC224814</p>
        <p>GST No.: </p>
        <p>NEW S.NO.72/1/A, Old S.No.335/1, Plot No.8,Pragati Colony, Khokale Mala,
        Attached to Diamond Hotel,100 Feet Road, Sangli – 416416, Maharashtra, India.</p><br>

        <p>Contact Information</p>

        <table>
            <tr>
                <td width="25%">Department</td>
                <td>Contact No.</td>
            </tr>
            <tr>
                <td>Sample Receipt Desk</td>
                <td>+91 9270301003</td>
            </tr>
            <tr>
                <td>Technical Team</td>
                <td>+91 9270301004</td>
            </tr>
            <tr>
                <td>Accounts Department</td>
                <td>+91 9270301005</td>
            </tr>
        </table>
        <p>Email: deltalabsangli@gmail.com</p>
        <p>Website: www.deltaa.in</p>
        <p>This is a system-generated communication and does not require a signature.</p>
        """

    frappe.sendmail(
        recipients=[email_id],
        subject="XYZ",
        message=message,
        attachments=attachments
    )

    return "Mail Sent Successfully"


#*******************************************************************************************************
