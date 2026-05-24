// public/js/chat.js
// ===== ПОЛНАЯ ЛОГИКА ЧАТА + ПОИСК + СТАТУСЫ + МОБИЛЬНАЯ АДАПТАЦИЯ =====

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
  if (tripId) setTimeout(() => initChat(tripId), 100);
};

window.closeChatModal = function () {
  const modal = document.getElementById("chatModal");
  if (modal) modal.style.display = "none";
  clearImagePreview();
  hideContextMenu();

  // Сброс поиска при закрытии
  const searchInput = document.getElementById("chatSearchInput");
  if (searchInput) {
    searchInput.value = "";
    // Если чат был открыт, возвращаем историю
    if (currentTripId) loadChatHistory(currentTripId);
  }
};

window.sendChatMessage = sendChatMessage;
window.handleChatKeydown = handleChatKeydown;
window.handleImageSelect = handleImageSelect;

// ===== ИНИЦИАЛИЗАЦИЯ ЧАТА =====
async function initChat(tripId) {
  currentTripId = tripId;
  const userId = window.currentUserId;

  if (!userId) return;

  if (!chatSocket) {
    chatSocket = io();

    chatSocket.on("connect", () => chatSocket.emit("authenticate", userId));
    chatSocket.on("authenticated", () =>
      chatSocket.emit("join_trip_chat", { tripId, userId }),
    );

    // 🔹 Новые сообщения
    chatSocket.on("new_message", (msg) => {
      const isChatOpen =
        document.getElementById("chatModal")?.style.display === "block";
      if (!isChatOpen)
        showNotification(
          "💬 Новое сообщение",
          msg.text?.substring(0, 50) || "📷 Фото",
        );

      // Если активен поиск - обновляем результаты, иначе просто добавляем
      const searchInput = document.getElementById("chatSearchInput");
      const isSearching = searchInput && searchInput.value.trim().length > 0;

      if (isSearching) {
        searchMessages(searchInput.value.trim());
      } else {
        appendMessageToUI(msg);
        scrollToBottom();
      }

      if (isChatOpen && msg.userId !== userId) markAsRead(msg.id);
    });

    // 🔹 Статус "Печатает..."
    chatSocket.on("typing_update", (data) => {
      if (data.userId === window.currentUserId) return;
      const indicator = document.getElementById("typingIndicator");
      const typingText = document.getElementById("typingText");
      if (data.isTyping) {
        typingText.textContent = `${data.username || "Собеседник"} печатает`;
        indicator.style.display = "block";
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(
          () => (indicator.style.display = "none"),
          5000,
        );
      } else {
        indicator.style.display = "none";
      }
    });

    // 🔹 Статусы сообщений
    chatSocket.on("status_updated", (data) => {
      const statusEl = document.querySelector(
        `.chat-message[data-message-id="${data.messageId}"] .chat-status`,
      );
      if (statusEl) updateStatusIcon(statusEl, data.status);
    });

    // 🔹 Редактирование
    chatSocket.on("message_edited", (data) => {
      const el = document.querySelector(
        `.chat-message[data-message-id="${data.messageId}"] .chat-text`,
      );
      if (el) {
        el.textContent = data.newText;
        const timeEl = el.closest(".chat-bubble")?.querySelector(".chat-time");
        if (timeEl && !timeEl.textContent.includes("(изменено)")) {
          timeEl.innerHTML += ' <small style="color:#999">(изменено)</small>';
        }
      }
    });

    // 🔹 Удаление
    chatSocket.on("message_deleted", (data) => {
      const el = document.querySelector(
        `.chat-message[data-message-id="${data.messageId}"]`,
      );
      if (el) {
        el.style.animation = "slideOutRight 0.3s ease-out";
        setTimeout(() => el.remove(), 300);
      }
    });
  } else {
    chatSocket.emit("join_trip_chat", { tripId, userId });
  }

  initReadObserver();
  await loadChatHistory(tripId);
  setTimeout(scrollToBottom, 100);
}

// ===== ПОИСК (Исправленный) =====
function initSearch() {
  const searchInput = document.getElementById("chatSearchInput");
  if (!searchInput) {
    console.warn("⚠️ Поле поиска #chatSearchInput не найдено в HTML");
    return;
  }

  let searchTimeout;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const query = e.target.value.trim();
      if (!currentTripId) {
        console.warn("⚠️ Чат не инициализирован (нет currentTripId)");
        return;
      }

      if (query) {
        searchMessages(query);
      } else {
        loadChatHistory(currentTripId);
      }
    }, 500);
  });
}

