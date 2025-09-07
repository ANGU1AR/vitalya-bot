const axios = require('axios');
const crypto = require('crypto');
const https = require('https');

// Создаем кастомный https agent который игнорирует SSL ошибки
const customAgent = new https.Agent({
  rejectUnauthorized: false // ИГНОРИРУЕМ SSL ОШИБКИ
});

class GigaChat {
    constructor() {
        this.baseURL = 'https://gigachat.devices.sberbank.ru';
        this.authURL = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
        this.accessToken = null;
        this.tokenExpires = 0;
        
        this.authKey = process.env.GIGACHAT_AUTH_KEY;
    }

    generateRqUID() {
        return crypto.randomUUID();
    }

    async getAccessToken() {
        try {
            if (this.accessToken && Date.now() < this.tokenExpires) {
                return this.accessToken;
            }

            const response = await axios.post(this.authURL, 
                new URLSearchParams({ scope: 'GIGACHAT_API_PERS' }),
                {
                    httpsAgent: customAgent, // ДОБАВЛЯЕМ КАСТОМНЫЙ AGENT
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json',
                        'RqUID': this.generateRqUID(),
                        'Authorization': `Basic ${this.authKey}`
                    }
                }
            );

            this.accessToken = response.data.access_token;
            this.tokenExpires = Date.now() + (response.data.expires_in * 1000) - 60000;
            
            console.log('✅ GigaChat token получен');
            return this.accessToken;
        } catch (error) {
            console.error('❌ Ошибка получения GigaChat token:', error.message);
            return null;
        }
    }

    async sendMessage(message, chatHistory = []) {
        try {
            const token = await this.getAccessToken();
            if (!token) {
                return "Что-то я сегодня не в форме... 🤔";
            }

            const messages = [
                ...chatHistory,
                {
                    role: 'user',
                    content: message
                }
            ];

            const response = await axios.post(
                `${this.baseURL}/api/v1/chat/completions`,
                {
                    model: 'GigaChat',
                    messages: messages,
                    temperature: 0.7,
                    top_p: 0.1,
                    n: 1,
                    stream: false,
                    max_tokens: 512,
                    repetition_penalty: 1.1
                },
                {
                    httpsAgent: customAgent, // ДОБАВЛЯЕМ И ЗДЕСЬ
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                }
            );

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('❌ Ошибка GigaChat API:', error.message);
            return "Что-то я сегодня не в форме... 🤔";
        }
    }

    async learnFromChat(chatHistory) {
        try {
            const learningPrompt = `Проанализируй историю диалога и научись отвечать в похожем стиле. Учти особенности общения, манеру речи. История: ${JSON.stringify(chatHistory)}`;
            return await this.sendMessage(learningPrompt, []);
        } catch (error) {
            console.error('❌ Ошибка обучения:', error);
            return null;
        }
    }
}

module.exports = new GigaChat();