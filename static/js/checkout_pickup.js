document.addEventListener("DOMContentLoaded", () => {
    const paymentOptions = document.querySelectorAll(".payment-option");
    const paymentInput = document.getElementById("payment_method");
    const placeOrderBtn = document.querySelector(".place-order");

    const onlineOverlay = document.getElementById("onlineModalOverlay");
    const onlineClose = document.getElementById("onlineModalClose");

    if (!paymentOptions.length || !paymentInput || !placeOrderBtn) return;

    const paymentMap = {
        store: "Pay at Store",
        online: "Online Payment"
    };

    // =========================
    // PAYMENT OPTION SELECTION
    // =========================
    paymentOptions.forEach(option => {
        option.addEventListener("click", () => {
            paymentOptions.forEach(o => o.classList.remove("active"));
            option.classList.add("active");

            option.style.animation = "pop 0.25s ease";
            setTimeout(() => option.style.animation = "", 250);

            paymentInput.value = paymentMap[option.id] || "";
        });
    });

    // Default
    const defaultOption =
        document.querySelector(".payment-option.active") || paymentOptions[0];

    if (defaultOption) {
        defaultOption.classList.add("active");
        paymentInput.value = paymentMap[defaultOption.id];
    }

    // =========================
    // CONFIRM PICKUP ORDER
    // =========================
    placeOrderBtn.addEventListener("click", (e) => {

        if (!paymentInput.value) {
            e.preventDefault();
            Swal.fire({
                toast: true,
                position: "top-end",
                icon: "error",
                title: "Please select a payment method.",
                showConfirmButton: false,
                timer: 1500
            });
            return;
        }

        // 🔥 ONLINE PAYMENT → STOP SUBMIT + OPEN MODAL
        if (paymentInput.value === "Online Payment") {
            e.preventDefault();
            openOnlineModal();
        }
    });

    // =========================
    // ONLINE MODAL CONTROLS
    // =========================
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

    onlineClose.addEventListener("click", closeOnlineModal);

    onlineOverlay.addEventListener("click", (e) => {
        if (e.target === onlineOverlay) closeOnlineModal();
    });

    // =========================
    // PAYMENT CHANNEL HANDLER
    // =========================
    document.querySelectorAll(".channel-btn").forEach(btn => {
        btn.addEventListener("click", async () => {

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
});
