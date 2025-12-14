document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("editProfileForm");

  const usernameEl = document.getElementById("username");
  const nameEl = document.getElementById("name");
  const emailEl = document.getElementById("email");
  const phoneEl = document.getElementById("phone");

  const dobMonthEl = document.querySelector('select[name="dob_month"]');
  const dobDayEl = document.querySelector('select[name="dob_day"]');
  const dobYearEl = document.querySelector('select[name="dob_year"]');

  const fileInput = document.getElementById("avatarInput");
  const avatarPreview = document.getElementById("avatarPreview");
  const avatarIcon = document.getElementById("avatarIcon");

  // ---------- Autofill ----------
  async function loadProfile() {
    try {
      const res = await fetch("/api/user/profile");
      const data = await res.json();
      if (!data.ok) return;

      const u = data.user;

      usernameEl.value = u.username || "";
      nameEl.value = u.name || "";
      emailEl.value = u.email || "";
      phoneEl.value = u.phone || "";

      originalUsername = username.value;
      originalEmail = email.value;

      // gender radio
      if (u.gender) {
        const g = document.querySelector(`input[name="gender"][value="${u.gender}"]`);
        if (g) g.checked = true;
      }

      // dob -> selects
      if (u.dob) {
        const d = new Date(u.dob);
        // Date() parses ISO yyyy-mm-dd as UTC; for selects it's ok:
        dobYearEl.value = String(d.getUTCFullYear());
        dobMonthEl.value = String(d.getUTCMonth() + 1);
        dobDayEl.value = String(d.getUTCDate());
      }

      // avatar
      if (u.profile_image) {
        avatarPreview.src = `/static/${u.profile_image}`;
        avatarPreview.style.display = "block";
        avatarIcon.style.display = "none";
      } else {
        avatarPreview.style.display = "none";
        avatarIcon.style.display = "block";
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    }
  }

  // ---------- Pick + Preview + Upload avatar ----------
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast("warning", "Only JPG and PNG files allowed");
      fileInput.value = "";
      return;
    }

    if (file.size > 1024 * 1024) {
      toast("warning", "File too large");
      fileInput.value = "";
      return;
    }

    avatarPreview.src = URL.createObjectURL(file);
    avatarPreview.style.display = "block";
    avatarIcon.style.display = "none";

    const fd = new FormData();
    fd.append("image", file);

    try {
      await fetch("/api/user/profile-picture", {
        method: "POST",
        body: fd
      });
    } catch {
      toast("error", "Failed to save profile");
    }
  });

  // ---------- Save profile via AJAX (optional, but clean) ----------
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const ok =
      validateUsername() &
      validateName() &
      validateEmail() &
      validatePhone() &
      validateGender() &
      validateDOB();

    if (!ok) return;

    const fd = new FormData(form);

    try {
      const res = await fetch("/edit-profile", {
        method: "POST",
        body: fd
      });
      const data = await res.json();

      if (!data.ok) {
        alert(data.error || "Failed to save profile.");
        return;
      }

      // Update originals after save
      originalUsername = username.value.trim();
      originalEmail = email.value.trim();

      // Clear any lingering uniqueness errors
      setFieldError(username, "");
      setFieldError(email, "");

      showCuteToast(ToastIcons.success, "Profile updated!");
    } catch {
      showCuteToast(
        ToastIcons.error,
        data.error || "Failed to save profile"
      );
    }
  });


  loadProfile();
});



