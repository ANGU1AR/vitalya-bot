const { Telegraf } = require("telegraf");
const express = require('express');
const axios = require('axios');

// Импорт модулей
const { loadMemory, saveMemory, getChatMemory, updateChatMemory } = require('./memoryManager');
const { sendRandomPhoto, sendRandomVideo, sendRandomSticker, addPhotoFromUrl, addVideoFromUrl, saveMediaFromMessage } = require('./mediaManager');
const { generateMixedPhrase, analyzeMessage } = require('./aiProcessor');
const { setupRemoteControl } = require('./remoteControl');

const telegramToken = process.env.TELEGRAM_TOKEN;
const bot = new Telegraf(telegramToken);
const app = express();
const PORT = process.env.PORT || 3000;

let isBotActive = false;
let recentMessages = [];
let lastActivityTime = Date.now();
let photoTimer = null;

// 🔥 Загрузка памяти при запуске
async function initializeBot() {
    await loadMemory();
    console.log("🧠 Память загружена!");
}

// 🔥 Таймеры
function startTimers(chatId) {
    if (photoTimer) clearInterval(photoTimer);
    
    // Таймер для фраз
    setInterval(async () => {
        if (isBotActive && Date.now() - lastActivityTime < 300000) {
            const mixedPhrase = generateMixedPhrase(chatId);
            if (mixedPhrase && Math.random() > 0.6) {
                await bot.telegram.sendMessage(chatId, mixedPhrase);
            }
        }
    }, 180000);
    
    // Таймер для медиа
    photoTimer = setInterval(async () => {
        if (isBotActive && Date.now() - lastActivityTime < 3600000) {
            if (Math.random() > 0.5) {
                const chatMemory = getChatMemory(chatId);
                const mediaType = Math.random() > 0.5 ? 'photo' : 'video';
                
                if (mediaType === 'photo' && chatMemory.photos.length > 0) {
                    await sendRandomPhoto(bot, chatId, chatMemory);
                } else if (mediaType === 'video' && chatMemory.videos.length > 0) {
                    await sendRandomVideo(bot, chatId, chatMemory);
                } else if (chatMemory.stickers.length > 0) {
                    await sendRandomSticker(bot, chatId, chatMemory);
                }
            }
        }
    }, 180000 + Math.floor(Math.random() * 3420000));
}

// 🔥 ПОЛНАЯ ИНТЕГРАЦИЯ С SaveAsBot
async function downloadFromSaveAsBot(url, chatId) {
    try {
        await bot.telegram.sendMessage(chatId, "Скачиваю контент... ⏳");
        
        // Отправляем запрос к SaveAsBot
        await axios.post(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
            chat_id: '@SaveAsBot',
            text: url
        });
        
        // Ждем ответа от SaveAsBot
        const checkSaveAsResponse = setInterval(async () => {
            try {
                // Проверяем последние сообщения от SaveAsBot
                const updates = await axios.post(`https://api.telegram.org/bot${telegramToken}/getUpdates`, {
                    offset: -10,
                    timeout: 1
                });
                
                const saveAsMessages = updates.data.result.filter(update => 
                    update.message && 
                    update.message.from.username === 'SaveAsBot' &&
                    update.message.text && 
                    (update.message.text.includes('Downloaded') || update.message.text.includes('Скачано'))
                );
                
                if (saveAsMessages.length > 0) {
                    clearInterval(checkSaveAsResponse);
                    const fileMessage = saveAsMessages[0].message;
                    
                    if (fileMessage.photo) {
                        const photo = fileMessage.photo[fileMessage.photo.length - 1];
                        const file = await bot.telegram.getFile(photo.file_id);
                        const fileUrl = `https://api.telegram.org/file/bot${telegramToken}/${file.file_path}`;
                        
                        if (addPhotoFromUrl(chatId, fileUrl)) {
                            await bot.telegram.sendPhoto(chatId, fileUrl, {
                                caption: "Контент добавлен в коллекцию! ✅"
                            });
                        }
                    } else if (fileMessage.video) {
                        const video = fileMessage.video;
                        const file = await bot.telegram.getFile(video.file_id);
                        const fileUrl = `https://api.telegram.org/file/bot${telegramToken}/${file.file_path}`;
                        
                        if (addVideoFromUrl(chatId, fileUrl)) {
                            await bot.telegram.sendVideo(chatId, fileUrl, {
                                caption: "Контент добавлен в коллекцию! ✅"
                            });
                        }
                    }
                }
            } catch (error) {
                console.error("Ошибка проверки SaveAsBot:", error);
            }
        }, 3000);
        
        // Таймаут на проверку
        setTimeout(() => {
            clearInterval(checkSaveAsResponse);
            bot.telegram.sendMessage(chatId, "Не удалось скачать контент 😕");
        }, 15000);
        
    } catch (error) {
        console.error("❌ Ошибка интеграции с SaveAsBot:", error.message);
        await bot.telegram.sendMessage(chatId, "Ошибка при скачивании 😵");
    }
}

