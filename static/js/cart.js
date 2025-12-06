/* ----------------------------------------
    SWEETALERT DELETE CONFIRMATION
---------------------------------------- */
document.querySelectorAll(".delete-item-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const cartId = btn.dataset.cartId;
        confirmDelete(cartId);
    });
});

function confirmDelete(cartId) {
    Swal.fire({
        title: "Remove this item?",
        text: "Do you want to remove this book from your cart?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d37f8c",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "Yes, remove",
        cancelButtonText: "Cancel"
    }).then(result => {
        if (result.isConfirmed) {
            document.getElementById(`delete-form-${cartId}`).submit();
        }
    });
}


/* ----------------------------------------
    QUANTITY CONTROL
---------------------------------------- */
document.addEventListener("DOMContentLoaded", function () {
    console.log("Quantity system active!");

    const qtyInputs = document.querySelectorAll(".qty-input");

    qtyInputs.forEach(container => {
        const input = container.querySelector(".product-qty");
        const minusBtn = container.querySelector(".qty-count--minus");
        const addBtn = container.querySelector(".qty-count--add");

        const cartId = container.dataset.cartId;
        const unitPrice = parseFloat(container.dataset.unitPrice);
        const stock = parseInt(container.dataset.stock);
        const maxQty = Math.min(stock, 10);

        input.setAttribute("max", maxQty);

        // INITIAL BUTTON STATE
        updateQtyButtons(input, minusBtn, addBtn, maxQty);

        // -----------------------------
        // USER TYPING
        // -----------------------------
        input.addEventListener("input", function () {
            let value = parseInt(input.value);

            if (isNaN(value) || value < 1) {
                confirmDelete(cartId, container);
                return;
            }

            if (value > maxQty) value = maxQty;

            input.value = value;

            updateQty(cartId, value, container, unitPrice);
            updateQtyButtons(input, minusBtn, addBtn, maxQty);
        });

        // -----------------------------
        // MINUS BUTTON
        // -----------------------------
        minusBtn.addEventListener("click", function () {
            let qty = parseInt(input.value);

            if (qty <= 1) {
                confirmDelete(cartId, container);
                return;
            }

            qty -= 1;
            input.value = qty;

            updateQty(cartId, qty, container, unitPrice);
            updateQtyButtons(input, minusBtn, addBtn, maxQty);
        });

        // -----------------------------
        // PLUS BUTTON
        // -----------------------------
        addBtn.addEventListener("click", function () {
            let qty = parseInt(input.value);

            if (qty >= maxQty) return;

            qty += 1;
            input.value = qty;

            updateQty(cartId, qty, container, unitPrice);
            updateQtyButtons(input, minusBtn, addBtn, maxQty);
        });
    });
});

function updateQtyButtons(input, minusBtn, addBtn, maxQty) {
    const qty = parseInt(input.value) || 1;

    minusBtn.disabled = qty <= 1;
    addBtn.disabled = qty >= maxQty;
}


/* ----------------------------------------
   UPDATE QTY IN UI + SAVE TO DATABASE
---------------------------------------- */
function updateQty(cartId, qty, container, unitPrice) {
    // 1. Update line total
    const totalField = container.parentElement.querySelector(".item-total");
    const newTotal = qty * unitPrice;
    totalField.textContent = `₱${newTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    // 2. Update summary totals
    updateGrandTotal();

    // 3. Save to backend (simple version)
    fetch("/cart/update-qty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            cart_id: cartId,
            quantity: qty
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === "updated") {
            console.log(`Saved: Cart item ${cartId} = quantity ${qty}`);
        }
    })
    .catch(err => console.error("Error saving quantity:", err));
}


/* ----------------------------------------
   ITEM COUNT LIVE
---------------------------------------- */
function updateItemCount() {
    let itemCount = 0;

    document.querySelectorAll(".item-checkbox").forEach(cb => {
        if (cb.checked) itemCount++;
    });

    document.getElementById("summary-items").textContent =
        `Subtotal (${itemCount} item${itemCount === 1 ? '' : 's'})`;
}


/* ----------------------------------------
   RECALCULATE ORDER SUMMARY TOTAL
---------------------------------------- */
function updateGrandTotal() {
    let sum = 0;

    document.querySelectorAll(".cart-item").forEach(item => {
        const checkbox = item.querySelector(".item-checkbox");
        if (checkbox && checkbox.checked) {
            const totalElem = item.querySelector(".item-total");
            const value = parseFloat(totalElem.textContent.replace(/[₱,]/g, ""));
            sum += value;
        }
    });

    document.querySelector(".total-amount").textContent =
        `₱${sum.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    document.querySelector(".summary-item-total").textContent =
        `₱${sum.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    updateItemCount();
}

/* ----------------------------------------
    CHECKBOX SELECTION LOGIC
---------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
    const selectAll = document.getElementById("select-all");
    const itemCheckboxes = document.querySelectorAll(".item-checkbox");
    const checkoutInput = document.getElementById("selected-items-input");

    // Auto-select ALL items when page loads
    itemCheckboxes.forEach(cb => cb.checked = true);
    selectAll.checked = true;

    updateSelectedItems();
    updateGrandTotal();

    // Toggle all items
    selectAll.addEventListener("change", () => {
        itemCheckboxes.forEach(cb => cb.checked = selectAll.checked);
        updateSelectedItems();
        updateGrandTotal();
    });

    // Each checkbox toggled
    itemCheckboxes.forEach(cb => {
        cb.addEventListener("change", () => {
            const allChecked = [...itemCheckboxes].every(c => c.checked);
            selectAll.checked = allChecked;

            updateSelectedItems();
            updateGrandTotal();
        });
    });

    function updateSelectedItems() {
        const selected = [...itemCheckboxes]
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        checkoutInput.value = JSON.stringify(selected);
    }
});


document.addEventListener("DOMContentLoaded", () => {
    const selectAll = document.getElementById("select-all");
    const itemCheckboxes = document.querySelectorAll(".item-checkbox");
    const checkoutInput = document.getElementById("selected-items-input");

    // Toggle all items
    selectAll.addEventListener("change", () => {
        itemCheckboxes.forEach(cb => cb.checked = selectAll.checked);
        updateSelectedItems();
        updateGrandTotal();
    });

    // When any item is checked/unchecked
    itemCheckboxes.forEach(cb => {
        cb.addEventListener("change", () => {
            const allChecked = [...itemCheckboxes].every(cb => cb.checked);
            selectAll.checked = allChecked;

            updateSelectedItems();
            updateGrandTotal();
        });
    });

    function updateSelectedItems() {
        const selected = [...itemCheckboxes]
            .filter(cb => cb.checked)
            .map(cb => cb.value);

        checkoutInput.value = JSON.stringify(selected);
    }
});

document.getElementById("checkout-form").addEventListener("submit", function (e) {
    const selected = JSON.parse(document.getElementById("selected-items-input").value);

    if (!selected || selected.length === 0) {
        e.preventDefault();
        Swal.fire({
            toast: true,
            position: "top-end",
            icon: "warning",
            text: "No items selected. Please select at least one item before checking out.",
            showConfirmButton: false,
            timer: 1500
        });
    }
});