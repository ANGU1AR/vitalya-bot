const { Telegraf } = require("telegraf");
const axios = require("axios");
const express = require('express');

const telegramToken = process.env.TELEGRAM_TOKEN;
const bot = new Telegraf(telegramToken);
const app = express();
const PORT = process.env.PORT || 3000;

let isBotActive = false;

// 🔥 SberAI API с вашим токеном
async function getAIResponse(message) {
    try {
        const sberToken = process.env.SBERAI_TOKEN || "1cc3c432-b960-465c-9aea-93e4fedc42ac";
        
        const response = await axios.post(
            'https://api.aicloud.sbercloud.ru/v1/chat/completions',
            {
                model: "GigaChat",
                messages: [{ role: "user", content: message }],
                max_tokens: 300,
                temperature: 0.7
            },
            {
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + sberToken
                },
                timeout: 15000
            }
        );
        
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("SberAI Error:", error.response?.data || error.message);
        return getFallbackResponse(message);
    }
}

// Умные запасные ответы
function getFallbackResponse(message) {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('привет')) return "Привет! Как дела? 😊";
    if (lowerMsg.includes('как дела')) return "У меня всё отлично! А у тебя? 👍";
    if (lowerMsg.includes('спасибо')) return "Всегда пожалуйста! 😊";
    if (lowerMsg.includes('пока')) return "До встречи! 👋";
    if (lowerMsg.includes('шутка')) return "Почему программисты любят природу? Потому что в ней нет багов! 😄";
    
    const fallbacks = [
        "Интересный вопрос! Давай поговорим о чём-то другом? 🤔",
        "Сейчас не могу ответить, но я быстро учусь! 🚀",
        "Ой, мои мозги немного туманны... спроси что-то попроще! ☁️",
        "Чёт не соображаю... может, расскажешь что-нибудь интересное? 😅"
    ];
    
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// Фразы для включения/выключения
const wakeUpPhrases = ["Гудентак! 😎 Виталя на связи!", "Виталя в здании! 💪", "Проснулся! 🚀 Готов к работе!"];
const sleepPhrases = ["Ай мля! Маслину поймал! 😵‍💫", "Виталя уходит в закат! 🌅", "Отключаюсь! 🔌"];

bot.on("text", async (ctx) => {
    const messageText = ctx.message.text.toLowerCase();
    
    // Команды управления
    if (messageText.includes('виталя проснись') || messageText.includes('виталя включись')) {
        if (!isBotActive) {
            isBotActive = true;
            const phrase = wakeUpPhrases[Math.floor(Math.random() * wakeUpPhrases.length)];
            await ctx.reply(phrase);
        } else {
            await ctx.reply("Я уже в строю! 💪");
        }
        return;
    }
    
    if (messageText.includes('виталя уйди') || messageText.includes('виталя вырубай')) {
        if (isBotActive) {
            isBotActive = false;
            const phrase = sleepPhrases[Math.floor(Math.random() * sleepPhrases.length)];
            await ctx.reply(phrase);
        } else {
            await ctx.reply("Я и так отдыхаю... 😴");
        }
        return;
    }

    // Проверка статуса
    if (messageText.includes('виталя ты здесь') || messageText.includes('виталя статус')) {
        await ctx.reply(isBotActive ? "На месте! 💪 Готов к работе!" : "Сплю... 😴 Разбуди командой 'Виталя проснись'");
        return;
    }

    // 🔥 Обработка сообщений с AI
    if (isBotActive && messageText.startsWith('виталя')) {
        const userMessage = ctx.message.text.slice(7).trim();
        
        if (userMessage) {
            // Показываем статус "печатает..."
            await ctx.sendChatAction('typing');
            
            // Получаем ответ от AI
            const aiResponse = await getAIResponse(userMessage);
            await ctx.reply(aiResponse);
        } else {
            await ctx.reply("Чем могу помочь? 😊");
        }
    }
});

// Express для Railway
app.get('/', (req, res) => {
    res.send('🤖 Виталя-бот с SberAI работает!');
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});

// Запуск бота
bot.launch().then(() => {
    console.log("🤖 Виталя-бот с SberAI запущен!");
}).catch((error) => {
    console.error("Ошибка запуска бота:", error);
});

// Обработка завершения работы
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));