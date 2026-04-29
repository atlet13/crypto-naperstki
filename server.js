require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.')); // для index.html

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = parseInt(process.env.ADMIN_ID);

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Ініціалізація БД
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                tg_id BIGINT PRIMARY KEY,
                username TEXT,
                balance NUMERIC(15,2) DEFAULT 0.00,
                total_deposits NUMERIC(15,2) DEFAULT 0.00,
                games_played INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS deposits (
                id SERIAL PRIMARY KEY,
                tg_id BIGINT,
                amount NUMERIC(15,2),
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ PostgreSQL таблиці створено');
    } catch (e) {
        console.error('DB Error:', e);
    }
}
initDB();

// API: Поповнення
app.post('/api/deposit', async (req, res) => {
    const { tgId, username, amount } = req.body;
    
    try {
        await pool.query(`INSERT INTO deposits (tg_id, amount) VALUES ($1, $2)`, [tgId, amount]);

        await bot.sendMessage(ADMIN_ID, 
`💰 НОВЕ ПОПОВНЕННЯ!
👤 @${username || 'unknown'}
🆔 ${tgId}
💎 ${amount} TON

✅ Натисніть кнопку:`, {
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

// API: Отримати баланс
app.get('/api/balance/:tgId', async (req, res) => {
    const { tgId } = req.params;
    try {
        const result = await pool.query('SELECT balance FROM users WHERE tg_id = $1', [tgId]);
        res.json({ balance: result.rows[0]?.balance || 87.45 });
    } catch (e) {
        res.json({ balance: 87.45 });
    }
});

// Callback від адміна
bot.on('callback_query', async (query) => {
    if (query.data.startsWith('dep_')) {
        const [, tgId, amount] = query.data.split('_');
        const numAmount = parseFloat(amount);

        await pool.query(
            `INSERT INTO users (tg_id, username, balance) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (tg_id) DO UPDATE 
             SET balance = users.balance + $3, total_deposits = users.total_deposits + $3`,
            [parseInt(tgId), query.from.username, numAmount]
        );

        await bot.answerCallbackQuery(query.id, { text: `✅ ${amount} TON зараховано!` });
        await bot.sendMessage(tgId, `🎉 Ваш баланс поповнено на ${amount} TON! Удачі в грі!`);
    }
});

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущено на порту ${PORT}`);
});
