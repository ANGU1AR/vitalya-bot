const { Telegraf } = require("telegraf");
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const telegramToken = process.env.TELEGRAM_TOKEN;
const bot = new Telegraf(telegramToken);
const app = express();
const PORT = process.env.PORT || 3000;

// 🔥 ПАМЯТЬ ДЛЯ КАЖДОГО ЧАТА
let chatMemories = {};
const memoryFile = path.join(__dirname, 'memory.json');

// 🔥 ЗАГРУЗКА ПАМЯТИ
async function loadMemory() {
    try {
        const data = await fs.readFile(memoryFile, 'utf8');
        chatMemories = JSON.parse(data);
        console.log("🧠 Память загружена для чатов:", Object.keys(chatMemories));
    } catch (error) {
        chatMemories = {};
        console.log("🧠 Новая память создана");
    }
}

// 🔥 СОХРАНЕНИЕ ПАМЯТИ
async function saveMemory() {
    try {
        // Конвертируем Set в Array для сохранения
        const memoriesToSave = {};
        for (const [chatId, memory] of Object.entries(chatMemories)) {
            memoriesToSave[chatId] = {
                words: Array.from(memory.words || []),
                phrases: Array.from(memory.phrases || []),
                photos: memory.photos || [],
                videos: memory.videos || [],
                stickers: memory.stickers || []
            };
        }
        await fs.writeFile(memoryFile, JSON.stringify(memoriesToSave, null, 2));
    } catch (error) {
        console.error("❌ Ошибка сохранения памяти:", error);
    }
}

// 🔥 ПОЛУЧЕНИЕ ПАМЯТИ ЧАТА
function getChatMemory(chatId) {
    if (!chatMemories[chatId]) {
        chatMemories[chatId] = {
            words: new Set(),
            phrases: new Set(),
            photos: [],
            videos: [],
            stickers: []
        };
    }
    return chatMemories[chatId];
}

// 🔥 ПРОВЕРКА ССЫЛОК
function isValidUrl(url, types) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' && 
               types.some(type => parsed.pathname.toLowerCase().endsWith(type));
    } catch {
        return false;
    }
}

// 🔥 ДОБАВЛЕНИЕ МЕДИА
function addMediaToChat(chatId, url, mediaType) {
    const chatMemory = getChatMemory(chatId);
    const validTypes = {
        'photo': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
        'video': ['.mp4', '.mov', '.avi', '.webm'],
        'sticker': ['.webp', '.tgs']
    };

    if (isValidUrl(url, validTypes[mediaType]) && !chatMemory[mediaType + 's'].includes(url)) {
        chatMemory[mediaType + 's'].push(url);
        saveMemory();
        return true;
    }
    return false;
}

// 🔥 ОТПРАВКА СЛУЧАЙНОГО МЕДИА (ИСПРАВЛЕННЫЙ БАГ)
let lastMediaIndexes = {};

async function sendRandomMedia(chatId, mediaType) {
    const chatMemory = getChatMemory(chatId);
    const mediaArray = chatMemory[mediaType + 's'];
    
    if (mediaArray.length === 0) {
        await bot.telegram.sendMessage(chatId, `В коллекции нет ${mediaType === 'photo' ? 'фото' : 'видео'}!`);
        return;
    }

    // 🔥 ИСПРАВЛЕНИЕ БАГА: разные индексы для каждого чата и типа медиа
    const key = `${chatId}_${mediaType}`;
    if (!lastMediaIndexes[key]) lastMediaIndexes[key] = -1;
    
    lastMediaIndexes[key] = (lastMediaIndexes[key] + 1) % mediaArray.length;
    const mediaUrl = mediaArray[lastMediaIndexes[key]];

    try {
        if (mediaType === 'photo') {
            await bot.telegram.sendPhoto(chatId, mediaUrl, { caption: "📸 Держите фото!" });
        } else if (mediaType === 'video') {
            await bot.telegram.sendVideo(chatId, mediaUrl, { caption: "🎥 Держите видео!" });
        } else if (mediaType === 'sticker') {
            await bot.telegram.sendSticker(chatId, mediaUrl);
        }
    } catch (error) {
        console.error(`❌ Ошибка отправки ${mediaType}:`, error.message);
        await bot.telegram.sendMessage(chatId, `Не удалось отправить ${mediaType} 😔`);
    }
}

// 🔥 АНАЛИЗ СООБЩЕНИЙ
function analyzeMessage(chatId, text) {
    const chatMemory = getChatMemory(chatId);
    const words = text.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    const phrases = text.split(/[.!?]/).filter(phrase => phrase.trim().length > 3);
    
    words.forEach(word => chatMemory.words.add(word));
    phrases.forEach(phrase => chatMemory.phrases.add(phrase.trim()));
}

// 🔥 ГЕНЕРАТОР ФРАЗ
function generateMixedPhrase(chatId) {
    const chatMemory = getChatMemory(chatId);
    if (chatMemory.words.size < 5) return null;
    
    const words = Array.from(chatMemory.words);
    const wordCount = 3 + Math.floor(Math.random() * 4);
    let newPhrase = [];
    
    for (let i = 0; i < wordCount; i++) {
        newPhrase.push(words[Math.floor(Math.random() * words.length)]);
    }
    
    let result = newPhrase.join(' ');
    result = result.charAt(0).toUpperCase() + result.slice(1);
    result += ['.', '!', '?', '...'][Math.floor(Math.random() * 4)];
    
    return result;
}