async function searchMessages(query) {
  const container = document.getElementById("chatMessages");
  container.innerHTML = '<div class="chat-loading">Поиск...</div>';

  try {
    // Проверяем, что tripId существует
    if (!currentTripId) throw new Error("No tripId");

    const res = await fetch(
      `/api/trips/${currentTripId}/messages/search?q=${encodeURIComponent(query)}`,
    );
    const data = await res.json();

    container.innerHTML = "";
    if (!data.success) {
      container.innerHTML = `<div class="chat-error">Ошибка: ${data.error}</div>`;
      return;
    }

    if (data.messages.length === 0) {
      container.innerHTML = `<div class="chat-empty">Ничего не найдено по запросу "${query}"</div>`;
      return;
    }

    // Рендерим найденные сообщения
    data.messages.reverse().forEach((msg) => {
      appendMessageToUI(msg, true, query); // true = highlight
    });
  } catch (e) {
    console.error("❌ Ошибка поиска:", e);
    container.innerHTML = '<div class="chat-error">Ошибка поиска</div>';
  }
}

// ===== НАБЛЮДАТЕЛЬ "ПРОЧИТАНО" =====
function initReadObserver() {
  if (readObserver) return;
  readObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const msgDiv = entry.target;
          if (!msgDiv.classList.contains("mine") && msgDiv.dataset.messageId) {
            markAsRead(msgDiv.dataset.messageId);
            readObserver.unobserve(msgDiv);
          }
        }
      });
    },
    { root: document.getElementById("chatMessages"), threshold: 0.5 },
  );
}

function markAsRead(messageId) {
  if (!chatSocket || !currentTripId) return;
  const statusEl = document.querySelector(
    `.chat-message[data-message-id="${messageId}"] .chat-status`,
  );
  if (statusEl && statusEl.dataset.status !== "read") {
    updateStatusIcon(statusEl, "read");
    chatSocket.emit("update_message_status", {
      tripId: currentTripId,
      messageId,
      status: "read",
    });
  }
}

function updateStatusIcon(element, status) {
  if (status === "delivered" || status === "read") {
    element.textContent = "✓✓";
    element.dataset.status = status;
  }
  if (status === "read") {
    element.style.color = "#4ade80";
    element.style.fontWeight = "bold";
  }
}

// ===== ЗАГРУЗКА ИСТОРИИ =====
async function loadChatHistory(tripId) {
  const container = document.getElementById("chatMessages");
  container.innerHTML = '<div class="chat-loading">Загрузка...</div>';

  try {
    const res = await fetch(`/api/trips/${tripId}/messages`);
    const data = await res.json();

    if (!data.success) {
      container.innerHTML = `<div class="chat-error">Ошибка: ${data.error}</div>`;
      return;
    }

    container.innerHTML = "";
    if (data.messages.length === 0) {
      container.innerHTML =
        '<div class="chat-empty">Сообщений пока нет. Напишите первым! 👋</div>';
      return;
    }

    data.messages.forEach((msg) => appendMessageToUI(msg, false));

    if (readObserver) {
      document
        .querySelectorAll(".chat-message:not(.mine)")
        .forEach((msg) => readObserver.observe(msg));
    }
  } catch (e) {
    console.error("❌ Ошибка истории:", e);
    container.innerHTML = '<div class="chat-error">Не удалось загрузить</div>';
  }
}

