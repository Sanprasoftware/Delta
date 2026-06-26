# Copyright (c) 2025, Sanpra Software Solution and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import cint, cstr
from frappe.model.naming import make_autoname

class SampleInward(Document):
    @frappe.whitelist()
    def validate_material_rows(self):
        qty = int(self.quantity or 0) 
        self.set("material_details", [])
        for i in range(qty):
            self.append("material_details", {})
        return qty
#**************************************************************************************************
    @frappe.whitelist()
    def update_material_rows(self):
        qty = int(self.quantity or 0)
        existing_rows = len(self.material_details)
        if qty > existing_rows:
            for i in range(existing_rows, qty):
                self.append("material_details", {})
        elif qty < existing_rows:
            for i in range(existing_rows - qty):
                self.material_details.pop()
        return qty
#**************************************************************************************************
    def before_save(self):
        qty = int(self.quantity or 0)
        row_count = len(self.material_details or [])

        if row_count != qty:
            frappe.throw(
                f"Material Details rows must be exactly equal to Quantity ({qty}). "
                f"Current rows: {row_count}"
            )
        self.update_print_summary()


        self.generate_ids_for_new_material()   
        self.sync_material_sample_ids()

        self.get_sample_id_and_test_id()
        self.set_sticker_print_from_test_on_sample()
        self.update_processing_charges()

        self.cutting_total = sum(row.total or 0 for row in self.cutting_charge_table)
        self.machining_total = sum(row.total or 0 for row in self.machining_charge_table)

        self.set_sample_counter_from_material_details()
        self.set_test_ids()
        self.set_increment_counter()


#**************************************************************************************************

    def set_increment_counter(self):
        company = "DELTAA METALLIX SOLUTIONS PRIVATE LIMITED"

        test_ids = [
            int(row.test_id) for row in self.test_on_sample if row.test_id
        ]

        if test_ids:
            last_test = max(test_ids)
            company_last = int(frappe.db.get_value("Company", company, "custom_test_counter") or 0)
            frappe.db.set_value("Company", company, "custom_test_counter", str(max(company_last, last_test)))


#**************************************************************************************************
    def sync_material_sample_ids(self):
        for row in self.material_details:
            if row.counter and not row.sample_id:
                row.sample_id = row.counter
            elif row.sample_id and not row.counter:
                row.counter = row.sample_id

    def set_sample_counter_from_material_details(self):
        company_name = "DELTAA METALLIX SOLUTIONS PRIVATE LIMITED"

        def sample_num(value):
            value = cstr(value or "").strip()
            if not value:
                return 0
            if value.startswith("S-"):
                value = value[2:]
            elif value.startswith("S"):
                value = value[1:]
            return cint(value)

        sample_ids = [
            cstr(row.sample_id or row.counter).strip()
            for row in self.material_details
            if (row.sample_id or row.counter)
        ]

        if not sample_ids:
            return

        max_sample_num = max(sample_num(sample_id) for sample_id in sample_ids)
        if not max_sample_num:
            return

        company_last = frappe.db.get_value("Company", company_name, "custom_sample_counter") or "S0"
        company_last_num = sample_num(company_last)
        frappe.db.set_value(
            "Company",
            company_name,
            "custom_sample_counter",
            f"S-{max(company_last_num, max_sample_num)}",
        )

    def set_test_ids(self):
        company_name = "DELTAA METALLIX SOLUTIONS PRIVATE LIMITED"

        test_ids = [int(row.test_id) for row in self.test_on_sample if row.test_id]

        if test_ids:
            max_test = max(test_ids)
            company_last = int(frappe.db.get_value("Company", company_name, "custom_test_counter") or 0)
            frappe.db.set_value("Company", company_name, "custom_test_counter", str(max(company_last, max_test)))

