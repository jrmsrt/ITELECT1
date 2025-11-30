document.getElementById("searchBar").addEventListener("keyup", filterBooks);

function applyFilters() {
    filterBooks();
}

function resetFilters() {
    document.getElementById("searchBar").value = "";
    document.getElementById("titleFilter").value = "";
    document.getElementById("authorFilter").value = "";
    document.getElementById("genreFilter").value = "";

    filterBooks(); // refresh grid
}

function filterBooks() {
    const search = document.getElementById("searchBar").value.toLowerCase();
    const title  = document.getElementById("titleFilter").value.toLowerCase();
    const author = document.getElementById("authorFilter").value.toLowerCase();
    const genre  = document.getElementById("genreFilter").value.toLowerCase();

    const cards = document.querySelectorAll(".book-card");
    let visibleCount = 0;

    cards.forEach(card => {
        const matchesSearch =
            card.dataset.title.includes(search) ||
            card.dataset.author.includes(search) ||
            card.dataset.genre.includes(search) ||
            card.dataset.description.includes(search);

        const matchesTitle  = title === ""  || card.dataset.title === title;
        const matchesAuthor = author === "" || card.dataset.author === author;
        const matchesGenre  = genre === ""  || card.dataset.genre === genre;

        const show = matchesSearch && matchesTitle && matchesAuthor && matchesGenre;

        card.style.display = show ? "block" : "none";

        if (show) visibleCount++;
    });

    document.getElementById("resultCount").innerText =
        `Showing ${visibleCount} results`;
}


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

/* Unified Reset Function (FINAL VERSION) */
function resetForm() {

    // Detect which form exists on the page
    const form =
        document.getElementById("editBookForm") ||
        document.getElementById("addBookForm");

    if (!form) return;

    // Reset all text / number / textarea inputs
    form.querySelectorAll("input[type='text'], input[type='number'], textarea")
        .forEach(field => {
            field.value = "";
        });

    // Reset file input
    const coverInput = document.getElementById("coverInput");
    if (coverInput) {
        coverInput.value = "";
    }

    // Reset image preview
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

function toggleFavorite(bookId, btn) {

    fetch(`/toggle_favorite/${bookId}`, {
        method: "POST"
    })
    .then(res => res.json())
    .then(data => {

        if (data.status === "added") {
            btn.classList.add("favorited");
            updateFavoriteCount();   // 🔥 update count immediately
        }
        else if (data.status === "removed") {
            btn.classList.remove("favorited");
            updateFavoriteCount();   // 🔥 update count immediately
        }
        else if (data.status === "not_logged_in") {
            alert("You must log in to add favorites.");
        }
    });
}

function updateFavoriteCount() {
    fetch("/favorites/count")
        .then(res => res.json())
        .then(data => {
            const countElement = document.querySelector(".favorite-count");

            if (countElement) {
                countElement.textContent = data.count;

                // Optional pop animation to show change
                countElement.classList.add("count-bump");
                setTimeout(() => countElement.classList.remove("count-bump"), 300);
            }
        });
}


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

document.addEventListener("DOMContentLoaded", () => {
    const detailButtons = document.querySelectorAll(".details");
    const modal = document.getElementById("bookModal");
    const modalContent = document.querySelector(".modal-content");

    detailButtons.forEach(btn => {
        btn.addEventListener("click", function () {
            const card = this.closest(".book-card");

            // Fill modal with data
            document.getElementById("modalTitle").innerText = card.querySelector(".book-title").innerText;
            document.getElementById("modalAuthor").innerText = card.querySelector(".book-meta span").innerText;
            document.getElementById("modalGenre").innerText = card.querySelector(".book-meta").innerText.split("|")[1].trim();
            const rawText = card.querySelector(".desc").innerText.trim();
            const paragraphs = rawText.split(/\n\s*\n/);
            document.getElementById("modalDescription").innerHTML =
                paragraphs.map(p => `<p>${p}</p>`).join("");
            document.getElementById("modalPrice").innerText = card.querySelector(".price").innerText;
            document.getElementById("modalStock").innerText = card.querySelector(".stock").innerText;

            // Cover image
            const imgSrc = card.querySelector(".book-cover img").src;
            document.getElementById("modalCover").src = imgSrc;

            // ---- OPEN MODAL WITH ANIMATIONS ----
            modal.style.display = "flex";

            modal.classList.remove("fade-out");
            modal.classList.add("fade-in");

            modalContent.classList.remove("zoom-out");
            void modalContent.offsetWidth; 
            modalContent.classList.add("zoom-in");
        });
    });
});

/* ------------ CLOSE WITH FADE + ZOOM ------------ */
function closeModal() {
    const modal = document.getElementById("bookModal");
    const modalContent = document.querySelector(".modal-content");

    // Start fade & zoom-out animations
    modal.classList.remove("fade-in");
    modal.classList.add("fade-out");

    modalContent.classList.remove("zoom-in");
    modalContent.classList.add("zoom-out");

    // Hide after animations finish
    setTimeout(() => {
        modal.style.display = "none";
    }, 250);
}

/* ------------ CLOSE WHEN CLICKING OUTSIDE ------------ */
document.addEventListener("click", function (e) {
    const modal = document.getElementById("bookModal");
    const modalContent = document.querySelector(".modal-content");

    if (modal.style.display === "flex") {
        const inside = modalContent.contains(e.target);
        const detailsBtn = e.target.classList.contains("details");

        if (!inside && !detailsBtn) {
            closeModal();
        }
    }
});
