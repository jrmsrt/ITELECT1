document.addEventListener("DOMContentLoaded", () => {
    const passwordInput       = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const submitButton        = document.getElementById("submit-button");

    const lengthReq    = document.getElementById("length-req");
    const uppercaseReq = document.getElementById("uppercase-req");
    const lowercaseReq = document.getElementById("lowercase-req");
    const numberReq    = document.getElementById("number-req");
    const specialReq   = document.getElementById("special-req");

    const successMessage = document.getElementById("success-message");
    const errorMessage   = document.getElementById("error-message");

    // Helper to set each requirement state
    function setRequirementState(liElement, isValid) {
        if (!liElement) return;
        const icon = liElement.querySelector(".requirement-icon");
        if (!icon) return;

        if (isValid) {
            icon.textContent = "✓";
            icon.classList.remove("invalid");
            icon.classList.add("valid");
            liElement.classList.add("met");
        } else {
            icon.textContent = "✗";
            icon.classList.remove("valid");
            icon.classList.add("invalid");
            liElement.classList.remove("met");
        }
    }

    function validatePasswordValue(value) {
        const lengthOK    = value.length >= 8;
        const upperOK     = /[A-Z]/.test(value);
        const lowerOK     = /[a-z]/.test(value);
        const numberOK    = /[0-9]/.test(value);
        const specialOK   = /[!@#$%^&*]/.test(value);

        // Update each requirement row + icon
        setRequirementState(lengthReq,    lengthOK);
        setRequirementState(uppercaseReq, upperOK);
        setRequirementState(lowercaseReq, lowerOK);
        setRequirementState(numberReq,    numberOK);
        setRequirementState(specialReq,   specialOK);

        // Return overall result
        return lengthOK && upperOK && lowerOK && numberOK && specialOK;
    }

    function updateFormState() {
        const passwordVal        = passwordInput.value;
        const confirmPasswordVal = confirmPasswordInput.value;

        const passwordValid = validatePasswordValue(passwordVal);
        const passwordsMatch = passwordValid && confirmPasswordVal !== "" && (passwordVal === confirmPasswordVal);

        // Enable button only when everything is OK
        if (passwordValid && passwordsMatch) {
            submitButton.disabled = false;
            if (errorMessage) errorMessage.style.display = "none";
        } else {
            submitButton.disabled = true;
            // Don't force-show error here; leave it for submit event if you like
        }
    }

    // Event listeners for live validation
    if (passwordInput) {
        passwordInput.addEventListener("input", () => {
            validatePasswordValue(passwordInput.value);
            updateFormState();
        });
    }

    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener("input", () => {
            updateFormState();
        });
    }

    // Optional: show error message if user tries to submit with invalid data
    const form = document.getElementById("reset-password-form");
    if (form) {
        form.addEventListener("submit", (e) => {
            const passwordVal        = passwordInput.value;
            const confirmPasswordVal = confirmPasswordInput.value;

            const passwordValid  = validatePasswordValue(passwordVal);
            const passwordsMatch = passwordValid && (passwordVal === confirmPasswordVal);

            if (!passwordValid || !passwordsMatch) {
                e.preventDefault();
                if (errorMessage) {
                    errorMessage.style.display = "block";
                    errorMessage.textContent = "Please fix the errors below before submitting.";
                }
            } else {
                if (errorMessage) errorMessage.style.display = "none";
            }
        });
    }

    // Hide success/error by default (frontend) if you want
    if (successMessage) successMessage.style.display = "none";
    if (errorMessage) errorMessage.style.display = "none";
});
