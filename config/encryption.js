// config/encryption.js
const CryptoJS = require("crypto-js");

// ⚠️ В продакшене используйте process.env.MESSAGE_SECRET_KEY
const SECRET_KEY = "super_secret_key_for_dev_only_32chars!";

module.exports = {
  encrypt(text) {
    if (!text) return null;
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
  },
  decrypt(ciphertext) {
    if (!ciphertext) return null;
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      console.error("🔓 Ошибка дешифровки:", e.message);
      return ciphertext; // Возвращаем как есть при ошибке
    }
  },
};
