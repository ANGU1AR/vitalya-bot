const { Telegraf } = require("telegraf");
const express = require('express');
const axios = require('axios');

// Импорт модулей
const { loadMemory, saveMemory, getChatMemory } = require('./memoryManager');
const { sendRandomPhoto, sendRandomVideo, sendRandomSticker, addPhotoFromUrl, addVideoFromUrl, saveMediaFromMessage } = require('./mediaManager');
const { generateMixedPhrase } = require('./aiProcessor');
const { setupRemoteControl } = require('./remoteControl');
const gigachat = require('./gigachat');

const telegramToken = process.env.TELEGRAM_TOKEN;
const bot = new Telegraf(telegramToken);
const app = express();
const PORT = process.env.PORT || 3000;

let isBotActive = false;
let recentMessages = [];
let lastActivityTime = Date.now();
let photoTimer = null;
let chatHistory = [];

// 🔥 ДОБАВЛЯЕМ СЧЕТЧИКИ ДЛЯ БАБУШКИНЫХ КОММЕНТАРИЕВ
let messageCounter = 0;
let nextCommentAt = Math.floor(Math.random() * 5) + 1; // случайное число от 1 до 5

// 🔥 Загрузка памяти при запуске
async function initializeBot() {
    await loadMemory();
    console.log("🧠 Память загружена!");
}

// 🔥 Таймеры
function startTimers(chatId) {
    if (photoTimer) clearInterval(photoTimer);
    
    // Таймер для медиа (оставляем только медиа, убираем комментарии по времени)
    photoTimer = setInterval(async () => {
        if (isBotActive && Date.now() - lastActivityTime < 3600000) {
            if (Math.random() > 0.8) {
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
    }, 300000);
}

// 🔥 Обработка сообщений
bot.on("text", async (ctx) => {
    try {
        const chatId = ctx.chat.id;
        const messageText = ctx.message.text;
        const lowerText = messageText.toLowerCase();
        
        // 🔥 УВЕЛИЧИВАЕМ СЧЕТЧИК СООБЩЕНИЙ
        messageCounter++;
        console.log(`📊 Сообщение ${messageCounter}/${nextCommentAt} до комментария`);
        
        // 🔥 ПРОВЕРЯЕМ, НЕ ПОРА ЛИ БАБУШКЕ ВСТАВИТЬ КОММЕНТАРИЙ
        if (isBotActive && messageCounter >= nextCommentAt) {
            const comment = gigachat.getRandomComment();
            if (comment) {
                // Небольшая задержка для естественности
                setTimeout(async () => {
                    try {
                        await bot.telegram.sendMessage(chatId, comment);
                        console.log(`👵 Бабушка вставила комментарий после ${messageCounter} сообщений`);
                    } catch (error) {
                        console.error("Ошибка отправки комментария:", error.message);
                    }
                }, 2000 + Math.floor(Math.random() * 3000));
            }
            
            // 🔥 СБРАСЫВАЕМ СЧЕТЧИК И ЗАДАЕМ НОВОЕ СЛУЧАЙНОЕ ЗНАЧЕНИЕ
            messageCounter = 0;
            nextCommentAt = Math.floor(Math.random() * 5) + 1; // от 1 до 5
            console.log(`🎯 Следующий комментарий через ${nextCommentAt} сообщений`);
        }
        
        // Сохраняем в историю
        chatHistory.push({
            role: 'user',
            content: messageText,
            timestamp: Date.now()
        });
        
        // Ограничиваем историю
        if (chatHistory.length > 20) {
            chatHistory = chatHistory.slice(-20);
        }
        
        lastActivityTime = Date.now();
        
        // 🔥 КОМАНДЫ УПРАВЛЕНИЯ - ПРОВЕРЯЕМ ПЕРВЫМИ!
        
        // Команды включения/выключения
        if (lowerText.includes('виталя проснись') || lowerText.includes('виталя включись')) {
            if (!isBotActive) {
                isBotActive = true;
                const wakeUpPhrases = [
                    "ЕКАТЕРИНА ОСТАНОВИТЕСЯ НЕ БАНЬТЕ МЕНЯ!!!"
                ];
                const phrase = wakeUpPhrases[Math.floor(Math.random() * wakeUpPhrases.length)];
                await ctx.reply(phrase);
                startTimers(chatId);
                // Сбрасываем счетчик при активации
                messageCounter = 0;
                nextCommentAt = Math.floor(Math.random() * 5) + 1;
            }
            return;
        }
        
        if (lowerText.includes('виталя уйди') || lowerText.includes('виталя вырубай')) {
            if (isBotActive) {
                isBotActive = false;
                const sleepPhrases = [
                    "Ай мля! Маслину поймал! 😵‍💫",
                    "Виталя уходит в закат! 🌅",
                    "Отключаюсь! 🔌"
                ];
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

        // Команда "Виталя статус"
        if ((lowerText === 'виталя статус' || lowerText === 'виталя время') && isBotActive) {
            const chatMemory = getChatMemory(chatId);
            const now = new Date();
            const stats = `📊 Статус Витали:
🕐 Время: ${now.toLocaleTimeString('ru-RU')}
📅 Дата: ${now.toLocaleDateString('ru-RU')}
💬 Слов в памяти: ${chatMemory.words.size}
📝 Фраз в памяти: ${chatMemory.phrases.size}
📸 Фото: ${chatMemory.photos.length}
🎥 Видео: ${chatMemory.videos.length}
😊 Стикеров: ${chatMemory.stickers.length}
🔋 Состояние: ${isBotActive ? 'Активен' : 'Спит'}
📨 До комментария: ${nextCommentAt - messageCounter} сообщ.`;
            
            await ctx.reply(stats);
            return;
        }

        // Команда "Виталя учись"
        if ((lowerText === 'виталя учись' || lowerText === 'виталя обучись') && isBotActive) {
            await ctx.sendChatAction('typing');
            const learningResult = await gigachat.learnFromChat(chatHistory);
            
            if (learningResult) {
                await ctx.reply("✅ Обучение завершено! Теперь я стал умнее! 🧠");
            } else {
                await ctx.reply("❌ Не удалось пройти обучение...");
            }
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

        // 🔥 ОТВЕТ ЧЕРЕЗ GIGACHAT (только если не команда)
        if (isBotActive && (lowerText.startsWith('виталя') || Math.random() > 0.7)) {
            // Пропускаем если это была команда
            if (lowerText.includes('статус') || lowerText.includes('время') || 
                lowerText.includes('учись') || lowerText.includes('обучись')) {
                return;
            }
            
            const userMessage = lowerText.startsWith('виталя') ? messageText.slice(7).trim() : messageText;
            
            if (userMessage) {
                await ctx.sendChatAction('typing');
                
                const response = await gigachat.sendMessage(userMessage, chatHistory);
                
                chatHistory.push({
                    role: 'assistant',
                    content: response,
                    timestamp: Date.now()
                });
                
                await ctx.reply(response);
            }
        }
    } catch (error) {
        console.error("Ошибка обработки сообщения:", error.message);
    }
});

// 🔥 Обработка медиа-сообщений
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

// Express для Railway
app.get('/', (req, res) => {
    res.send('🤖 Виталя-бот с бабушкой работает!');
});

// 🔥 Запуск
initializeBot().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Сервер запущен на порту ${PORT}`);
    });
    
    setupRemoteControl(bot);
    
    bot.launch().then(() => {
        console.log("🤖 Виталя-бот с бабушкой запущен!");
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