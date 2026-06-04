// public/js/chat.js
// ===== ПОЛНАЯ ЛОГИКА ЧАТА =====

let chatSocket = null;
let currentTripId = null;
let selectedImage = null;
let currentContextMenu = null;
let currentMessageId = null;
let isTyping = false;
let typingTimeout = null;
let readObserver = null;

// Запись
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let isVideoRecording = false;
let recordingTimer = null;
let recordingSeconds = 0;
let recordingStream = null;
let videoPreviewElement = null;

// Режим записи
let recordMode = "voice";
let pressTimer = null;
let isPressed = false;

// ===== ГЛОБАЛЬНЫЕ ФУНКЦИИ =====
window.openChatModal = function () {
  console.log("🔓 openChatModal вызвана");
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
  const inp = document.getElementById("chatTextInput");
  if (inp) {
    inp.addEventListener("input", updateSendButton);
    updateSendButton(); // Инициализация кнопки
  }
};

window.closeChatModal = function () {
  const modal = document.getElementById("chatModal");
  if (modal) modal.style.display = "none";
  clearImagePreview();
  hideContextMenu();
  hidePhotoMenu();
  hideVideoPreview();

  if (mediaRecorder && (isRecording || isVideoRecording)) {
    mediaRecorder.stop();
  }
  if (recordingStream) {
    recordingStream.getTracks().forEach((track) => track.stop());
  }

  const searchInput = document.getElementById("chatSearchInput");
  if (searchInput) {
    searchInput.value = "";
    if (currentTripId) loadChatHistory(currentTripId);
  }
};

//  ГЛОБАЛЬНЫЕ ФУНКЦИИ
window.sendChatMessage = sendChatMessage;
window.handleChatKeydown = handleChatKeydown;
window.handleImageSelect = handleImageSelect;
window.togglePhotoMenu = togglePhotoMenu;
window.selectPhotoSource = selectPhotoSource;
window.toggleRecordMode = toggleRecordMode;
window.startVoiceRecording = startVoiceRecording;
window.stopVoiceRecording = stopVoiceRecording;

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

function safeDecodeText(text) {
  if (!text) return "";
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
    } catch (e) {}
  }
  return text;
}