// ===== ОТРИСОВКА СООБЩЕНИЯ =====
function appendMessageToUI(msg, highlightMode = false, highlightQuery = "") {
  const container = document.getElementById("chatMessages");
  const isMyMessage = msg.userId === window.currentUserId;

  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-message ${isMyMessage ? "mine" : "other"}`;
  msgDiv.dataset.messageId = msg.id;
  msgDiv.dataset.createdAt = msg.createdAt;
  msgDiv.style.cssText = `
    display: flex;
    flex-direction: ${isMyMessage ? "row-reverse" : "row"};
    gap: 10px;
    align-items: ${isMyMessage ? "flex-end" : "flex-start"};
    margin: 4px 0;
    position: relative;
  `;

  // 🔹 Меню (ПКМ / Долгое нажатие)
  if (isMyMessage) {
    msgDiv.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, msg.id, msg.createdAt);
    });

    let pressTimer;
    msgDiv.addEventListener("touchstart", (e) => {
      pressTimer = setTimeout(() => {
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
    msgDiv.addEventListener("touchend", () => clearTimeout(pressTimer));
    msgDiv.addEventListener("touchmove", () => clearTimeout(pressTimer));
  }

  // Аватарка
  const avatar = document.createElement("div");
  avatar.className = "chat-avatar";
  avatar.style.cssText = `
    width: 36px; height: 36px; min-width: 36px;
    border-radius: 50%; background: ${isMyMessage ? "#007bff" : "#6c757d"};
    color: white; display: flex; align-items: center; justify-content: center;
    font-weight: bold; font-size: 14px;
  `;
  avatar.textContent = "?";

  // Пузырь
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${isMyMessage ? "mine" : "other"}`;
  bubble.style.cssText = `
    max-width: 75%; padding: 10px 14px; border-radius: 18px;
    background: ${isMyMessage ? "#007bff" : "#f1f0f0"};
    color: ${isMyMessage ? "white" : "#333"};
    font-size: 14px; line-height: 1.4; word-wrap: break-word; position: relative;
  `;

  if (msg.text) {
    const textSpan = document.createElement("div");
    textSpan.className = "chat-text";

    // 🔹 Подсветка текста при поиске
    if (highlightMode && highlightQuery) {
      const regex = new RegExp(`(${escapeRegExp(highlightQuery)})`, "gi");
      textSpan.innerHTML = msg.text.replace(
        regex,
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
    img.style.cssText = `max-width: 100%; border-radius: 12px; margin-top: 8px; cursor: pointer; display: block;`;
    img.onclick = () => window.open(msg.imageUrl, "_blank");
    bubble.appendChild(img);
  }

  // Время и Статус
  const infoDiv = document.createElement("div");
  infoDiv.style.cssText = `
    font-size: 11px; margin-top: 4px; text-align: ${isMyMessage ? "right" : "left"};
    display: flex; align-items: center; justify-content: ${isMyMessage ? "flex-end" : "flex-start"};
    gap: 4px; color: ${isMyMessage ? "rgba(255,255,255,0.7)" : "#888"};
  `;

  const timeSpan = document.createElement("span");
  timeSpan.textContent = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  infoDiv.appendChild(timeSpan);

  if (isMyMessage) {
    const statusSpan = document.createElement("span");
    statusSpan.className = "chat-status";
    statusSpan.dataset.status = msg.status || "sent";
    statusSpan.textContent = msg.status === "read" ? "✓✓" : "✓✓";
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

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ===== ОТПРАВКА =====
async function sendChatMessage() {
  const textInput = document.getElementById("chatTextInput");
  const text = textInput.value.trim();
  const imageUrl = selectedImage ? await uploadChatImage(selectedImage) : null;

  if (!text && !imageUrl) {
    textInput.focus();
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
      imageUrl,
    });
    textInput.value = "";
    clearImagePreview();
    textInput.focus();

    // Если поиск активен - сбрасываем его
    const searchInput = document.getElementById("chatSearchInput");
    if (searchInput && searchInput.value.trim()) {
      searchInput.value = "";
      loadChatHistory(currentTripId);
    }
  } catch (e) {
    console.error("❌ Ошибка отправки:", e);
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
function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    alert("Только изображения");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    alert("Макс. 5MB");
    return;
  }

  selectedImage = file;
  const preview = document.getElementById("chatImagePreview");
  const previewImg = document.getElementById("chatPreviewImg");

  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    preview.style.display = "block";
  };
  reader.readAsDataURL(file);
}

function clearImagePreview() {
  selectedImage = null;
  document.getElementById("chatImagePreview").style.display = "none";
  document.getElementById("chatImageInput").value = "";
}

async function uploadChatImage(file) {
  const formData = new FormData();
  formData.append("chatImage", file);
  formData.append("tripId", currentTripId);
  try {
    const res = await fetch("/api/chat/upload-image", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    return data.success ? data.imageUrl : null;
  } catch (e) {
    return null;
  }
}

// ===== УВЕДОМЛЕНИЯ =====
function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default")
    Notification.requestPermission();
}

function showNotification(title, body) {
  const container = document.getElementById("chatNotifications");
  if (!container) return;
  const notif = document.createElement("div");
  notif.style.cssText = `
    background: white; border-radius: 12px; padding: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15); min-width: 250px; max-width: 350px;
    margin-bottom: 10px; cursor: pointer; border-left: 4px solid #007bff;
    animation: slideInRight 0.3s ease-out; font-family: system-ui;
  `;
  notif.innerHTML = `<div style="font-weight:600">${title}</div><div style="color:#666;font-size:14px">${body}</div>`;
  notif.onclick = () => {
    window.openChatModal();
    notif.remove();
  };
  container.appendChild(notif);
  setTimeout(() => {
    notif.style.animation = "slideOutRight 0.3s ease-out";
    setTimeout(() => notif.remove(), 300);
  }, 4000);
}

function initNotificationStyles() {
  if (document.getElementById("chatStyles")) return;
  const s = document.createElement("style");
  s.id = "chatStyles";
  s.textContent = `
    @keyframes slideInRight { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
    @keyframes slideOutRight { from{transform:translateX(0);opacity:1} to{transform:translateX(100%);opacity:0} }
  `;
  document.head.appendChild(s);
}

// ===== КОНТЕКСТНОЕ МЕНЮ =====
function showContextMenu(x, y, messageId, createdAt) {
  hideContextMenu();
  currentMessageId = messageId;
  const mins = (new Date() - new Date(createdAt)) / 60000;
  const canEdit = mins <= 5;

  const menu = document.createElement("div");
  menu.style.cssText = `
    position:fixed; background:white; border-radius:10px; box-shadow:0 8px 30px rgba(0,0,0,0.25);
    min-width:200px; z-index:100000; overflow:hidden; animation:fadeIn 0.15s;
  `;
  menu.innerHTML = `
    <button class="edit-btn" ${!canEdit ? "disabled" : ""} style="display:block;width:100%;padding:14px;border:none;background:none;text-align:left;cursor:${canEdit ? "pointer" : "default"};color:${canEdit ? "#333" : "#bbb"}">
      ${canEdit ? "✏️ Редактировать" : "⏱️ Время вышло"}
    </button>
    <div style="height:1px;background:#eee"></div>
    <button class="delete-btn" style="display:block;width:100%;padding:14px;border:none;background:none;text-align:left;cursor:pointer;color:#ff4444">
      🗑️ Удалить
    </button>
  `;

  let top = y,
    left = x;
  if (left + 200 > window.innerWidth) left = window.innerWidth - 210;
  if (top + 150 > window.innerHeight) top = window.innerHeight - 160;
  menu.style.top = top + "px";
  menu.style.left = left + "px";

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

// ===== РЕДАКТИРОВАНИЕ =====
function openEditModal(messageId) {
  const msgDiv = document.querySelector(
    `.chat-message[data-message-id="${messageId}"]`,
  );
  if (!msgDiv) return;
  const textEl = msgDiv.querySelector(".chat-text");
  const bubble = textEl.closest(".chat-bubble");
  const oldContent = bubble.innerHTML;

  const ta = document.createElement("textarea");
  ta.value = textEl.textContent;
  ta.style.cssText = `width:100%;padding:8px;border:2px solid #007bff;border-radius:8px;resize:none;font-size:14px;min-height:60px;`;

  const acts = document.createElement("div");
  acts.style.cssText =
    "margin-top:8px;display:flex;gap:8px;justify-content:flex-end";
  acts.innerHTML = `
    <button class="save" style="padding:6px 12px;background:#007bff;color:white;border:none;border-radius:6px">Сохранить</button>
    <button class="cancel" style="padding:6px 12px;background:#eee;border:none;border-radius:6px">Отмена</button>
  `;

  bubble.innerHTML = "";
  bubble.appendChild(ta);
  bubble.appendChild(acts);
  ta.focus();

  acts.querySelector(".save").onclick = () =>
    saveEdit(messageId, ta.value, bubble, oldContent);
  acts.querySelector(".cancel").onclick = () => (bubble.innerHTML = oldContent);
}

async function saveEdit(id, text, bubble, old) {
  if (!text.trim()) return;
  try {
    const res = await fetch(`/api/messages/${id}/edit`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim() }),
    });
    const data = await res.json();
    if (data.success) {
      bubble.innerHTML = `<div class="chat-text">${escapeHtml(text.trim())}</div><div class="chat-time" style="font-size:11px;color:#888;margin-top:4px;text-align:right">${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} <small>(изм)</small></div>`;
      if (chatSocket)
        chatSocket.emit("message_edited", {
          tripId: currentTripId,
          messageId: id,
          newText: text.trim(),
        });
    } else {
      alert("Ошибка");
      bubble.innerHTML = old;
    }
  } catch (e) {
    bubble.innerHTML = old;
  }
}

// ===== УДАЛЕНИЕ =====
async function deleteMessage(id) {
  if (!confirm("Удалить?")) return;
  try {
    const res = await fetch(`/api/messages/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      const el = document.querySelector(
        `.chat-message[data-message-id="${id}"]`,
      );
      if (el) {
        el.style.animation = "slideOutRight 0.3s";
        setTimeout(() => el.remove(), 300);
      }
      if (chatSocket)
        chatSocket.emit("message_deleted", {
          tripId: currentTripId,
          messageId: id,
        });
    }
  } catch (e) {}
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

function escapeHtml(t) {
  const d = document.createElement("div");
  d.textContent = t;
  return d.innerHTML;
}
function scrollToBottom() {
  const c = document.getElementById("chatMessages");
  if (c) c.scrollTop = c.scrollHeight;
}

// ===== ЗАПУСК ПОСЛЕ ЗАГРУЗКИ DOM =====
document.addEventListener("DOMContentLoaded", () => {
  initNotificationStyles();
  initSearch(); // 🔹 Инициализируем поиск здесь
});
