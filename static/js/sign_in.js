document.addEventListener("DOMContentLoaded", function () {

    // Get main container
    const main = document.querySelector("main.sign-in");
    if (!main) return;

    const loginRequired = main.getAttribute("data-login-required");
    const msgType = main.getAttribute("data-msg-type");
    const msg = main.getAttribute("data-msg");
    const redirectUrl = main.getAttribute("data-redirect-url");
    const loginPage = main.getAttribute("data-login-required-page");


    // ===============================
    //  SHOW "LOGIN REQUIRED" TOAST
    // ===============================
    if (loginRequired === "true") {

        let title = "Please log in first.";

        if (loginPage === "favorites") {
            title = "Please log in first to access Favorites.";
        }
        else if (loginPage === "cart") {
            title = "Please log in first to access your Cart.";
        }
        else if (loginPage === "checkout") {
            title = "Please log in first to proceed with Checkout.";
        }

        Swal.fire({
            toast: true,
            icon: 'warning',
            title: title,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3500,
            timerProgressBar: true,
            background: '#fff'
        });
    }


    // ===============================
    //  SHOW SUCCESS LOGIN MESSAGE
    // ===============================
    if (msgType === "success") {
        Swal.fire({
            icon: 'success',
            title: "You're now logged in!",
            text: msg,
            confirmButtonText: "Proceed",
            allowOutsideClick: false,
            allowEscapeKey: false
        }).then(() => {
            window.location.href = redirectUrl;
        });
    }
});


// ===============================
//  SLIDE-UP ALERT BOX CLOSE
// ===============================
function closeAlert() {
    const box = document.getElementById('alertBox');
    if (!box) return;

    box.classList.add('slide-up');
    setTimeout(() => {
        if (box && box.parentNode) box.parentNode.removeChild(box);
    }, 400);
}


// ===============================
// SEGMENT INDICATOR + KEYBOARD
// ===============================
(function () {
    const segment = document.getElementById('mySegment');
    const buttons = Array.from(segment.querySelectorAll('.seg-btn'));
    const indicator = segment.querySelector('.seg-indicator');

    function activateButton(btn, setFocus = false, animate = true) {  // Added 'animate' parameter
        buttons.forEach(b => {
            const selected = b === btn;
            b.classList.toggle('active', selected);
            b.setAttribute('aria-selected', selected ? 'true' : 'false');
        });

        const rect = btn.getBoundingClientRect();
        const parentRect = segment.getBoundingClientRect();
        const left = rect.left - parentRect.left + segment.scrollLeft;
        const width = rect.width;

        // Disable transition on initial load, enable on clicks
        if (!animate) {
            indicator.classList.add('no-transition');
        } else {
            indicator.classList.remove('no-transition');
        }

        indicator.style.transform = `translateX(${left}px)`;
        indicator.style.width = `${width}px`;

        if (setFocus) btn.focus();

        // Persist the active tab index in localStorage
        const idx = buttons.indexOf(btn);
        localStorage.setItem('activeTab', idx);
    }

    // Get persisted active tab or default to 1 (User)
    let activeIndex = localStorage.getItem('activeTab') ? parseInt(localStorage.getItem('activeTab')) : 1;
    if (buttons.length && buttons[activeIndex]) {
        // No animation on load
        activateButton(buttons[activeIndex], false, false);
    }

    buttons.forEach(btn => {
        btn.addEventListener('click', () => activateButton(btn, false, true));  // Animate on clicks

        btn.addEventListener('keydown', (e) => {
            const idx = buttons.indexOf(btn);

            if (e.key === 'ArrowRight' || e.key === 'Right') {
                e.preventDefault();
                activateButton(buttons[(idx + 1) % buttons.length], true, true);
            } 
            else if (e.key === 'ArrowLeft' || e.key === 'Left') {
                e.preventDefault();
                activateButton(buttons[(idx - 1 + buttons.length) % buttons.length], true, true);
            } 
            else if (e.key === 'Home') {
                e.preventDefault();
                activateButton(buttons[0], true, true);
            } 
            else if (e.key === 'End') {
                e.preventDefault();
                activateButton(buttons[buttons.length - 1], true, true);
            } 
            else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                activateButton(btn, true, true);
            }
        });
    });

    window.addEventListener('resize', () => {
        const active = segment.querySelector('.seg-btn.active') || buttons[activeIndex];
        if (active) activateButton(active, false, false);  // No animation on resize
    });

    const ro = new ResizeObserver(() => {
        const active = segment.querySelector('.seg-btn.active') || buttons[activeIndex];
        if (active) activateButton(active, false, false);  // No animation on resize
    });
    ro.observe(segment);
})();