function normalizeMsg(msg) {
  console.log("📩 normalizeMsg вход:", msg);
  const result = {
    id: msg.id,
    userId: msg.user_id ?? msg.userId,
    text: safeDecodeText(msg.text),
    imageUrl: msg.image_url ?? msg.imageUrl ?? null,
    audioUrl: msg.audio_url ?? msg.audioUrl ?? null,
    videoUrl: msg.video_url ?? msg.videoUrl ?? null,
    createdAt: msg.created_at ?? msg.createdAt ?? new Date().toISOString(),
    status: msg.status ?? "sent",
    userName:
      msg.user_name ??
      msg.userName ??
      getAvatarLetter(msg.user_id ?? msg.userId),
  };
  console.log("📩 normalizeMsg результат:", result);
  return result;
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

// ===== ПРЕДПРОСМОТР ВИДЕО =====
function showVideoPreview(stream) {
  hideVideoPreview();
  videoPreviewElement = document.createElement("video");
  videoPreviewElement.srcObject = stream;
  videoPreviewElement.autoplay = true;
  videoPreviewElement.playsinline = true;
  videoPreviewElement.muted = true;
  videoPreviewElement.style.cssText = `
    position: fixed;
    bottom: 100px;
    right: 120px;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid #dc3545;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    z-index: 9999;
    transform: scaleX(-1);
  `;
  document.body.appendChild(videoPreviewElement);
}

function hideVideoPreview() {
  if (videoPreviewElement) {
    videoPreviewElement.remove();
    videoPreviewElement = null;
  }
}

// ===== КНОПКА ОТПРАВКИ/ЗАПИСИ =====
function updateSendButton() {
  const btn = document.getElementById("sendBtn");
  const inp = document.getElementById("chatTextInput");
  if (!btn || !inp) return;

  const hasText = inp.value.trim() || selectedImage;

  if (hasText) {
    //  РЕЖИМ ОТПРАВКИ ТЕКСТА
    btn.innerHTML = "➤";
    btn.dataset.mode = "send";
    btn.style.background = "#007bff";
    btn.style.color = "white";
    btn.title = "Отправить сообщение";

    // Удаляем обработчики записи
    btn.removeEventListener("mousedown", handleRecordStart);
    btn.removeEventListener("mouseup", handleRecordEnd);
    btn.removeEventListener("mouseleave", handleRecordLeave);
    btn.removeEventListener("touchstart", handleRecordTouchStart);
    btn.removeEventListener("touchend", handleRecordTouchEnd);

    // Добавляем обработчик отправки
    btn.onclick = sendChatMessage;

    console.log("✅ Режим: ОТПРАВКА ТЕКСТА");
  } else {
    // 🔹 РЕЖИМ ЗАПИСИ (голосовое/видео)
    updateRecordButtonIcon();
    btn.dataset.mode = "record";

    // Удаляем обработчик отправки
    btn.onclick = null;

    // Добавляем обработчики записи
    btn.addEventListener("mousedown", handleRecordStart);
    btn.addEventListener("mouseup", handleRecordEnd);
    btn.addEventListener("mouseleave", handleRecordLeave);
    btn.addEventListener("touchstart", handleRecordTouchStart, {
      passive: false,
    });
    btn.addEventListener("touchend", handleRecordTouchEnd);

    console.log(" Режим: ЗАПИСЬ (удерживайте для записи)");
  }
}

function updateRecordButtonIcon() {
  const btn = document.getElementById("sendBtn");
  if (!btn) return;

  if (recordMode === "video") {
    btn.innerHTML = "🎥";
    btn.style.background = "#28a745";
    btn.style.color = "white";
    btn.title = "Режим: видеокружочек (удерживайте)";
  } else {
    btn.innerHTML = "🎤";
    btn.style.background = "#f5f5f5";
    btn.style.color = "inherit";
    btn.title = "Режим: голосовое (удерживайте)";
  }
}

function toggleRecordMode() {
  if (isRecording || isVideoRecording) return;
  recordMode = recordMode === "voice" ? "video" : "voice";
  updateRecordButtonIcon();
  const btn = document.getElementById("sendBtn");
  if (btn) {
    btn.style.transform = "scale(0.9)";
    setTimeout(() => (btn.style.transform = "scale(1)"), 150);
  }
}

// ===== ОТПРАВКА СООБЩЕНИЯ =====
async function sendChatMessage() {
  console.log("📤 sendChatMessage вызвана");

  const inp = document.getElementById("chatTextInput");
  if (!inp) {
    console.error("❌ Поле ввода не найдено!");
    return;
  }

  const text = inp.value.trim();
  console.log("📝 Текст:", text);

  // Загружаем фото если есть
  let imageUrl = null;
  if (selectedImage) {
    console.log("📷 Загрузка фото...");
    imageUrl = await uploadChatImage(selectedImage);
    if (!imageUrl) {
      alert(" Не удалось загрузить фото");
      return;
    }
    console.log("✅ Фото загружено:", imageUrl);
  }

  if (!text && !imageUrl) {
    console.log("⚠️ Нет текста и фото");
    inp.focus();
    return;
  }

  // Останавливаем "печатает"
  if (isTyping) {
    isTyping = false;
    if (chatSocket && currentTripId && window.currentUserId) {
      chatSocket.emit("typing_stop", {
        tripId: currentTripId,
        userId: window.currentUserId,
      });
    }
  }

  // Отправляем через сокет
  if (!chatSocket || !currentTripId || !window.currentUserId) {
    console.error("❌ Сокет не подключен:", {
      chatSocket: !!chatSocket,
      currentTripId,
      userId: window.currentUserId,
    });
    alert("Чат не подключен. Обновите страницу.");
    return;
  }

  console.log("🚀 Отправка:", {
    tripId: currentTripId,
    userId: window.currentUserId,
    text,
    imageUrl,
  });

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
    updateSendButton();

    const si = document.getElementById("chatSearchInput");
    if (si && si.value.trim()) {
      si.value = "";
      loadChatHistory(currentTripId);
    }

    console.log("✅ Сообщение отправлено");
  } catch (e) {
    console.error("❌ Ошибка:", e);
    alert("Не удалось отправить");
  }
}

