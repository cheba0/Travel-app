// public/js/creatingTravel.js
console.log("✅ creatingTravel.js загружен");

// Флаг защиты от повторной отправки
let isSubmitting = false;

document.addEventListener("DOMContentLoaded", function () {
  console.log("✅ DOM полностью загружен");

  initImagePreview();
  initFormHandler();
});

/**
 * Инициализация превью изображения
 * Работает с вашей структурой: скрытый input + иконка + img#preview
 */
function initImagePreview() {
  const imageInput = document.getElementById("imageInput");
  const preview = document.getElementById("preview");
  const uploadIcon = document.getElementById("uploadIcon");

  // Если элементов нет — выходим без ошибок
  if (!imageInput || !preview || !uploadIcon) {
    return;
  }

  // 🔹 Клик по иконке открывает скрытый input
  uploadIcon.addEventListener("click", function () {
    imageInput.click();
  });
  uploadIcon.style.cursor = "pointer";

  // Обработка выбора файла
  imageInput.addEventListener("change", function (e) {
    const file = e.target.files[0];

    if (file) {
      // Проверка типа файла
      if (!file.type.startsWith("image/")) {
        alert("❌ Пожалуйста, выберите изображение (jpg, png, gif, webp)");
        this.value = "";
        return;
      }

      // Проверка размера (макс. 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("❌ Файл слишком большой. Максимальный размер: 5MB");
        this.value = "";
        return;
      }

      const reader = new FileReader();

      reader.onload = function (e) {
        // 🔹 Показываем превью, скрываем иконку — БЕЗ изменения ваших стилей
        preview.src = e.target.result;
        preview.style.display = "block"; // ваш стиль .image_preview применится
        uploadIcon.style.display = "none";
      };

      reader.onerror = function () {
        alert("❌ Не удалось прочитать файл");
        preview.style.display = "none";
        uploadIcon.style.display = "block";
      };

      reader.readAsDataURL(file);
    } else {
      // Сброс при отмене выбора
      preview.src = "";
      preview.style.display = "none";
      uploadIcon.style.display = "block";
    }
  });
}

/**
 * Инициализация обработчика формы
 */
function initFormHandler() {
  const form = document.getElementById("addForm");
  const imageInput = document.getElementById("imageInput"); // 🔹 Получаем input отдельно
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (isSubmitting) return;

    const createBtn = document.getElementById("createBtn");
    const messageDiv = document.getElementById("message");

    isSubmitting = true;
    if (createBtn) {
      createBtn.disabled = true;
      createBtn.textContent = "Создание...";
    }
    if (messageDiv) messageDiv.innerHTML = "";

    try {
      // 🔹 Создаём FormData из формы
      const formData = new FormData(form);

      // 🔹 ВАЖНО: вручную добавляем файл, т.к. input вне формы
      if (imageInput && imageInput.files && imageInput.files[0]) {
        formData.append("image", imageInput.files[0]);
        console.log("📎 Файл добавлен в FormData:", imageInput.files[0].name);
      } else {
        console.log("ℹ️ Файл не выбран (необязательно)");
      }

      // Отладка
      console.log("📦 Итоговый FormData:");
      for (let [key, value] of formData.entries()) {
        console.log(
          `  ${key}:`,
          value instanceof File ? `File: ${value.name}` : value,
        );
      }

      const response = await fetch("/api/travels", {
        method: "POST",
        body: formData,
        // ❗ Не указываем Content-Type — браузер сам выставит multipart/form-data
      });

      const result = await response.json();

      if (result.success) {
        if (messageDiv) {
          messageDiv.innerHTML =
            '<div style="color: green; margin: 10px 0;">✅ Путешествие создано!</div>';
        }
        setTimeout(() => {
          window.location.href = "/travel/" + result.travel.id;
        }, 1000);
      } else {
        if (messageDiv) {
          messageDiv.innerHTML =
            '<div style="color: red; margin: 10px 0;">❌ ' +
            result.error +
            "</div>";
        }
        isSubmitting = false;
        if (createBtn) {
          createBtn.disabled = false;
          createBtn.textContent = "Создать";
        }
      }
    } catch (error) {
      console.error("❌ Ошибка отправки:", error);
      if (messageDiv) {
        messageDiv.innerHTML =
          '<div style="color: red; margin: 10px 0;">❌ Ошибка соединения</div>';
      }
      isSubmitting = false;
      if (createBtn) {
        createBtn.disabled = false;
        createBtn.textContent = "Создать";
      }
    }
  });
}

/**
 * Сброс формы (опционально)
 */
function resetTravelForm() {
  const form = document.getElementById("addForm");
  if (form) form.reset();

  const preview = document.getElementById("preview");
  const uploadIcon = document.getElementById("uploadIcon");
  if (preview) preview.style.display = "none";
  if (uploadIcon) uploadIcon.style.display = "block";

  isSubmitting = false;

  const createBtn = document.getElementById("createBtn");
  if (createBtn) {
    createBtn.disabled = false;
    createBtn.textContent = "Создать";
  }

  const messageDiv = document.getElementById("message");
  if (messageDiv) messageDiv.innerHTML = "";
}

// Доступно глобально
window.resetTravelForm = resetTravelForm;