// ===============================
// SLIDE FORM SWITCH ANIMATION
// ===============================
document.addEventListener("DOMContentLoaded", function () {
    const segButtons = document.querySelectorAll(".seg-btn");
    const adminForm = document.getElementById("admin-form");
    const userForm = document.getElementById("user-form");
    const container = document.querySelector(".signin-form");

    // Helper functions to disable/enable inputs in a form
    function disableInputs(el) {
        el.querySelectorAll('input').forEach(input => input.disabled = true);
    }
    function enableInputs(el) {
        el.querySelectorAll('input').forEach(input => input.disabled = false);
    }

    // Set initial state based on persisted tab (no animation on load)
    let activeIndex = localStorage.getItem('activeTab') ? parseInt(localStorage.getItem('activeTab')) : 1;
    if (activeIndex === 0) {  // Admin
        adminForm.style.display = "block";
        userForm.style.display = "none";
        disableInputs(userForm);
        enableInputs(adminForm);
    } else {  // User
        userForm.style.display = "block";
        adminForm.style.display = "none";
        disableInputs(adminForm);
        enableInputs(userForm);
    }

    function animateSwitch(showEl, hideEl, direction) {
        // Disable inputs in the form being hidden
        disableInputs(hideEl);

        const startHeight = container.offsetHeight;

        hideEl.classList.add(direction === "right" ? "slide-out-left" : "slide-out-right");

        setTimeout(() => {
            hideEl.style.display = "none";
            hideEl.classList.remove("slide-out-left", "slide-out-right");

            showEl.style.display = "block";
            showEl.style.opacity = "0";
            showEl.style.transform = direction === "right"
                ? "translateX(40px)"
                : "translateX(-40px)";

            // Enable inputs in the form being shown
            enableInputs(showEl);

            const endHeight = container.offsetHeight;

            container.style.height = startHeight + "px";
            requestAnimationFrame(() => {
                container.style.height = endHeight + "px";
                showEl.style.opacity = "1";
                showEl.style.transform = "translateX(0)";
            });

            setTimeout(() => {
                container.style.height = "";
                showEl.style.transform = "";
                showEl.style.opacity = "";
            }, 400);

        }, 200);
    }

    // Admin → slides from RIGHT
    segButtons[0].addEventListener("click", () => {
        animateSwitch(adminForm, userForm, "right");
    });

    // User → slides from LEFT
    segButtons[1].addEventListener("click", () => {
        animateSwitch(userForm, adminForm, "left");
    });
});

// ===============================
// CONTENT SWAP (Title/Text)
// ===============================
document.addEventListener("DOMContentLoaded", function () {
    const title = document.querySelector(".sign-in-content h1");
    const text = document.querySelector(".sign-in-content p");

    const userContent = {
        title: `a safe place for<br>every story, <br>a peaceful space for every reader.`,
        text: `BookHaven is more than a bookstore—it’s your escape, your discovery zone, your personal haven of stories. Log in to browse, explore, and collect the books that inspire you. From thrilling adventures to quiet reflections, every story is here to find its way to you.`
    };

    const adminContent = {
        title: `hello, admin! <br>control, manage, <br>and protect the shelves.`,
        text: `Access the administrative dashboard to manage books, users, and system activity. Maintain inventory, track records, and keep BookHaven running smoothly and securely.`
    };

    function swapContent(content) {
        title.style.opacity = "0";
        text.style.opacity = "0";
        title.style.transform = "translateY(10px)";
        text.style.transform = "translateY(10px)";

        setTimeout(() => {
            title.innerHTML = content.title;
            text.innerHTML = content.text;

            title.style.opacity = "1";
            text.style.opacity = "1";
            title.style.transform = "translateY(0)";
            text.style.transform = "translateY(0)";
        }, 250);
    }

    const segButtons = document.querySelectorAll(".seg-btn");

    // Set initial content based on persisted tab
    let activeIndex = localStorage.getItem('activeTab') ? parseInt(localStorage.getItem('activeTab')) : 1;
    if (activeIndex === 0) {
        swapContent(adminContent);
    } else {
        swapContent(userContent);
    }

    // Admin click
    segButtons[0].addEventListener("click", () => {
        swapContent(adminContent);
    });

    // User click
    segButtons[1].addEventListener("click", () => {
        swapContent(userContent);
    });
});
