const fs = require('fs').promises;
const path = require('path');

const memoryFile = path.join(__dirname, 'memory.json');
let memory = {
    words: new Set(),
    phrases: new Set(),
    photos: [],
    videos: [],
    stickers: []
};

async function loadMemory() {
    try {
        const data = await fs.readFile(memoryFile, 'utf8');
        const rawMemory = JSON.parse(data);
        
        memory = {
            words: new Set(rawMemory.words || []),
            phrases: new Set(rawMemory.phrases || []),
            photos: rawMemory.photos || [],
            videos: rawMemory.videos || [],
            stickers: rawMemory.stickers || []
        };
    } catch (error) {
        memory = {
            words: new Set(),
            phrases: new Set(),
            photos: [],
            videos: [],
            stickers: []
        };
    }
}

async function saveMemory() {
    try {
        const memoryToSave = {
            words: Array.from(memory.words || []),
            phrases: Array.from(memory.phrases || []),
            photos: memory.photos || [],
            videos: memory.videos || [],
            stickers: memory.stickers || []
        };
        await fs.writeFile(memoryFile, JSON.stringify(memoryToSave, null, 2));
    } catch (error) {
        console.error("Ошибка сохранения памяти:", error);
    }
}

function getChatMemory() {
    return memory;
}

function updateChatMemory(newMemory) {
    memory = newMemory;
}

module.exports = { loadMemory, saveMemory, getChatMemory, updateChatMemory };