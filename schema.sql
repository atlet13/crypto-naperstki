CREATE TABLE users (
    tg_id BIGINT PRIMARY KEY,
    username TEXT,
    balance NUMERIC(15,2) DEFAULT 0.00,
    total_deposits NUMERIC(15,2) DEFAULT 0.00,
    games_played INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE deposits (
    id SERIAL PRIMARY KEY,
    tg_id BIGINT,
    amount NUMERIC(15,2),
    status TEXT DEFAULT 'pending',
    tx_hash TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Початковий бонус для всіх
INSERT INTO users (tg_id, username, balance) 
VALUES (8561782680, 'admin', 10000.00)
ON CONFLICT DO NOTHING;