#**************************************************************************************************
    def get_sample_id_and_test_id(self):
        for row in self.test_on_sample:
            if row.sample_id and row.test_id:
                row.sample_idtest_id = f"{row.sample_id}/{row.test_id}"
                row.sample_id_heat_no = f"{row.sample_id}/{row.test_id} ({row.heat_number})"
            else:
                row.sample_idtest_id = row.test_id or row.sample_id or ""
                row.sample_id_heat_no = ""             

    def _get_item_test_description_by_method(self, item_code, test_method):
        if not item_code or not test_method:
            return ""

        test_description = frappe.db.get_value(
            "Material Sample Details",
            {"parent": item_code, "test_method": test_method},
            "test_description",
        )
        return cstr(test_description or "").strip()

    def _get_test_description_text(self, test_description):
        test_description = cstr(test_description or "").strip()
        if not test_description:
            return ""

        actual_description = frappe.db.get_value(
            "Test Description", test_description, "test_description"
        )
        return cstr(actual_description or test_description).strip()


    def _resolve_test_description_and_rate(
        self, item_code, test_method, default_test_description=""
    ):

        test_method = cstr(test_method or "").strip()
        if not test_method:
            return cstr(default_test_description or "").strip(), 0

        # 1️⃣ Customer specific Test
        if self.customer:
            customer_desc = frappe.get_all(
                "Test Description",
                filters={
                    "test_method": test_method,
                    "customer_name": self.customer
                },
                fields=["name", "rate"],
                limit=1
            )

            if customer_desc:
                return customer_desc[0].name, customer_desc[0].rate or 0

        # 2️⃣ Standard Test
        standard_desc = frappe.get_all(
            "Test Description",
            filters={
                "test_method": test_method,
                "is_standard": 1
            },
            fields=["name", "rate"],
            limit=1
        )

        if standard_desc:
            return standard_desc[0].name, standard_desc[0].rate or 0

        # 3️⃣ Item master fallback
        item_test_description = self._get_item_test_description_by_method(
            item_code, test_method
        )

        test_name = item_test_description or cstr(default_test_description or "").strip()
        
        if test_name:
            exists = frappe.db.exists("Test Description", test_name)
            if exists:
                test_rate = frappe.db.get_value("Test Description", test_name, "rate") or 0
                return test_name, test_rate
            
            # Agar name nahi hai, toh label se name dhundo
            name_by_label = frappe.db.get_value(
                "Test Description",
                {"test_description": test_name},  # label field
                "name"
            )
            if name_by_label:
                test_rate = frappe.db.get_value("Test Description", name_by_label, "rate") or 0
                return name_by_label, test_rate
        
        return test_name, 0
    
      
