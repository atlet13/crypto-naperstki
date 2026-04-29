-- Виконай цей запит у Dashboard PostgreSQL на Render

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
