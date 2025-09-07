const fs = require('fs').promises;
const path = require('path');

const memoryFile = path.join(__dirname, 'memory.json');
let memory = {};

// Память разделена по chatId
async function loadMemory() {
    try {
        const data = await fs.readFile(memoryFile, 'utf8');
        memory = JSON.parse(data);
    } catch (error) {
        memory = {};
    }
}

async function saveMemory() {
    try {
        await fs.writeFile(memoryFile, JSON.stringify(memory, null, 2));
    } catch (error) {
        console.error("Ошибка сохранения памяти:", error);
    }
}

function getChatMemory(chatId) {
    if (!memory[chatId]) {
        memory[chatId] = {
            words: new Set(),
            phrases: new Set(),
            photos: [],
            videos: [],
            stickers: []
        };
    }
    return memory[chatId];
}

function updateChatMemory(chatId, newMemory) {
    memory[chatId] = newMemory;
}

module.exports = { loadMemory, saveMemory, getChatMemory, updateChatMemory };