#******************************************************************************************

    @frappe.whitelist()
    def get_material_details(self):

        company = "DELTAA METALLIX SOLUTIONS PRIVATE LIMITED"

        counters = frappe.db.get_value(
            "Company",
            company,
            ["custom_sample_counter", "custom_test_counter"],
            as_dict=True
        )

        def sample_num(val):
            v = str(val or "S0")
            if v.startswith("S-"):
                v = v[2:]
            elif v.startswith("S"):
                v = v[1:]
            return cint(v)

        def normalize_sample_id(val):
            v = cstr(val or "").strip()
            if not v:
                return ""
            return f"S-{sample_num(v)}" if sample_num(v) else ""

        company_sample_counter = sample_num(counters.custom_sample_counter)
        company_test_counter = cint(counters.custom_test_counter)

        existing_sample_numbers = []
        existing_test_counter = 0

        for m in self.material_details:
            s_num = sample_num(m.counter or m.sample_id)
            if s_num:
                existing_sample_numbers.append(s_num)

        for r in self.test_on_sample:

            s_num = sample_num(r.sample_id)
 
            if s_num:
                existing_sample_numbers.append(s_num)

            existing_test_counter = max(existing_test_counter, cint(r.test_id))

        next_sample_counter = max(
            company_sample_counter,
            max(existing_sample_numbers) if existing_sample_numbers else 0
        )
        test_counter = max(company_test_counter, existing_test_counter)

        # -----------------------------------------------------
        # REMOVE DUPLICATE COUNTERS
        # -----------------------------------------------------

        seen = set()

        for m in self.material_details:
            normalized_counter = normalize_sample_id(m.counter or m.sample_id)

            if normalized_counter and normalized_counter in seen:
                m.counter = None
                m.sample_id = None
                m.new_record_flag = 0

            elif normalized_counter:
                m.counter = normalized_counter
                m.sample_id = normalized_counter
                seen.add(normalized_counter)

        # -----------------------------------------------------
        # GENERATE SAMPLE IDS
        # -----------------------------------------------------

        old_to_new_sample_id = {}
        sample_id_to_index_id = {}
        material_by_sample_id = {}

        for idx, m in enumerate(self.material_details):

            old_sample_id = normalize_sample_id(m.counter or m.sample_id)
            new_sample_id = old_sample_id

            if not new_sample_id:
                next_sample_counter += 1
                new_sample_id = f"S-{next_sample_counter}"

            if old_sample_id and old_sample_id != new_sample_id:
                old_to_new_sample_id[old_sample_id] = new_sample_id

            m.counter = new_sample_id
            m.sample_id = new_sample_id

            sample_id_to_index_id[new_sample_id] = cint(m.idx) or (idx + 1)
            material_by_sample_id[new_sample_id] = m

        # -----------------------------------------------------
        # REMOVE TEST ROWS OF DELETED MATERIALS
        # -----------------------------------------------------

        if self.test_on_sample:

            valid_sample_ids = [m.counter for m in self.material_details if m.counter]

            remapped = []

            for row in self.test_on_sample:

                if row.sample_id not in valid_sample_ids:
                    continue

                d = row.as_dict()

                d.sample_id = old_to_new_sample_id.get(row.sample_id, row.sample_id)
                material_row = material_by_sample_id.get(d.sample_id)

                d.sample_idtest_id = (
                    f"{d.sample_id}/{d.test_id}"
                    if d.test_id
                    else d.sample_id
                )

                d.index_id = sample_id_to_index_id.get(d.sample_id)
                if material_row:
                    d.material_specification = material_row.material_specification
                    d.heat_number = material_row.heat_number
                    d.material_shape = material_row.material_shape
                    d.sample_description = material_row.sample_description
                    d.sample_id = material_row.sample_id

                remapped.append(d)

            self.set("test_on_sample", [])

            for d in remapped:
                self.append("test_on_sample", d)

        # -----------------------------------------------------
        # APPEND NEW TESTS
        # -----------------------------------------------------

        for m in self.material_details:

            if cint(m.new_record_flag) == 1:
                continue

            if cint(m.auto_assign) != 1:
                continue

            sample_id = m.counter

            tests = frappe.get_all(
                "Material Sample Details",
                {"parent": m.material_specification},
                ["test_group", "test_method", "test_description"],
                order_by="idx asc"
            )

            for test in tests:
                test_name, test_rate = self._resolve_test_description_and_rate(
                    m.material_specification,
                    test.test_method,
                    test.test_description,
                )

                test_counter += 1

                test_id = test_counter

                row = self.append("test_on_sample", {})
                row.sample_id = sample_id
                row.test_id = test_id
                row.sample_idtest_id = f"{sample_id}/{test_id}"
                row.material_specification = m.material_specification
                row.heat_number = m.heat_number
                row.material_shape = m.material_shape
                row.test_group = test.test_group
                row.test_method = test.test_method
                row.sample_description = m.sample_description
                row.test_description = test_name
                row.price = test_rate
                row.sample_id = sample_id
                row.index_id = cint(m.idx)

            m.new_record_flag = 1

        return {
            "row_count": len(self.material_details),
            "counters": counters
        }











    def set_sticker_print_from_test_on_sample(self):
        self.set("sticker_print", [])
        for test_row in self.test_on_sample:
            self.append("sticker_print", {
                "material_specification": test_row.material_specification,
                "test_method": test_row.test_method,
                "test_description": test_row.test_description,
                "customer_requirement":test_row.customer_requirement,
                "sample_id" : test_row.sample_id,
                "heat_number": test_row.heat_number,
                "test_id": test_row.test_id
            })
