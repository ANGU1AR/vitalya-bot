const fs = require('fs').promises;
const path = require('path');

const memoryFile = path.join(__dirname, 'memory.json');
let memory = {};
let memoryCache = null; // ДОБАВЛЯЕМ КЭШ

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
        memoryCache = memory; // СОХРАНЯЕМ В КЭШ
    } catch (error) {
        memory = {};
        memoryCache = {};
    }
}

function getChatMemory(chatId) {
    // ИСПОЛЬЗУЕМ КЭШ вместо постоянных запросов
    if (!memoryCache[chatId]) {
        memoryCache[chatId] = {
            words: new Set(),
            phrases: new Set(),
            photos: [],
            videos: [],
            stickers: []
        };
    }
    return memoryCache[chatId];
}

async function saveMemory() {
    try {
        const memoryToSave = {};
        for (const chatId in memoryCache) {
            memoryToSave[chatId] = {
                words: Array.from(memoryCache[chatId].words || []),
                phrases: Array.from(memoryCache[chatId].phrases || []),
                photos: memoryCache[chatId].photos || [],
                videos: memoryCache[chatId].videos || [],
                stickers: memoryCache[chatId].stickers || []
            };
        }
        await fs.writeFile(memoryFile, JSON.stringify(memoryToSave, null, 2));
    } catch (error) {
        console.error("Ошибка сохранения памяти:", error);
    }
}

module.exports = { loadMemory, saveMemory, getChatMemory, updateChatMemory };