const { getChatMemory } = require('./memoryManager');

function analyzeMessage(chatId, messageText) {
    try {
        const chatMemory = getChatMemory(chatId);
        const words = messageText.toLowerCase().split(/\s+/).filter(word => word.length > 2);
        
        words.forEach(word => {
            if (word && word.length > 1) {
                chatMemory.words.add(word);
            }
        });
        
        if (words.length > 2) {
            chatMemory.phrases.add(messageText);
        }
    } catch (error) {
        console.log("Анализ сообщения пропущен:", error.message);
    }
}

function generateMixedPhrase(chatId) {
    try {
        const chatMemory = getChatMemory(chatId);
        
        if (chatMemory.words.size === 0) {
            return "Что-то я сегодня не в форме... 🤔";
        }
        
        const words = Array.from(chatMemory.words);
        const phrases = Array.from(chatMemory.phrases);
        
        const simpleResponses = [
            "Привет! Как дела? 😎",
            "Что нового? 💬",
            "Как жизнь? 🚀",
            "О чем поговорим? 🤔",
            "Сегодня отличный день! 🌟",
            "Чем занят? 💪",
            "Как настроение? 😊"
        ];
        
        return simpleResponses[Math.floor(Math.random() * simpleResponses.length)];
        
    } catch (error) {
        return "Что-то я сегодня не в форме... 🤔";
    }
}

module.exports = { analyzeMessage, generateMixedPhrase };