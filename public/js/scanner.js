// public/js/scanner.js

/**
 * Сканер QR-кодов для чеков (ФНС РФ)
 * Версия 1.0 для Travel-app
 */
class ReceiptQRScanner {
  constructor(videoElementId, travelId, options = {}) {
    // Элементы DOM
    this.video = document.getElementById(videoElementId);
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");

    // ID текущего путешествия (обязательный параметр)
    this.travelId = travelId;

    // Состояние сканера
    this.scanning = false;
    this.lastScannedCode = null;
    this.scanAnimationFrame = null;

    // Конфигурация
    this.config = {
      scanInterval: options.scanInterval || 300, // мс между сканированиями
      showDebugInfo: options.showDebugInfo || false,
      autoStopOnSuccess: options.autoStopOnSuccess !== false, // останавливаться после успеха
      beepOnSuccess: options.beepOnSuccess || false,
    };

    // Callback-функции
    this.onScanSuccess =
      options.onScanSuccess || this.defaultScanSuccessHandler;
    this.onScanError = options.onScanError || this.defaultErrorHandler;
    this.onCameraStart = options.onCameraStart || null;
    this.onCameraStop = options.onCameraStop || null;

    // Элементы для отображения состояния (будут найдены или созданы)
    this.statusElement = null;
    this.debugElement = null;

    // Частота кадров для статистики
    this.frameCount = 0;
    this.lastFpsTime = 0;
    this.currentFps = 0;

    // Инициализация
    this.initialize();
  }

  /**
   * Инициализация сканера
   */
  initialize() {
    console.log("QR Scanner initialized for travel:", this.travelId);

    // Создаем элементы для отображения состояния, если их нет
    this.createStatusElements();

    // Проверяем поддержку jsQR
    if (typeof jsQR === "undefined") {
      this.showError(
        "Библиотека jsQR не загружена. Проверьте подключение скрипта.",
      );
      return;
    }
  }

  /**
   * Создание элементов для отображения статуса
   */
  createStatusElements() {
    // Элемент статуса
    this.statusElement =
      document.getElementById("scanner-status") || this.createStatusElement();

    // Элемент отладки (если включен debug)
    if (this.config.showDebugInfo) {
      this.debugElement =
        document.getElementById("scanner-debug") || this.createDebugElement();
    }
  }

  createStatusElement() {
    const statusDiv = document.createElement("div");
    statusDiv.id = "scanner-status";
    statusDiv.className = "scanner-status";
    statusDiv.innerHTML = `
            <div class="status-indicator">
                <span class="status-dot"></span>
                <span class="status-text">Готов к работе</span>
            </div>
            <div class="status-details"></div>
        `;

    if (this.video.parentNode) {
      this.video.parentNode.appendChild(statusDiv);
    }

    return statusDiv;
  }

  createDebugElement() {
    const debugDiv = document.createElement("div");
    debugDiv.id = "scanner-debug";
    debugDiv.className = "scanner-debug";
    debugDiv.innerHTML = `
            <h4>Отладка сканера:</h4>
            <p>FPS: <span id="debug-fps">0</span></p>
            <p>Размер видео: <span id="debug-video-size">0x0</span></p>
            <p>Последний результат: <span id="debug-last-result">нет</span></p>
        `;

    if (this.video.parentNode) {
      this.video.parentNode.appendChild(debugDiv);
    }

    return debugDiv;
  }

