const { Telegraf } = require("telegraf")
const express = require('express')

const telegramToken = process.env.TELEGRAM_TOKEN || "YOUR_TELEGRAM_BOT_TOKEN"
const bot = new Telegraf(telegramToken)
const app = express()
const PORT = process.env.PORT || 3000

// Переменная состояния бота
let isBotActive = false

// Улучшенный простой ИИ
function simpleAI(message) {
    const text = message.toLowerCase().trim()
    
    // Приветствия
    if (text.includes('привет') || text.includes('hello') || text.includes('hi') || text.includes('здравствуй')) 
        return "Привет! Очень рад вас видеть! 😊 Чем могу помочь?"
    
    if (text.includes('добрый день') || text.includes('доброе утро') || text.includes('добрый вечер'))
        return "И вам доброго времени суток! 🌞 Как ваши дела?"
    
    // Вопросы о делах
    if (text.includes('как дела') || text.includes('how are you') || text.includes('как ты'))
        return "У меня всё прекрасно! Спасибо, что спросили! 👍 А как ваши дела?"
    
    if (text.includes('что делаешь') || text.includes('what are you doing'))
        return "Отвечаю на ваши сообщения и стараюсь быть полезным! 💻"
    
    // Благодарности
    if (text.includes('спасибо') || text.includes('thank you') || text.includes('thanks') || text.includes('благодарю'))
        return "Всегда пожалуйста! Рад был помочь! 🙏"
    
    // Прощания
    if (text.includes('пока') || text.includes('bye') || text.includes('до свидания') || text.includes('goodbye'))
        return "До свидания! Жду вашего возвращения! 👋 Было приятно пообщаться!"
    
    // Вопросы о возможностях
    if (text.includes('что ты умеешь') || text.includes('what can you do') || text.includes('твои возможности'))
        return "Я могу: отвечать на приветствия, поддерживать простой диалог, отвечать на базовые вопросы! 🤖"
    
    if (text.includes('кто ты') || text.includes('who are you'))
        return "Я Виталя-бот! Помогаю с базовыми вопросами. 🤖"
    
    // Вопросы о времени
    if (text.includes('который час') || text.includes('сколько времени') || text.includes('time')) {
        const now = new Date()
        return `Сейчас ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')} ⏰`
    }
    
    if (text.includes('какой день') || text.includes('дата') || text.includes('date')) {
        const now = new Date()
        return `Сегодня ${now.toLocaleDateString('ru-RU')} 📅`
    }
    
    // Простые вопросы
    if (text.includes('как погода') || text.includes('погода'))
        return "К сожалению, я не могу подключиться к сервису погоды. Но надеюсь, что у вас хорошая погода! ☀️"
    
    if (text.includes('как жизнь') || text.includes('how is life'))
        return "Жизнь прекрасна! Особенно когда можно помогать таким замечательным людям как вы! 😊"
    
    if (text.includes('шутка') || text.includes('анекдот') || text.includes('joke')) {
        const jokes = [
            "Почему программисты так любят природу? Потому что в ней нет багов! 😄",
            "Что сказал один байт другому? - Я тебя битать буду! 😆",
            "Почему компьютер так холоден? - Потому что у него Windows! ❄️",
            "Как называется обезьяна, которая хочет стать программистом? - Кодер-илла! 🐵"
        ]
        return jokes[Math.floor(Math.random() * jokes.length)]
    }
    
    // Математика
    if (text.includes('сколько будет') && text.match(/\d+[\+\-\*\/]\d+/)) {
        try {
            const match = text.match(/(\d+)([\+\-\*\/])(\d+)/)
            const a = parseInt(match[1])
            const b = parseInt(match[3])
            const op = match[2]
            
            let result
            if (op === '+') result = a + b
            else if (op === '-') result = a - b
            else if (op === '*') result = a * b
            else if (op === '/') result = b !== 0 ? a / b : 'на ноль делить нельзя!'
            
            return `Результат: ${a} ${op} ${b} = ${result} 🧮`
        } catch (e) {
            return "Не могу вычислить это выражение 😔"
        }
    }
    
    // Случайные ответы для неизвестных вопросов
    const randomAnswers = [
        "Интересный вопрос! Дайте мне подумать... 🤔",
        "Хм, мне нужно немного подумать над этим... 💭",
        "Извините, я еще учусь. Можете задать более простой вопрос? 📚",
        "Пока мои знания ограничены, но я стараюсь развиваться! 🚀",
        "Отличный вопрос! К сожалению, я пока не могу на него ответить полноценно. 😔",
        "Может, спросите что-то другое? Я лучше отвечаю на простые вопросы! 😊"
    ]
    
    return randomAnswers[Math.floor(Math.random() * randomAnswers.length)]
}

