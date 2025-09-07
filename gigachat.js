const axios = require('axios');
const crypto = require('crypto');

class GigaChat {
    constructor() {
        this.baseURL = 'https://gigachat.devices.sberbank.ru';
        this.authURL = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
        this.accessToken = null;
        this.tokenExpires = 0;
        
        // Получаем из переменных окружения
        this.authKey = process.env.GIGACHAT_AUTH_KEY;
        this.clientId = process.env.GIGACHAT_CLIENT_ID;
        this.clientSecret = process.env.GIGACHAT_CLIENT_SECRET;
    }

    // Генерация уникального RqUID
    generateRqUID() {
        return crypto.randomUUID();
    }

    // Получение access token
    async getAccessToken() {
        try {
            // Если токен еще действителен, возвращаем его
            if (this.accessToken && Date.now() < this.tokenExpires) {
                return this.accessToken;
            }

            const response = await axios.post(this.authURL, 
                new URLSearchParams({ scope: 'GIGACHAT_API_PERS' }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json',
                        'RqUID': this.generateRqUID(),
                        'Authorization': `Basic ${this.authKey}`
                    }
                }
            );

            this.accessToken = response.data.access_token;
            this.tokenExpires = Date.now() + (response.data.expires_in * 1000) - 60000; // -1 минута на запас
            
            console.log('✅ GigaChat token получен');
            return this.accessToken;
        } catch (error) {
            console.error('❌ Ошибка получения GigaChat token:', error.response?.data || error.message);
            throw error;
        }
    }

    // Отправка сообщения в GigaChat
    async sendMessage(message, chatHistory = []) {
        try {
            const token = await this.getAccessToken();
            
            // Формируем историю диалога
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
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                }
            );

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('❌ Ошибка GigaChat API:', error.response?.data || error.message);
            return "Что-то я сегодня не в форме... 🤔";
        }
    }

    // Обучение на основе истории чата
    async learnFromChat(chatHistory) {
        try {
            const learningPrompt = `
Проанализируй историю диалога и научись отвечать в похожем стиле. 
Учти особенности общения, манеру речи, используемые слова и выражения.
Старайся имитировать этот стиль в будущих ответах.

История диалога:
${JSON.stringify(chatHistory, null, 2)}

Теперь ответь в похожем стиле на следующее сообщение: 
`;
            
            return await this.sendMessage(learningPrompt, []);
        } catch (error) {
            console.error('❌ Ошибка обучения:', error);
            return null;
        }
    }
}

module.exports = new GigaChat();