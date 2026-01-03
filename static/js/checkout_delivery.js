// ============================================================
//   PHILIPPINE ADDRESS HANDLERS (Supports BOTH address forms)
// ============================================================

function loadAndFilterJSON(path, filterKey, filterValue, sortKey, callback) {
    $.getJSON(path, function (data) {
    const result = data
        .filter(item => item[filterKey] == filterValue)
        .sort((a, b) => a[sortKey].localeCompare(b[sortKey]));
    callback(result);
    });
}

// ============================================================
// REGION → PROVINCE
// ============================================================
function handleRegionChange() {
    const region_code = $(this).val();
    $("#region-text").val($(this).find("option:selected").text());

    let province = $("#province");
    let city = $("#city");
    let barangay = $("#barangay");

    // If we're in "add new address" mode, target the new_* selects
    if (isAddingNewAddress) {
        province = $("#new_province");
        city = $("#new_city");
        barangay = $("#new_barangay");
    }

    province.find("option:not(:first)").remove();
    city.find("option:not(:first)").remove();
    barangay.find("option:not(:first)").remove();

    loadAndFilterJSON(
        "/static/ph-json/province.json",
        "region_code",
        region_code,
        "province_name",
        function (result) {
            $.each(result, (_, item) => {
                province.append(
                    $("<option></option>").val(item.province_code).text(item.province_name)
                );
            });
        }
    );
}

// ============================================================
// PROVINCE → CITY
// ============================================================
function handleProvinceChange() {
    const province_code = $(this).val();
    const selectedText = $(this).find("option:selected").text();

    if (this.id === "new_province") {
        $("#new_province-text").val(selectedText);
    } else {
        $("#province-text").val(selectedText);
    }

    let city = this.id === "new_province" ? $("#new_city") : $("#city");
    let barangay = this.id === "new_province" ? $("#new_barangay") : $("#barangay");

    city.find("option:not(:first)").remove();
    barangay.find("option:not(:first)").remove();

    loadAndFilterJSON(
        "/static/ph-json/city.json",
        "province_code",
        province_code,
        "city_name",
        function (result) {
            $.each(result, (_, item) => {
                city.append(
                    $("<option></option>").val(item.city_code).text(item.city_name)
                );
            });
        }
    );
}


// ============================================================
// CITY → BARANGAY
// ============================================================
function handleCityChange() {
    const city_code = $(this).val();
    const selectedText = $(this).find("option:selected").text();

    if (this.id === "new_city") {
        $("#new_city-text").val(selectedText);
    } else {
        $("#city-text").val(selectedText);
    }

    let barangay = this.id === "new_city" ? $("#new_barangay") : $("#barangay");

    barangay.find("option:not(:first)").remove();

    loadAndFilterJSON(
        "/static/ph-json/barangay.json",
        "city_code",
        city_code,
        "brgy_name",
        function (result) {
            $.each(result, (_, item) => {
                barangay.append(
                    $("<option></option>").val(item.brgy_code).text(item.brgy_name)
                );
            });
        }
    );
}

// ============================================================
// BARANGAY → store text
// ============================================================
function handleBarangayChange() {
    const selectedText = $(this).find("option:selected").text();

    if (this.id === "new_barangay") {
        $("#new_barangay-text").val(selectedText);
    } else {
        $("#barangay-text").val(selectedText);
    }
}


// ============================================================
// CUTE TOAST FUNCTION
// ============================================================
function showCuteToast(iconHtml, title) {
    Swal.fire({
        toast: true,
        position: "top-end",
        iconHtml: iconHtml,
        title: title,
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
        customClass: {
        icon: "no-default-icon"
        }
    });
}

const savedAddressAnim = `
    <span class="save-icon">🏠</span>
    <span class="sparkle sparkle-1">✨</span>
    <span class="sparkle sparkle-2">✨</span>
    <span class="sparkle sparkle-3">✨</span>
`;


// ============================================================
// GLOBAL FLAG — are we adding a NEW ADDRESS?
// ============================================================
let isAddingNewAddress = false;