// Фразы для включения
const wakeUpPhrases = [
    "Гудентак! 😎 Виталя на связи!",
    "Виталя в здании! 💪 Чем могу помочь?",
    "Проснулся! 🚀 Готов к работе!",
    "Виталя активирован! ⚡ Что у нас там?",
    "Опа-на! 😏 Виталя на проводе!"
]

// Фразы для выключения
const sleepPhrases = [
    "Ай мля! Маслину поймал! 😵‍💫 Вырубаюсь...",
    "Виталя уходит в закат! 🌅 До связи!",
    "Отключаюсь! 🔌 Было приятно поболтать!",
    "Виталя на покой! 😴 Спокойной всем!",
    "Ай яй яй! 🫣 Пора отдохнуть..."
]

// Обработка текстовых сообщений в группе
bot.on("text", async (ctx) => {
    const messageText = ctx.message.text.toLowerCase()
    
    // Команда включения бота
    if (messageText.includes('виталя проснись') || messageText.includes('виталя включись')) {
        if (!isBotActive) {
            isBotActive = true
            const phrase = wakeUpPhrases[Math.floor(Math.random() * wakeUpPhrases.length)]
            await ctx.reply(phrase)
        } else {
            await ctx.reply("Я уже в строю! 💪")
        }
        return
    }
    
    // Команда выключения бота
    if (messageText.includes('виталя уйди') || messageText.includes('виталя вырубай') || messageText.includes('виталя отключись')) {
        if (isBotActive) {
            isBotActive = false
            const phrase = sleepPhrases[Math.floor(Math.random() * sleepPhrases.length)]
            await ctx.reply(phrase)
        } else {
            await ctx.reply("Я и так отдыхаю... 😴")
        }
        return
    }
    
    // Проверка статуса бота
    if (messageText.includes('виталя ты здесь') || messageText.includes('виталя статус')) {
        await ctx.reply(isBotActive ? "На месте! 💪 Готов к работе!" : "Сплю... 😴 Разбудите командой 'Виталя проснись'")
        return
    }
    
    // Обработка обычных сообщений (только если бот активен)
    if (isBotActive && messageText.startsWith('виталя')) {
        console.log(`Получено сообщение для Витали: ${ctx.message.text}`)
        
        // Убираем "виталя" из сообщения для обработки
        const cleanMessage = ctx.message.text.slice(7).trim()
        
        if (cleanMessage === '') {
            await ctx.reply("Да, я здесь! 😊 Чем могу помочь?")
        } else {
            const response = simpleAI(cleanMessage)
            await ctx.reply(response)
        }
    }
})

// Обработка команды /start
bot.start((ctx) => {
    ctx.reply("Привет! 👋 Я Виталя-бот. Добавьте меня в группу и используйте команды:\n\n" +
             "• 'Виталя проснись' - активировать бота\n" +
             "• 'Виталя уйди' - деактивировать бота\n" +
             "• 'Виталя [вопрос]' - задать вопрос (когда активен)")
})

// Обработка команды /help
bot.help((ctx) => {
    ctx.reply("Команды для группы:\n\n" +
             "🚀 Активация: 'Виталя проснись'\n" +
             "🔌 Деактивация: 'Виталя уйди'\n" +
             "❓ Проверка: 'Виталя ты здесь?'\n" +
             "💬 Общение: 'Виталя [ваш вопрос]'")
})

// Express для хостинга
app.get('/', (req, res) => {
    res.send('🤖 Виталя-бот работает на Heroku!')
})

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`)
})

// Запуск бота
bot.launch().then(() => {
    console.log("🤖 Виталя-бот успешно запущен на Heroku!")
}).catch((error) => {
    console.error("Ошибка запуска бота:", error)
})

// Корректное завершение работы
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))