#**********************************************************************************************
    def on_submit(self):
        self.create_physical_tests()
        self.create_chemical_tests()
        self.create_corrosion_tests()
        self.create_metallography_tests()
        self.create_other_tests()
        self.update_print_summary()
    def on_update_after_submit(self):
        self.create_physical_tests()
        self.create_chemical_tests()
        self.create_corrosion_tests()
        self.create_metallography_tests()
        self.create_other_tests()
        self.update_print_summary()
    
    def onload(self):
        self.update_print_summary()
        
    def update_print_summary(self):
        self.total_test = len(self.test_on_sample or [])
        self.set_printed_counter()
        self.calculate_ready_to_print_count()

    
    def set_printed_counter(self):
        group_to_doctype = {
            "Physical": "Physical Test",
            "Chemical": "Chemical Test",
            "Corrosion": "Corrosion Test",
            "Metallography": "Metallography Test",
        }
        
        printed_count = 0
        
        for row in self.test_on_sample:
            doctype_name = group_to_doctype.get(row.test_group)
            if not doctype_name:
                continue
            
            # Us DocType me record dhundo child_table_id se
            existing = frappe.db.exists(doctype_name, {"child_table_id": row.name})
            if existing:
                is_print = frappe.db.get_value(doctype_name, existing, "is_print")
                if cint(is_print) == 1:
                    printed_count += 1
        
        self.printed = printed_count
#********************************************************************************
    def calculate_ready_to_print_count(self):
        
        # Test Group → DocType mapping
        test_doctypes = {
            "Physical": "Physical Test",
            "Chemical": "Chemical Test",
            "Corrosion": "Corrosion Test",
            "Metallography": "Metallography Test",
        }
        
        ready_count = 0
        
        # Har test row ke liye check karo
        for row in self.test_on_sample:
            
            # Konsa DocType hai?
            dt = test_doctypes.get(row.test_group)
            if not dt:
                continue
            
            # Us DocType me record dhundo child_table_id se
            test_doc = frappe.db.get_value(
                dt,
                {"child_table_id": row.name},
                ["workflow_state"],  # Sirf workflow_state chahiye
                as_dict=True
            )
            
            # Agar record mila aur workflow_state Verified ya Approved hai
            if test_doc and test_doc.workflow_state in ["Verified", "Approved"]:
                ready_count += 1
        
        # Counter set karo
        self.ready_to_print = ready_count
#**************************************************Other Test**************************************
    def create_other_tests(self):
        for row in self.test_on_sample:
            if row.test_group == "Other":
                test_description_name, _ = self._resolve_test_description_and_rate(
                row.material_specification,
                row.test_method,
                row.test_description
            )
                existing = frappe.db.exists("Other Test",{"child_table_id": row.name})
                if existing:
                    other_doc = frappe.get_doc("Other Test", existing)
                    other_doc.heat_number = row.heat_number
                    other_doc.test_method = row.test_method
                    other_doc.test_description = test_description_name
                    other_doc.sample_description = row.sample_description
                    other_doc.save()
                else:
                    other_doc = frappe.new_doc("Other Test")   
                    other_doc.inward_number = self.name
                    other_doc.child_table_id = row.name
                    other_doc.test_group = row.test_group
                    other_doc.material_shape = row.material_shape
                    other_doc.heat_number = row.heat_number
                    other_doc.test_method = row.test_method
                    other_doc.test_description = test_description_name
                    other_doc.sample_description = row.sample_description
                    other_doc.material_specification = row.material_specification
                    other_doc.customer_requirement = row.customer_requirement
                    other_doc.challan_no = self.challan_no
                    other_doc.customer_name = self.customer
                    other_doc.document_id = row.sample_idtest_id
                    other_doc.material_description = row.material_specification
                    other_doc.challan_date = self.challan_date
                    # other_doc.discipline = row.discipline
                    other_doc.group = row.group
                    other_doc.mrn_no = self.name

                    # Witness
                    if self.client:
                        other_doc.witness = "Yes"
                        other_doc.witness_name = self.client
                    else:
                        other_doc.witness = "No"
                    if existing:
                        other_doc.save(ignore_permissions=True, ignore_version=True)
                    else:
                        other_doc.save()   