// =========================
// SAVE UNSAVED NEW ADDRESS STATE
// =========================
function saveNewAddressState() {
    if (sessionStorage.getItem("addingNewAddress") !== "true") return;

    const state = {
        inputs: {},
        errors: {}
    };

    document
        .querySelectorAll("#addressFormContainer input.form-input")
        .forEach(input => {
            state.inputs[input.id] = input.value;
        });

    const selectorInput = document.getElementById("address_selector");
    if (selectorInput) {
        state.inputs.address_selector = selectorInput.value;
    }

    ["region", "province", "city", "barangay"].forEach(k => {
        const el = document.getElementById(`${k}-text`);
        if (el) state.inputs[el.id] = el.value;
    });

    document.querySelectorAll(".field-error.visible").forEach(err => {
        state.errors[err.id] = err.textContent;
    });

    sessionStorage.setItem("newAddressFormState", JSON.stringify(state));
}

// =========================
// FORMAT PH PHONE NUMBER
// =========================
function formatPHPhone(raw) {
    if (!raw) return "";

    let digits = raw.replace(/\D/g, "");

    if (digits.length >= 2 && !digits.startsWith("09")) {
        digits = "09";
    }

    digits = digits.slice(0, 11);

    if (digits.length <= 4) return digits;
    if (digits.length <= 7) {
        return digits.slice(0, 4) + " " + digits.slice(4);
    }

    return (
        digits.slice(0, 4) +
        " " +
        digits.slice(4, 7) +
        " " +
        digits.slice(7)
    );
}

// Helper: error rendering
function setFieldError(inputEl, message) {
    if (!inputEl) return;

    const errorEl = document.getElementById(inputEl.id + "Error");
    if (!errorEl) return;

    if (message) {
        errorEl.textContent = message;
        errorEl.classList.add("visible");
        inputEl.classList.add("has-error");
    } else {
        errorEl.textContent = "";
        errorEl.classList.remove("visible");
        inputEl.classList.remove("has-error");
    }
}

