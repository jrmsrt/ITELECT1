document.addEventListener("DOMContentLoaded", () => {
    // ==========================
    // REGISTRATION FORM LOGIC
    // ==========================
    const firstName        = document.getElementById('firstName');
    const lastName         = document.getElementById('lastName');
    const email            = document.getElementById('email');
    const username         = document.getElementById('username');
    const password         = document.getElementById('password');
    const confirmPassword  = document.getElementById('confirmPassword');
    const submitBtn        = document.getElementById('submitBtn');
    const registrationForm = document.getElementById('registrationForm');

    // ==========================
    // HELPER: FIELD ERROR HANDLING
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


    // ==========================
    // VALIDATION HELPERS
    // ==========================
    function nameIsValid(value) {
        // Start with a capital, then letters.
        // After that, allow groups starting with space or hyphen + more letters (any case).
        const pattern = /^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)(?:[ -][A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*$/u;
        return pattern.test(value.trim());
    }


    function emailIsValid(value) {
        // Must be a @gmail.com address
        const pattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
        return pattern.test(value.trim());
    }

    function passwordIsValid(value) {
        const lenOK      = value.length >= 8;
        const hasLower   = /[a-z]/.test(value);
        const hasUpper   = /[A-Z]/.test(value);
        const hasDigit = /[0-9]/.test(value);
        const hasSpecial = /[^A-Za-z]/.test(value);
        return lenOK && hasLower && hasUpper && hasDigit && hasSpecial;
    }

    // ==========================
    // UNIQUENESS HELPERS (using fetch, no async/await)
    // ==========================

    function checkEmailUnique(val) {
        if (!val) return;

        fetch(`/check_email?email=${encodeURIComponent(val)}`)
            .then(response => response.json())
            .then(data => {
                if (!email) return;

                // data.available expected from backend
                if (!data.available) {
                    // Email is already registered
                    setFieldError(email, "This email is already registered. Please use a different email or login.");
                } else {
                    // Only clear if the field still has the same value we checked
                    if (email.value.trim() === val) {
                        setFieldError(email, "");
                    }
                }
            })
            .catch(err => {
                console.error("check_email error:", err);
            });
    }

    function checkUsernameUnique(val) {
        if (!val) return;

        fetch(`/check_username?username=${encodeURIComponent(val)}`)
            .then(response => response.json())
            .then(data => {
                if (!username) return;

                if (!data.available) {
                    setFieldError(username, "This username is already taken.");
                } else {
                    if (username.value.trim() === val) {
                        setFieldError(username, "");
                    }
                }
            })
            .catch(err => {
                console.error("check_username error:", err);
            });
    }

    // ==========================
    // FIELD VALIDATORS
    // ==========================

    function validateFirstName() {
        if (!firstName) return false;
        const val = firstName.value;   // <-- No .trim() here

        if (val.trim() === "") {
            setFieldError(firstName, "This field is required.");
            return false;
        }

        if (!nameIsValid(val)) {
            setFieldError(firstName, "First name must start with a capital letter and contain letters only.");
            return false;
        }

        setFieldError(firstName, "");
        return true;
    }


    function validateLastName() {
        if (!lastName) return false;
        const val = lastName.value;

        if (!val) {
            setFieldError(lastName, "This field is required.");
            return false;
        }

        if (!nameIsValid(val)) {
            setFieldError(lastName, "Last name must start with a capital letter and contain letters only.");
            return false;
        }

        setFieldError(lastName, "");
        return true;
    }

    function validateEmail() {
        if (!email) return false;
        const val = email.value.trim();
        email.value = val;

        if (!val) {
            setFieldError(email, "This field is required.");
            return false;
        }

        if (!emailIsValid(val)) {
            setFieldError(email, "Email must be a valid @gmail.com address.");
            return false;
        }

        // Format is valid → clear local error and check uniqueness (async via fetch)
        setFieldError(email, "");
        checkEmailUnique(val);

        return true;
    }

    function validateUsername() {
        if (!username) return false;
        const val = username.value.trim();
        const len = val.length;

        if (!val) {
            setFieldError(username, "This field is required.");
            return false;
        }

        // Length rule: 6–15 chars
        if (len < 6 || len > 15) {
            if (len < 6) {
                const more = 6 - len;
                setFieldError(
                    username,
                    `Username must have 6 to 15 characters. ${more} more character(s) needed.`
                );
            } else {
                setFieldError(username, "Username must have 6 to 15 characters.");
            }
            return false;
        }

        setFieldError(username, "");
        checkUsernameUnique(val);
        return true;
    }

    function validatePassword() {
        if (!password) return false;
        const val = password.value;

        if (!val) {
            setFieldError(password, "This field is required.");
            return false;
        }

        if (!passwordIsValid(val)) {
            setFieldError(
                password,
                "Password must be at least 8 characters and include a lowercase letter, an uppercase letter, a number and a special character."
            );
            return false;
        }

        setFieldError(password, "");
        return true;
    }

    function validateConfirmPassword() {
        if (!confirmPassword) return false;
        const pass       = password ? password.value : "";
        const confirmVal = confirmPassword.value;

        if (!confirmVal) {
            setFieldError(confirmPassword, "This field is required.");
            return false;
        }

        if (confirmVal !== pass || !passwordIsValid(pass)) {
            setFieldError(confirmPassword, "Passwords do not match.");
            return false;
        }

        setFieldError(confirmPassword, "");
        return true;
    }


    // ==========================
    // EVENT BINDINGS
    // ==========================
    if (firstName) {
        firstName.addEventListener('input', validateFirstName);
    }
    if (lastName) {
        lastName.addEventListener('input', validateLastName);
    }
    if (email) {
        email.addEventListener('input', validateEmail);
    }
    if (username) {
        username.addEventListener('input', validateUsername);
    }
    if (password) {
        password.addEventListener('input', function () {
            const passOK = validatePassword();
            if (passOK && confirmPassword && confirmPassword.value !== '') {
                validateConfirmPassword();
            }
        });
    }
    if (confirmPassword) {
        confirmPassword.addEventListener('input', validateConfirmPassword);
    }

    // Prevent submit if anything is invalid (registration)
    if (registrationForm) {
        registrationForm.addEventListener('submit', function (e) {
            const okFirst  = validateFirstName();
            const okLast   = validateLastName();
            const okEmail  = validateEmail();
            const okUser   = validateUsername();
            const okPass   = validatePassword();
            const okConf   = validateConfirmPassword();

            if (!okFirst || !okLast || !okEmail || !okUser || !okPass || !okConf) {
                e.preventDefault();
            }
        });
    }


    // Add / remove .filled class based on value (for hover styling)
    document.querySelectorAll(".form-input").forEach(input => {
        input.addEventListener("input", function () {
            if (this.value.trim() !== "") {
                this.classList.add("filled");
            } else {
                this.classList.remove("filled");
            }
        });
    });
});


    // ==========================
    // VERIFICATION CODE (OTP) LOGIC
    // ==========================
    const otpInputs   = document.querySelectorAll(".otp-input");
    const verifyForm  = document.getElementById("verifyForm");
    const hiddenCode  = document.getElementById("verificationCode"); // <input type="hidden" name="code" id="verificationCode">

    if (otpInputs.length > 0) {
        otpInputs.forEach((input, index) => {
            // Only allow digits, auto-focus next box
            input.addEventListener("input", () => {
                input.value = input.value.replace(/[^0-9]/g, "");

                if (input.value && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
            });

            // Backspace → move to previous when empty
            input.addEventListener("keydown", (e) => {
                if (e.key === "Backspace" && !input.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });
        });
    }

    if (verifyForm && otpInputs.length > 0) {
        verifyForm.addEventListener("submit", (e) => {
            // Build full 6-digit code
            const code = Array.from(otpInputs)
                .map(inp => inp.value.trim())
                .join("");

            if (code.length !== 6) {
                e.preventDefault();
                showAlert("Please enter the 6-digit verification code.");
                return;
            }

            if (hiddenCode) {
                hiddenCode.value = code;
            }
        });
    }

document.addEventListener("DOMContentLoaded", () => {
    const otpInputs   = document.querySelectorAll(".otp-input");
    const verifyForm  = document.getElementById("verifyForm");
    const hiddenCode  = document.getElementById("verificationCode");
    const alertBox    = document.getElementById("alertBox");
    const alertText   = alertBox ? alertBox.querySelector(".alert-text") : null;

    // ---------- ALERT HELPERS ----------
    function showAlert(msg) {
        if (!alertBox || !alertText) return;

        // Always force error style for JS-generated alerts
        alertBox.classList.remove("success");
        alertBox.classList.add("error");

        alertText.textContent = msg;
        alertBox.style.display = "block";
        alertBox.classList.remove("slide-up");
        alertBox.classList.add("slide-down");
    }


    window.closeAlert = function () {
        if (!alertBox) return;
        alertBox.classList.add("slide-up");
        setTimeout(() => {
            alertBox.style.display = "none";
            alertBox.classList.remove("slide-up");
            if (alertText) alertText.textContent = "";
        }, 350);
    };

    // ---------- OTP LOGIC ----------
    if (otpInputs.length > 0) {
        // Autofocus first input and set "active" style
        otpInputs[0].focus();
        otpInputs[0].classList.add("active");

        otpInputs.forEach((input, index) => {
            // Active styling
            input.addEventListener("focus", () => {
                otpInputs.forEach(i => i.classList.remove("active"));
                input.classList.add("active");
            });

            // Only digits, auto-focus next, and auto-submit ONLY when 6 digits complete
            input.addEventListener("input", () => {
                input.value = input.value.replace(/[^0-9]/g, "");

                if (input.value && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }

                // While the user is still typing (length < 6), DO NOTHING (no errors)
                const code = Array.from(otpInputs)
                    .map(inp => inp.value.trim())
                    .join("");

                if (code.length === otpInputs.length) {
                    // User has finished typing 6 digits
                    if (hiddenCode) hiddenCode.value = code;
                    if (verifyForm) verifyForm.submit();  // submit to backend
                }
            });

            // Backspace to previous
            input.addEventListener("keydown", (e) => {
                if (e.key === "Backspace" && !input.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });
        });
    }

    // Manual click on "Verify Email" button
    if (verifyForm && otpInputs.length > 0) {
        verifyForm.addEventListener("submit", (e) => {
            const code = Array.from(otpInputs)
                .map(inp => inp.value.trim())
                .join("");

            // If they click Verify without finishing 6 digits, we just show a gentle reminder
            if (code.length !== otpInputs.length) {
                e.preventDefault();
                showAlert("Please enter the 6-digit verification code.");
                return;
            }

            // If length is 6, allow normal submit (server will decide if valid/invalid)
            if (hiddenCode) {
                hiddenCode.value = code;
            }
        });
    }
});