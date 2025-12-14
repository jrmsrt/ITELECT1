document.addEventListener("DOMContentLoaded", () => {
    const paymentOptions = document.querySelectorAll(".payment-option");
    const paymentInput = document.getElementById("payment_method");
    const placeOrderBtn = document.querySelector(".place-order");

    if (!paymentOptions.length || !paymentInput) return;

    const paymentMap = {
        store: "Pay at Store",
        online: "Online Payment"
    };

    paymentOptions.forEach(option => {
        option.addEventListener("click", () => {
            paymentOptions.forEach(o => o.classList.remove("active"));
            option.classList.add("active");

            // Animation
            option.style.animation = "pop 0.25s ease";
            setTimeout(() => option.style.animation = "", 250);

            paymentInput.value = paymentMap[option.id] || "";
        });
    });

    // Default selection
    const defaultOption =
        document.querySelector(".payment-option.active") || paymentOptions[0];

    if (defaultOption) {
        defaultOption.classList.add("active");
        paymentInput.value = paymentMap[defaultOption.id];
    }

    // Safety check on submit
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener("click", () => {
            if (!paymentInput.value) {
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "error",
                    title: "Please select a payment method.",
                    showConfirmButton: false,
                    timer: 1500
                });
            }
        });
    }
});