// ============================================================
// MAIN SETUP
// ============================================================
document.addEventListener("DOMContentLoaded", () => {

    // =========================
    // RESTORE "ADD NEW ADDRESS" STATE
    // =========================
    if (sessionStorage.getItem("addingNewAddress") === "true") {
        isAddingNewAddress = true;

        $("#addressListContainer").hide();
        $("#addressFormContainer").removeClass("hidden");
    }

    // =========================
    // RESTORE UNSAVED INPUTS + ERRORS
    // =========================
    const savedState = sessionStorage.getItem("newAddressFormState");

    if (
        sessionStorage.getItem("addingNewAddress") === "true" &&
        savedState
    ) {
        const { inputs, errors } = JSON.parse(savedState);

        // Restore input values
        Object.entries(inputs).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        });

        // Restore visible selector text
        if (inputs.address_selector) {
            document.getElementById("address_selector").value =
                inputs.address_selector;
        }

        // Restore errors + error styles
        Object.entries(errors).forEach(([id, message]) => {
            const errEl = document.getElementById(id);
            if (!errEl) return;

            errEl.textContent = message;
            errEl.classList.add("visible");

            const inputEl = document.getElementById(id.replace("Error", ""));
            if (inputEl) inputEl.classList.add("has-error");
        });
    }

    // --------------------------
    // REGION DROPDOWN INITIALIZE
    // --------------------------
    const regionDropdown = $("#region");
    regionDropdown.empty().append('<option value="" selected disabled>Choose Region</option>');

    $.getJSON("/static/ph-json/region.json", function (data) {
        $.each(data, (_, e) => {
            regionDropdown.append(
                $("<option></option>").val(e.region_code).text(e.region_name)
            );
        });
    });

    // Location listeners
    $("#region").on("change", handleRegionChange);
    $("#province").on("change", handleProvinceChange);
    $("#city").on("change", handleCityChange);
    $("#barangay").on("change", handleBarangayChange);

    $("#new_province").on("change", handleProvinceChange);
    $("#new_city").on("change", handleCityChange);
    $("#new_barangay").on("change", handleBarangayChange);

    // =========================
    // PAYMENT OPTIONS ANIMATION
    // =========================
    const paymentOptions = document.querySelectorAll(".payment-option");

    paymentOptions.forEach((option) => {
        option.addEventListener("click", () => {
            paymentOptions.forEach((o) => o.classList.remove("active"));
            option.classList.add("active");

            option.style.animation = "pop 0.25s ease";
        });
    });

    // =========================
    // INPUT FIELDS VALIDATION
    // =========================
    const fullName = document.getElementById("fullName");
    const phone = document.getElementById("phone");

    // =========================
    // PHONE AUTO-FORMATTING (PH)
    // =========================
    if (phone) {
        phone.addEventListener("input", () => {
            let digits = phone.value.replace(/\D/g, "");

            // Force start with 09
            if (digits.length >= 2 && !digits.startsWith("09")) {
                digits = "09";
            }

            // Limit to 11 digits
            digits = digits.slice(0, 11);

            // Format: 0917 123 4567
            let formatted = digits;

            if (digits.length > 4) {
                formatted = digits.slice(0, 4) + " " + digits.slice(4);
            }
            if (digits.length > 7) {
                formatted =
                    digits.slice(0, 4) +
                    " " +
                    digits.slice(4, 7) +
                    " " +
                    digits.slice(7);
            }

            phone.value = formatted;
        });
    }

    const zip = document.getElementById("zip");
    const street = document.getElementById("street");
    const placeOrderBtn = document.querySelector(".place-order");

    const region = document.getElementById("region");
    const province =
        document.getElementById("province") || document.getElementById("new_province");
    const city =
        document.getElementById("city") || document.getElementById("new_city");
    const barangay =
        document.getElementById("barangay") || document.getElementById("new_barangay");

    // Individual validators
    function validateFullName() {
        if (!fullName) return true;
        const value = fullName.value.trim();
        const pattern = /^([A-Z][a-z]+)(\s[A-Z][a-z]+)*$/;

        if (!value) {
            setFieldError(fullName, "This field is required.");
            return false;
        }
        if (!pattern.test(value)) {
            setFieldError(
                fullName,
                "Enter full name with the right format (e.g., Juan Dela Cruz)."
            );
            return false;
        }
        setFieldError(fullName, "");
        return true;
    }

    function validatePhone() {
        if (!phone) return true;

        const value = phone.value.trim();
        const pattern = /^09\d{2} \d{3} \d{4}$/;

        if (!value) {
            setFieldError(phone, "This field is required.");
            return false;
        }

        if (!pattern.test(value)) {
            setFieldError(phone, "Phone number must be in the format 09XX XXX XXXX.");
            return false;
        }

        setFieldError(phone, "");
        return true;
    }

    function validateAddressSelector() {
        const barangayText = document.getElementById("barangay-text");
        const selectorInput = document.getElementById("address_selector");

        if (!barangayText || !selectorInput) return true;

        if (!barangayText.value.trim()) {
            setFieldError(
                selectorInput,
                "This field is required. Complete all selections."
            );

            // FORCE SAVE ERROR STATE
            saveNewAddressState();

            return false;
        }

        setFieldError(selectorInput, "");

        // SAVE CLEARED STATE
        saveNewAddressState();

        return true;
    }

    function validateZip() {
        if (!zip) return true;
        const value = zip.value.trim();
        const pattern = /^\d{4}$/;

        if (!value) {
            setFieldError(zip, "This field is required.");
            return false;
        }
        if (!pattern.test(value)) {
            setFieldError(zip, "ZIP Code must contain exactly 4 digits.");
            return false;
        }
        setFieldError(zip, "");
        return true;
    }

    function formatStreet() {
        if (!street) return;
        let value = street.value
            .toLowerCase()
            .replace(/\b\w/g, (char) => char.toUpperCase());
        street.value = value;
    }

    function validateStreet() {
        if (!street) return true;
        const value = street.value.trim();
        if (!value) {
            setFieldError(street, "This field is required.");
            return false;
        }
        setFieldError(street, "");
        return true;
    }

    // Global validator – run ALL validators
    function validateFullAddressFields() {
        let isValid = true;

        if (!validateFullName()) isValid = false;
        if (!validatePhone()) isValid = false;
        if (!validateAddressSelector()) isValid = false;
        if (!validateZip()) isValid = false;
        if (!validateStreet()) isValid = false;

        return isValid;
    }

    function validateAddressForm() {

        const hasSavedAddresses = document.querySelectorAll("input[name='selected_address']").length > 0;

        // CASE 1: First order (no saved addresses) → ALWAYS validate
        if (!hasSavedAddresses) {
            return validateFullAddressFields();
        }

        // CASE 2: Selecting an existing address → SKIP validation
        if (!isAddingNewAddress) {
            return true;
        }

        // CASE 3: Adding a new address → Validate fully
        return validateFullAddressFields();
    }

    // Attach real-time validation
    if (fullName) fullName.addEventListener("input", validateFullName);
    if (phone) phone.addEventListener("input", validatePhone);
    if (zip) zip.addEventListener("input", validateZip);

    if (street) {
        street.addEventListener("input", () => {
            formatStreet();
            validateStreet();
        });
    }

    // =========================
    // AUTO-SAVE UNSAVED INPUTS
    // =========================
    document
        .querySelectorAll("#addressFormContainer input.form-input")
        .forEach(input => {
            input.addEventListener("input", saveNewAddressState);
            input.addEventListener("change", saveNewAddressState);
        });

    // =========================
    // ADD NEW ADDRESS SECTION
    // =========================

    // Show new address form
    $("#addAddressBtn").on("click", function () {
        isAddingNewAddress = true;

        // 🔥 persist state
        sessionStorage.setItem("addingNewAddress", "true");

        $("#addressListContainer").hide();
        $("#addressFormContainer").removeClass("hidden");
    });

    // Reset address form
    $("#resetAddressForm").on("click", function () {
        // Clear inputs
        $("#addressFormContainer input[type='text']").val("");
        $("#zip").val("");

        // Clear hidden text fields
        $("#region-text, #province-text, #city-text, #barangay-text").val("");
        $("#new_province-text, #new_city-text, #new_barangay-text").val("");

        // Reset region selection
        $("#region").val("");

        // Reset province/city/barangay but KEEP placeholder option
        if (isAddingNewAddress) {
            $("#new_province").find("option:not(:first)").remove().end().val("");
            $("#new_city").find("option:not(:first)").remove().end().val("");
            $("#new_barangay").find("option:not(:first)").remove().end().val("");
        } else {
            $("#province").find("option:not(:first)").remove().end().val("");
            $("#city").find("option:not(:first)").remove().end().val("");
            $("#barangay").find("option:not(:first)").remove().end().val("");
        }

        // Clear errors
        $(".field-error").text("").removeClass("visible");
        $(".has-error").removeClass("has-error");
    });

    // Cancel → back to address list
    $("#cancelNewAddress").on("click", function () {
        sessionStorage.removeItem("addingNewAddress");
        sessionStorage.removeItem("newAddressFormState");

        isAddingNewAddress = false;

        // 🔥 clear persisted state
        sessionStorage.removeItem("addingNewAddress");

        $("#addressFormContainer").addClass("hidden");
        $("#addressListContainer").show();
    });

    // SAVE NEW ADDRESS (when clicking the Save button)
    $("#saveNewAddress").on("click", function () {
        if (!validateAddressForm()) {
            Swal.fire({ 
                toast: true, 
                position: "top-end", 
                icon: "error", 
                title: "Please complete all required fields correctly.", 
                showConfirmButton: false, 
                timer: 1500, 
                timerProgressBar: true, 
            }); 
            return
        }

        const formEl = document.querySelector("#placeOrderForm");
        if (!formEl) return;

        const formData = new FormData(formEl);

        fetch("/add-address", {
            method: "POST",
            body: formData,
        })
        .then((res) => res.json())
        .then((data) => {
            if (data.success) {
                showCuteToast(savedAddressAnim, "Address Saved!");

                sessionStorage.removeItem("addingNewAddress");
                sessionStorage.removeItem("newAddressFormState");

                sessionStorage.removeItem("addingNewAddress");
                
                setTimeout(() => location.reload(), 900);
            } else {
                Swal.fire("Error", "Unable to save address.", "error");
            }
        })
        .catch(() => {
            Swal.fire(
                "Error",
                "Something went wrong while saving the address.",
                "error"
            );
        });
    });


    // =========================
    // PLACE ORDER BUTTON
    // =========================
    // Track selected existing address
    document.querySelectorAll("input[name='selected_address']").forEach(radio => {
        radio.addEventListener("change", () => {
            isAddingNewAddress = false; // user chose existing
            document.getElementById("selected_address_hidden").value = radio.value;
        });
    });


    let newlyCreatedAddressId = null;

    if (placeOrderBtn) {
        placeOrderBtn.addEventListener("click", (e) => {

            // 1️⃣ Validate address first
            const allValid = validateAddressForm();
            if (!allValid) {
                e.preventDefault();
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "error",
                    title: "Please complete all required fields correctly.",
                    showConfirmButton: false,
                    timer: 1500,
                    timerProgressBar: true,
                });
                return;
            }

            // 2️⃣ Detect selected payment method
            const activeOption = document.querySelector(".payment-option.active");
            const paymentMap = {
                cod: "Cash on Delivery",
                online: "Online Payment",
            };
            const paymentValue = activeOption ? paymentMap[activeOption.id] : "";

            // Always set hidden field
            document.getElementById("payment_method").value = paymentValue;

            // 3️⃣ ONLINE PAYMENT → STOP submit + open modal
            if (paymentValue === "Online Payment") {
                e.preventDefault();
                openOnlineModal();
                return;
            }

        // CASE 1 — NEW ADDRESS: SAVE FIRST THEN PLACE ORDER
        if (isAddingNewAddress) {
            e.preventDefault();

            const formEl = document.querySelector("#placeOrderForm");
            const formData = new FormData(formEl);

            fetch("/add-address", {
                method: "POST",
                body: formData,
            })
                .then((res) => res.json())
                .then((data) => {
                    if (data.success) {
                        showCuteToast(savedAddressAnim, "Address Saved!");

                        sessionStorage.removeItem("addingNewAddress");
                        sessionStorage.removeItem("newAddressFormState");

                        setTimeout(() => {
                            // Assign the new address ID to the hidden field
                            document.getElementById("selected_address_hidden")
                                .value = newlyCreatedAddressId;

                            // Restore payment method
                            $("#payment_method").val(paymentValue);

                            // Submit final order
                            formEl.submit();
                        }, 1000);
                    } else {
                        Swal.fire("Error", "Unable to save address.", "error");
                    }
                })
                .catch(() => {
                    Swal.fire(
                    "Error",
                    "Something went wrong while saving the address.",
                    "error"
                    );
                });

                return;
            }

            // CASE 2 — EXISTING ADDRESS SELECTED
            const chosenAddress = document.querySelector("input[name='selected_address']:checked");

            if (chosenAddress) {
                document.getElementById("selected_address_hidden").value = chosenAddress.value;
            }

            $("#payment_method").val(paymentValue);
        });
    }

});

