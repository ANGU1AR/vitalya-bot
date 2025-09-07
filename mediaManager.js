const { isValidPhotoUrl, isValidVideoUrl } = require('./utils');

let lastSentMediaIndex = -1;

async function sendRandomPhoto(chatId, chatMemory) {
    if (chatMemory.photos.length === 0) return;
    
    lastSentMediaIndex = (lastSentMediaIndex + 1) % chatMemory.photos.length;
    const photoUrl = chatMemory.photos[lastSentMediaIndex];
    
    try {
        await bot.telegram.sendPhoto(chatId, photoUrl, {
            caption: "Держите фотку! 📸"
        });
    } catch (error) {
        console.error("Ошибка отправки фото:", error);
    }
}

async function sendRandomVideo(chatId, chatMemory) {
    if (chatMemory.videos.length === 0) return;
    
    lastSentMediaIndex = (lastSentMediaIndex + 1) % chatMemory.videos.length;
    const videoUrl = chatMemory.videos[lastSentMediaIndex];
    
    try {
        await bot.telegram.sendVideo(chatId, videoUrl, {
            caption: "Держите видео! 🎥"
        });
    } catch (error) {
        console.error("Ошибка отправки видео:", error);
    }
}

async function sendRandomSticker(chatId, chatMemory) {
    if (chatMemory.stickers.length === 0) return;
    
    const randomSticker = chatMemory.stickers[Math.floor(Math.random() * chatMemory.stickers.length)];
    
    try {
        await bot.telegram.sendSticker(chatId, randomSticker);
    } catch (error) {
        console.error("Ошибка отправки стикера:", error);
    }
}

// ... остальные функции ...

module.exports = { sendRandomPhoto, sendRandomVideo, sendRandomSticker, addPhotoFromUrl, addVideoFromUrl, saveMediaFromMessage };