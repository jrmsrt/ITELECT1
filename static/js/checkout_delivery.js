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

// ============================================================
// MAIN SETUP
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
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
    const email = document.getElementById("emailCheckout");
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

    function validateEmail() {
        if (!email) return true;
        const value = email.value.trim();
        const pattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

        if (!value) {
            setFieldError(email, "This field is required.");
            return false;
        }
        if (!pattern.test(value)) {
            setFieldError(email, "Email must be a valid @gmail.com address.");
            return false;
        }
        setFieldError(email, "");
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

    function validateRegion() {
        if (!region) return true;
        const value = region.value;
        if (!value) {
            setFieldError(region, "Please select your region.");
            return false;
        }
        setFieldError(region, "");
        return true;
    }

    function validateProvince() {
        if (!province) return true;
        const value = province.value;
        if (!value) {
            setFieldError(province, "Please select your province.");
            return false;
        }
        setFieldError(province, "");
        return true;
    }

    function validateCity() {
        if (!city) return true;
        const value = city.value;
        if (!value) {
            setFieldError(city, "Please select your city.");
            return false;
        }
        setFieldError(city, "");
        return true;
    }

    function validateBarangay() {
        if (!barangay) return true;
        const value = barangay.value;
        if (!value) {
            setFieldError(barangay, "Please select your barangay.");
            return false;
        }
        setFieldError(barangay, "");
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
        if (!validateEmail()) isValid = false;
        if (!validatePhone()) isValid = false;
        if (!validateZip()) isValid = false;
        if (!validateStreet()) isValid = false;
        if (!validateRegion()) isValid = false;
        if (!validateProvince()) isValid = false;
        if (!validateCity()) isValid = false;
        if (!validateBarangay()) isValid = false;

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
    if (email) email.addEventListener("input", validateEmail);
    if (phone) phone.addEventListener("input", validatePhone);
    if (zip) zip.addEventListener("input", validateZip);
    if (region) region.addEventListener("change", validateRegion);
    if (province) province.addEventListener("change", validateProvince);
    if (city) city.addEventListener("change", validateCity);
    if (barangay) barangay.addEventListener("change", validateBarangay);

    if (street) {
        street.addEventListener("input", () => {
            formatStreet();
            validateStreet();
        });
    }

    // =========================
    // ADD NEW ADDRESS SECTION
    // =========================

    // Show new address form
    $("#addAddressBtn").on("click", function () {
        isAddingNewAddress = true;
        $("#addressListContainer").hide();
        $("#addressFormContainer").removeClass("hidden");
    });

    // Reset address form
    $("#resetAddressForm").on("click", function () {
        // Clear inputs
        $("#addressFormContainer input[type='text'], #addressFormContainer input[type='email']").val("");
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
        isAddingNewAddress = false;
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
            return
        }

        // PRE-CAPTURE payment method (avoid race condition)
        const activeOption = document.querySelector(".payment-option.active");
        let paymentValue = "";
        if (activeOption) {
            const paymentMap = {
                cod: "Cash on Delivery",
                online: "Online Payment",
            };
            paymentValue = paymentMap[activeOption.id];
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