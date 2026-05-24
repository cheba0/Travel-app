// public/js/chat-test.js
console.log("🧪 chat-test.js v4 (с Историей) загружен");

if (typeof io === "undefined") {
  console.error("❌ Socket.io не подключён");
} else {
  const socket = io();
  const TRIP_ID =
    window.travelData?.id ||
    new URL(window.location.href).pathname.match(/\/travel\/(\d+)/)?.[1];
  const USER_ID = window.currentUserId;

  if (!TRIP_ID || !USER_ID) {
    console.error("❌ Не найден ID поездки или пользователя");
  } else {
    console.log(`📊 Цель: trip=${TRIP_ID}, user=${USER_ID}`);

    // 🔹 1. Загружаем ИСТОРИЮ (REST API)
    async function loadHistory() {
      console.log("⏳ Загрузка истории сообщений...");
      try {
        const res = await fetch(`/api/trips/${TRIP_ID}/messages`);
        const data = await res.json();

        if (data.success) {
          console.log(`✅ Загружено ${data.messages.length} сообщений`);
          data.messages.forEach((msg) => {
            // Выводим историю в консоль
            console.log(
              `📜 [${new Date(msg.createdAt).toLocaleTimeString()}] User ${msg.userId}: ${msg.text}`,
            );
          });
        } else {
          console.error("Ошибка загрузки истории:", data.error);
        }
      } catch (e) {
        console.error("Ошибка сети:", e);
      }
    }

    //  2. Подключаем Socket (REAL-TIME)
    socket.on("connect", () => {
      socket.emit("authenticate", USER_ID);
    });

    socket.on("authenticated", () => {
      socket.emit("join_trip_chat", { tripId: TRIP_ID, userId: USER_ID });
    });

    socket.on("chat_joined", () => {
      console.log("✅ Подключено к чату. Ожидание новых сообщений...");
    });

    socket.on("new_message", (msg) => {
      // Новое сообщение приходит ЗАШИФРОВАННЫМ через сокет
      // В реальном приложении мы бы его расшифровали тут.
      // Для теста просто покажем, что пришло
      console.log(`🔔 Новое сообщение (зашифрованное): ${msg.text}`);

      // Запускаем функцию загрузки, чтобы проверить, что оно попало в БД
      // loadHistory(); // Можно раскомментировать для теста
    });

    // Запуск при старте
    loadHistory();
  }
}
