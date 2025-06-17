const axios = require('axios');
require('dotenv').config();

async function sendTelegramMessage(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    await axios.post(url, {
      chat_id: chatId,
      text: message
    });
  } catch (error) {
    console.error('Failed to send Telegram message:', error.message);
  }
}

module.exports = { sendTelegramMessage };
