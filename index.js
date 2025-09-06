const { Telegraf } = require("telegraf");
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const telegramToken = process.env.TELEGRAM_TOKEN;
const bot = new Telegraf(telegramToken);
const app = express();
const PORT = process.env.PORT || 3000;

let isBotActive = false;
let memory = {
    words: new Set(),
    phrases: new Set(),
    photos: []
};
let recentMessages = [];
let lastActivityTime = Date.now();
let photoTimer = null;
const memoryFile = path.join(__dirname, 'memory.json');

// 🔥 Загрузка памяти
async function loadMemory() {
    try {
        const data = await fs.readFile(memoryFile, 'utf8');
        const saved = JSON.parse(data);
        memory.words = new Set(saved.words || []);
        memory.phrases = new Set(saved.phrases || []);
        memory.photos = saved.photos || [];
        console.log("🧠 Память загружена!");
    } catch (error) {
        memory = {
            words: new Set(),
            phrases: new Set(),
            photos: [] // Убрали неработающие фото
        };
        console.log("🧠 Новая память создана");
    }
}

async function saveMemory() {
    try {
        const toSave = {
            words: Array.from(memory.words),
            phrases: Array.from(memory.phrases),
            photos: memory.photos
        };
        await fs.writeFile(memoryFile, JSON.stringify(toSave, null, 2));
    } catch (error) {
        console.error("Ошибка сохранения памяти:", error);
    }
}

// 🔥 Проверка валидности фото URL
function isValidPhotoUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' && 
               /\.(jpg|jpeg|png|gif)$/i.test(parsed.pathname);
    } catch {
        return false;
    }
}

// 🔥 Добавление фото по URL
function addPhotoFromUrl(url) {
    if (isValidPhotoUrl(url) && !memory.photos.includes(url)) {
        memory.photos.push(url);
        saveMemory();
        return true;
    }
    return false;
}

// 🔥 Сохранение фото из сообщения
async function savePhotoFromMessage(ctx) {
    try {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const fileLink = await bot.telegram.getFileLink(photo.file_id);
        const photoUrl = fileLink.href;
        
        if (!memory.photos.includes(photoUrl)) {
            memory.photos.push(photoUrl);
            saveMemory();
            return photoUrl;
        }
        return null;
    } catch (error) {
        console.error("Ошибка сохранения фото:", error);
        return null;
    }
}

// 🔥 Безопасная отправка фото
async function sendRandomPhoto(ctx) {
    if (memory.photos.length === 0) {
        await ctx.reply("В коллекции нет фото! 📸");
        return;
    }

    try {
        // Фильтруем только валидные фото
        const validPhotos = memory.photos.filter(photo => isValidPhotoUrl(photo));
        
        if (validPhotos.length === 0) {
            await ctx.reply("Нет рабочих фото в коллекции! ❌");
            return;
        }

        const randomPhoto = validPhotos[Math.floor(Math.random() * validPhotos.length)];
        await ctx.replyWithPhoto(randomPhoto, {
            caption: "Держите фотку! 📸"
        });
    } catch (error) {
        console.error("Ошибка отправки фото:", error);
        await ctx.reply("Не удалось отправить фото 😔");
    }
}

// 🔥 Анализ сообщений
function analyzeMessage(text) {
    const words = text.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    const phrases = text.split(/[.!?]/).filter(phrase => phrase.trim().length > 3);
    
    words.forEach(word => memory.words.add(word));
    phrases.forEach(phrase => memory.phrases.add(phrase.trim()));
    
    recentMessages.push(text);
    if (recentMessages.length > 20) {
        recentMessages.shift();
    }
    
    lastActivityTime = Date.now();
}

// 🔥 Генератор фраз
function generateMixedPhrase() {
    if (recentMessages.length < 3) return null;
    
    try {
        const availableWords = Array.from(memory.words).filter(word => word.length > 2);
        if (availableWords.length < 5) return null;
        
        const wordCount = 3 + Math.floor(Math.random() * 4);
        let newPhrase = [];
        
        for (let i = 0; i < wordCount; i++) {
            const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];
            newPhrase.push(randomWord);
        }
        
        let result = newPhrase.join(' ');
        result = result.charAt(0).toUpperCase() + result.slice(1);
        
        const endings = ['.', '!', '?', '...'];
        result += endings[Math.floor(Math.random() * endings.length)];
        
        return result;
    } catch (error) {
        return null;
    }
}