function handleChatKeydown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
}

// ===== ЗАПИСЬ ГОЛОСОВОГО/ВИДЕО =====
async function startVoiceRecording() {
  try {
    const isVideo = recordMode === "video";
    const constraints = isVideo
      ? { audio: true, video: { facingMode: "user", width: 480, height: 480 } }
      : { audio: true };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    recordingStream = stream;

    const mimeType = isVideo
      ? "video/webm;codecs=vp9,opus"
      : "audio/webm;codecs=opus";
    mediaRecorder = new MediaRecorder(stream, { mimeType });

    audioChunks = [];
    recordingSeconds = 0;

    if (isVideo) {
      isVideoRecording = true;
    } else {
      isRecording = true;
    }

    if (isVideo) showVideoPreview(stream);

    const btn = document.getElementById("sendBtn");
    const indicator = document.getElementById("recordingIndicator");

    if (btn) {
      btn.innerHTML = "⏹️";
      btn.style.background = "#dc3545";
      btn.style.color = "white";
    }
    if (indicator) {
      indicator.style.display = "block";
      indicator.style.background = isVideo ? "#28a745" : "#dc3545";
    }

    recordingTimer = setInterval(() => {
      recordingSeconds++;
      const mins = Math.floor(recordingSeconds / 60);
      const secs = recordingSeconds % 60;
      if (indicator) {
        indicator.textContent = isVideo
          ? `🎥 ${mins}:${secs.toString().padStart(2, "0")}`
          : `🎤 ${mins}:${secs.toString().padStart(2, "0")}`;
      }
    }, 1000);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      console.log("🔴 Запись остановлена, chunks:", audioChunks.length);
      if (recordingStream)
        recordingStream.getTracks().forEach((track) => track.stop());
      clearInterval(recordingTimer);
      hideVideoPreview();

      if (btn) updateRecordButtonIcon();
      if (indicator) indicator.style.display = "none";

      if (audioChunks.length > 0) {
        const blob = new Blob(audioChunks, { type: mimeType });
        if (isVideo) await sendVideoMessage(blob);
        else await sendVoiceMessage(blob);
      }

      isRecording = false;
      isVideoRecording = false;
    };

    mediaRecorder.start(100);
    console.log("✅ Запись началась:", isVideo ? "video" : "audio");
  } catch (err) {
    console.error("❌ Ошибка доступа:", err);
    alert("Не удалось получить доступ к микрофону/камере");
    isRecording = false;
    isVideoRecording = false;
  }
}

function stopVoiceRecording() {
  if (mediaRecorder && (isRecording || isVideoRecording)) {
    mediaRecorder.stop();
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
}

// ===== ОБРАБОТЧИКИ КНОПКИ ЗАПИСИ =====
function handleRecordStart(e) {
  e.preventDefault();
  const btn = document.getElementById("sendBtn");
  if (!btn || btn.dataset.mode !== "record") return;

  isPressed = true;
  pressTimer = setTimeout(() => {
    if (isPressed) {
      console.log("⏱️ Долгое нажатие - начало записи");
      startVoiceRecording();
    }
  }, 500);
}

function handleRecordEnd(e) {
  const btn = document.getElementById("sendBtn");
  if (!btn || btn.dataset.mode !== "record") return;

  clearTimeout(pressTimer);

  if (!isRecording && !isVideoRecording) {
    console.log("👆 Короткое нажатие - переключение режима");
    isPressed = false;
    toggleRecordMode();
  } else {
    console.log("👆 Отпускание - остановка записи");
    isPressed = false;
    stopRecording();
  }
}

function handleRecordLeave() {
  if (isPressed) {
    clearTimeout(pressTimer);
    isPressed = false;
    if (isRecording || isVideoRecording) {
      stopRecording();
    }
  }
}

function handleRecordTouchStart(e) {
  e.preventDefault();
  handleRecordStart(e);
}

function handleRecordTouchEnd(e) {
  e.preventDefault();
  handleRecordEnd(e);
}

// ===== ВЫБОР ФОТО =====
function togglePhotoMenu() {
  const menu = document.getElementById("photoSourceMenu");
  if (!menu) return;
  menu.style.display = menu.style.display === "block" ? "none" : "block";
}

function hidePhotoMenu() {
  const menu = document.getElementById("photoSourceMenu");
  if (menu) menu.style.display = "none";
}

function selectPhotoSource(source) {
  hidePhotoMenu();
  const input = document.createElement("input");
  input.type = "file";

  if (source === "gallery") input.accept = "image/*";
  else if (source === "files") input.accept = "*/*";
  else if (source === "camera") {
    input.accept = "image/*";
    input.capture = "environment";
  }

  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (source === "files" && !file.type.startsWith("image/")) {
      return alert("Пока поддерживаются только изображения");
    }
    handleImageSelect({ target: { files: e.target.files } });
  };
  input.click();
}

