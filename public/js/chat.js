// public/js/chat.js
// ===== ПОЛНАЯ ЛОГИКА ЧАТА: ИСПРАВЛЕНО И ОПТИМИЗИРОВАНО =====

let chatSocket = null;
let currentTripId = null;
let selectedImage = null;
let currentContextMenu = null;
let currentMessageId = null;
let isTyping = false;
let typingTimeout = null;
let readObserver = null;

// ===== ГЛОБАЛЬНЫЕ ФУНКЦИИ =====
window.openChatModal = function () {
  const modal = document.getElementById("chatModal");
  if (!modal) return;
  modal.style.display = "flex";
  initNotificationStyles();
  requestNotificationPermission();
  const tripId = window.travelData?.id;
  if (tripId) {
    currentTripId = tripId;
    setTimeout(() => initChat(tripId), 100);
  }
};

window.closeChatModal = function () {
  const modal = document.getElementById("chatModal");
  if (modal) modal.style.display = "none";
  clearImagePreview();
  hideContextMenu();
  const searchInput = document.getElementById("chatSearchInput");
  if (searchInput) {
    searchInput.value = "";
    if (currentTripId) loadChatHistory(currentTripId);
  }
};

window.sendChatMessage = sendChatMessage;
window.handleChatKeydown = handleChatKeydown;
window.handleImageSelect = handleImageSelect;

// ===== ВСПОМОГАТЕЛЬНЫЕ =====
function getCurrentUserId() {
  const id = window.currentUserId ?? window.travelData?.userId;
  return id != null ? parseInt(id) : null;
}

function getAvatarLetter(userId) {
  const parts = window.travelData?.participants || [];
  const u = parts.find((p) => parseInt(p.id) === parseInt(userId));
  return u?.username ? u.username.charAt(0).toUpperCase() : "?";
}