  /**
   * Запуск сканера и камеры
   */
  async start() {
    if (this.scanning) {
      this.updateStatus("Сканер уже запущен", "warning");
      return;
    }

    try {
      this.updateStatus("Запрос доступа к камере...", "loading");

      // Получаем доступ к камере
      const constraints = {
        video: {
          facingMode: "environment", // Задняя камера
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      this.video.srcObject = stream;
      this.video.playsInline = true;

      // Ждем, пока видео начнет воспроизводиться
      await new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          this.video
            .play()
            .then(resolve)
            .catch((error) => {
              this.showError("Ошибка воспроизведения видео: " + error.message);
            });
        };
      });

      this.scanning = true;
      this.updateStatus(
        "Сканирование... Наведите камеру на QR-код чека",
        "active",
      );

      if (this.onCameraStart) {
        this.onCameraStart();
      }

      // Начинаем сканирование
      this.startScanning();
    } catch (error) {
      this.handleCameraError(error);
    }
  }

  /**
   * Запуск цикла сканирования
   */
  startScanning() {
    if (!this.scanning) return;

    const scanFrame = () => {
      if (!this.scanning) return;

      // Обновляем статистику FPS
      this.updateFPS();

      // Проверяем, готово ли видео
      if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
        // Устанавливаем размер canvas равным размеру видео
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;

        // Рисуем текущий кадр на canvas
        this.ctx.drawImage(
          this.video,
          0,
          0,
          this.canvas.width,
          this.canvas.height,
        );

        // Получаем данные изображения
        const imageData = this.ctx.getImageData(
          0,
          0,
          this.canvas.width,
          this.canvas.height,
        );

        // Пытаемся распознать QR-код
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
          greyScaleWeights: {
            red: 0.2126,
            green: 0.7152,
            blue: 0.0722,
          },
        });

        if (code) {
          this.handleQRCodeDetected(code);
        }

        // Обновляем информацию для отладки
        if (this.config.showDebugInfo && this.debugElement) {
          this.updateDebugInfo(code);
        }
      }

      // Планируем следующий кадр
      this.scanAnimationFrame = requestAnimationFrame(() => {
        setTimeout(scanFrame, this.config.scanInterval);
      });
    };

    // Запускаем первый кадр
    scanFrame();
  }

  /**
   * Обработка обнаруженного QR-кода
   */
  handleQRCodeDetected(code) {
    // Проверяем, не тот ли это же код, что и в прошлый раз
    if (this.lastScannedCode === code.data) {
      return; // Пропускаем повторное сканирование
    }

    this.lastScannedCode = code.data;

    console.log("QR-код обнаружен:", code.data);

    // Воспроизводим звук при успехе (опционально)
    if (this.config.beepOnSuccess) {
      this.playBeepSound();
    }

    // Парсим данные чека
    const receiptData = this.parseReceiptQR(code.data);

    // Обновляем статус
    this.updateStatus(
      `Чек обнаружен! Сумма: ${receiptData.sum} руб.`,
      "success",
    );

    // Вызываем callback успешного сканирования
    this.onScanSuccess({
      rawData: code.data,
      parsedData: receiptData,
      location: code.location,
      travelId: this.travelId,
    });

    // Останавливаем сканирование, если настроено
    if (this.config.autoStopOnSuccess) {
      setTimeout(() => this.stop(), 1000);
    }
  }

  /**
   * Парсинг данных чека из QR-кода (ФНС формат)
   */
  parseReceiptQR(qrString) {
    const result = {
      raw: qrString,
      isValid: false,
      sum: 0,
      date: null,
      fiscalNumber: null,
      fiscalDocument: null,
      fiscalSign: null,
      operationType: null,
    };

    try {
      // Разбиваем строку на параметры
      const params = {};
      qrString.split("&").forEach((param) => {
        const [key, value] = param.split("=");
        if (key && value) {
          params[key] = value;
        }
      });

      // Проверяем минимально необходимые параметры
      if (params.t && params.s && params.fn) {
        result.isValid = true;

        // Сумма
        result.sum = parseFloat(params.s) || 0;

        // Дата и время
        const dateStr = params.t;
        if (dateStr.length >= 13) {
          const year = dateStr.substring(0, 4);
          const month = dateStr.substring(4, 6);
          const day = dateStr.substring(6, 8);
          const hour = dateStr.substring(9, 11) || "00";
          const minute = dateStr.substring(11, 13) || "00";

          result.date = new Date(
            `${year}-${month}-${day}T${hour}:${minute}:00`,
          );
          result.dateString = `${day}.${month}.${year} ${hour}:${minute}`;
        }

        // Фискальные данные
        result.fiscalNumber = params.fn;
        result.fiscalDocument = params.i;
        result.fiscalSign = params.fp;
        result.operationType = params.n || "1";

        // Дополнительные параметры
        if (params.fd) result.fiscalDriveNumber = params.fd;
        if (params.fp) result.fiscalSign = params.fp;
      }
    } catch (error) {
      console.error("Ошибка парсинга QR-кода:", error);
      result.error = error.message;
    }

    return result;
  }

  /**
   * Остановка сканера
   */
  stop() {
    if (!this.scanning) return;

    this.scanning = false;

    // Останавливаем анимацию
    if (this.scanAnimationFrame) {
      cancelAnimationFrame(this.scanAnimationFrame);
      this.scanAnimationFrame = null;
    }

    // Останавливаем камеру
    if (this.video.srcObject) {
      const tracks = this.video.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      this.video.srcObject = null;
    }

    this.updateStatus("Сканер остановлен", "inactive");

    if (this.onCameraStop) {
      this.onCameraStop();
    }
  }

  /**
   * Перезапуск сканера
   */
  restart() {
    this.stop();
    setTimeout(() => this.start(), 500);
  }

  /**
   * Обработка ошибок камеры
   */
  handleCameraError(error) {
    console.error("Ошибка камеры:", error);

    let errorMessage = "Неизвестная ошибка камеры";

    switch (error.name) {
      case "NotAllowedError":
        errorMessage =
          "Доступ к камере запрещен. Разрешите доступ в настройках браузера.";
        break;
      case "NotFoundError":
        errorMessage =
          "Камера не найдена. Убедитесь, что камера подключена и не используется другим приложением.";
        break;
      case "NotSupportedError":
        errorMessage = "Ваш браузер не поддерживает доступ к камере.";
        break;
      case "NotReadableError":
        errorMessage =
          "Не удалось получить доступ к камере. Возможно, она уже используется.";
        break;
      default:
        errorMessage = `Ошибка: ${error.message}`;
    }

    this.showError(errorMessage);

    if (this.onScanError) {
      this.onScanError(error);
    }
  }

  /**
   * Обновление статуса сканера
   */
  updateStatus(message, type = "info") {
    if (!this.statusElement) return;

    const statusText = this.statusElement.querySelector(".status-text");
    const statusDot = this.statusElement.querySelector(".status-dot");
    const statusDetails = this.statusElement.querySelector(".status-details");

    if (statusText) statusText.textContent = message;

    // Обновляем индикатор
    if (statusDot) {
      statusDot.className = "status-dot";
      statusDot.classList.add(`status-${type}`);
    }

    // Показываем детали для ошибок
    if (type === "error" && statusDetails) {
      statusDetails.textContent = message;
      statusDetails.style.display = "block";
    } else if (statusDetails) {
      statusDetails.style.display = "none";
    }

    // Логируем в консоль
    console.log(`Scanner [${type}]: ${message}`);
  }

  /**
   * Показать ошибку
   */
  showError(message) {
    this.updateStatus(message, "error");
  }

  /**
   * Обновление FPS
   */
  updateFPS() {
    const now = performance.now();
    this.frameCount++;

    if (now >= this.lastFpsTime + 1000) {
      this.currentFps = Math.round(
        (this.frameCount * 1000) / (now - this.lastFpsTime),
      );
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
  }

  /**
   * Обновление отладочной информации
   */
  updateDebugInfo(code) {
    if (!this.debugElement) return;

    // FPS
    const fpsEl = document.getElementById("debug-fps");
    if (fpsEl) fpsEl.textContent = this.currentFps;

    // Размер видео
    const sizeEl = document.getElementById("debug-video-size");
    if (sizeEl) {
      sizeEl.textContent = `${this.video.videoWidth}x${this.video.videoHeight}`;
    }

    // Последний результат
    const resultEl = document.getElementById("debug-last-result");
    if (resultEl) {
      resultEl.textContent = code ? "Обнаружен" : "Нет";
      resultEl.style.color = code ? "green" : "gray";
    }
  }

  /**
   * Воспроизведение звукового сигнала
   */
  playBeepSound() {
    try {
      const audioContext = new (
        window.AudioContext || window.webkitAudioContext
      )();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.1,
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.log("Не удалось воспроизвести звук:", error);
    }
  }

  /**
   * Обработчик успешного сканирования по умолчанию
   */
  defaultScanSuccessHandler(data) {
    console.log("QR-код успешно отсканирован:", data);

    // Отправляем данные на сервер для создания расхода
    this.sendReceiptToServer(data);
  }

  /**
   * Отправка данных чека на сервер
   */
  async sendReceiptToServer(receiptData) {
    try {
      const response = await fetch("/qr/process-receipt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token":
            document.querySelector('meta[name="csrf-token"]')?.content || "",
        },
        body: JSON.stringify({
          qrRawData: receiptData.rawData,
          parsedData: receiptData.parsedData,
          travelId: receiptData.travelId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccessMessage(result);
      } else {
        this.showErrorMessage(result.message);
      }
    } catch (error) {
      console.error("Ошибка отправки данных:", error);
      this.showErrorMessage("Ошибка сети. Проверьте подключение к интернету.");
    }
  }

  /**
   * Показать сообщение об успехе
   */
  showSuccessMessage(result) {
    const message = `
            <div class="receipt-success">
                <h4>✅ Чек успешно добавлен!</h4>
                <p><strong>Сумма:</strong> ${result.expense.amount} руб.</p>
                <p><strong>Дата:</strong> ${new Date(result.expense.date).toLocaleString()}</p>
                <p><strong>Описание:</strong> ${result.expense.description || "Чек покупки"}</p>
                <div class="actions">
                    <button onclick="window.location.href='/travel/${this.travelId}'" class="btn-primary">
                        Вернуться к путешествию
                    </button>
                    <button onclick="scanner.restart()" class="btn-secondary">
                        Сканировать ещё
                    </button>
                </div>
            </div>
        `;

    this.displayModal(message, "success");
  }

  /**
   * Показать сообщение об ошибке
   */
  showErrorMessage(message) {
    const errorHtml = `
            <div class="receipt-error">
                <h4>❌ Ошибка обработки чека</h4>
                <p>${message}</p>
                <div class="actions">
                    <button onclick="scanner.restart()" class="btn-primary">
                        Попробовать снова
                    </button>
                </div>
            </div>
        `;

    this.displayModal(errorHtml, "error");
  }

  /**
   * Отображение модального окна
   */
  displayModal(content, type = "info") {
    // Удаляем старые модальные окна
    const oldModal = document.getElementById("scanner-modal");
    if (oldModal) oldModal.remove();

    // Создаем новое модальное окно
    const modal = document.createElement("div");
    modal.id = "scanner-modal";
    modal.className = `scanner-modal scanner-modal-${type}`;
    modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;

    // Добавляем стили
    const styles = `
            .scanner-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            .scanner-modal .modal-content {
                background: white;
                padding: 25px;
                border-radius: 10px;
                max-width: 500px;
                width: 90%;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            }
            .scanner-modal-success .modal-content {
                border-top: 5px solid #4CAF50;
            }
            .scanner-modal-error .modal-content {
                border-top: 5px solid #f44336;
            }
            .modal-body {
                text-align: center;
            }
            .receipt-success h4 {
                color: #4CAF50;
                margin-bottom: 15px;
            }
            .receipt-error h4 {
                color: #f44336;
                margin-bottom: 15px;
            }
            .actions {
                margin-top: 20px;
                display: flex;
                gap: 10px;
                justify-content: center;
            }
            .btn-primary, .btn-secondary {
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
            }
            .btn-primary {
                background: #007bff;
                color: white;
            }
            .btn-secondary {
                background: #6c757d;
                color: white;
            }
        `;

    // Добавляем стили
    const styleSheet = document.createElement("style");
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    // Добавляем модальное окно на страницу
    document.body.appendChild(modal);

    // Закрытие по клику вне модального окна
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  /**
   * Обработчик ошибок по умолчанию
   */
  defaultErrorHandler(error) {
    console.error("Ошибка сканера:", error);
  }

  /**
   * Проверка поддержки необходимых API
   */
  static checkCompatibility() {
    const compat = {
      getUserMedia: !!navigator.mediaDevices?.getUserMedia,
      requestAnimationFrame: !!window.requestAnimationFrame,
      jsQR: typeof jsQR !== "undefined",
      canvas: !!document.createElement("canvas").getContext,
    };

    const isCompatible = Object.values(compat).every((v) => v);

    return {
      isCompatible,
      details: compat,
      message: isCompatible
        ? "Браузер поддерживает все необходимые функции"
        : "Браузер не поддерживает некоторые необходимые функции",
    };
  }

  /**
   * Получение списка доступных камер
   */
  static async getCameraDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((device) => device.kind === "videoinput");
    } catch (error) {
      console.error("Ошибка получения списка камер:", error);
      return [];
    }
  }
}