#*****************************************metallography_tests************************************
    def create_metallography_tests(self):
        for row in self.test_on_sample:
            if row.test_group == "Metallography":
                test_description_name, _ = self._resolve_test_description_and_rate(
                row.material_specification,
                row.test_method,
                row.test_description
            )
                existing = frappe.db.exists("Metallography Test",{"child_table_id": row.name})
                if existing:
                    meta_doc = frappe.get_doc("Metallography Test", existing)
                    meta_doc.heat_number = row.heat_number
                    meta_doc.test_method = row.test_method
                    meta_doc.test_description = test_description_name
                    meta_doc.sample_description = row.sample_description
                    meta_doc.save()
                else:
                    meta_doc = frappe.new_doc("Metallography Test")
                    meta_doc.inward_number = self.name
                    meta_doc.child_table_id = row.name
                    meta_doc.test_group = row.test_group
                    meta_doc.material_shape = row.material_shape
                    meta_doc.heat_number = row.heat_number
                    meta_doc.test_method = row.test_method
                    meta_doc.test_description = test_description_name
                    meta_doc.sample_description = row.sample_description
                    meta_doc.material_specification = row.material_specification
                    meta_doc.customer_requirement = row.customer_requirement
                    meta_doc.challan_no = self.challan_no
                    meta_doc.customer_name = self.customer
                    meta_doc.document_id = row.sample_idtest_id
                    meta_doc.material_description = row.material_specification
                    meta_doc.challan_date = self.challan_date
                    # meta_doc.discipline = row.discipline
                    meta_doc.group = row.group
                    meta_doc.mrn_no = self.name
                    meta_doc.sample_id = row.sample_id

                    # Witness
                    if self.client:
                        meta_doc.witness = "Yes"
                        meta_doc.witness_name = self.client
                    else:
                        meta_doc.witness = "No"
                    if existing:
                        meta_doc.save(ignore_permissions=True, ignore_version=True)
                    else:
                        meta_doc.save()
#*******************************************Corrosion Test **********************************************
    def create_corrosion_tests(self):
        for row in self.test_on_sample:
            if row.test_group == "Corrosion":
                test_description_name, _ = self._resolve_test_description_and_rate(
                row.material_specification,
                row.test_method,
                row.test_description
            )
                existing = frappe.db.exists("Corrosion Test",{"child_table_id": row.name})
                if existing:
                    corro_doc = frappe.get_doc("Corrosion Test", existing)
                    corro_doc.test_method = row.test_method
                    corro_doc.heat_number = row.heat_number
                    corro_doc.test_description = test_description_name
                    corro_doc.customer_requirement = row.customer_requirement
                    corro_doc.save()
                else:
                    corro_doc = frappe.new_doc("Corrosion Test")
                    corro_doc.inward_number = self.name
                    corro_doc.child_table_id = row.name
                    corro_doc.test_group = row.test_group
                    corro_doc.material_shape = row.material_shape
                    corro_doc.heat_number = row.heat_number
                    corro_doc.test_method = row.test_method
                    corro_doc.test_description = test_description_name
                    corro_doc.sample_description = row.sample_description
                    corro_doc.material_specification = row.material_specification
                    corro_doc.customer_requirement = row.customer_requirement
                    corro_doc.challan_no = self.challan_no
                    corro_doc.customer_name = self.customer
                    corro_doc.document_id = row.sample_idtest_id
                    corro_doc.material_description = row.material_specification
                    corro_doc.challan_date = self.challan_date
                    # corro_doc.discipline = row.discipline
                    corro_doc.group = row.group
                    corro_doc.mrn_no = self.name
                    corro_doc.sample_id = row.sample_id

                    # Witness
                    if self.client:
                        corro_doc.witness = "Yes"
                        corro_doc.witness_name = self.client
                    else:
                        corro_doc.witness = "No"
                    if existing:
                        corro_doc.save(ignore_permissions=True, ignore_version=True)
                    else:
                        corro_doc.save()
