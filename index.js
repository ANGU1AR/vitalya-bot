const { Telegraf } = require("telegraf");
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const telegramToken = process.env.TELEGRAM_TOKEN;
const bot = new Telegraf(telegramToken);
const app = express();
const PORT = process.env.PORT || 3000;

let isBotActive = false;
let memory = {};
const memoryFile = path.join(__dirname, 'memory.json');

// 🔥 Загрузка памяти при запуске
async function loadMemory() {
    try {
        const data = await fs.readFile(memoryFile, 'utf8');
        memory = JSON.parse(data);
        console.log("🧠 Память загружена!");
    } catch (error) {
        memory = {};
        console.log("🧠 Новая память создана");
    }
}

// 🔥 Сохранение памяти
async function saveMemory() {
    try {
        await fs.writeFile(memoryFile, JSON.stringify(memory, null, 2));
    } catch (error) {
        console.error("Ошибка сохранения памяти:", error);
    }
}

// 🔥 Творческое преобразование текста
function creativeTransform(text) {
    const transformations = [
        text => text + "? Это интересно! 🤔",
        text => text + "... а почему ты спросил? 😊",
        text => "Хм, насчет " + text + " я думаю, что это важно! 💭",
        text => text.split('').reverse().join('') + "? Оригинально! 🎭",
        text => text.toUpperCase() + "! ВОТ ЭТО ДА! 🔥",
        text => text.replace(/[а-я]/g, char => 
            Math.random() > 0.5 ? char.toUpperCase() : char) + " 👀"
    ];
    
    const transform = transformations[Math.floor(Math.random() * transformations.length)];
    return transform(text);
}

// 🔥 Умные запасные ответы
function getSmartResponse(message) {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('привет')) return "Привет! Как дела? 😊";
    if (lowerMsg.includes('как дела')) return "У меня всё отлично! А у тебя? 👍";
    if (lowerMsg.includes('что делаешь')) return "Отвечаю на сообщения! 💻";
    if (lowerMsg.includes('спасибо')) return "Всегда пожалуйста! 😊";
    if (lowerMsg.includes('пока')) return "До встречи! 👋";
    if (lowerMsg.includes('шутка')) return "Почему программисты любят природу? Потому что в ней нет багов! 😄";
    if (lowerMsg.includes('погод')) return "К сожалению, я не подключен к сервису погоды ☀️";
    if (lowerMsg.includes('врем')) {
        const now = new Date();
        return `Сейчас примерно ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')} ⏰`;
    }
    
    const randomResponses = [
        "Интересно! Расскажи подробнее? 🤔",
        "Хм, мне нужно подумать над этим... 💭",
        "Очень необычно! Что ещё хочешь обсудить? 😊",
        "Сейчас не могу ответить, но я быстро учусь! 🚀",
        "Чёт не соображаю... может, спросишь что-то попроще? 😅",
        "Ой, мои мозги немного туманны... ☁️",
        "Давай поговорим о чём-нибудь другом? 🤗",
        "Интересная тема! Что ещё хочешь обсудить? 💬"
    ];
    
    return randomResponses[Math.floor(Math.random() * randomResponses.length)];
}

// 🔥 Генератор умных ответов
function generateAIResponse(message) {
    const lowerMsg = message.toLowerCase();
    const words = lowerMsg.split(/\s+/).filter(word => word.length > 2);
    
    // Поиск похожих фраз в памяти
    for (const [key, responses] of Object.entries(memory)) {
        const keyWords = key.toLowerCase().split(/\s+/);
        const matchScore = keyWords.filter(word => lowerMsg.includes(word)).length;
        
        if (matchScore >= keyWords.length / 2) {
            return responses[Math.floor(Math.random() * responses.length)];
        }
    }
    
    // Творческое преобразование текста
    if (Math.random() > 0.3) {
        return creativeTransform(message);
    }
    
    return getSmartResponse(message);
}

// 🔥 Обучение на ответах пользователей
function learnFromResponse(userMessage, botResponse) {
    const key = userMessage.toLowerCase().slice(0, 50);
    
    if (!memory[key]) {
        memory[key] = [];
    }
    
    if (!memory[key].includes(botResponse)) {
        memory[key].push(botResponse);
        if (Object.keys(memory).length % 10 === 0) {
            saveMemory();
        }
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
            await ctx.sendChatAction('typing');
            
            const aiResponse = generateAIResponse(userMessage);
            learnFromResponse(userMessage, aiResponse);
            
            await ctx.reply(aiResponse);
        } else {
            await ctx.reply("Чем могу помочь? 😊");
        }
    }
});

// Express для Railway
app.get('/', (req, res) => {
    res.send('🤖 Виталя-бот с ИИ работает!');
});

// Загрузка памяти и запуск
loadMemory().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Сервер запущен на порту ${PORT}`);
    });
    
    bot.launch().then(() => {
        console.log("🤖 Виталя-бот с ИИ запущен!");
    }).catch((error) => {
        console.error("Ошибка запуска бота:", error);
    });
});

// Сохранение памяти при выходе
process.once('SIGINT', async () => {
    await saveMemory();
    bot.stop('SIGINT');
});

process.once('SIGTERM', async () => {
    await saveMemory();
    bot.stop('SIGTERM');
});