// =========================
// INLINE  CASCADE
// =========================

const selector = document.getElementById("address_selector");
const dropdown = document.getElementById("addressDropdown");
const optionsEl = document.getElementById("addressOptions");
const tabs = document.querySelectorAll(".address-tabs .tab");
const clearBtn = document.getElementById("clearAddress");

let step = "region";
let selected = {};
let lastStepIndex = 0;


// Open / close
selector.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.remove("hidden");
    requestAnimationFrame(() => {
    dropdown.classList.add("open");
});
clearBtn.classList.remove("hidden");

    loadOptions("region");
});

dropdown.addEventListener("click", (e) => {
    e.stopPropagation();
});

// Close when clicking outside
document.addEventListener("click", () => {
    if (!dropdown.classList.contains("open")) return;

    dropdown.classList.remove("open");

    setTimeout(() => {
        dropdown.classList.add("hidden");
    }, 250);

    clearBtn.classList.add("hidden");
});

// Load options
function loadOptions(stepKey, parentCode = null) {
    const files = {
        region: "/static/ph-json/region.json",
        province: "/static/ph-json/province.json",
        city: "/static/ph-json/city.json",
        barangay: "/static/ph-json/barangay.json"
    };

    const order = ["region", "province", "city", "barangay"];
    const currentIndex = order.indexOf(stepKey);

    // Animate tabs
    animateTab(stepKey);

    $.getJSON(files[stepKey], data => {
        let filtered = data;

        if (parentCode) {
            const map = {
                province: "region_code",
                city: "province_code",
                barangay: "city_code"
            };
            filtered = data.filter(i => i[map[stepKey]] == parentCode);
        }

        // Build OFF-DOM
        const fragment = document.createDocumentFragment();

        filtered.forEach(item => {
            const li = document.createElement("li");
            li.textContent =
                item.region_name ||
                item.province_name ||
                item.city_name ||
                item.brgy_name;

            li.addEventListener("click", (e) => {
                e.stopPropagation();
                selectOption(stepKey, item);
            });

            fragment.appendChild(li);
        });

        // Clear + inject ONCE
        optionsEl.innerHTML = "";
        optionsEl.appendChild(fragment);

        // Apply animation AFTER content is ready
        optionsEl.classList.remove("slide-forward", "slide-backward");

        const order = ["region", "province", "city", "barangay"];
        const currentIndex = order.indexOf(stepKey);

        if (currentIndex > lastStepIndex) {
            optionsEl.classList.add("slide-forward");
        } else if (currentIndex < lastStepIndex) {
            optionsEl.classList.add("slide-backward");
        }

        lastStepIndex = currentIndex;
    });
}