#******************************************Chemical Test*********************************************
    def create_chemical_tests(self):
        for row in self.test_on_sample:
            if row.test_group == "Chemical":
                test_description_name, _ = self._resolve_test_description_and_rate(
                row.material_specification,
                row.test_method,
                row.test_description
            )
                existing = frappe.db.exists("Chemical Test", {"child_table_id": row.name})
                if existing:
                    chem_doc = frappe.get_doc("Chemical Test", existing)
                    chem_doc.heat_number = row.heat_number
                    chem_doc.sample_description = row.sample_description
                    chem_doc.test_description = test_description_name
                    method_changed = chem_doc.test_method != row.test_method
                    chem_doc.test_method = row.test_method
                    if method_changed:
                        chem_doc.set("test_details_chemical", [])
                        item_doc = frappe.get_doc("Item", row.material_specification)
                        for item_chem in item_doc.custom_chemical_detail:
                            chem_doc.append("test_details_chemical", {
                                "test_method": row.test_method,
                                "parameter": item_chem.parameter,
                                "min_range": item_chem.min_range,
                                "max_range": item_chem.max_range,
                                "value": 0
                            })
                        if row.test_method:
                            method_doc = frappe.get_doc("Test Method", row.test_method)
                            method_map = {
                                d.parameter: d for d in method_doc.chemical_details
                            }
                            for d in chem_doc.test_details_chemical:
                                if d.parameter in method_map:
                                    d.method_min_range = method_map[d.parameter].min_range
                                    d.method_max_range = method_map[d.parameter].max_range
                    chem_doc.save(ignore_permissions=True, ignore_version=True)
                else:
                    chem_doc = frappe.new_doc("Chemical Test")
                    chem_doc.inward_number = self.name
                    chem_doc.child_table_id = row.name
                    chem_doc.test_group = row.test_group
                    chem_doc.material_shape = row.material_shape
                    chem_doc.heat_number = row.heat_number
                    chem_doc.test_method = row.test_method
                    chem_doc.test_description = test_description_name
                    chem_doc.sample_description = row.sample_description
                    chem_doc.material_specification = row.material_specification
                    chem_doc.customer_requirement = row.customer_requirement
                    chem_doc.challan_no = self.challan_no
                    chem_doc.customer_name = self.customer
                    chem_doc.document_id = row.sample_idtest_id
                    chem_doc.material_description = row.material_specification
                    chem_doc.challan_date = self.challan_date
                    # chem_doc.discipline = row.discipline
                    chem_doc.group = row.group
                    chem_doc.mrn_no = self.name
                    chem_doc.sample_id = row.sample_id
                    if self.client:
                        chem_doc.witness = "Yes"
                        chem_doc.witness_name = self.client
                    else:
                        chem_doc.witness = "No"
                    item_doc = frappe.get_doc("Item", row.material_specification)
                    for item_chem in item_doc.custom_chemical_detail:
                        chem_doc.append("test_details_chemical", {
                            "test_method": row.test_method,
                            "parameter": item_chem.parameter,
                            "min_range": item_chem.min_range,
                            "max_range": item_chem.max_range,
                            "value": 0
                        })
                    if row.test_method:
                        method_doc = frappe.get_doc("Test Method", row.test_method)
                        method_map = {
                            d.parameter: d for d in method_doc.chemical_details
                        }
                        for d in chem_doc.test_details_chemical:
                            if d.parameter in method_map:
                                d.method_min_range = method_map[d.parameter].min_range
                                d.method_max_range = method_map[d.parameter].max_range
                    chem_doc.save()