function formatTime(dateString) {
  if (!dateString)
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  try {
    const d = new Date(dateString);
    return isNaN(d.getTime())
      ? new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

// Безопасное декодирование (на случай старых записей в БД)
function safeDecodeText(text) {
  if (!text) return "";
  // Если текст выглядит как зашифрованная строка CryptoJS, пробуем расшифровать
  if (text.startsWith("U2FsdGVkX1")) {
    try {
      if (typeof CryptoJS !== "undefined") {
        const bytes = CryptoJS.AES.decrypt(
          text,
          "client_side_key_for_demo_only_32ch!",
        );
        const decoded = bytes.toString(CryptoJS.enc.Utf8);
        if (decoded) return decoded;
      }
    } catch (e) {
      /* игнорируем ошибки декодирования */
    }
  }
  return text;
}

function normalizeMsg(msg) {
  return {
    id: msg.id,
    userId: msg.user_id ?? msg.userId,
    text: safeDecodeText(msg.text),
    imageUrl: msg.image_url ?? msg.imageUrl,
    createdAt: msg.created_at ?? msg.createdAt ?? new Date().toISOString(),
    status: msg.status ?? "sent",
    userName: msg.user_name ?? getAvatarLetter(msg.user_id ?? msg.userId),
  };
}

function escapeHtml(t) {
  const d = document.createElement("div");
  d.textContent = t;
  return d.innerHTML;
}
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function scrollToBottom() {
  const c = document.getElementById("chatMessages");
  if (c) c.scrollTop = c.scrollHeight;
}

// ===== ОТРИСОВКА СООБЩЕНИЯ =====
function appendMessageToUI(msg, highlightMode = false, highlightQuery = "") {
  if (!msg.text?.trim() && !msg.imageUrl) return;

  const myId = getCurrentUserId();
  const msgUid = parseInt(msg.userId);
  const isMyMessage = myId !== null && msgUid === myId;

  const container = document.getElementById("chatMessages");
  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-message ${isMyMessage ? "mine" : "other"}`;
  msgDiv.dataset.messageId = msg.id;
  msgDiv.dataset.createdAt = msg.createdAt;
  msgDiv.style.cssText = `display:flex;flex-direction:${isMyMessage ? "row-reverse" : "row"};gap:10px;align-items:${isMyMessage ? "flex-end" : "flex-start"};margin:4px 0;position:relative;`;

  if (isMyMessage) {
    msgDiv.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, msg.id, msg.createdAt);
    });
    let pt;
    msgDiv.addEventListener("touchstart", (e) => {
      pt = setTimeout(() => {
        e.preventDefault();
        if (navigator.vibrate) navigator.vibrate(50);
        showContextMenu(
          e.touches[0].clientX,
          e.touches[0].clientY,
          msg.id,
          msg.createdAt,
        );
      }, 500);
    });
    msgDiv.addEventListener("touchend", () => clearTimeout(pt));
    msgDiv.addEventListener("touchmove", () => clearTimeout(pt));
  }

  const avatar = document.createElement("div");
  avatar.className = "chat-avatar";
  avatar.style.cssText = `width:36px;height:36px;min-width:36px;border-radius:50%;background:${isMyMessage ? "#007bff" : "#6c757d"};color:white;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;`;
  avatar.textContent = msg.userName || "?";

  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${isMyMessage ? "mine" : "other"}`;
  bubble.style.cssText = `max-width:75%;padding:10px 14px;border-radius:18px;background:${isMyMessage ? "#007bff" : "#f1f0f0"};color:${isMyMessage ? "white" : "#333"};font-size:14px;line-height:1.4;word-wrap:break-word;position:relative;`;

  if (msg.text?.trim()) {
    const textSpan = document.createElement("div");
    textSpan.className = "chat-text";
    if (highlightMode && highlightQuery) {
      textSpan.innerHTML = msg.text.replace(
        new RegExp(`(${escapeRegExp(highlightQuery)})`, "gi"),
        '<mark style="background:yellow;color:black;border-radius:2px;padding:0 2px">$1</mark>',
      );
    } else {
      textSpan.textContent = msg.text;
    }
    bubble.appendChild(textSpan);
  }

  if (msg.imageUrl) {
    const img = document.createElement("img");
    img.src = msg.imageUrl;
    img.style.cssText =
      "max-width:100%;border-radius:12px;margin-top:8px;cursor:pointer;display:block;";
    img.onclick = () => window.open(msg.imageUrl, "_blank");
    bubble.appendChild(img);
  }

  const infoDiv = document.createElement("div");
  infoDiv.style.cssText = `font-size:11px;margin-top:4px;text-align:${isMyMessage ? "right" : "left"};display:flex;align-items:center;justify-content:${isMyMessage ? "flex-end" : "flex-start"};gap:4px;color:${isMyMessage ? "rgba(255,255,255,0.7)" : "#888"};`;

  const timeSpan = document.createElement("span");
  timeSpan.className = "chat-time";
  timeSpan.textContent = formatTime(msg.createdAt);
  infoDiv.appendChild(timeSpan);

  if (isMyMessage) {
    const statusSpan = document.createElement("span");
    statusSpan.className = "chat-status";
    statusSpan.dataset.status = msg.status || "sent";
    statusSpan.textContent = msg.status === "read" ? "✓✓" : "✓";
    if (msg.status === "read") {
      statusSpan.style.color = "#4ade80";
      statusSpan.style.fontWeight = "bold";
    }
    infoDiv.appendChild(statusSpan);
  }

  bubble.appendChild(infoDiv);
  msgDiv.appendChild(avatar);
  msgDiv.appendChild(bubble);
  container.appendChild(msgDiv);

  if (!isMyMessage && readObserver) readObserver.observe(msgDiv);
}

// ===== ИСТОРИЯ И ПОИСК =====
async function loadChatHistory(tripId) {
  const container = document.getElementById("chatMessages");
  container.innerHTML = '<div class="chat-loading">Загрузка...</div>';
  try {
    const res = await fetch(`/api/trips/${tripId}/messages`);
    const data = await res.json();
    container.innerHTML = "";
    if (!data.success || !data.messages?.length) {
      container.innerHTML =
        '<div class="chat-empty">Сообщений пока нет. Напишите первым! 👋</div>';
      return;
    }
    data.messages.forEach((m) => appendMessageToUI(normalizeMsg(m), false));
    if (readObserver)
      document
        .querySelectorAll(".chat-message:not(.mine)")
        .forEach((el) => readObserver.observe(el));
  } catch (e) {
    console.error(e);
    container.innerHTML = '<div class="chat-error">Ошибка загрузки</div>';
  }
}

function initSearch() {
  const input = document.getElementById("chatSearchInput");
  if (!input) return;
  let t;
  input.addEventListener("input", (e) => {
    clearTimeout(t);
    t = setTimeout(() => {
      const q = e.target.value.trim();
      if (!currentTripId) return;
      q ? searchMessages(q) : loadChatHistory(currentTripId);
    }, 500);
  });
}

async function searchMessages(query) {
  const container = document.getElementById("chatMessages");
  container.innerHTML = '<div class="chat-loading">Поиск...</div>';
  try {
    const res = await fetch(
      `/api/trips/${currentTripId}/messages/search?q=${encodeURIComponent(query)}`,
    );
    const data = await res.json();
    container.innerHTML = "";
    if (!data.success || !data.messages?.length) {
      container.innerHTML = `<div class="chat-empty">Ничего не найдено</div>`;
      return;
    }
    data.messages
      .reverse()
      .forEach((m) => appendMessageToUI(normalizeMsg(m), true, query));
  } catch (e) {
    container.innerHTML = '<div class="chat-error">Ошибка поиска</div>';
  }
}

// ===== ПРОЧТЕНО / СТАТУСЫ =====
function initReadObserver() {
  if (readObserver) return;
  readObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const d = e.target;
          if (!d.classList.contains("mine") && d.dataset.messageId) {
            markAsRead(d.dataset.messageId);
            readObserver.unobserve(d);
          }
        }
      });
    },
    { root: document.getElementById("chatMessages"), threshold: 0.5 },
  );
}

