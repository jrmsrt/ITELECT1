const toggleButton = document.getElementById('toggle-btn');
const sidebar = document.getElementById('sidebar');

/* ===============================
   RESTORE STATE
   =============================== */
document.addEventListener('DOMContentLoaded', () => {
  const state = localStorage.getItem('sidebar');
  if (state === 'closed') {
    sidebar.classList.add('close');
    toggleButton?.classList.add('rotate');
  }
});

/* ===============================
   TOGGLE SIDEBAR
   =============================== */
function toggleSidebar() {
  const isClosed = sidebar.classList.toggle('close');
  toggleButton.classList.toggle('rotate');

  if (isClosed) {
    document.documentElement.setAttribute('data-sidebar', 'closed');
    localStorage.setItem('sidebar', 'closed');
  } else {
    document.documentElement.removeAttribute('data-sidebar');
    localStorage.setItem('sidebar', 'open');
  }
}

/* ===============================
   DISABLE SUBMENUS WHEN CLOSED
   =============================== */
function toggleSubMenu(button) {
  if (sidebar.classList.contains('close')) return;

  const submenu = button.nextElementSibling;
  const isOpen = submenu.classList.contains('show');

  closeAllSubMenus();

  if (!isOpen) {
    submenu.classList.add('show');
    button.classList.add('rotate');
  }
}

/* ===============================
   CLOSE ALL SUBMENUS
   =============================== */
function closeAllSubMenus() {
  sidebar.querySelectorAll('.show').forEach(menu => {
    menu.classList.remove('show');
    menu.previousElementSibling?.classList.remove('rotate');
  });
}