// Select option
function selectOption(stepKey, item) {
    const nameMap = {
        region: "region_name",
        province: "province_name",
        city: "city_name",
        barangay: "brgy_name"
    };

    selected[stepKey] = item;
    document.getElementById(`${stepKey}-text`).value = item[nameMap[stepKey]];

    // 🔥 Build incremental address text (Shopee-style)
    const order = ["region", "province", "city", "barangay"];
    const parts = [];

    for (const key of order) {
        if (selected[key]) {
            parts.push(selected[key][nameMap[key]]);
        } else {
            break;
        }
    }

    selector.value = parts.join(", ");

    saveNewAddressState();

    // Clear dependent steps
    const index = order.indexOf(stepKey);
    for (let i = index + 1; i < order.length; i++) {
        selected[order[i]] = null;
        document.getElementById(`${order[i]}-text`).value = "";
        disableTab(order[i]);
    }

    order.forEach((k, i) => {
        const tab = document.querySelector(`.tab[data-step="${k}"]`);
        if (!tab) return;

        if (selected[k]) {
            tab.classList.remove("disabled");
        } else if (i > index) {
            tab.classList.add("disabled");
        }
    });

    const updatedParts = [];
    for (const key of order) {
        if (selected[key]) {
            updatedParts.push(selected[key][nameMap[key]]);
        } else {
            break;
        }
    }
    selector.value = updatedParts.join(", ");

    // Final step → close after animation
    if (stepKey === "barangay") {
        setFieldError(document.getElementById("address_selector"), "");

        dropdown.classList.remove("open");
        clearBtn.classList.add("hidden");

        setTimeout(() => {
            dropdown.classList.add("hidden");
        }, 250);

        finalize();
        return;
    }

    // Move to next step
    const next = order[index + 1];
    enableTab(next);
    loadOptions(next, item[`${stepKey}_code`]);
}