function markAsRead(id) {
  if (!chatSocket || !currentTripId) return;
  const el = document.querySelector(
    `.chat-message[data-message-id="${id}"] .chat-status`,
  );
  if (el && el.dataset.status !== "read") {
    updateStatusIcon(el, "read");
    chatSocket.emit("update_message_status", {
      tripId: currentTripId,
      messageId: id,
      status: "read",
    });
  }
}

function updateStatusIcon(el, status) {
  if (status === "delivered" || status === "read") {
    el.textContent = "✓✓";
    el.dataset.status = status;
  }
  if (status === "read") {
    el.style.color = "#4ade80";
    el.style.fontWeight = "bold";
  }
}

// ===== SOCKET INIT =====
async function initChat(tripId) {
  currentTripId = tripId;
  const userId = getCurrentUserId();
  if (!userId) {
    console.error("❌ currentUserId не установлен!");
    return;
  }

  if (!chatSocket) {
    chatSocket = io();
    chatSocket.on("connect", () => chatSocket.emit("authenticate", userId));
    chatSocket.on("authenticated", () =>
      chatSocket.emit("join_trip_chat", { tripId, userId }),
    );

    chatSocket.on("new_message", (msg) => {
      const clean = normalizeMsg(msg);
      const open =
        document.getElementById("chatModal")?.style.display === "block";

      // 🔔 Уведомления ТОЛЬКО для чужих сообщений
      if (!open && clean.userId !== window.currentUserId) {
        showNotification(
          "💬 Новое сообщение",
          clean.text?.substring(0, 50) || "📷 Фото",
        );
      }

      const si = document.getElementById("chatSearchInput");
      if (si && si.value.trim()) searchMessages(si.value.trim());
      else {
        appendMessageToUI(clean);
        scrollToBottom();
      }

      if (open && clean.userId !== window.currentUserId) markAsRead(clean.id);
    });

    chatSocket.on("message_edited", (data) => {
      const div = document.querySelector(
        `.chat-message[data-message-id="${data.messageId}"]`,
      );
      if (div) {
        const txt = div.querySelector(".chat-text");
        if (txt) txt.textContent = safeDecodeText(data.newText);
        const time = div.querySelector(".chat-time");
        if (time && !time.textContent.includes("(изменено)"))
          time.innerHTML =
            time.textContent.trim() +
            ' <small style="color:#999">(изменено)</small>';
      }
    });

    chatSocket.on("message_deleted", (data) => {
      const el = document.querySelector(
        `.chat-message[data-message-id="${data.messageId}"]`,
      );
      if (el) {
        el.style.animation = "slideOutRight 0.3s";
        setTimeout(() => el.remove(), 300);
      }
    });

    chatSocket.on("typing_update", (data) => {
      if (data.userId === window.currentUserId) return;
      const ind = document.getElementById("typingIndicator");
      const txt = document.getElementById("typingText");
      if (data.isTyping) {
        txt.textContent = `${data.username || "Собеседник"} печатает`;
        ind.style.display = "block";
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => (ind.style.display = "none"), 5000);
      } else ind.style.display = "none";
    });

    chatSocket.on("status_updated", (data) => {
      const el = document.querySelector(
        `.chat-message[data-message-id="${data.messageId}"] .chat-status`,
      );
      if (el) updateStatusIcon(el, data.status);
    });
  } else {
    chatSocket.emit("join_trip_chat", { tripId, userId });
  }

  initReadObserver();
  await loadChatHistory(tripId);
  setTimeout(scrollToBottom, 100);
}

