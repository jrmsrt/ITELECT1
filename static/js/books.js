/* =========================
    SEARCH & FILTER
========================= */

const searchInput = document.getElementById("searchBar");
if (searchInput) {
    searchInput.addEventListener("keyup", filterBooks);
}

function applyFilters() {
    filterBooks();
}

function resetFilters() {
    const searchBar = document.getElementById("searchBar");
    const titleFilter = document.getElementById("titleFilter");
    const authorFilter = document.getElementById("authorFilter");
    const genreFilter = document.getElementById("genreFilter");

    if (searchBar) searchBar.value = "";
    if (titleFilter) titleFilter.value = "";
    if (authorFilter) authorFilter.value = "";
    if (genreFilter) genreFilter.value = "";

    filterBooks();
}

function filterBooks() {
    const searchBar = document.getElementById("searchBar");
    const titleFilter = document.getElementById("titleFilter");
    const authorFilter = document.getElementById("authorFilter");
    const genreFilter = document.getElementById("genreFilter");

    if (!searchBar || !titleFilter || !authorFilter || !genreFilter) return;

    const search = searchBar.value.toLowerCase();
    const title = titleFilter.value.toLowerCase();
    const author = authorFilter.value.toLowerCase();
    const genre = genreFilter.value.toLowerCase();

    const cards = document.querySelectorAll(".book-card, .item");
    let visibleCount = 0;

    cards.forEach(card => {
        if (!card.dataset.originalDisplay) {
            card.dataset.originalDisplay = getComputedStyle(card).display;
        }
    });


    cards.forEach(card => {
        const matchesSearch =
            card.dataset.title.includes(search) ||
            card.dataset.author.includes(search) ||
            card.dataset.genre.includes(search) ||
            card.dataset.description.includes(search);

        const matchesTitle = !title || card.dataset.title === title;
        const matchesAuthor = !author || card.dataset.author === author;
        const matchesGenre =
        !genre ||
        card.dataset.genre
            .split(",")
            .map(g => g.trim())
            .includes(genre);


        const show = matchesSearch && matchesTitle && matchesAuthor && matchesGenre;

        card.style.display = show ? card.dataset.originalDisplay : "none";

        if (show) visibleCount++;
    });

    const resultCount = document.getElementById("resultCount");
    if (resultCount) {
        resultCount.innerText = `Showing ${visibleCount} results`;
    }
}

/* =========================
    CLEARING FIELDS FOR ADD AND EDIT BOOKS
========================= */
function confirmDeleteBook(bookId) {
    Swal.fire({
        title: "Delete This Book?",
        text: "This action cannot be undone.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d37f8c",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "Yes, delete it",
        cancelButtonText: "Cancel",
        background: "#fff",
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = `/admin/delete-book/${bookId}`;
        }
    });
}


