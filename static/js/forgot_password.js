document.addEventListener("DOMContentLoaded", () => {

    const emailInput = document.getElementById("email");
    const submitBtn  = document.getElementById("submit-button");

    // Your global alert box
    const alertBox  = document.getElementById("alertBox");
    const alertText = alertBox ? alertBox.querySelector(".alert-text") : null;

    // Track current error type: "format", "not_found", or null
    let lastErrorType = null;

    // ---- ALERT HELPERS (using your slide-up CSS) ----
    function slideUpAlert() {
        if (!alertBox) return;
        alertBox.classList.add("slide-up");
        setTimeout(() => {
            alertBox.style.display = "none";
            alertBox.classList.remove("slide-up");
            if (alertText) alertText.textContent = "";
        }, 350);
    }

    function showAlert(message, type) {
        if (!alertBox || !alertText) return;
        alertText.textContent = message;
        alertBox.classList.remove("slide-up");
        alertBox.style.display = "flex";
        lastErrorType = type;   // remember what we’re showing
    }

    function clearAlertIfAny() {
        if (!alertBox || !alertText) return;
        if (lastErrorType !== null) {
            slideUpAlert();
            lastErrorType = null;
        }
    }

    // For the × button
    window.closeAlert = function () {
        clearAlertIfAny();
    };

    // ---- VALIDATION HELPERS ----
    function isValidGmail(email) {
        return /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email);
    }

    function disableSubmit() {
        if (submitBtn) submitBtn.disabled = true;
    }

    function enableSubmit() {
        if (submitBtn) submitBtn.disabled = false;
    }

    // ---- LIVE EMAIL VALIDATION ----
    if (emailInput) {
        emailInput.addEventListener("input", () => {
            const val = emailInput.value.trim();

            // If field is empty → clear everything and allow submit
            if (!val) {
                clearAlertIfAny();
                enableSubmit();
                return;
            }

            // 1) Basic @gmail.com validation
            if (!isValidGmail(val)) {
                // Only update if not already showing format error
                if (lastErrorType !== "format") {
                    showAlert("Email must be a valid @gmail.com address.", "format");
                }
                disableSubmit();
                return;
            }

            // At this point: format is valid.
            // DO NOT clear the alert here — we wait to see if the account exists.

            const currentVal = val; // capture for race conditions
            const formData = new FormData();
            formData.append("email", currentVal);

            fetch("/forgot-password/check-email", {
                method: "POST",
                headers: {
                    "X-Requested-With": "XMLHttpRequest"
                },
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                // If user changed the input while waiting, ignore this response
                if (emailInput.value.trim() !== currentVal) {
                    return;
                }

                if (!data.valid) {
                    if (data.reason === "not_found") {
                        if (lastErrorType !== "not_found") {
                            showAlert("No account found with that email.", "not_found");
                        }
                    } else if (data.reason === "invalid_format") {
                        if (lastErrorType !== "format") {
                            showAlert("Email must be a valid @gmail.com address.", "format");
                        }
                    } else {
                        showAlert("Invalid email address.", "other");
                    }
                    disableSubmit();
                } else {
                    // Email is valid AND exists in DB
                    clearAlertIfAny();  // slide-up any previous error ("format" or "not_found")
                    enableSubmit();
                }
            })
            .catch(err => {
                console.error("AJAX error:", err);
                disableSubmit();
            });
        });
    }
});