// Tabs control
function activateTab(stepKey) {
    tabs.forEach(t => {
        t.classList.toggle("active", t.dataset.step === stepKey);
    });
}

function enableTab(stepKey) {
    document.querySelector(`.tab[data-step="${stepKey}"]`)
        .classList.remove("disabled");
}

function disableTab(stepKey) {
    document.querySelector(`.tab[data-step="${stepKey}"]`)
        .classList.add("disabled");
}

// Final output
function finalize() {
    selector.value =
        `${selected.region.region_name}, ` +
        `${selected.province.province_name}, ` +
        `${selected.city.city_name}, ` +
        `${selected.barangay.brgy_name}`;

    // Close dropdown smoothly after final selection
    setTimeout(() => {
        dropdown.classList.remove("open");

        setTimeout(() => {
            dropdown.classList.add("hidden");
        }, 250);
    }, 180);
}

tabs.forEach(tab => {
    tab.addEventListener("click", () => {
        if (tab.classList.contains("disabled")) return;

        const stepKey = tab.dataset.step;

        animateTab(stepKey);

        if (stepKey === "region") loadOptions("region");
        if (stepKey === "province" && selected.region)
            loadOptions("province", selected.region.region_code);
        if (stepKey === "city" && selected.province)
            loadOptions("city", selected.province.province_code);
        if (stepKey === "barangay" && selected.city)
            loadOptions("barangay", selected.city.city_code);
    });
});

