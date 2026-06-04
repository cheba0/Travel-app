CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trips (
    id SERIAL PRIMARY KEY,
    trip_name VARCHAR(255) NOT NULL,
    description TEXT,
    currency VARCHAR(3) DEFAULT 'RUB',
    start_date DATE,
    end_date DATE,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    location TEXT,
    CONSTRAINT trips_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE trip_participants (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(trip_id, user_id),
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE expense_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    expense_name VARCHAR(255) NOT NULL,
    trip_id INTEGER NOT NULL,
    paid_by INTEGER NOT NULL,
    category_id INTEGER,
    amount DECIMAL(10,2) NOT NULL,
    description VARCHAR(500),
    date DATE NOT NULL,
    raw_qr_data TEXT,
    shop_identifier VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_settled BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (paid_by) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES expense_categories(id)
);

CREATE TABLE IF NOT EXISTS expense_shares (
  id SERIAL PRIMARY KEY,
  expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_owed DECIMAL(10, 2) NOT NULL CHECK (amount_owed >= 0),
  custom_amount DECIMAL(10, 2), -- Фиксированная сумма
  percentage DECIMAL(5, 2), -- Процент от общей суммы
  is_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(expense_id, user_id)
);

CREATE TABLE settlements (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL,
    from_user INTEGER NOT NULL,
    to_user INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    FOREIGN KEY (from_user) REFERENCES users(id),
    FOREIGN KEY (to_user) REFERENCES users(id)
);

CREATE TABLE expense_files (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS debts (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE,
  is_settled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE trips ADD COLUMN photo TEXT;

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  text TEXT,
  image_url TEXT,
  is_encrypted BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для быстрой загрузки истории
CREATE INDEX IF NOT EXISTS idx_messages_trip_id ON messages(trip_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
-- Добавляем колонку status если нет
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'sent';

-- Добавляем колонку updated_at если нет
ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS video_url VARCHAR(500);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS audio_url VARCHAR(500);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- Таблица для записи фактов оплаты долгов между участниками
CREATE TABLE IF NOT EXISTS debt_settlements (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    from_user_id INTEGER NOT NULL REFERENCES users(id), -- Кто платит
    to_user_id INTEGER NOT NULL REFERENCES users(id),   -- Кому платит
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    note VARCHAR(500),                                    -- Заметка (опционально)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (from_user_id != to_user_id)                   -- Нельзя платить самому себе
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_debt_settlements_trip ON debt_settlements(trip_id);
CREATE INDEX IF NOT EXISTS idx_debt_settlements_from ON debt_settlements(from_user_id);
CREATE INDEX IF NOT EXISTS idx_debt_settlements_to ON debt_settlements(to_user_id);

COMMENT ON TABLE debt_settlements IS 'История погашения долгов между участниками путешествия';
COMMENT ON COLUMN debt_settlements.from_user_id IS 'Кто заплатил (должник)';
COMMENT ON COLUMN debt_settlements.to_user_id IS 'Кому заплатили (кредитор)';
