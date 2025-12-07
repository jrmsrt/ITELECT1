// ============================================
// PH LOCATION HANDLERS (regions, provinces...)
// ============================================
var my_handlers = {
  fill_provinces: function () {
    var region_code = $(this).val();
    $("#region-text").val($(this).find("option:selected").text());
    $("#province-text, #city-text, #barangay-text").val("");

    let dropdown = $("#province");
    dropdown.empty().append('<option selected disabled>Choose State/Province</option>');

    $("#city").empty().append('<option selected disabled>Choose city/municipality</option>');
    $("#barangay").empty().append('<option selected disabled>Choose barangay</option>');

    $.getJSON("/static/ph-json/province.json", function (data) {
      var result = data
        .filter((v) => v.region_code == region_code)
        .sort((a, b) => a.province_name.localeCompare(b.province_name));

      $.each(result, (_, e) => {
        dropdown.append(
          $("<option></option>").val(e.province_code).text(e.province_name)
        );
      });
    });
  },

  fill_cities: function () {
    var province_code = $(this).val();
    $("#province-text").val($(this).find("option:selected").text());
    $("#city-text, #barangay-text").val("");

    let dropdown = $("#city");
    dropdown.empty().append('<option selected disabled>Choose city/municipality</option>');
    $("#barangay").empty().append('<option selected disabled>Choose barangay</option>');

    $.getJSON("/static/ph-json/city.json", function (data) {
      var result = data
        .filter((v) => v.province_code == province_code)
        .sort((a, b) => a.city_name.localeCompare(b.city_name));

      $.each(result, (_, e) => {
        dropdown.append(
          $("<option></option>").val(e.city_code).text(e.city_name)
        );
      });
    });
  },

  fill_barangays: function () {
    var city_code = $(this).val();
    $("#city-text").val($(this).find("option:selected").text());
    $("#barangay-text").val("");

    let dropdown = $("#barangay");
    dropdown.empty().append('<option selected disabled>Choose barangay</option>');

    $.getJSON("/static/ph-json/barangay.json", function (data) {
      var result = data
        .filter((v) => v.city_code == city_code)
        .sort((a, b) => a.brgy_name.localeCompare(b.brgy_name));

      $.each(result, (_, e) => {
        dropdown.append(
          $("<option></option>").val(e.brgy_code).text(e.brgy_name)
        );
      });
    });
  },

  onchange_barangay: function () {
    $("#barangay-text").val($(this).find("option:selected").text());
  },
};

$(function () {
  $("#region").on("change", my_handlers.fill_provinces);
  $("#province").on("change", my_handlers.fill_cities);
  $("#city").on("change", my_handlers.fill_barangays);
  $("#barangay").on("change", my_handlers.onchange_barangay);

  let dropdown = $("#region");
  dropdown.empty().append('<option value="" selected disabled>Choose Region</option>');

  $.getJSON("/static/ph-json/region.json", function (data) {
    $.each(data, (_, e) => {
      dropdown.append(
        $("<option></option>").val(e.region_code).text(e.region_name)
      );
    });
  });
});


// =========================
// PAYMENT OPTIONS ANIMATION
// =========================
document.addEventListener("DOMContentLoaded", () => {
  const options = document.querySelectorAll(".payment-option");

  options.forEach((option) => {
    option.addEventListener("click", () => {
      options.forEach((o) => o.classList.remove("active"));
      option.classList.add("active");

      option.style.animation = "pop 0.25s ease";
      setTimeout(() => (option.style.animation = ""), 250);
    });
  });

  const style = document.createElement("style");
  style.innerHTML = `
    @keyframes pop {
      0%   { transform: scale(1); }
      50%  { transform: scale(1.06); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
});


// =========================
// INPUT FIELDS VALIDATION
// =========================
document.addEventListener("DOMContentLoaded", () => {
  const fullName = document.getElementById("fullName");
  const email = document.getElementById("emailCheckout");
  const phone = document.getElementById("phone");
  const zip = document.getElementById("zip");
  const street = document.getElementById("street");
  const placeOrderBtn = document.querySelector(".place-order");

  const region = document.getElementById("region");
  const province = document.getElementById("province") || document.getElementById("new_province");
  const city = document.getElementById("city") || document.getElementById("new_city"); 
  const barangay = document.getElementById("barangay") || document.getElementById("new_barangay");

  // -------------------------
  // Helper: error rendering
  // -------------------------
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

  // -------------------------
  // Individual validators
  // -------------------------
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
    const pattern = /^09\d{9}$/;

    if (!value) {
      setFieldError(phone, "This field is required.");
      return false;
    }
    if (!pattern.test(value)) {
      setFieldError(phone, "Phone must start with 09 and contain 11 digits.");
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

  // -------------------------
  // Global validator
  // (call ALL validators, not short-circuit)
// -------------------------
  function validateAddressForm() {
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

  // -------------------------
  // Attach real-time validation
  // -------------------------
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
  // PLACE ORDER BUTTON
  // =========================
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
        return;
      }

      // Set payment method
      const paymentMap = {
        cod: "Cash on Delivery",
        online: "Online Payment",
      };

      const activeOption = document.querySelector(".payment-option.active");
      if (activeOption) {
        const payment = activeOption.id;
        const hidden = document.getElementById("payment_method");
        if (hidden) {
          hidden.value = paymentMap[payment] || payment;
        }
      }

      // No full_address field used; backend builds address.
    });
  }

  // =========================
  // ADD NEW ADDRESS SECTION
  // =========================

  // Show new address form
  $("#addAddressBtn").on("click", function () {
    $("#addressListContainer").hide();
    $("#addressFormContainer").removeClass("hidden");
  });

  // Reset new address form
  $("#resetAddressForm").on("click", function () {
    // Clear text/email inputs
    $("#addressFormContainer input[type='text'], #addressFormContainer input[type='email']").val("");
    $("#zip").val("");

    // Reset selects with placeholders
    $("#region").val("");
    $("#province").html('<option selected disabled>Choose State/Province</option>');
    $("#city").html('<option selected disabled>Choose city/municipality</option>');
    $("#barangay").html('<option selected disabled>Choose barangay</option>');

    // Clear hidden text versions
    $("#region-text, #province-text, #city-text, #barangay-text").val("");

    // Optional: clear previous errors visually
$("#resetAddressForm").on("click", function () {
    // Clear inputs
    $("#addressFormContainer input[type='text'], #addressFormContainer input[type='email']").val("");
    $("#zip").val("");

    // Reset selects properly
    $("#region").val("");
    $("#province").html('<option selected disabled>Choose State/Province</option>');
    $("#city").html('<option selected disabled>Choose city/municipality</option>');
    $("#barangay").html('<option selected disabled>Choose barangay</option>');

    // Clear hidden text fields
    $("#region-text, #province-text, #city-text, #barangay-text").val("");

    // Clear visible error labels WITHOUT triggering validation
    $(".field-error").text("").removeClass("visible");
    $(".has-error").removeClass("has-error");
});

  });

  // Cancel → go back to address list
  $("#cancelNewAddress").on("click", function () {
    $("#addressFormContainer").addClass("hidden");
    $("#addressListContainer").show();
  });

  // SAVE NEW ADDRESS
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
      return;
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
          Swal.fire({
            icon: "success",
            title: "Address saved!",
            showConfirmButton: false,
            timer: 1000,
          });
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
});
