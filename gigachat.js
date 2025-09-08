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
        this.lastCommentTime = 0;
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
                return this.getBabuskaResponse();
            }

            const limitedHistory = chatHistory.slice(-3);

            const messages = [
                {
                    role: 'system',
                    content: 'Ты - дед виталий, который подслушивает разговор и вставляет свои 5 копеек. Отвечай очень коротко (1 предложение), с юмором, сарказмом или мудростью можешь и с матами можешь каверкать то что написали пользователи. Не задавай вопросы. Комментируй только по делу. Используй дедовы выражения и иногда эмодзи. Примеры: "В наше время так не делали!", "Молодежь пошла...", "А я тебе говорил!"'
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
                    temperature: 0.9, // Больше креативности
                    top_p: 0.95,
                    n: 1,
                    stream: false,
                    max_tokens: 50, // Очень коротко!
                    repetition_penalty: 1.3
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
            
            // Обрезаем и проверяем на бабушкоподобность
            responseText = this.formatBabuskaResponse(responseText);
            
            return responseText;

        } catch (error) {
            console.error('❌ Ошибка GigaChat API:', error.message);
            return this.getBabuskaResponse();
        }
    }

    // Форматируем ответ в бабушкином стиле
    formatBabuskaResponse(text) {
        if (text.length > 60) {
            text = text.substring(0, 60) + '...';
        }
        
        // Убираем вопросы
        if (text.includes('?') || this.isQuestion(text)) {
            return this.getBabuskaResponse();
        }
        
        return text;
    }

    // Проверяем является ли текст вопросом
    isQuestion(text) {
        const questionWords = ['как', 'что', 'почему', 'когда', 'где', 'кто', 'какой', 'сколько'];
        return questionWords.some(word => text.toLowerCase().startsWith(word));
    }

    // Бабушкины комментарии вместо вопросов
    getBabuskaResponse() {
        const babuskaComments = [
            "В наше время так не разговаривали! 👵",
            "Молодежь пошла... 🤦‍♀️",
            "А я тебе говорил! 📢",
            "Вот именно! 👍",
            "Ну и ну... 😲",
            "Так я и знал! 🧠",
            "Бывает, родной 😌",
            "Ох уж эти современные штучки! 📱",
            "Вот это да! 🌟",
            "Как в старые добрые... 🕰️",
            "Правильно, правильно 👌",
            "Ну ты даешь! 😅",
            "Вот так вот! 💫",
            "Интересненько... 🤔",
            "Лучше бы чайку попили ☕",
            "Совсем с ума посходили! 😵",
            "Вот это поворот! 🌀",
            "Как же без этого... 🙄",
            "Ну наконец-то! 🎉",
            "Так и знал, что так будет! 🔮"
        ];
        
        return babuskaComments[Math.floor(Math.random() * babuskaComments.length)];
    }

    // Случайный бабушкин комментарий для таймера
    getRandomComment() {
        const now = Date.now();
        // Не чаще чем раз в 2 минуты
        if (now - this.lastCommentTime < 120000) {
            return null;
        }
        
        this.lastCommentTime = now;
        
        const randomComments = [
            "А вот в наше время...",
            "Молодежь не та пошла!",
            "Ох, как вспомню...",
            "Вот это да, вот это да!",
            "Чайку бы сейчас ☕",
            "Совсем другое дело!",
            "Как же время летит...",
            "Вот так всегда!",
            "Ничего не понимаю!",
            "А я то думал...",
            "Вот это номер!",
            "Ну надо же!",
            "Как интересно!",
            "Вот это дела!",
            "Ничего себе!",
            "Ужас просто!",
            "Красота то какая!",
            "Вот это даёт!",
            "Ну и дела...",
            "Вот так сюрприз!"
        ];
        
        return randomComments[Math.floor(Math.random() * randomComments.length)];
    }
}

module.exports = new GigaChat();