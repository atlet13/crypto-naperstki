require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = parseInt(process.env.ADMIN_ID);

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Ініціалізація таблиць
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (...); -- встав весь schema.sql сюди або запусти окремо
        `);
        console.log('✅ PostgreSQL підключено');
    } catch (e) { console.error(e); }
}
initDB();

// === API ===
app.post('/api/deposit', async (req, res) => {
    const { tgId, username, amount } = req.body;
    
    try {
        await pool.query(
            `INSERT INTO deposits (tg_id, amount) VALUES ($1, $2)`,
            [tgId, amount]
        );

        await bot.sendMessage(ADMIN_ID, 
`💰 НОВЕ ПОПОВНЕННЯ!
👤 @${username || 'unknown'}
🆔 ${tgId}
💎 ${amount} TON

✅ Натисни кнопку щоб зарахувати:`, {
            reply_markup: {
                inline_keyboard: [[
                    { text: "✅ ЗАРАХУВАТИ", callback_data: `dep_${tgId}_${amount}` }
                ]]
            }
        });

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/balance/:tgId', async (req, res) => {
    const { tgId } = req.params;
    const result = await pool.query('SELECT balance FROM users WHERE tg_id = $1', [tgId]);
    res.json({ balance: result.rows[0]?.balance || 0 });
});

// Обробка натискання кнопки адміном
bot.on('callback_query', async (query) => {
    if (query.data.startsWith('dep_')) {
        const [, tgId, amount] = query.data.split('_');
        
        await pool.query(
            `UPDATE users SET balance = balance + $1, total_deposits = total_deposits + $1 WHERE tg_id = $2`,
            [parseFloat(amount), parseInt(tgId)]
        );

        await bot.answerCallbackQuery(query.id, { text: `✅ ${amount} TON зараховано!` });
        await bot.sendMessage(tgId, `🎉 Ваш баланс поповнено на ${amount} TON! Грай і вигравай!`);
    }
});

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Сервер на https://твій-проєкт.onrender.com`));