// Фразы для включения/выключения
const wakeUpPhrases = ["Гудентак! 😎 Виталя на связи!", "Виталя в здании! 💪", "Проснулся! 🚀 Готов к работе!"];
const sleepPhrases = ["Ай мля! Маслину поймал! 😵‍💫", "Виталя уходит в закат! 🌅", "Отключаюсь! 🔌"];

// 🔥 Обработка сообщений (ИСПРАВЛЕННАЯ ВЕРСИЯ)
bot.on("text", async (ctx) => {
    try {
        const chatId = ctx.chat.id;
        const messageText = ctx.message.text;
        const lowerText = messageText.toLowerCase();
        
        analyzeMessage(chatId, messageText);
        lastActivityTime = Date.now();
        
        // Интеграция с SaveAsBot
        if (lowerText.startsWith('скачай ') && isBotActive) {
            const url = messageText.slice(7).trim();
            await ctx.reply("Пытаюсь скачать... ⏳");
            await downloadFromSaveAsBot(url, chatId);
            return;
        }
        
        // Команды управления
        if (lowerText.includes('виталя проснись') || lowerText.includes('виталя включись')) {
            if (!isBotActive) {
                isBotActive = true;
                const phrase = wakeUpPhrases[Math.floor(Math.random() * wakeUpPhrases.length)];
                await ctx.reply(phrase);
                startTimers(chatId);
            }
            return;
        }
        
        if (lowerText.includes('виталя уйди') || lowerText.includes('виталя вырубай')) {
            if (isBotActive) {
                isBotActive = false;
                const phrase = sleepPhrases[Math.floor(Math.random() * sleepPhrases.length)];
                await ctx.reply(phrase);
                if (photoTimer) clearInterval(photoTimer);
                await saveMemory();
            }
            return;
        }

        // Команда UwU для фото
        if ((lowerText === 'uwu' || lowerText === 'виталя uwu') && isBotActive) {
            const chatMemory = getChatMemory(chatId);
            await sendRandomPhoto(bot, chatId, chatMemory);
            return;
        }

        // Команда для видео
        if ((lowerText === 'видео' || lowerText === 'виталя видео') && isBotActive) {
            const chatMemory = getChatMemory(chatId);
            await sendRandomVideo(bot, chatId, chatMemory);
            return;
        }

        // Команда для стикеров
        if ((lowerText === 'стикер' || lowerText === 'виталя стикер') && isBotActive) {
            const chatMemory = getChatMemory(chatId);
            await sendRandomSticker(bot, chatId, chatMemory);
            return;
        }

        // Добавление медиа по URL
        if (lowerText.startsWith('добавить фото ') && isBotActive) {
            const photoUrl = messageText.slice(13).trim();
            if (addPhotoFromUrl(chatId, photoUrl)) {
                await ctx.reply("Фото добавлено в коллекцию! 📸");
            }
            return;
        }

        if (lowerText.startsWith('добавить видео ') && isBotActive) {
            const videoUrl = messageText.slice(14).trim();
            if (addVideoFromUrl(chatId, videoUrl)) {
                await ctx.reply("Видео добавлено в коллекцию! 🎥");
            }
            return;
        }

        // Ответ на обращение
        if (isBotActive && (lowerText.startsWith('виталя') || Math.random() > 0.7)) {
            const userMessage = lowerText.startsWith('виталя') ? messageText.slice(7).trim() : messageText;
            
            if (userMessage) {
                await ctx.sendChatAction('typing');
                const mixedPhrase = generateMixedPhrase(chatId);
                const response = mixedPhrase || "Что-то я сегодня не в форме... 🤔";
                await ctx.reply(response);
            }
        }
    } catch (error) {
        console.error("Ошибка обработки сообщения:", error.message);
    }
});

// 🔥 Обработка медиа-сообщений (ИСПРАВЛЕННАЯ ВЕРСИЯ)
bot.on(["photo", "video", "sticker"], async (ctx) => {
    try {
        if (isBotActive) {
            const chatId = ctx.chat.id;
            const savedUrl = await saveMediaFromMessage(chatId, ctx);
            if (savedUrl) {
                await ctx.reply("Медиа сохранено в коллекцию! ✅");
            }
        }
    } catch (error) {
        console.error("Ошибка обработки медиа:", error.message);
    }
});

// 🔥 Обработка медиа-сообщений
bot.on(["photo", "video", "sticker"], async (ctx) => {
    if (isBotActive) {
        const chatId = ctx.chat.id;
        const savedUrl = await saveMediaFromMessage(chatId, ctx);
        if (savedUrl) {
            await ctx.reply("Медиа сохранено в коллекцию! ✅");
        }
    }
});

// Express для Railway
app.get('/', (req, res) => {
    res.send('🤖 Виталя-бот с улучшенной памятью работает!');
});

// 🔥 Запуск
initializeBot().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Сервер запущен на порту ${PORT}`);
    });
    
    setupRemoteControl(bot);
    
    bot.launch().then(() => {
        console.log("🤖 Виталя-бот запущен!");
    });
});

// Graceful shutdown
process.once('SIGINT', async () => {
    await saveMemory();
    bot.stop('SIGINT');
});

process.once('SIGTERM', async () => {
    await saveMemory();
    bot.stop('SIGTERM');
});