// ===== КОНТЕКСТНОЕ МЕНЮ =====
function showContextMenu(x, y, messageId, createdAt) {
  hideContextMenu();
  currentMessageId = messageId;
  let ds = createdAt;
  if (!ds) {
    const el = document.querySelector(
      `.chat-message[data-message-id="${messageId}"]`,
    );
    if (el) ds = el.dataset.createdAt;
  }
  let md;
  try {
    md = new Date(ds);
    if (isNaN(md.getTime())) md = new Date();
  } catch {
    md = new Date();
  }
  const mins = (new Date() - md) / 60000;
  const canEdit = mins <= 5 && mins >= 0;

  const menu = document.createElement("div");
  menu.className = "chat-context-menu";
  menu.style.cssText = `position:fixed;background:white;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,0.25);min-width:220px;z-index:100000;overflow:hidden;animation:fadeIn 0.15s;`;
  menu.innerHTML = `
    <button class="edit-btn" ${!canEdit ? "disabled" : ""} style="display:block;width:100%;padding:14px 18px;border:none;background:none;text-align:left;cursor:${canEdit ? "pointer" : "not-allowed"};color:${canEdit ? "#333" : "#999"}">
      ${canEdit ? "✎ Редактировать" : "◴ Время вышло"}
    </button>
    <div style="height:1px;background:#eee"></div>
    <button class="delete-btn" style="display:block;width:100%;padding:14px 18px;border:none;background:none;text-align:left;cursor:pointer;color:#ff4444">🗑 Удалить</button>`;

  menu.style.top = y + "px";
  menu.style.left = x + "px";
  menu.querySelector(".edit-btn").onclick = (e) => {
    e.stopPropagation();
    if (canEdit) {
      hideContextMenu();
      openEditModal(messageId);
    }
  };
  menu.querySelector(".delete-btn").onclick = (e) => {
    e.stopPropagation();
    hideContextMenu();
    deleteMessage(messageId);
  };
  document.body.appendChild(menu);
  currentContextMenu = menu;
  setTimeout(() => {
    document.addEventListener("click", hideContextMenuOnClick);
    document.addEventListener("touchstart", hideContextMenuOnClick);
  }, 0);
  setTimeout(() => {
    const r = menu.getBoundingClientRect();
    if (r.right > window.innerWidth)
      menu.style.left = window.innerWidth - r.width - 15 + "px";
    if (r.bottom > window.innerHeight)
      menu.style.top = window.innerHeight - r.height - 15 + "px";
  }, 10);
}

function hideContextMenu() {
  if (currentContextMenu) currentContextMenu.remove();
  currentContextMenu = null;
  document.removeEventListener("click", hideContextMenuOnClick);
  document.removeEventListener("touchstart", hideContextMenuOnClick);
}
function hideContextMenuOnClick(e) {
  if (currentContextMenu && !currentContextMenu.contains(e.target))
    hideContextMenu();
}