/* =========================
    UPLOADING THE COVER
========================= */
function previewImage(event) {
    const input = event.target;
    const preview = document.getElementById('preview-img');
    const placeholder = document.getElementById('placeholder-text');

    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function resetForm() {

    const form =
        document.getElementById("editBookForm") ||
        document.getElementById("addBookForm");

    if (!form) return;

    form.querySelectorAll("input[type='text'], input[type='number'], textarea")
        .forEach(field => {
            field.value = "";
        });

    const coverInput = document.getElementById("coverInput");
    if (coverInput) {
        coverInput.value = "";
    }

    const preview = document.getElementById("preview-img");
    const placeholder = document.getElementById("placeholder-text");

    if (preview) {
        preview.src = "";
        preview.style.display = "none";
    }

    if (placeholder) {
        placeholder.style.display = "block";
    }
}

/* =========================
    Animated login-required icon
========================= */

const loginRequiredIcon = `
    <div class="login-icon">
        <span class="login-lock">🔒</span>
        <span class="login-sparkle s1">✨</span>
        <span class="login-sparkle s2">✨</span>
    </div>
`;


function showLoginRequiredDialog(message = "You must be logged in to continue.") {
    Swal.fire({
        iconHtml: loginRequiredIcon,
        customClass: {
            icon: "swal2-custom-icon",
            popup: "swal2-custom-popup"
        },
        title: "Login Required",
        html: message,
        confirmButtonText: "OK",
        width: 400
    });
}

/* =========================
    FAVORITES TOGGLE
========================= */

function toggleFavorite(bookId, btn) {
    fetch(`/toggle_favorite/${bookId}`, { method: "POST" })
        .then(res => res.json())
        .then(data => {

            if (data.status === "added") {
                btn.classList.add("favorited");
                updateFavoriteCount();

                showCuteToast(
                    `
                    <span class="heart-anim">💗</span>
                    <span class="sparkle sparkle-1">✨</span>
                    <span class="sparkle sparkle-2">✨</span>
                    <span class="sparkle sparkle-3">✨</span>
                    `,
                    "Added to favorites!"
                );
            }

            else if (data.status === "removed") {
                btn.classList.remove("favorited");
                updateFavoriteCount();

                showCuteToast(
                    `
                    <span class="heartbreak-anim">💔</span>
                    <span class="crack crack-1">✦</span>
                    <span class="crack crack-2">✦</span>
                    `,
                    "Removed from favorites"
                );
            }

            else if (data.status === "not_logged_in") {
                showLoginRequiredDialog("You must be logged in to add favorites.");
            }
        });
}

function updateFavoriteCount() {
    fetch("/favorites/count")
        .then(res => res.json())
        .then(data => {
            const countElement = document.querySelector(".favorite-count");
            if (!countElement) return;

            countElement.textContent = data.count;
            countElement.classList.add("count-bump");
            setTimeout(() => countElement.classList.remove("count-bump"), 300);
        });
}


/* =========================
    UNFAVORITING BOOKS
========================= */

function confirmUnfavorite(bookId) {
    Swal.fire({
        title: "Remove from Favorites?",
        text: "This book will be removed from your favorites list.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d37f8c",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "Yes, remove it",
        cancelButtonText: "Cancel",
        background: "#fff",
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = `/remove_favorite/${bookId}`;
        }
    });
}

/* =========================
    TOAST HELPER (NO PERSISTENCE)
========================= */

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


/* =========================
    ADD TO CART
========================= */

function addToCart(bookId, quantity = 1) {
    fetch("/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book_id: bookId, quantity })
    })
    .then(res => res.json())
    .then(data => {

        if (data.status === "ok") {

            updateCartCount();

            const titleText = data.action === "updated"
                ? "Updated quantity in your cart!"
                : "Added to cart!";

            const iconHtml = `
                <span class="heart-anim">🛒</span>
                <span class="sparkle sparkle-1">✨</span>
                <span class="sparkle sparkle-2">✨</span>
                <span class="sparkle sparkle-3">✨</span>
            `;

            showCuteToast(iconHtml, titleText);
        }

        else if (data.status === "not_logged_in") {
            showLoginRequiredDialog("You must be logged in to add items to your cart.");
        }

        else if (data.status === "out_of_stock") {
            Swal.fire({
                toast: true,
                icon: "error",
                position: "top-end",
                html: "<strong>Out of Stock</strong><br><small>Sorry, this book is currently out of stock.</small>",
                timer: 1100,
                showConfirmButton: false,
                timerProgressBar: false,
            });
        }

        else if (data.status === "max_reached") {
            Swal.fire({
                toast: true,
                icon: "warning",
                position: "top-end",
                text: "Maximum of 10 per item allowed.",
                timer: 1500,
                showConfirmButton: false
            });
        }

        else if (data.status === "max_qty_reached") {
            Swal.fire({
                toast: true,
                icon: "warning",
                position: "top-end",
                text: "Maximum stock already in cart.",
                timer: 1500,
                showConfirmButton: false
            });
        }

        else if (data.status === "book_not_found") {
            Swal.fire({
                icon: "error",
                title: "Book not found",
                text: "This book could not be found."
            });
        }

        else {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Unable to add to cart."
            });
        }
    })
    .catch(err => {
        console.error("Add to cart error:", err);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "Unable to add to cart right now."
        });
    });
}