/**
 * Глобальная функция для инициализации сканера
 */
window.initReceiptScanner = function (videoElementId, travelId, options = {}) {
  try {
    // Проверяем совместимость
    const compat = ReceiptQRScanner.checkCompatibility();
    if (!compat.isCompatible) {
      alert(compat.message);
      console.warn("Проблемы совместимости:", compat.details);
      return null;
    }

    // Создаем экземпляр сканера
    const scanner = new ReceiptQRScanner(videoElementId, travelId, options);

    // Сохраняем в глобальной переменной для доступа из консоли
    window.receiptScanner = scanner;

    console.log(
      "Сканер чеков инициализирован. Используйте window.receiptScanner для доступа.",
    );

    return scanner;
  } catch (error) {
    console.error("Ошибка инициализации сканера:", error);
    return null;
  }
};

/**
 * Утилиты для работы с чеками
 */
window.ReceiptUtils = {
  /**
   * Валидация QR-кода чека
   */
  validateReceiptQR(qrString) {
    const requiredParams = ["t", "s", "fn"];
    const params = {};

    try {
      qrString.split("&").forEach((param) => {
        const [key, value] = param.split("=");
        if (key && value) params[key] = value;
      });

      const missingParams = requiredParams.filter((param) => !params[param]);

      return {
        isValid: missingParams.length === 0,
        missingParams,
        hasAllData: params.t && params.s && params.fn && params.i && params.fp,
        params,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message,
        params: {},
      };
    }
  },

  /**
   * Форматирование даты чека
   */
  formatReceiptDate(dateString) {
    if (!dateString || dateString.length < 8) return "Неизвестная дата";

    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    const hour = dateString.substring(9, 11) || "00";
    const minute = dateString.substring(11, 13) || "00";

    return `${day}.${month}.${year} ${hour}:${minute}`;
  },

  /**
   * Генерация тестового QR-кода для отладки
   */
  generateTestReceiptQR() {
    const now = new Date();
    const dateStr = now
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\..+/, "")
      .replace("T", "");

    return `t=${dateStr}&s=1500.50&fn=9289000100&i=12345&fp=9876543210&n=1`;
  },
};

// Автоматическая инициализация при наличии элемента с data-scanner-init
document.addEventListener("DOMContentLoaded", function () {
  const scannerElement = document.querySelector("[data-scanner-init]");
  if (scannerElement) {
    const videoId = scannerElement.dataset.videoId || "scanner-video";
    const travelId = scannerElement.dataset.travelId;

    if (travelId) {
      window.initReceiptScanner(videoId, travelId, {
        autoStopOnSuccess: true,
        beepOnSuccess: true,
      });
    }
  }
});

// Экспорт для использования в модулях
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ReceiptQRScanner };
}