function animateTab(stepKey) {
    const order = ["region", "province", "city", "barangay"];
    const index = order.indexOf(stepKey);

    // Move underline
    document.querySelector(".address-tabs")
        .style.setProperty("--tab-x", `${index * 100}%`);

    // Activate tab
    tabs.forEach(tab => {
        tab.classList.toggle("active", tab.dataset.step === stepKey);
    });
}

clearBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    // Clear visible input
    selector.value = "";

    // Clear selections
    selected = {};
    lastStepIndex = 0;

    // Clear hidden fields
    ["region", "province", "city", "barangay"].forEach(k => {
        const el = document.getElementById(`${k}-text`);
        if (el) el.value = "";
    });

    // Reset tabs
    tabs.forEach(tab => {
        tab.classList.remove("active");
        if (tab.dataset.step !== "region") {
            tab.classList.add("disabled");
        }
    });

    document.querySelector('.tab[data-step="region"]').classList.add("active");

    // Reset underline
    document.querySelector(".address-tabs")
        .style.setProperty("--tab-x", "0%");

    // Reload region options
    loadOptions("region");

    // Keep dropdown open
    dropdown.classList.remove("hidden");

    saveNewAddressState();
});

document.querySelectorAll(".channel-btn").forEach(btn => {
    btn.addEventListener("click", async () => {

        // FORCE CAPTURE SELECTED ADDRESS
        const chosenAddress = document.querySelector(
            "input[name='selected_address']:checked"
        );

        if (chosenAddress) {
            document.getElementById("selected_address_hidden").value =
                chosenAddress.value;
        }

        const hiddenAddress = document.getElementById("selected_address_hidden").value;
        if (!hiddenAddress) {
            Swal.fire("Error", "Please select or save an address first.", "error");
            return;
        }

        const form = document.querySelector("#placeOrderForm");
        const data = new FormData(form);
        data.append("channel", btn.dataset.channel);

        const res = await fetch("/api/paymongo/start-checkout", {
            method: "POST",
            body: data
        });

        const json = await res.json();

        if (!json.ok) {
            Swal.fire("Error", json.error || "Unable to start payment.", "error");
            return;
        }

        window.location.href = json.checkout_url;
    });
});


// =========================
// ONLINE PAYMENT MODAL
// =========================
const onlineOverlay = document.getElementById("onlineModalOverlay");
const onlineClose = document.getElementById("onlineModalClose");
const channelLoading = document.getElementById("channelLoading");
const channelButtons = document.querySelectorAll(".channel-btn");

function openOnlineModal() {
    onlineOverlay.classList.add("show");
    onlineOverlay.classList.remove("closing");
}

function closeOnlineModal() {
    onlineOverlay.classList.add("closing");
    onlineOverlay.classList.remove("show");
    setTimeout(() => {
        onlineOverlay.classList.remove("closing");
    }, 260);
}

// close button
onlineClose.addEventListener("click", closeOnlineModal);

// click outside modal
onlineOverlay.addEventListener("click", (e) => {
    if (e.target === onlineOverlay) closeOnlineModal();
});