// 🔥 ТАЙМЕРЫ
let isBotActive = false;
let photoTimer = null;
let lastActivityTime = Date.now();

function startTimers(chatId) {
    if (photoTimer) clearInterval(photoTimer);
    
    photoTimer = setInterval(async () => {
        if (isBotActive && Date.now() - lastActivityTime < 3600000) {
            const chatMemory = getChatMemory(chatId);
            const mediaTypes = [];
            if (chatMemory.photos.length > 0) mediaTypes.push('photo');
            if (chatMemory.videos.length > 0) mediaTypes.push('video');
            if (chatMemory.stickers.length > 0) mediaTypes.push('sticker');
            
            if (mediaTypes.length > 0 && Math.random() > 0.5) {
                const randomType = mediaTypes[Math.floor(Math.random() * mediaTypes.length)];
                await sendRandomMedia(chatId, randomType);
            }
        }
    }, 180000 + Math.floor(Math.random() * 3420000));
}

// 🔥 КОМАНДЫ БОТА
const wakeUpPhrases = ["Гудентак! 😎 Виталя на связи!", "Виталя в здании! 💪", "Проснулся! 🚀 Готов к работе!"];
const sleepPhrases = ["Ай мля! Маслину поймал! 😵‍💫", "Виталя уходит в закат! 🌅", "Отключаюсь! 🔌"];

bot.on("text", async (ctx) => {
    const chatId = ctx.chat.id;
    const messageText = ctx.message.text;
    const lowerText = messageText.toLowerCase();
    
    analyzeMessage(chatId, messageText);
    lastActivityTime = Date.now();
    
    // 🔥 КОМАНДЫ УПРАВЛЕНИЯ
    if (lowerText.includes('виталя проснись')) {
        if (!isBotActive) {
            isBotActive = true;
            const phrase = wakeUpPhrases[Math.floor(Math.random() * wakeUpPhrases.length)];
            await ctx.reply(phrase);
            startTimers(chatId);
        }
        return;
    }
    
    if (lowerText.includes('виталя уйди')) {
        if (isBotActive) {
            isBotActive = false;
            const phrase = sleepPhrases[Math.floor(Math.random() * sleepPhrases.length)];
            await ctx.reply(phrase);
            if (photoTimer) clearInterval(photoTimer);
            await saveMemory(); // 💾 СОХРАНЯЕМ ПАМЯТЬ
        }
        return;
    }

    // 🔥 КОМАНДЫ МЕДИА
    if (lowerText === 'uwu' && isBotActive) {
        await sendRandomMedia(chatId, 'photo');
        return;
    }

    if (lowerText === 'видео' && isBotActive) {
        await sendRandomMedia(chatId, 'video');
        return;
    }

    if (lowerText === 'стикер' && isBotActive) {
        await sendRandomMedia(chatId, 'sticker');
        return;
    }

    if (lowerText.startsWith('добавить фото ')) {
        const photoUrl = messageText.slice(13).trim();
        if (addMediaToChat(chatId, photoUrl, 'photo')) {
            await ctx.reply("📸 Фото добавлено!");
        } else {
            await ctx.reply("❌ Неверная ссылка!");
        }
        return;
    }

    // 🔥 ОБЫЧНЫЕ ОТВЕТЫ
    if (isBotActive && Math.random() > 0.5) {
        const response = generateMixedPhrase(chatId) || "Что-то я сегодня не в форме... 🤔";
        await ctx.reply(response);
    }
});

// 🔥 СОХРАНЕНИЕ МЕДИА ИЗ СООБЩЕНИЙ
bot.on(["photo", "video", "sticker"], async (ctx) => {
    if (!isBotActive) return;
    
    const chatId = ctx.chat.id;
    const chatMemory = getChatMemory(chatId);
    
    try {
        if (ctx.message.photo) {
            const photo = ctx.message.photo[ctx.message.photo.length - 1];
            const fileLink = await bot.telegram.getFileLink(photo.file_id);
            chatMemory.photos.push(fileLink.href);
        }
        else if (ctx.message.video) {
            const video = ctx.message.video;
            const fileLink = await bot.telegram.getFileLink(video.file_id);
            chatMemory.videos.push(fileLink.href);
        }
        else if (ctx.message.sticker) {
            chatMemory.stickers.push(ctx.message.sticker.file_id);
        }
        
        await saveMemory();
        await ctx.reply("✅ Сохранено в коллекцию!");
    } catch (error) {
        console.error("❌ Ошибка сохранения медиа:", error);
    }
});

// 🔥 ЗАПУСК СЕРВЕРА
app.get('/', (req, res) => {
    res.send('🤖 Виталя-бот работает!');
});

// 🔥 ИНИЦИАЛИЗАЦИЯ
loadMemory().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Сервер запущен на порту ${PORT}`);
        console.log("✅ Бот готов к работе!");
        console.log("🎮 Команды: Виталя проснись, Виталя уйди, uwu, видео, стикер");
    });
    
    bot.launch().then(() => {
        console.log("🤖 Бот запущен!");
    });
});

// 🔥 СОХРАНЕНИЕ ПРИ ВЫКЛЮЧЕНИИ
process.once('SIGINT', async () => {
    await saveMemory();
    bot.stop('SIGINT');
});

process.once('SIGTERM', async () => {
    await saveMemory();
    bot.stop('SIGTERM');
});