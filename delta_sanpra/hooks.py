app_name = "delta_sanpra"
app_title = "Delta Sanpra"
app_publisher = "Sanpra Software Solution"
app_description = "Delta Sanpra"
app_email = "sanprasoftwares@gmail.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "delta_sanpra",
# 		"logo": "/assets/delta_sanpra/logo.png",
# 		"title": "Delta Sanpra",
# 		"route": "/delta_sanpra",
# 		"has_permission": "delta_sanpra.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/delta_sanpra/css/delta_sanpra.css"
# app_include_js = "/assets/delta_sanpra/js/delta_sanpra.js"

# include js, css files in header of web template
# web_include_css = "/assets/delta_sanpra/css/delta_sanpra.css"
# web_include_js = "/assets/delta_sanpra/js/delta_sanpra.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "delta_sanpra/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
doctype_js = {
    "Item" : "public/js/custom_item.js",
    "Customer" : "public/js/custom_customer.js",
    "Supplier" : "public/js/custom_supplier.js",
    "Interview": "public/js/skillset.js",
    "Sales Invoice": "public/js/create_sales_invoice.js"
}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "delta_sanpra/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "delta_sanpra.utils.jinja_methods",
# 	"filters": "delta_sanpra.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "delta_sanpra.install.before_install"
# after_install = "delta_sanpra.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "delta_sanpra.uninstall.before_uninstall"
# after_uninstall = "delta_sanpra.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "delta_sanpra.utils.before_app_install"
# after_app_install = "delta_sanpra.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "delta_sanpra.utils.before_app_uninstall"
# after_app_uninstall = "delta_sanpra.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "delta_sanpra.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
	"Item": {
        "validate": "delta_sanpra.public.py.custom_item.set_item_name"
		# "on_update": "method",
		# "on_cancel": "method",
		# "on_trash": "method"
	},
    "Employee": {
        "before_save": "delta_sanpra.public.py.custom_employee.before_save"
    },
    "Sales Invoice":{
        "on_submit": "delta_sanpra.public.py.create_sales_invoice.set_inward_flag",
        "on_cancel": "delta_sanpra.public.py.create_sales_invoice.re_set_inward_flag"
    }
    
}

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"delta_sanpra.tasks.all"
# 	],
# 	"daily": [
# 		"delta_sanpra.tasks.daily"
# 	],
# 	"hourly": [
# 		"delta_sanpra.tasks.hourly"
# 	],
# 	"weekly": [
# 		"delta_sanpra.tasks.weekly"
# 	],
# 	"monthly": [
# 		"delta_sanpra.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "delta_sanpra.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "delta_sanpra.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "delta_sanpra.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["delta_sanpra.utils.before_request"]
# after_request = ["delta_sanpra.utils.after_request"]

# Job Events
# ----------
# before_job = ["delta_sanpra.utils.before_job"]
# after_job = ["delta_sanpra.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"delta_sanpra.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

