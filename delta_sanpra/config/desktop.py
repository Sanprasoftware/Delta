from frappe import _

def get_data():
    return [
        {
            "module_name": "Delta Sanpra",
            "type": "module",
            "label": _("Management"),
            "icon": "octicon octicon-settings",
            "color": "grey",
            "link": "app/admin"
        }
    ]