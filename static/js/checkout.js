var my_handlers = {
  fill_provinces: function() {
    var region_code = $(this).val();
    $('#region-text').val($(this).find("option:selected").text());
    $('#province-text, #city-text, #barangay-text').val('');
    let dropdown = $('#province');
    dropdown.empty().append('<option selected disabled>Choose State/Province</option>');
    $('#city, #barangay').empty().append('<option selected disabled></option>');
    $.getJSON('/static/ph-json/province.json', function(data) {
      var result = data.filter(v => v.region_code == region_code)
                       .sort((a,b) => a.province_name.localeCompare(b.province_name));
      $.each(result, (_, e) => dropdown.append($('<option></option>').val(e.province_code).text(e.province_name)));
    });
  },
  fill_cities: function() {
    var province_code = $(this).val();
    $('#province-text').val($(this).find("option:selected").text());
    $('#city-text, #barangay-text').val('');
    let dropdown = $('#city');
    dropdown.empty().append('<option selected disabled>Choose city/municipality</option>');
    $('#barangay').empty().append('<option selected disabled></option>');
    $.getJSON('/static/ph-json/city.json', function(data) {
      var result = data.filter(v => v.province_code == province_code)
                       .sort((a,b) => a.city_name.localeCompare(b.city_name));
      $.each(result, (_, e) => dropdown.append($('<option></option>').val(e.city_code).text(e.city_name)));
    });
  },
  fill_barangays: function() {
    var city_code = $(this).val();
    $('#city-text').val($(this).find("option:selected").text());
    $('#barangay-text').val('');
    let dropdown = $('#barangay');
    dropdown.empty().append('<option selected disabled>Choose barangay</option>');
    $.getJSON('/static/ph-json/barangay.json', function(data) {
      var result = data.filter(v => v.city_code == city_code)
                       .sort((a,b) => a.brgy_name.localeCompare(b.brgy_name));
      $.each(result, (_, e) => dropdown.append($('<option></option>').val(e.brgy_code).text(e.brgy_name)));
    });
  },
  onchange_barangay: function() {
    $('#barangay-text').val($(this).find("option:selected").text());
  }
};

$(function() {
  $('#region').on('change', my_handlers.fill_provinces);
  $('#province').on('change', my_handlers.fill_cities);
  $('#city').on('change', my_handlers.fill_barangays);
  $('#barangay').on('change', my_handlers.onchange_barangay);
  let dropdown = $('#region');
  dropdown.empty().append('<option value="" selected disabled>Choose Region</option>');
  $.getJSON('/static/ph-json/region.json', function(data) {
    $.each(data, (_, e) => dropdown.append($('<option></option>').val(e.region_code).text(e.region_name)));
  });
});


/* =========================
    PAYMENT-OPTIONS ANIMATION
========================= */
document.addEventListener("DOMContentLoaded", () => {
    const options = document.querySelectorAll(".payment-option");

    options.forEach(option => {
        option.addEventListener("click", () => {

            // Remove active class from all
            options.forEach(o => o.classList.remove("active"));

            // Add active to clicked
            option.classList.add("active");

            // Pop animation
            option.style.animation = "pop 0.25s ease";
            setTimeout(() => option.style.animation = "", 250);
        });
    });
});

/* Add pop keyframes */
const style = document.createElement("style");
style.innerHTML = `
@keyframes pop {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.06); }
  100% { transform: scale(1); }
}`;
document.head.appendChild(style);


/* =========================
    INPUT FIELDS VALIDATION
========================= */
document.addEventListener("DOMContentLoaded", () => {

    // Inputs
    const fullName = document.getElementById("fullName");
    const email = document.getElementById("emailCheckout");
    const phone = document.getElementById("phone");
    const zip = document.getElementById("zip");
    const street = document.getElementById("street");
    const placeOrderBtn = document.querySelector(".place-order");

    const region = document.getElementById("region");
    const province = document.getElementById("province");
    const city = document.getElementById("city");
    const barangay = document.getElementById("barangay");

    // Helper: show + hide field errors
    function setFieldError(inputEl, message) {
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

    // =============== VALIDATION RULES ===============

    // Full name: Capitalized words only
    function validateFullName() {
        const value = fullName.value.trim();
        const pattern = /^([A-Z][a-z]+)(\s[A-Z][a-z]+)*$/;

        if (!value) {
            setFieldError(fullName, "This field is required.");
            return false;
        }
        if (!pattern.test(value)) {
            setFieldError(fullName, "Enter full name with the right format (e.g., Juan Dela Cruz).");
            return false;
        }

        setFieldError(fullName, "");
        return true;
    }

    // Email must be @gmail.com
    function validateEmail() {
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

    // Phone must start with 09 + 9 digits (total 11 digits)
    function validatePhone() {
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
      const value = region.value;
      if (!value) {
          setFieldError(region, "Please select your region.");
          return false;
      }
      setFieldError(region, "");
      return true;
  }

  function validateProvince() {
      const value = province.value;
      if (!value) {
          setFieldError(province, "Please select your province.");
          return false;
      }
      setFieldError(province, "");
      return true;
  }

  function validateCity() {
      const value = city.value;
      if (!value) {
          setFieldError(city, "Please select your city.");
          return false;
      }
      setFieldError(city, "");
      return true;
  }

  function validateBarangay() {
      const value = barangay.value;
      if (!value) {
          setFieldError(barangay, "Please select your barangay.");
          return false;
      }
      setFieldError(barangay, "");
      return true;
  }

    // ZIP must be 4 digits only
    function validateZip() {
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

    // Street → auto capitalize first letter of each word
    function formatStreet() {
        let value = street.value.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
        street.value = value;
    }

    function validateStreet() {
        const value = street.value.trim();
        if (!value) {
            setFieldError(street, "This field is required.");
            return false;
        }

        setFieldError(street, "");
        return true;
    }

    // =============== EVENT LISTENERS ===============

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

    // =============== FINAL VALIDATION ON SUBMIT ===============

    if (placeOrderBtn) {
        placeOrderBtn.addEventListener("click", (e) => {
          const validName = validateFullName();
          const validEmail = validateEmail();
          const validPhone = validatePhone();
          const validZip = validateZip();
          const validStreet = validateStreet();

          const validRegion = validateRegion();
          const validProvince = validateProvince();
          const validCity = validateCity();
          const validBarangay = validateBarangay();

          if (
              !validName || !validEmail || !validPhone ||
              !validZip || !validStreet ||
              !validRegion || !validProvince || !validCity || !validBarangay
          ) {
              e.preventDefault();
              Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Please complete all required fields correctly.",
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });
          }
      });
    }
});

document.querySelector(".place-order").addEventListener("click", (e) => {
    const paymentMap = {
        cod: "Cash on Delivery",
        online: "Online Payment"
    };

    const payment = document.querySelector(".payment-option.active").id;
    document.getElementById("payment_method").value = paymentMap[payment] || payment;

    const fullAddress = [
        document.getElementById("street").value,
        document.getElementById("barangay-text").value,
        document.getElementById("city-text").value,
        document.getElementById("province-text").value,
        document.getElementById("region-text").value,
        document.getElementById("zip").value
    ].join(", ");

    document.getElementById("full_address").value = fullAddress;
});
