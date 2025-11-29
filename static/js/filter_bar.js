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