document.addEventListener("DOMContentLoaded", () => {

  // ==========================
  // ELEMENTS
  // ==========================
  const form = document.getElementById("editProfileForm");

  const username = document.getElementById("username");
  const name = document.getElementById("name");
  const email = document.getElementById("email");
  const phone = document.getElementById("phone");

  const genderRadios = document.querySelectorAll('input[name="gender"]');

  const dobMonth = document.querySelector('select[name="dob_month"]');
  const dobDay   = document.querySelector('select[name="dob_day"]');
  const dobYear  = document.querySelector('select[name="dob_year"]');

  const fileInput = document.getElementById("avatarInput");
  const avatarPreview = document.getElementById("avatarPreview");
  const avatarIcon = document.getElementById("avatarIcon");

  let originalUsername = "";
  let originalEmail = "";

  // ==========================
  // ERROR HANDLERS
  // ==========================
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

  function setGroupError(errorEl, message) {
    if (!errorEl) return;

    if (message) {
      errorEl.textContent = message;
      errorEl.classList.add("visible");
    } else {
      errorEl.textContent = "";
      errorEl.classList.remove("visible");
    }
  }

  // ==========================
  // AUTO-FORMATTING
  // ==========================
  function formatName(value) {
    return value
      .replace(/\s+/g, " ")
      .trim()
      .split(/([ -])/g)
      .map(part => {
        if (part === " " || part === "-") return part;
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      })
      .join("");
  }

  name.addEventListener("blur", () => {
    if (name.value.trim()) {
      name.value = formatName(name.value);
    }
  });

  phone.addEventListener("input", () => {
    let digits = phone.value.replace(/\D/g, "");

    if (digits.length >= 2 && !digits.startsWith("09")) {
      digits = "09";
    }

    digits = digits.slice(0, 11);

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

  // ==========================
  // VALIDATION HELPERS
  // ==========================
  function nameIsValid(value) {
    return /^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)(?:[ -][A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*$/u
      .test(value.trim());
  }

  function emailIsValid(value) {
    return /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(value.trim());
  }

  function phoneIsValid(value) {
    return /^09\d{2} \d{3} \d{4}$/.test(value.trim());
  }

  // ==========================
  // UNIQUENESS CHECKS (EDIT)
  // ==========================
  function checkUsernameUnique(val) {
    if (!val || val === originalUsername) {
      setFieldError(username, "");
      return;
    }

    fetch(`/check_username_edit?username=${encodeURIComponent(val)}`)
      .then(res => res.json())
      .then(data => {
        if (!data.available) {
          setFieldError(username, "This username is already taken.");
        } else {
          setFieldError(username, "");
        }
      });
  }

  function checkEmailUnique(val) {
    if (!val || val === originalEmail) {
      setFieldError(email, "");
      return;
    }

    fetch(`/check_email_edit?email=${encodeURIComponent(val)}`)
      .then(res => res.json())
      .then(data => {
        if (!data.available) {
          setFieldError(email, "This email is already registered.");
        } else {
          setFieldError(email, "");
        }
      });
  }

  // ==========================
  // FIELD VALIDATORS
  // ==========================
  function validateUsername() {
    const val = username.value.trim();

    if (!val) {
      setFieldError(username, "This field is required.");
      return false;
    }

    if (val.length < 6 || val.length > 15) {
      setFieldError(username, "Username must be 6–15 characters long.");
      return false;
    }

    setFieldError(username, "");
    checkUsernameUnique(val);
    return true;
  }

  function validateName() {
    if (!name.value.trim()) {
      setFieldError(name, "This field is required.");
      return false;
    }

    if (!nameIsValid(name.value)) {
      setFieldError(name, "Name must start with a capital letter and contain letters only.");
      return false;
    }

    setFieldError(name, "");
    return true;
  }

  function validateEmail() {
    email.value = email.value.trim();

    if (!email.value) {
      setFieldError(email, "This field is required.");
      return false;
    }

    if (!emailIsValid(email.value)) {
      setFieldError(email, "Email must be a valid @gmail.com address.");
      return false;
    }

    setFieldError(email, "");
    checkEmailUnique(email.value);
    return true;
  }

  function validatePhone() {
    if (!phone.value.trim()) {
      setFieldError(phone, "This field is required.");
      return false;
    }

    if (!phoneIsValid(phone.value)) {
      setFieldError(phone, "Phone number must be in the format 09XX XXX XXXX.");
      return false;
    }

    setFieldError(phone, "");
    return true;
  }

  function validateGender() {
    const errorEl = document.getElementById("genderError");
    let selected = false;

    genderRadios.forEach(r => {
      if (r.checked) selected = true;
    });

    if (!selected) {
      setGroupError(errorEl, "This field is required.");
      return false;
    }

    setGroupError(errorEl, "");
    return true;
  }

  function validateDOB() {
    const errorEl = document.getElementById("dobError");

    if (!dobMonth.value || !dobDay.value || !dobYear.value) {
      setGroupError(errorEl, "This field is required.");
      return false;
    }

    const dob = new Date(dobYear.value, dobMonth.value - 1, dobDay.value);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;

    if (age < 16) {
      toast("warning", "You must be at least 16 years old.");
      return false;
    }

    setGroupError(errorEl, "");
    return true;
  }

  // ==========================
  // EVENT BINDINGS
  // ==========================
  username.addEventListener("input", validateUsername);
  name.addEventListener("input", validateName);
  email.addEventListener("input", validateEmail);
  phone.addEventListener("input", validatePhone);

  genderRadios.forEach(r => r.addEventListener("change", validateGender));
  [dobMonth, dobDay, dobYear].forEach(el => el.addEventListener("change", validateDOB));

  // ==========================
  // AVATAR UPLOAD
  // ==========================
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast("warning", "Only JPG and PNG files allowed");
      fileInput.value = "";
      return;
    }

    if (file.size > 1024 * 1024) {
      toast("warning", "File too large");
      fileInput.value = "";
      return;
    }

    avatarPreview.src = URL.createObjectURL(file);
    avatarPreview.style.display = "block";
    avatarIcon.style.display = "none";

    const fd = new FormData();
    fd.append("image", file);

    try {
      await fetch("/api/user/profile-picture", {
        method: "POST",
        body: fd
      });
    } catch {
      toast("error", "Failed to save profile");
    }
  });

  // ==========================
  // SUBMIT
  // ==========================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const ok =
      validateUsername() &
      validateName() &
      validateEmail() &
      validatePhone() &
      validateGender() &
      validateDOB();

    if (!ok) return;

    const fd = new FormData(form);

    try {
      const res = await fetch("/edit-profile", { method: "POST", body: fd });
      const data = await res.json();

      if (!data.ok) {
        toast("error", "Failed to save profile");
        return;
      }

      originalUsername = username.value.trim();
      originalEmail = email.value.trim();

      toast("success", "Profile updated!");
    } catch {
      toast("error", "Failed to save profile");
    }
  });

});


// ==========================
// SWEET ALERT TOAST
// ==========================
function showCuteToast(iconHtml, title) {
  Swal.fire({
    toast: true,
    position: "top-end",
    iconHtml: iconHtml,
    title: title,
    showConfirmButton: false,
    timer: 1000,
    timerProgressBar: true,
    customClass: { icon: "no-default-icon" }
  });
}

// ==========================
// TOAST ICON PRESETS
// ==========================
const ToastIcons = {
  success: `
    <span class="heart-anim">💗</span>
    <span class="sparkle sparkle-1">✨</span>
    <span class="sparkle sparkle-2">✨</span>
    <span class="sparkle sparkle-3">✨</span>
  `,
  error: `
    <span class="heartbreak-anim">💔</span>
    <span class="crack crack-1">✦</span>
    <span class="crack crack-2">✦</span>
  `,
  warning: `
    <span class="heart-anim">⚠️</span>
    <span class="sparkle sparkle-1">✨</span>
  `
};

// ==========================
// SUPER CLEAN TOAST API
// ==========================
function toast(type, message) {
  showCuteToast(ToastIcons[type], message);
}