// ===== РЕДАКТИРОВАНИЕ / УДАЛЕНИЕ =====
function openEditModal(id) {
  const div = document.querySelector(`.chat-message[data-message-id="${id}"]`);
  if (!div) return;
  const txt = div.querySelector(".chat-text");
  const bub = txt.closest(".chat-bubble");
  const old = bub.innerHTML;
  const ta = document.createElement("textarea");
  ta.value = txt.textContent;
  ta.style.cssText =
    "width:100%;padding:8px;border:2px solid #007bff;border-radius:8px;resize:none;font-size:14px;min-height:60px;";
  const acts = document.createElement("div");
  acts.style.cssText =
    "margin-top:8px;display:flex;gap:8px;justify-content:flex-end;";
  acts.innerHTML = `<button class="save" style="padding:6px 12px;background:#007bff;color:white;border:none;border-radius:6px">Сохранить</button><button class="cancel" style="padding:6px 12px;background:#eee;border:none;border-radius:6px">Отмена</button>`;
  bub.innerHTML = "";
  bub.appendChild(ta);
  bub.appendChild(acts);
  ta.focus();
  acts.querySelector(".save").onclick = () => saveEdit(id, ta.value, bub, old);
  acts.querySelector(".cancel").onclick = () => (bub.innerHTML = old);
}

async function saveEdit(id, text, bub, old) {
  const t = text.trim();
  if (!t) return alert("Текст не может быть пустым");
  try {
    const res = await fetch(`/api/messages/${id}/edit`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: t }),
    });
    const d = await res.json();
    if (d.success) {
      const timeEl = bub.querySelector(".chat-time");
      const oldT = timeEl
        ? timeEl.textContent.replace("(изменено)", "").trim()
        : formatTime(new Date());
      bub.innerHTML = `<div class="chat-text">${escapeHtml(t)}</div><div class="chat-time" style="font-size:11px;color:#888;margin-top:4px;text-align:right">${oldT} <small style="color:#999">(изменено)</small></div>`;
      if (chatSocket && currentTripId)
        chatSocket.emit("message_edited", {
          tripId: currentTripId,
          messageId: id,
          newText: t,
        });
    } else {
      alert("Ошибка: " + (d.error || ""));
      bub.innerHTML = old;
    }
  } catch (e) {
    console.error(e);
    bub.innerHTML = old;
  }
}

async function deleteMessage(id) {
  if (!confirm("Удалить сообщение?")) return;
  try {
    const res = await fetch(`/api/messages/${id}`, { method: "DELETE" });
    const d = await res.json();
    if (d.success) {
      const el = document.querySelector(
        `.chat-message[data-message-id="${id}"]`,
      );
      if (el) {
        el.style.animation = "slideOutRight 0.3s";
        setTimeout(() => el.remove(), 300);
      }
      if (chatSocket && currentTripId)
        chatSocket.emit("message_deleted", {
          tripId: currentTripId,
          messageId: id,
        });
    }
  } catch (e) {}
}

// ===== ОТПРАВКА =====
async function sendChatMessage() {
  const inp = document.getElementById("chatTextInput");
  const text = inp.value.trim();

  // 🔹 Сначала загружаем фото, если есть
  let imageUrl = null;
  if (selectedImage) {
    imageUrl = await uploadChatImage(selectedImage);
    if (!imageUrl) {
      alert("❌ Не удалось загрузить фото");
      return;
    }
  }

  if (!text && !imageUrl) {
    inp.focus();
    return;
  }

  if (isTyping) {
    isTyping = false;
    chatSocket.emit("typing_stop", {
      tripId: currentTripId,
      userId: window.currentUserId,
    });
  }

  try {
    chatSocket.emit("send_message", {
      tripId: currentTripId,
      userId: window.currentUserId,
      text: text || null,
      imageUrl: imageUrl,
    });
    inp.value = "";
    clearImagePreview();
    inp.focus();
    const si = document.getElementById("chatSearchInput");
    if (si && si.value.trim()) {
      si.value = "";
      loadChatHistory(currentTripId);
    }
  } catch (e) {
    alert("Не удалось отправить");
  }
}

function handleChatKeydown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
}

