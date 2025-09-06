const { Telegraf } = require("telegraf");
const axios = require("axios");
const express = require('express'); // Добавляем express

const telegramToken = process.env.TELEGRAM_TOKEN;
const bot = new Telegraf(telegramToken);
const app = express(); // Создаем express app
const PORT = process.env.PORT || 3000;

let isBotActive = false;

// 🔥 Функция запроса к AI (бесплатный вариант без токена)
async function getAIResponse(message) {
    try {
        const response = await axios.post(
            'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium', // medium вместо large
            { inputs: message },
            { 
                headers: { 
                    'Content-Type': 'application/json' 
                },
                timeout: 15000 // Увеличиваем таймаут
            }
        );
        
        return response.data.generated_text || "Дай-ка подумать... 🤔";
    } catch (error) {
        console.error("AI Error:", error.message);
        
        // Запасные ответы если AI не работает
        const fallbackResponses = [
            "Щас мозги кипят... попробуй позже! 🔥",
            "Сервер прилёг отдохнуть... 😴",
            "Чёт не соображаю, спроси что-то попроще! 😅",
            "Мой AI на перекуре... подожди минутку! 🚬"
        ];
        
        return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }
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
    res.send('🤖 Виталя-бот с AI работает на Railway!');
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});

// Запуск бота
bot.launch().then(() => {
    console.log("🤖 Виталя-бот с AI запущен!");
}).catch((error) => {
    console.error("Ошибка запуска бота:", error);
});

// Обработка завершения работы
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));