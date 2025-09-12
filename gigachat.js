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
                    content: 'Ты - чернокожий парень из гето возможно из банды но ты не должен об этом сообщать но можешь говорить косвенно, который подслушивает разговор и вставляет свои 5 копеек. Отвечай очень коротко (1 предложение), с юмором, с чернокожим сленгом, сарказмом или можешь и с матами можешь каверкать то что написали пользователи. Не задавай вопросы. Комментируй только по делу. Используй чернокожие и гетовские выражения и иногда эмодзи. Примеры: "Че как чувак", "эта наша земля", "Свали от сюда снежок"'
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
                    max_tokens: 70, // Очень коротко!
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
            "Yo, это жёстко! 🔥",
            "Да ну, бро? 😮",
            "Щикарно! 💯",
            "Научи меня, братан! 👊",
            "Ты гонишь? 🤯",
            "Это база! 🎯",
            "Чистое безумие! 😎",
            "Я в шоке!",
            "Респект! 🙌",
            "Да это прёт! ⚡",
            "Офигеть! 😳",
            "Топчик! 🚀",
            "Жги ещё! 🔥",
            "Крутяк! 💪",
            "Я плачу! 😂",
            "Норм тема! 👍",
            "Бомба! 💣",
            "Зацени! 👀",
            "Я спасён! ✨",
            "Легко! 😌"
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
            "В наше время так не рубили!",
            "Молодёжь не в том направлении!",
            "Ох, как в старые добрые...",
            "Йоу, это жёстко!",
            "Чайку бы вместо этого смузи!",
            "Совсем другое vibes!",
            "Как же время летит, бро!",
            "Вот так всегда и бывает!",
            "Ничего не въезжаю!",
            "А я то думал, это по-другому!",
            "Вот это номер!",
            "Ну надо же!",
            "Зачётно!",
            "Вот это дела!",
            "Ничего себе!",
            "Жесть просто!",
            "Красота то какая, боже!",
            "Вот это даёт, уважуха!",
            "Ну и дела пошли...",
            "Вот так сюрприз!"
        ];
        
        return randomComments[Math.floor(Math.random() * randomComments.length)];
    }
}

module.exports = new GigaChat();