function updateCartCount() {
    fetch("/cart/count")
        .then(res => res.json())
        .then(data => {
            const badge = document.querySelector(".icon-count");
            if (!badge) return;

            badge.textContent = data.count;
            badge.classList.add("count-bump");
            setTimeout(() => badge.classList.remove("count-bump"), 300);
        })
        .catch(err => console.error("Cart count error:", err));
}


/* =========================
   BOOK DETAILS MODAL
========================= */

document.addEventListener("DOMContentLoaded", () => {
    setupModalDetails();
});

/* =========================
   SETUP MODAL EVENTS
========================= */
function setupModalDetails() {
    const modal = document.getElementById("bookModal");
    const modalContent = document.querySelector(".modal-content");
    const detailButtons = document.querySelectorAll(".details");

    if (!modal || !modalContent || !detailButtons.length) return;

    detailButtons.forEach(btn => {
        btn.addEventListener("click", function () {
            const card = this.closest(".book-card");
            if (!card) return;

            // Populate modal content
            document.getElementById("modalTitle").innerText =
                card.querySelector(".book-title")?.innerText || "";

            document.getElementById("modalAuthor").innerText =
                card.querySelector(".author")?.innerText || "";

            document.getElementById("modalGenre").innerText =
                card.querySelector(".genre")?.innerText || "";

            document.getElementById("modalDescription").innerText =
                card.querySelector(".desc")?.innerText || "";

            document.getElementById("modalPrice").innerText =
                card.querySelector(".price")?.innerText || "";

            document.getElementById("modalStock").innerText =
                card.querySelector(".stock")?.innerText || "";

            const coverImg = card.querySelector(".book-cover img");
            document.getElementById("modalCover").src =
                coverImg ? coverImg.src : "";

            // Show modal
            modal.style.display = "flex";
            modal.classList.remove("fade-out");
            modal.classList.add("fade-in");

            modalContent.classList.remove("zoom-out");
            void modalContent.offsetWidth;
            modalContent.classList.add("zoom-in");
        });
    });
}

/* =========================
   CLOSE MODAL
========================= */
function closeModal() {
    const modal = document.getElementById("bookModal");
    const modalContent = document.querySelector(".modal-content");

    if (!modal || !modalContent) return;

    modal.classList.remove("fade-in");
    modal.classList.add("fade-out");

    modalContent.classList.remove("zoom-in");
    modalContent.classList.add("zoom-out");

    setTimeout(() => {
        modal.style.display = "none";
    }, 250);
}

/* =========================
   CLICK OUTSIDE TO CLOSE
========================= */
document.addEventListener("click", (e) => {
    const modal = document.getElementById("bookModal");
    const modalContent = document.querySelector(".modal-content");

    if (!modal || !modalContent) return;

    if (modal.style.display === "flex") {
        const clickedInside = modalContent.contains(e.target);
        const clickedDetailsBtn = e.target.closest(".details");

        if (!clickedInside && !clickedDetailsBtn) {
            closeModal();
        }
    }
});


/* =========================
   ESC KEY TO CLOSE
========================= */
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeModal();
    }
});


/* =========================
    PAGE INITIALIZATION
========================= */

document.addEventListener("DOMContentLoaded", () => {

    updateCartCount();

    setupModalDetails();

    document.querySelectorAll(".add-cart").forEach(btn => {
        btn.addEventListener("click", function () {
            const card = this.closest(".book-card");
            if (!card) return;

            const bookId = card.getAttribute("data-book-id");
            if (bookId) {
                addToCart(bookId);
            }
        });
    });

    const modalAddCartBtn = document.querySelector(".modal-add-cart");
    if (modalAddCartBtn) {
        modalAddCartBtn.addEventListener("click", function () {
            const bookId = this.getAttribute("data-book-id");
            if (bookId) {
                addToCart(bookId);
            }
        });
    }
});

/* =========================
    TAGIFY MULTIPLE GENRES
========================= */

document.addEventListener("DOMContentLoaded", () => {
    let genreInput = document.querySelector("#genreInput");

    new Tagify(genreInput, {
        enforceWhitelist: false,
        whitelist: [],
        dropdown: {
            enabled: 0
        }
    });
});