#**************************************************Physical Test ****************************
    def create_physical_tests(self):
        for row in self.test_on_sample:
            if row.test_group == "Physical":
                test_description_name, _ = self._resolve_test_description_and_rate(
                row.material_specification,
                row.test_method,
                row.test_description
            )
                existing = frappe.db.exists("Physical Test",{"child_table_id": row.name})
                if existing:
                    phys_doc = frappe.get_doc("Physical Test", existing)
                    phys_doc.sample_description = row.sample_description
                    phys_doc.heat_number = row.heat_number
                    phys_doc.test_method = row.test_method
                    phys_doc.test_description =  test_description_name
                    phys_doc.save()
                else:
                    phys_doc = frappe.new_doc("Physical Test")
                    phys_doc.inward_number = self.name
                    phys_doc.child_table_id = row.name
                    phys_doc.test_group = row.test_group
                    phys_doc.material_shape = row.material_shape
                    phys_doc.heat_number = row.heat_number
                    phys_doc.test_method = row.test_method
                    phys_doc.test_description = test_description_name
                    phys_doc.sample_description = row.sample_description
                    phys_doc.material_specification = row.material_specification
                    phys_doc.customer_requirement = row.customer_requirement
                    phys_doc.challan_no = self.challan_no
                    phys_doc.customer_name = self.customer
                    phys_doc.document_id = row.sample_idtest_id
                    phys_doc.material_description = row.material_specification
                    phys_doc.challan_date = self.challan_date
                    # phys_doc.discipline = row.discipline
                    phys_doc.group = row.group
                    phys_doc.mrn_no = self.name
                    phys_doc.sample_id = row.sample_id

                    # Witness
                    if self.client:
                        phys_doc.witness = "Yes"
                        phys_doc.witness_name = self.client
                    else:
                        phys_doc.witness = "No"
                    if existing:
                        phys_doc.save(ignore_permissions=True, ignore_version=True)
                    else:
                        phys_doc.save()
#**************************************************************************************************                
#*************************************************************************************************
    @frappe.whitelist()
    def update_processing_charges(self):
        self.cutting_charge_table = []
        self.machining_charge_table = []
        existing_cutting = { (r.material, r.thik_dia): r for r in self.cutting_charge_table }
        existing_machining = { (r.materials, r.thik_dia, r.processing_charges): r for r in self.machining_charge_table }


        def get_charge(material_type_doc, proc_name, dia):
            fix_charge = 0

            for r in material_type_doc.sample_preparation_charges:
                if r.processing_charges != proc_name:
                    continue
                if cint(r.is_fix) == 0 and r.from_range is not None and r.to_range is not None:
                    if r.from_range <= dia <= r.to_range:
                        return r.charges
                if cint(r.is_fix) == 1:
                    fix_charge = r.charges

            # Agar koi range match nahi mila to fix charge return karo
            return fix_charge


        for row in self.material_details:
            if not row.material_dimension:
                continue

            dia = float(row.material_dimension)
            item = frappe.get_doc("Item", row.material_specification)
            material_type = item.custom_material_types
            if not material_type:
                continue

            material_type_doc = frappe.get_doc("Material Type", material_type)

            # ✅ CUTTING CHARGE ONLY IF dia >= 50
            if dia >= 50:
                for dia_to_check in [dia, dia / 2]:
                    charge = get_charge(material_type_doc, "Cutting Charges", dia_to_check)
                    total = charge * 1
                    key = (row.material_specification, dia_to_check)
                    if key in existing_cutting:
                        continue
                    self.append("cutting_charge_table", {
                        "material": row.material_specification,
                        "material_type": material_type,
                        "thik_dia": dia_to_check,
                        "total_charges": charge,
                        "quantity": 1,
                        "total": total
                    })

          
            check_dia = dia / 2 if dia >= 50 else dia

            proc = ""
            charge = 0
            qty = 1

            for r in material_type_doc.sample_preparation_charges:
                if r.processing_charges == "Cutting Charges":
                    continue

                if cint(r.is_fix) == 1 or (
                    r.from_range is not None and r.to_range is not None and r.from_range <= check_dia <= r.to_range
                ):
                    proc = r.processing_charges
                    charge = r.charges
                    break

            total = charge * qty
            key = (row.material_specification, check_dia, r.processing_charges)
            if key in existing_machining:
                continue
            self.append("machining_charge_table", {
                "material_type": material_type,
                "materials": row.material_specification,
                "thik_dia": check_dia,
                "processing_charges": proc,
                "machining_charge": charge,
                "quantity": qty,
                "total": total
            })

