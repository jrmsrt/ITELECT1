// ============================================================
// BOOKHAVEN AI — FLOATING CHATBOT LOGIC
// ============================================================
const CHAT_STATE_KEY = "bookhaven_ai_open";
const CHAT_MESSAGES_KEY = "bookhaven_ai_messages";
const CHAT_CLOSED_KEY = "bookhaven_ai_closed";

const toggleBtn = document.getElementById("ai-chatbot-toggle");
const chatWindow = document.getElementById("ai-chatbot-window");
const closeBtn = document.getElementById("ai-chatbot-close");
const minimizeBtn = document.getElementById("ai-chatbot-minimize");
const sendBtn = document.getElementById("ai-chatbot-send");
const inputBox = document.getElementById("ai-chatbot-input");
const msgBox = document.getElementById("ai-chatbot-messages");

let hasIntroShown = false;

// ============================================================
// INTRO MESSAGE
// ============================================================
function showIntroMessage() {
    if (hasIntroShown) return;

    const intro = document.createElement("div");
    intro.className = "ai-msg ai-intro-msg";
    intro.innerHTML = `
        Hi! I’m <b>Haven</b>, your BookHaven virtual assistant 👋<br>
        I’m here to help you get started or answer your questions.<br><br>

        <b>You may want to ask:</b>

        <div class="ai-intro-list">
            <button data-msg="How do I search for books?">How do I search for books?</button>
            <button data-msg="What are your store hours?">What are your store hours?</button>
            <button data-msg="How does pickup work?">How does pickup work?</button>
            <button data-msg="Where is your store located?">Where is your store located?</button>
        </div>
    `;

    msgBox.appendChild(intro);
    scrollToBottom();
    hasIntroShown = true;
}

// ============================================================
// TOGGLE CHAT WINDOW
// ============================================================
toggleBtn.addEventListener("click", () => {
    chatWindow.style.display = "flex";
    setTimeout(() => chatWindow.classList.add("open"), 10);

    localStorage.setItem(CHAT_STATE_KEY, "open");
    localStorage.removeItem(CHAT_CLOSED_KEY);

    if (!hasIntroShown && msgBox.children.length === 0) {
        showIntroMessage();
        saveMessages();
    }
});

// ============================================================
// CLOSE (CLEAR HISTORY)
// ============================================================
closeBtn.addEventListener("click", () => {
    chatWindow.classList.remove("open");

    setTimeout(() => {
        chatWindow.style.display = "none";
        msgBox.innerHTML = "";
        hasIntroShown = false;
        localStorage.removeItem(CHAT_MESSAGES_KEY);
    }, 200);

    localStorage.setItem(CHAT_STATE_KEY, "closed");
    localStorage.setItem(CHAT_CLOSED_KEY, "true");
});

// ============================================================
// MINIMIZE (KEEP HISTORY)
// ============================================================
minimizeBtn.addEventListener("click", () => {
    chatWindow.classList.remove("open");

    setTimeout(() => {
        chatWindow.style.display = "none";
    }, 200);

    localStorage.setItem(CHAT_STATE_KEY, "closed");
});

// ============================================================
// SEND MESSAGE
// ============================================================
sendBtn.addEventListener("click", sendMessage);
inputBox.addEventListener("keypress", e => {
    if (e.key === "Enter") sendMessage();
});

function sendMessage(textOverride = null) {
    const text = textOverride || inputBox.value.trim();
    if (!text) return;

    addUserMessage(text);
    inputBox.value = "";

    const typing = showTypingIndicator();

    fetch("/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
    })
    .then(res => res.json())
    .then(data => {
        typing.remove();
        addAIMessage(data.reply);
    })
    .catch(() => {
        typing.remove();
        addAIMessage("I’m having trouble responding right now. Please try again shortly.");
    });
}

// ============================================================
// MESSAGE HELPERS
// ============================================================
function saveMessages() {
    localStorage.setItem(CHAT_MESSAGES_KEY, msgBox.innerHTML);
}

function addUserMessage(text) {
    const msg = document.createElement("div");
    msg.className = "user-msg";
    msg.textContent = text;
    msgBox.appendChild(msg);
    saveMessages();
    scrollToBottom();
}

function addAIMessage(text) {
    const msg = document.createElement("div");
    msg.className = "ai-msg";
    msg.innerHTML = formatText(text);
    msgBox.appendChild(msg);
    saveMessages();
    scrollToBottom();
}

function showTypingIndicator() {
    const typing = document.createElement("div");
    typing.className = "typing-indicator";
    typing.innerHTML = `<span></span><span></span><span></span>`;
    msgBox.appendChild(typing);
    scrollToBottom();
    return typing;
}

function scrollToBottom() {
    msgBox.scrollTop = msgBox.scrollHeight;
}

// ============================================================
// QUICK REPLIES (INCLUDING INTRO BUTTONS)
// ============================================================
document.addEventListener("click", e => {
    const btn = e.target.closest("button[data-msg]");
    if (!btn) return;
    sendMessage(btn.dataset.msg);
});


// ============================================================
// FORMATTING
// ============================================================
function formatText(text) {
    if (!text) return "";
    let escaped = text
        .replace(/&/g, "&amp;")
        .replace(/&lt;/g, "&amp;lt;")
        .replace(/&gt;/g, "&amp;gt;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Convert escaped versions of allowed HTML tags back to actual HTML tags
    escaped = escaped
        .replace(/&lt;b&gt;/gi, "<b>")
        .replace(/&lt;\/b&gt;/gi, "</b>")
        .replace(/&lt;i&gt;/gi, "<i>")
        .replace(/&lt;\/i&gt;/gi, "</i>")
        .replace(/&lt;br\s*\/?&gt;/gi, "<br>");

    return escaped
        // **bold
        .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
        // *italic*
        .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<i>$2</i>")
        // new lines
        .replace(/\n/g, "<br>");
}


window.addEventListener("load", () => {
    const chatState = localStorage.getItem(CHAT_STATE_KEY);
    const wasManuallyClosed = localStorage.getItem(CHAT_CLOSED_KEY);
    const savedMessages = localStorage.getItem(CHAT_MESSAGES_KEY);

    if (savedMessages) {
        msgBox.innerHTML = savedMessages;
        hasIntroShown = true;
        scrollToBottom();
    }

    if (chatState === "open" && !wasManuallyClosed) {
        chatWindow.style.display = "flex";
        setTimeout(() => chatWindow.classList.add("open"), 50);
    }
});