// ===== ИЗОБРАЖЕНИЯ =====
function handleImageSelect(e) {
  const f = e.target.files[0];
  if (!f) return;
  if (!f.type.startsWith("image/")) return alert("Только изображения");
  if (f.size > 5 * 1024 * 1024) return alert("Макс. 5MB");
  selectedImage = f;
  const rd = new FileReader();
  rd.onload = (ev) => {
    document.getElementById("chatPreviewImg").src = ev.target.result;
    document.getElementById("chatImagePreview").style.display = "block";
  };
  rd.readAsDataURL(f);
}
function clearImagePreview() {
  selectedImage = null;
  document.getElementById("chatImagePreview").style.display = "none";
  document.getElementById("chatImageInput").value = "";
}

async function uploadChatImage(file) {
  const fd = new FormData();
  fd.append("chatImage", file);
  fd.append("tripId", currentTripId);
  try {
    const r = await fetch("/api/chat/upload-image", {
      method: "POST",
      body: fd,
    });
    if (!r.ok) throw new Error("Server error");
    const d = await r.json();
    return d.success ? d.imageUrl : null;
  } catch (e) {
    console.error("Upload error:", e);
    return null;
  }
}

// ===== УВЕДОМЛЕНИЯ =====
function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default")
    Notification.requestPermission();
}
function showNotification(title, body) {
  const c = document.getElementById("chatNotifications");
  if (!c) return;
  const n = document.createElement("div");
  n.style.cssText =
    "background:white;border-radius:12px;padding:16px;box-shadow:0 4px 20px rgba(0,0,0,0.15);min-width:250px;max-width:350px;margin-bottom:10px;cursor:pointer;border-left:4px solid #007bff;animation:slideInRight 0.3s;font-family:system-ui;";
  n.innerHTML = `<div style="font-weight:600">${title}</div><div style="color:#666;font-size:14px">${body}</div>`;
  n.onclick = () => {
    window.openChatModal();
    n.remove();
  };
  c.appendChild(n);
  setTimeout(() => {
    n.style.animation = "slideOutRight 0.3s";
    setTimeout(() => n.remove(), 300);
  }, 4000);
}
function initNotificationStyles() {
  if (document.getElementById("chatStyles")) return;
  const s = document.createElement("style");
  s.id = "chatStyles";
  s.textContent =
    "@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes slideOutRight{from{transform:translateX(0);opacity:1}to{transform:translateX(100%);opacity:0}}@keyframes fadeIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}";
  document.head.appendChild(s);
}

// ===== ТЕКСТ (ПЕЧАТЬ) =====
const textInput = document.getElementById("chatTextInput");
if (textInput) {
  textInput.addEventListener("input", () => {
    if (!isTyping && currentTripId && window.currentUserId) {
      isTyping = true;
      chatSocket.emit("typing_start", {
        tripId: currentTripId,
        userId: window.currentUserId,
      });
    }
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      if (isTyping) {
        isTyping = false;
        chatSocket.emit("typing_stop", {
          tripId: currentTripId,
          userId: window.currentUserId,
        });
      }
    }, 1000);
  });
}

// ===== ЗАПУСК =====
function initChatScripts() {
  initNotificationStyles();
  initSearch();
}
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", initChatScripts);
else initChatScripts();






function lockChatSize() {
    const modal = document.querySelector('#chatModal .chat-modal-content');
    if (!modal) return;
    
    // Сохраняем исходные размеры
    const originalWidth = window.getComputedStyle(modal).width;
    const originalHeight = window.getComputedStyle(modal).height;
    
    // Наблюдатель за изменениями размера
    const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
            const target = entry.target;
            if (target.style.width !== originalWidth || target.style.height !== originalHeight) {
                // Возвращаем исходные размеры
                target.style.width = '500px';
                target.style.maxWidth = '90vw';
                target.style.height = '700px';
                target.style.maxHeight = '85vh';
                target.style.minHeight = '700px';
            }
        }
    });
    
    resizeObserver.observe(modal);
}

// Запускаем при открытии чата
const originalOpenChatModal = window.openChatModal;
window.openChatModal = function () {
    originalOpenChatModal();
    setTimeout(lockChatSize, 50);
};