// ===== ОТПРАВКА ГОЛОСОВОГО/ВИДЕО =====
async function sendVoiceMessage(audioBlob) {
  console.log("🎤 Отправка голосового, size:", audioBlob.size);
  const formData = new FormData();
  formData.append("voiceMessage", audioBlob, `voice_${Date.now()}.webm`);
  formData.append("tripId", currentTripId);

  try {
    const res = await fetch("/api/chat/upload-voice", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    if (data.success) {
      console.log("✅ Голосовое загружено:", data.audioUrl);
      if (chatSocket && currentTripId && window.currentUserId) {
        chatSocket.emit("send_message", {
          tripId: currentTripId,
          userId: window.currentUserId,
          text: null,
          audioUrl: data.audioUrl,
        });
      }
    } else {
      alert("❌ Не удалось отправить голосовое");
    }
  } catch (e) {
    console.error("❌ Ошибка:", e);
    alert("Ошибка сети при отправке голосового");
  }
}

async function sendVideoMessage(videoBlob) {
  console.log("🎥 Отправка видео, size:", videoBlob.size);
  const formData = new FormData();
  formData.append("videoMessage", videoBlob, `video_${Date.now()}.webm`);
  formData.append("tripId", currentTripId);

  try {
    const res = await fetch("/api/chat/upload-video", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    if (data.success) {
      console.log("✅ Видео загружено:", data.videoUrl);
      if (chatSocket && currentTripId && window.currentUserId) {
        chatSocket.emit("send_message", {
          tripId: currentTripId,
          userId: window.currentUserId,
          text: null,
          videoUrl: data.videoUrl,
        });
      }
    } else {
      alert("❌ Не удалось отправить видео");
    }
  } catch (e) {
    console.error("❌ Ошибка:", e);
    alert("Ошибка сети при отправке видео");
  }
}

// ===== ОТРИСОВКА СООБЩЕНИЯ =====
function appendMessageToUI(msg, highlightMode = false, highlightQuery = "") {
  console.log("🎨 appendMessageToUI:", msg);

  if (!msg.text?.trim() && !msg.imageUrl && !msg.audioUrl && !msg.videoUrl) {
    console.warn("⚠️ Пустое сообщение пропущено");
    return;
  }

  const myId = getCurrentUserId();
  const msgUid = parseInt(msg.userId);
  const isMyMessage = myId !== null && msgUid === myId;

  const container = document.getElementById("chatMessages");
  if (!container) {
    console.error("❌ Контейнер не найден!");
    return;
  }

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

    let pressTimer2,
      isScrolling = false,
      startY = 0;
    msgDiv.addEventListener(
      "touchstart",
      (e) => {
        startY = e.touches[0].clientY;
        isScrolling = false;
        msgDiv.style.transition = "background-color 0.2s";
        msgDiv.style.backgroundColor = "rgba(0,123,255,0.1)";
        pressTimer2 = setTimeout(() => {
          if (!isScrolling) {
            e.preventDefault();
            if (navigator.vibrate) navigator.vibrate(50);
            msgDiv.style.backgroundColor = "";
            showContextMenu(
              e.touches[0].clientX,
              e.touches[0].clientY,
              msg.id,
              msg.createdAt,
            );
          }
        }, 500);
      },
      { passive: false },
    );
    msgDiv.addEventListener("touchmove", (e) => {
      if (Math.abs(e.touches[0].clientY - startY) > 10) {
        isScrolling = true;
        clearTimeout(pressTimer2);
        msgDiv.style.backgroundColor = "";
      }
    });
    msgDiv.addEventListener("touchend", () => {
      clearTimeout(pressTimer2);
      msgDiv.style.backgroundColor = "";
    });
    msgDiv.addEventListener("touchcancel", () => {
      clearTimeout(pressTimer2);
      msgDiv.style.backgroundColor = "";
    });
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

  if (msg.audioUrl) {
    const audioDiv = document.createElement("div");
    audioDiv.style.cssText = "margin-top:8px;";
    audioDiv.innerHTML = `
      <audio controls style="max-width:100%;height:32px;">
        <source src="${msg.audioUrl}" type="audio/webm">
      </audio>
    `;
    bubble.appendChild(audioDiv);
  }

  if (msg.videoUrl) {
    const videoDiv = document.createElement("div");
    videoDiv.style.cssText = "margin-top:8px;";
    videoDiv.innerHTML = `
      <video controls style="max-width:200px;max-height:200px;border-radius:50%;object-fit:cover;display:block;" playsinline>
        <source src="${msg.videoUrl}" type="video/webm">
      </video>
    `;
    bubble.appendChild(videoDiv);
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

    if (msg.status === "read") {
      statusSpan.textContent = "✓✓";
      statusSpan.style.color = "#4ade80";
      statusSpan.style.fontWeight = "bold";
    } else if (msg.status === "delivered") {
      statusSpan.textContent = "✓✓";
      statusSpan.style.color = "rgba(255,255,255,0.7)";
    } else {
      statusSpan.textContent = "✓";
      statusSpan.style.color = "rgba(255,255,255,0.7)";
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

// ===== ПРОЧТЕНО =====
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

// ===== SOCKET INIT =====
async function initChat(tripId) {
  currentTripId = tripId;
  const userId = getCurrentUserId();
  if (!userId) {
    console.error("❌ currentUserId не установлен!");
    return;
  }

  console.log("🔌 Инициализация чата:", { tripId, userId });

  if (!chatSocket) {
    chatSocket = io();
    chatSocket.on("connect", () => {
      console.log("✅ Сокет подключен");
      chatSocket.emit("authenticate", userId);
    });
    chatSocket.on("authenticated", () => {
      console.log("✅ Аутентификация пройдена");
      chatSocket.emit("join_trip_chat", { tripId, userId });
    });

    chatSocket.on("new_message", (msg) => {
      console.log("📨 Новое сообщение:", msg);
      const clean = normalizeMsg(msg);
      const open =
        document.getElementById("chatModal")?.style.display === "block";

      if (!open && clean.userId !== window.currentUserId) {
        let preview = clean.text?.substring(0, 50);
        if (clean.audioUrl) preview = "🎤 Голосовое сообщение";
        if (clean.videoUrl) preview = "🎥 Видеокружочек";
        if (clean.imageUrl) preview = "📷 Фото";
        showNotification("💬 Новое сообщение", preview || "...");
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
  const isMobile = window.innerWidth <= 768;

  const menu = document.createElement("div");
  menu.className = "chat-context-menu";

  if (isMobile) {
    menu.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.3);min-width:280px;max-width:90vw;z-index:100000;overflow:hidden;animation:fadeIn 0.15s;`;
  } else {
    menu.style.cssText = `position:fixed;top:${y}px;left:${x}px;background:white;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,0.25);min-width:220px;z-index:100000;overflow:hidden;animation:fadeIn 0.15s;`;
  }

  menu.innerHTML = `
    <button class="edit-btn" ${!canEdit ? "disabled" : ""} style="display:block;width:100%;padding:${isMobile ? "16px" : "14px"} 18px;border:none;background:none;text-align:left;cursor:${canEdit ? "pointer" : "not-allowed"};color:${canEdit ? "#333" : "#999"};font-size:${isMobile ? "16px" : "14px"}">
      ${canEdit ? "✏️ Редактировать" : "⏱️ Время вышло (5 мин)"}
    </button>
    <div style="height:1px;background:#eee"></div>
    <button class="delete-btn" style="display:block;width:100%;padding:${isMobile ? "16px" : "14px"} 18px;border:none;background:none;text-align:left;cursor:pointer;color:#ff4444;font-size:${isMobile ? "16px" : "14px"}">🗑️ Удалить сообщение</button>
  `;

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

  if (!isMobile) {
    setTimeout(() => {
      const r = menu.getBoundingClientRect();
      if (r.right > window.innerWidth)
        menu.style.left = window.innerWidth - r.width - 15 + "px";
      if (r.bottom > window.innerHeight)
        menu.style.top = window.innerHeight - r.height - 15 + "px";
    }, 10);
  }

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
function openEditModal(id) {
  const div = document.querySelector(`.chat-message[data-message-id="${id}"]`);
  if (!div) return;
  const txt = div.querySelector(".chat-text");
  if (!txt) return;
  const bub = txt.closest(".chat-bubble");
  const old = bub.innerHTML;
  const isMobile = window.innerWidth <= 768;

  const ta = document.createElement("textarea");
  ta.value = txt.textContent;
  ta.style.cssText = isMobile
    ? "width:100%;padding:12px;border:2px solid #007bff;border-radius:8px;resize:none;font-size:16px;min-height:100px;box-sizing:border-box;"
    : "width:100%;padding:8px;border:2px solid #007bff;border-radius:8px;resize:none;font-size:14px;min-height:60px;box-sizing:border-box;";

  const acts = document.createElement("div");
  acts.style.cssText =
    "margin-top:8px;display:flex;gap:8px;justify-content:flex-end;";
  acts.innerHTML = `
    <button class="save" style="padding:${isMobile ? "10px 16px" : "6px 12px"};background:#007bff;color:white;border:none;border-radius:6px;font-size:${isMobile ? "16px" : "14px"}">Сохранить</button>
    <button class="cancel" style="padding:${isMobile ? "10px 16px" : "6px 12px"};background:#eee;border:none;border-radius:6px;font-size:${isMobile ? "16px" : "14px"}">Отмена</button>
  `;

  bub.innerHTML = "";
  bub.appendChild(ta);
  bub.appendChild(acts);
  ta.focus();

  if (isMobile)
    setTimeout(
      () => ta.scrollIntoView({ behavior: "smooth", block: "center" }),
      100,
    );

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

// ===== ИЗОБРАЖЕНИЯ =====
function handleImageSelect(e) {
  const f = e.target.files[0];
  if (!f) return;
  if (!f.type.startsWith("image/")) return alert("Только изображения");
  if (f.size > 5 * 1024 * 1024) return alert("Макс. 5MB");
  selectedImage = f;
  const rd = new FileReader();
  rd.onload = (ev) => {
    const preview = document.getElementById("chatPreviewImg");
    const previewContainer = document.getElementById("chatImagePreview");
    if (preview && previewContainer) {
      preview.src = ev.target.result;
      previewContainer.style.display = "block";
    }
  };
  rd.readAsDataURL(f);
  updateSendButton();
}

function clearImagePreview() {
  selectedImage = null;
  const previewContainer = document.getElementById("chatImagePreview");
  const input = document.getElementById("chatImageInput");
  if (previewContainer) previewContainer.style.display = "none";
  if (input) input.value = "";
  updateSendButton();
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
    console.error(e);
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
  s.textContent = `
    @keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
    @keyframes slideOutRight{from{transform:translateX(0);opacity:1}to{transform:translateX(100%);opacity:0}}
    @keyframes fadeIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
    
    @media (max-width: 768px) {
      #chatModal .chat-modal-content {
        width: 100% !important; max-width: 100% !important;
        height: 100% !important; max-height: 100% !important;
        border-radius: 0 !important;
      }
      .chat-input-area { padding: 8px 12px !important; }
      #chatTextInput { font-size: 16px !important; }
      #chatNotifications { right: 10px !important; left: 10px !important; bottom: 80px !important; }
    }
  `;
  document.head.appendChild(s);
}

// ===== ПЕЧАТЬ =====
const textInput = document.getElementById("chatTextInput");
if (textInput) {
  textInput.addEventListener("input", () => {
    updateSendButton();
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
  console.log("🚀 initChatScripts вызвана");
  initNotificationStyles();
  initSearch();
}
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", initChatScripts);
else initChatScripts();
window.showChatNotification = showNotification;
