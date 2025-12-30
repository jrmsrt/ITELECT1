/* =========================
    UPLOADING THE PHOTO
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


// ===============================
//  EDIT/CANCEL ANNOUNCEMENT POST
// ===============================

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("announcement-form");
    const animatedWrapper = document.querySelector(".form-animated-wrapper");
    
    const titleInput = document.getElementById("title");
    const contentInput = document.getElementById("content");
    const coverInput = document.getElementById("coverInput");
    const previewImg = document.getElementById("preview-img");
    const placeholder = document.getElementById("placeholder-text");
    const cancelBtn = document.getElementById("cancel-edit-btn");

    const editButtons = document.querySelectorAll(".edit-btn");
    const originalFormAction = form.getAttribute("action");

    // -----------------------------
    // EDIT BUTTON FUNCTION
    // -----------------------------
    editButtons.forEach(button => {
        button.addEventListener("click", function (e) {
            e.preventDefault();

            const id = this.dataset.id;
            const title = this.dataset.title;
            const content = this.dataset.content;
            const photo = this.dataset.photo;

            // Fill inputs
            titleInput.value = title;
            contentInput.value = content;

            // Load existing image into preview
            if (photo) {
                previewImg.src = `/static/uploads/announcements/${photo}`;
                previewImg.style.display = "block";
                placeholder.style.display = "none";
            } else {
                previewImg.src = "";
                previewImg.style.display = "none";
                placeholder.style.display = "block";
            }

            // Change form action
            form.action = `/admin/announcements/edit/${id}`;

            // Show cancel button
            cancelBtn.style.display = "inline-block";

            // Reset animation so it replays every time
            animatedWrapper.classList.remove("scale-down", "scale-normal");
            void animatedWrapper.offsetWidth; // Force reflow
            animatedWrapper.classList.add("scale-normal");

            // Scroll to form
            animatedWrapper.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });


    // -----------------------------
    // CANCEL EDIT FUNCTION
    // -----------------------------
    cancelBtn.addEventListener("click", function () {

        animatedWrapper.classList.remove("scale-normal");
        animatedWrapper.classList.add("scale-down");

        setTimeout(() => {

            // Reset fields
            titleInput.value = "";
            contentInput.value = "";
            coverInput.value = "";

            // Reset form action
            form.action = originalFormAction;

            // Hide cancel button
            cancelBtn.style.display = "none";

            // Reset preview image
            previewImg.src = "";
            previewImg.style.display = "none";
            placeholder.style.display = "block";

            // Return to normal scale
            animatedWrapper.classList.remove("scale-down");
            animatedWrapper.classList.add("scale-normal");

        }, 300);
    });
});


// ===============================
//  CLEAR FIELDS
// ===============================

function resetForm() {

    const form =
        document.getElementById("announcement-form");

    if (!form) return;

    form.querySelectorAll("input[type='text'], textarea")
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


// ===============================
//  SWEETALERT TOASTS (ANNOUNCEMENTS)
// ===============================
const toastDataEl = document.getElementById("announcement-toast-data");

if (toastDataEl) {
    const TOASTS = JSON.parse(toastDataEl.textContent);

    if (TOASTS.post) {
        Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Announcement successfully posted!",
            showConfirmButton: false,
            timer: 1500
        });
    }

    if (TOASTS.edit) {
        Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Announcement successfully updated!",
            showConfirmButton: false,
            timer: 1500
        });
    }

    if (TOASTS.delete) {
        Swal.fire({
            toast: true,
            position: "top-end",
            icon: "success",
            title: "Announcement successfully deleted!",
            showConfirmButton: false,
            timer: 1500
        });
    }
}
