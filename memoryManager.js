const fs = require('fs').promises;
const path = require('path');

const memoryFile = path.join(__dirname, 'memory.json');
let memory = {};

// Добавляем сохранение истории в память
async function loadMemory() {
    try {
        const data = await fs.readFile(memoryFile, 'utf8');
        const rawMemory = JSON.parse(data);
        
        memory = {
            words: new Set(rawMemory.words || []),
            phrases: new Set(rawMemory.phrases || []),
            photos: rawMemory.photos || [],
            videos: rawMemory.videos || [],
            stickers: rawMemory.stickers || [],
            chatHistory: rawMemory.chatHistory || [] // Добавляем историю
        };
        
        // Восстанавливаем историю в глобальную переменную
        chatHistory = memory.chatHistory;
    } catch (error) {
        memory = {
            words: new Set(),
            phrases: new Set(),
            photos: [],
            videos: [],
            stickers: [],
            chatHistory: []
        };
    }
}

async function saveMemory() {
    try {
        // Сохраняем текущую историю в память
        memory.chatHistory = chatHistory;
        
        const memoryToSave = {
            words: Array.from(memory.words || []),
            phrases: Array.from(memory.phrases || []),
            photos: memory.photos || [],
            videos: memory.videos || [],
            stickers: memory.stickers || [],
            chatHistory: memory.chatHistory || [] // Сохраняем историю
        };
        
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