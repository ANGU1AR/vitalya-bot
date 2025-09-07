const fs = require('fs').promises;
const path = require('path');

const memoryFile = path.join(__dirname, 'memory.json');
let memory = {};

async function loadMemory() {
    try {
        const data = await fs.readFile(memoryFile, 'utf8');
        const rawMemory = JSON.parse(data);
        
        memory = {};
        for (const chatId in rawMemory) {
            memory[chatId] = {
                words: new Set(rawMemory[chatId].words || []),
                phrases: new Set(rawMemory[chatId].phrases || []),
                photos: rawMemory[chatId].photos || [],
                videos: rawMemory[chatId].videos || [],
                stickers: rawMemory[chatId].stickers || []
            };
        }
    } catch (error) {
        memory = {};
    }
}

async function saveMemory() {
    try {
        const memoryToSave = {};
        for (const chatId in memory) {
            memoryToSave[chatId] = {
                words: Array.from(memory[chatId].words || []),
                phrases: Array.from(memory[chatId].phrases || []),
                photos: memory[chatId].photos || [],
                videos: memory[chatId].videos || [],
                stickers: memory[chatId].stickers || []
            };
        }
        await fs.writeFile(memoryFile, JSON.stringify(memoryToSave, null, 2));
    } catch (error) {
        console.error("Ошибка сохранения памяти:", error);
    }
}

function getChatMemory(chatId) {
    console.log("Запрос памяти для чата:", chatId);
    
    if (!memory[chatId]) {
        console.log("Создаем новую память для чата:", chatId);
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