const axios = require('axios');
const crypto = require('crypto');
const https = require('https');

const customAgent = new https.Agent({
  rejectUnauthorized: false
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
                    httpsAgent: customAgent,
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
                return this.getFallbackResponse();
            }

            // ОГРАНИЧИВАЕМ длину истории чтобы избежать огромных запросов
            const limitedHistory = chatHistory.slice(-5); // только последние 5 сообщений

            const messages = [
                {
                    role: 'system',
                    content: 'Отвечай коротко и как обычный человек в чате. Максимум 1-2 предложения. Не пиши длинные тексты. Используй неформальный стиль общения. Иногда добавляй эмодзи. Будь проще.'
                },
                ...limitedHistory,
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
                    temperature: 0.8, // Больше случайности
                    top_p: 0.9,
                    n: 1,
                    stream: false,
                    max_tokens: 50, // ОГРАНИЧИВАЕМ длину ответа
                    repetition_penalty: 1.2
                },
                {
                    httpsAgent: customAgent,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                }
            );

            let responseText = response.data.choices[0].message.content;
            
            // ОБРЕЗАЕМ слишком длинные ответы
            if (responseText.length > 100) {
                responseText = responseText.substring(0, 100) + '...';
            }
            
            // УБИРАЕМ скучные формальные ответы
            if (this.isBoringResponse(responseText)) {
                return this.getFallbackResponse();
            }
            
            return responseText;

        } catch (error) {
            console.error('❌ Ошибка GigaChat API:', error.message);
            return this.getFallbackResponse();
        }
    }

    // Проверяем на скучные формальные ответы
    isBoringResponse(text) {
        const boringPatterns = [
            'как искусственный интеллект',
            'как языковая модель',
            'я не могу',
            'я не имею',
            'извините, но',
            'к сожалению,'
        ];
        
        return boringPatterns.some(pattern => 
            text.toLowerCase().includes(pattern.toLowerCase())
        );
    }

    // Запасные короткие человеческие ответы
    getFallbackResponse() {
        const shortResponses = [
            "Ага, щас... 🎯",
            "Ну такое... 👽", 
            "Запилим! 🔥",
            "Интересно... 🤔",
            "Бывает 😅",
            "Норм 👍",
            "Понял 🧠",
            "Смешно 😂",
            "Грустно 😢",
            "Круто! 🚀",
            "Согласен 💯",
            "Неа 🙅‍♂️",
            "Возможно 🤷‍♂️",
            "Хз че сказать 🤐",
            "Лол 😆",
            "Ого! 😮",
            "Серьезно? 🧐",
            "Ну и ну 😲",
            "Я в шоке 🤯",
            "Прелесть 💫"
        ];
        
        return shortResponses[Math.floor(Math.random() * shortResponses.length)];
    }

    async learnFromChat(chatHistory) {
        try {
            const learningPrompt = 'Научись отвечать коротко и как человек, а не как бот. Максимум 2 предложения.';
            return await this.sendMessage(learningPrompt, []);
        } catch (error) {
            console.error('❌ Ошибка обучения:', error);
            return null;
        }
    }
}

module.exports = new GigaChat();