#************************************************************************************************_
    @frappe.whitelist()
    def generate_ids_for_new_material(self):

        company = "DELTAA METALLIX SOLUTIONS PRIVATE LIMITED"

        counters = frappe.db.get_value(
            "Company",
            company,
            ["custom_sample_counter", "custom_test_counter"],
            as_dict=True
        )

        def sample_num(value):
            value = cstr(value or "").strip()
            if not value:
                return 0
            if value.startswith("S-"):
                value = value[2:]
            elif value.startswith("S"):
                value = value[1:]
            return cint(value)

        sample_counter = sample_num(counters.custom_sample_counter)
        test_counter = int(counters.custom_test_counter or 0)

        def normalize_sample_id(value):
            raw = cstr(value or "").strip()
            if not raw:
                return ""
            if raw.startswith("S-"):
                raw = raw[2:]
            elif raw.startswith("S"):
                raw = raw[1:]
            number = cint(raw)
            return f"S-{number}" if number else ""

        existing_sample_numbers = []
        for material in self.material_details:
            sample_value = normalize_sample_id(material.counter or material.sample_id)
            if sample_value:
                existing_sample_numbers.append(sample_num(sample_value))

        for row in self.test_on_sample:
            sample_value = normalize_sample_id(row.sample_id)
            if sample_value:
                existing_sample_numbers.append(sample_num(sample_value))
            test_counter = max(test_counter, cint(row.test_id))

        if existing_sample_numbers:
            sample_counter = max(sample_counter, max(existing_sample_numbers))

        for m in self.material_details:
            sample_id = normalize_sample_id(m.counter or m.sample_id)
            if not sample_id:
                sample_counter += 1
                sample_id = f"S-{sample_counter}"

            m.counter = sample_id
            m.sample_id = sample_id

            linked_rows = [
                row for row in self.test_on_sample
                if normalize_sample_id(row.sample_id) == sample_id
                or cint(row.index_id) == cint(m.idx)
            ]

            if linked_rows:
                for row in linked_rows:
                    row.sample_id = sample_id
                    row.sample_idtest_id = (
                        f"{sample_id}/{row.test_id}" if row.test_id else sample_id
                    )
                    row.material_specification = m.material_specification
                    row.heat_number = m.heat_number
                    row.material_shape = m.material_shape
                    row.sample_description = m.sample_description
                    row.index_id = cint(m.idx)
                m.new_record_flag = 1
                continue

            # Existing rows ko save par duplicate append nahi karna.
            if cint(m.auto_assign) != 1:
                continue

            tests = frappe.get_all(
                "Material Sample Details",
                {"parent": m.material_specification},
                ["test_group", "test_method", "test_description"],
                order_by="idx asc",
            )

            for test in tests:
                test_name, test_rate = self._resolve_test_description_and_rate(
                    m.material_specification,
                    test.test_method,
                    test.test_description,
                )
                test_counter += 1
                row = self.append("test_on_sample", {})
                row.sample_id = sample_id
                row.test_id = test_counter
                row.sample_idtest_id = f"{sample_id}/{test_counter}"
                row.material_specification = m.material_specification
                row.heat_number = m.heat_number
                row.material_shape = m.material_shape
                row.sample_description = m.sample_description
                row.test_group = test.test_group
                row.test_method = test.test_method
                row.test_description = test_name
                row.price = test_rate
                row.index_id = cint(m.idx)

            m.new_record_flag = 1
            
#***************************************************************************
    @frappe.whitelist()
    def create_sales_invoice(self):

        si = frappe.new_doc("Sales Invoice")
        si.customer = self.customer
        si.custom_customer1 = self.customer
        si.custom_mrn_no = self.name

        # custom link field
        si.sample_inward = self.name

        for row in self.test_on_sample:
            si.append("items", {
                # "item_code": row.item_code,
                "item_name": row.sample_idtest_id,
                "qty": 1,
                "rate": row.price or 0,
                "custom_test_method": row.test_method,
                "custom_test_description" : row.test_description,
                "custom_heat_no" : row.test_description,
                "custom_heat_no" : row.heat_number,
                "uom" : "Nos",
                "income_account" : "Sales - DM",
                "cost_center" : "Main - DM",
                "gst_hsn_code" : "51111110",
                "item_code": row.material_specification
            })

        return si
