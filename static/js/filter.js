
function toggleFilterForm() {
    const form = document.getElementById('filterForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

document.getElementById('searchBar').addEventListener('keyup', function() {
    const search = this.value.toLowerCase();
    document.querySelectorAll('#bookTable tbody tr').forEach(row => {
        const match = Array.from(row.children).some(td => td.textContent.toLowerCase().includes(search));
        row.style.display = match ? '' : 'none';
    });
});

function applyFilters() {
    const title = document.getElementById('titleFilter').value;
    const author = document.getElementById('authorFilter').value;
    const isbn = document.getElementById('isbnFilter').value;

    document.querySelectorAll('#bookTable tbody tr').forEach(row => {
        const titleMatch = title === '' || row.cells[2].textContent === title;
        const authorMatch = author === '' || row.cells[3].textContent === author;
        const isbnMatch = isbn === '' || row.cells[4].textContent === isbn;
        row.style.display = (titleMatch && authorMatch && isbnMatch) ? '' : 'none';
    });
}

function resetFilters() {
    document.getElementById('titleFilter').value = '';
    document.getElementById('authorFilter').value = '';
    document.getElementById('isbnFilter').value = '';
    document.getElementById('searchBar').value = '';
    document.querySelectorAll('#bookTable tbody tr').forEach(row => row.style.display = '');
}

function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(12);
    doc.text("Books List", 105, 15, {align: 'center'});

    doc.autoTable({
        html: '#bookTable',
        startY: 25,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 0, 0] }
    });

    doc.save('books_list.pdf');
}

function exportToExcel() {
    const table = document.getElementById("bookTable");
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.table_to_sheet(table);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Books List");
    XLSX.writeFile(workbook, "books_list.xlsx");
}
