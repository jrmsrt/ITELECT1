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

    const form = document.getElementById("editBookForm");

    // Clear ALL input fields manually
    form.querySelectorAll("input[type='text'], input[type='number'], textarea").forEach(field => {
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

    preview.src = "";
    preview.style.display = "none";
    placeholder.style.display = "block";
}
