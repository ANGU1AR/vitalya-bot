function setupRemoteControl(bot) {
    bot.command('admin_stats', async (ctx) => {
        const chatId = ctx.chat.id;
        const chatMemory = require('./memoryManager').getChatMemory(chatId);
        
        const stats = `📊 Статистика чата:
📝 Слов: ${chatMemory.words.size}
💬 Фраз: ${chatMemory.phrases.size}
📸 Фото: ${chatMemory.photos.length}
🎥 Видео: ${chatMemory.videos.length}
😊 Стикеров: ${chatMemory.stickers.length}`;
        
        await ctx.reply(stats);
    });
    
    bot.command('admin_clear', async (ctx) => {
        const chatId = ctx.chat.id;
        const chatMemory = require('./memoryManager').getChatMemory(chatId);
        
        chatMemory.words.clear();
        chatMemory.phrases.clear();
        chatMemory.photos = [];
        chatMemory.videos = [];
        chatMemory.stickers = [];
        
        await require('./memoryManager').saveMemory();
        await ctx.reply('Память очищена! 🧹');
    });
}

module.exports = { setupRemoteControl };