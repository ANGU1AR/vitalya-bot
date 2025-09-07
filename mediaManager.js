const { isValidPhotoUrl, isValidVideoUrl, isImageUrl, isVideoUrl } = require('./utils');

let lastSentMediaIndex = -1;

async function sendRandomPhoto(bot, chatId, chatMemory) {
    if (!chatMemory.photos || chatMemory.photos.length === 0) return;
    
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

async function sendRandomVideo(bot, chatId, chatMemory) {
    if (!chatMemory.videos || chatMemory.videos.length === 0) return;
    
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

async function sendRandomSticker(bot, chatId, chatMemory) {
    if (!chatMemory.stickers || chatMemory.stickers.length === 0) return;
    
    const randomSticker = chatMemory.stickers[Math.floor(Math.random() * chatMemory.stickers.length)];
    
    try {
        await bot.telegram.sendSticker(chatId, randomSticker);
    } catch (error) {
        console.error("Ошибка отправки стикера:", error);
    }
}

function addPhotoFromUrl(chatId, photoUrl) {
    if (!isValidPhotoUrl(photoUrl)) return false;
    
    const chatMemory = require('./memoryManager').getChatMemory(chatId);
    if (!chatMemory.photos.includes(photoUrl)) {
        chatMemory.photos.push(photoUrl);
        require('./memoryManager').saveMemory();
        return true;
    }
    return false;
}

function addVideoFromUrl(chatId, videoUrl) {
    if (!isValidVideoUrl(videoUrl)) return false;
    
    const chatMemory = require('./memoryManager').getChatMemory(chatId);
    if (!chatMemory.videos.includes(videoUrl)) {
        chatMemory.videos.push(videoUrl);
        require('./memoryManager').saveMemory();
        return true;
    }
    return false;
}

async function saveMediaFromMessage(chatId, ctx) {
    const chatMemory = require('./memoryManager').getChatMemory(chatId);
    
    if (ctx.message.photo) {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const file = await ctx.telegram.getFile(photo.file_id);
        const photoUrl = `https://api.telegram.org/file/bot${ctx.botInfo.token}/${file.file_path}`;
        
        if (!chatMemory.photos.includes(photoUrl)) {
            chatMemory.photos.push(photoUrl);
            require('./memoryManager').saveMemory();
            return photoUrl;
        }
    }
    
    if (ctx.message.video) {
        const video = ctx.message.video;
        const file = await ctx.telegram.getFile(video.file_id);
        const videoUrl = `https://api.telegram.org/file/bot${ctx.botInfo.token}/${file.file_path}`;
        
        if (!chatMemory.videos.includes(videoUrl)) {
            chatMemory.videos.push(videoUrl);
            require('./memoryManager').saveMemory();
            return videoUrl;
        }
    }
    
    if (ctx.message.sticker) {
        const sticker = ctx.message.sticker;
        if (!chatMemory.stickers.includes(sticker.file_id)) {
            chatMemory.stickers.push(sticker.file_id);
            require('./memoryManager').saveMemory();
            return sticker.file_id;
        }
    }
    
    return null;
}

module.exports = { 
    sendRandomPhoto, 
    sendRandomVideo, 
    sendRandomSticker, 
    addPhotoFromUrl, 
    addVideoFromUrl, 
    saveMediaFromMessage 
};