// 🔥 Таймеры
function startTimers(ctx) {
    if (photoTimer) clearInterval(photoTimer);
    
    setInterval(async () => {
        if (isBotActive && Date.now() - lastActivityTime < 300000) {
            const mixedPhrase = generateMixedPhrase();
            if (mixedPhrase && Math.random() > 0.6) {
                await ctx.reply(mixedPhrase);
            }
        }
    }, 180000);
    
    photoTimer = setInterval(async () => {
        if (isBotActive && Date.now() - lastActivityTime < 3600000) {
            if (Math.random() > 0.5) {
                await sendRandomPhoto(ctx);
            }
        }
    }, 180000 + Math.floor(Math.random() * 3420000));
}

// Фразы для включения/выключения
const wakeUpPhrases = ["Гудентак! 😎 Виталя на связи!", "Виталя в здании! 💪", "Проснулся! 🚀 Готов к работе!"];
const sleepPhrases = ["Ай мля! Маслину поймал! 😵‍💫", "Виталя уходит в закат! 🌅", "Отключаюсь! 🔌"];

bot.on("text", async (ctx) => {
    const messageText = ctx.message.text;
    const lowerText = messageText.toLowerCase();
    
    analyzeMessage(messageText);
    
    // Команда добавления фото по URL
    if (lowerText.startsWith('добавить фото ') && isBotActive) {
        const photoUrl = messageText.slice(13).trim();
        if (addPhotoFromUrl(photoUrl)) {
            await ctx.reply("Фото добавлено в коллекцию! 📸");
        } else {
            await ctx.reply("Неверная ссылка на фото! ❌");
        }
        return;
    }
    
    // Команда показа всех фото
    if (lowerText === 'мои фото' && isBotActive) {
        await ctx.reply(`В моей коллекции ${memory.photos.length} фото! 🖼️`);
        return;
    }
    
    // 🔥 КОМАНДА UwU
    if ((lowerText === 'uwu' || lowerText === 'виталя uwu') && isBotActive) {
        await sendRandomPhoto(ctx);
        return;
    }
    
    // Команды управления
    if (lowerText.includes('виталя проснись') || lowerText.includes('виталя включись')) {
        if (!isBotActive) {
            isBotActive = true;
            const phrase = wakeUpPhrases[Math.floor(Math.random() * wakeUpPhrases.length)];
            await ctx.reply(phrase);
            startTimers(ctx);
        } else {
            await ctx.reply("Я уже в строю! 💪");
        }
        return;
    }
    
    if (lowerText.includes('виталя уйди') || lowerText.includes('виталя вырубай')) {
        if (isBotActive) {
            isBotActive = false;
            const phrase = sleepPhrases[Math.floor(Math.random() * sleepPhrases.length)];
            await ctx.reply(phrase);
            if (photoTimer) clearInterval(photoTimer);
        } else {
            await ctx.reply("Я и так отдыхаю... 😴");
        }
        return;
    }

    // Проверка статуса
    if (lowerText.includes('виталя ты здесь') || lowerText.includes('виталя статус')) {
        await ctx.reply(isBotActive ? "На месте! 💪 Готов к работе!" : "Сплю... 😴 Разбуди командой 'Виталя проснись'");
        return;
    }

    // Ответ на обращение
    if (isBotActive && (lowerText.startsWith('виталя') || Math.random() > 0.7)) {
        const userMessage = lowerText.startsWith('виталя') ? messageText.slice(7).trim() : messageText;
        
        if (userMessage) {
            await ctx.sendChatAction('typing');
            
            const mixedPhrase = generateMixedPhrase();
            const response = mixedPhrase || "Что-то я сегодня не в форме... 🤔";
            
            await ctx.reply(response);
        }
    }
});

// 🔥 Обработка фото-сообщений
bot.on("photo", async (ctx) => {
    if (isBotActive) {
        const savedUrl = await savePhotoFromMessage(ctx);
        if (savedUrl) {
            await ctx.reply("Фото сохранено в мою коллекцию! 📸");
        } else {
            await ctx.reply("Такое фото уже есть! 👍");
        }
    }
});

// Express для Railway
app.get('/', (req, res) => {
    res.send('🤖 Виталя-бот с фото-коллекцией работает!');
});

// 🔥 Важно: Graceful shutdown для избежания Conflict ошибки
let isShuttingDown = false;

async function shutdown() {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.log("🛑 Завершение работы...");
    await saveMemory();
    await bot.stop();
    process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

// Загрузка памяти и запуск
loadMemory().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Сервер запущен на порту ${PORT}`);
    });
    
    bot.launch().then(() => {
        console.log("🤖 Виталя-бот запущен!");
    }).catch(error => {
        console.error("❌ Ошибка запуска бота:", error.message);
        console.log("🔄 Перезапуск через 5 секунд...");
        setTimeout(() => process.exit(1), 5000);
    });
});