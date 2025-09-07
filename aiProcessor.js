const { getChatMemory } = require('./memoryManager');

function analyzeMessage(chatId, messageText) {
    const chatMemory = getChatMemory(chatId);
    const words = messageText.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    
    words.forEach(word => chatMemory.words.add(word));
    
    if (words.length > 3) {
        chatMemory.phrases.add(messageText);
    }
}

function generateMixedPhrase(chatId) {
    const chatMemory = getChatMemory(chatId);
    
    if (chatMemory.words.size === 0 || chatMemory.phrases.size === 0) {
        return null;
    }
    
    const words = Array.from(chatMemory.words);
    const phrases = Array.from(chatMemory.phrases);
    
    if (Math.random() > 0.5) {
        return generateFromWords(words);
    } else {
        return generateFromPhrases(phrases);
    }
}

function generateFromWords(words) {
    const wordCount = Math.floor(Math.random() * 3) + 3;
    let phrase = [];
    
    for (let i = 0; i < wordCount; i++) {
        phrase.push(words[Math.floor(Math.random() * words.length)]);
    }
    
    return phrase.join(' ') + getRandomEmoji();
}

function generateFromPhrases(phrases) {
    if (phrases.length === 0) return null;
    
    const phraseParts = phrases[Math.floor(Math.random() * phrases.length)].split(/\s+/);
    const start = Math.floor(Math.random() * Math.max(1, phraseParts.length - 2));
    const length = Math.floor(Math.random() * 3) + 2;
    
    return phraseParts.slice(start, start + length).join(' ') + getRandomEmoji();
}

function getRandomEmoji() {
    const emojis = [' 😎', ' 💪', ' 🚀', ' 🤔', ' 🎯', ' 🔥', ' 📸', ' 🎥', ' 🤖'];
    return emojis[Math.floor(Math.random() * emojis.length)];
}

module.exports = { analyzeMessage, generateMixedPhrase };