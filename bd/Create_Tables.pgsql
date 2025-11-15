DROP TABLE IF EXISTS expense_distribution CASCADE;
DROP TABLE IF EXISTS debts CASCADE;
DROP TABLE IF EXISTS trip_participants CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
    id SERIAL,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    CONSTRAINT users_id_pk PRIMARY KEY(id)
);

-- Create trips table
CREATE TABLE trips (
    id SERIAL,
    trip_name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    creator_id INT NOT NULL,
    CONSTRAINT trips_id_pk PRIMARY KEY(id),
    CONSTRAINT trips_creator_fk FOREIGN KEY(creator_id) REFERENCES users(id),
    CONSTRAINT chk_dates_valid CHECK (end_date >= start_date)
);

-- Create trip participants table
CREATE TABLE trip_participants (
    id SERIAL,
    trip_id INT NOT NULL,
    user_id INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT trip_participants_id_pk PRIMARY KEY(id),
    CONSTRAINT trip_participants_trip_fk FOREIGN KEY(trip_id) REFERENCES trips(id),
    CONSTRAINT trip_participants_user_fk FOREIGN KEY(user_id) REFERENCES users(id),
    CONSTRAINT unique_participant UNIQUE(trip_id, user_id)
);

-- Create expenses table
CREATE TABLE expenses (
    id SERIAL,
    trip_id INT NOT NULL,
    paid_by INT NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL,
    CONSTRAINT expenses_id_pk PRIMARY KEY(id),
    CONSTRAINT expenses_trip_fk FOREIGN KEY(trip_id) REFERENCES trips(id),
    CONSTRAINT expenses_paid_by_fk FOREIGN KEY(paid_by) REFERENCES users(id),
    CONSTRAINT chk_positive_amount CHECK (amount > 0)
);

-- Create expense distribution table
CREATE TABLE expense_distribution (
    id SERIAL,
    expense_id INT NOT NULL,
    user_id INT NOT NULL,
    share_amount DECIMAL(10, 2) NOT NULL,
    share_percentage DECIMAL(5, 2) NOT NULL,
    CONSTRAINT expense_distribution_id_pk PRIMARY KEY(id),
    CONSTRAINT expense_distribution_expense_fk FOREIGN KEY(expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    CONSTRAINT expense_distribution_user_fk FOREIGN KEY(user_id) REFERENCES users(id),
    CONSTRAINT chk_percentage_valid CHECK (share_percentage BETWEEN 0 AND 100),
    CONSTRAINT chk_share_amount_valid CHECK (share_amount >= 0)
);

-- Create debts table
CREATE TABLE debts (
    id SERIAL,
    trip_id INT NOT NULL,
    creditor_id INT NOT NULL,
    debtor_id INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT debts_id_pk PRIMARY KEY(id),
    CONSTRAINT debts_trip_fk FOREIGN KEY(trip_id) REFERENCES trips(id),
    CONSTRAINT debts_creditor_fk FOREIGN KEY(creditor_id) REFERENCES users(id),
    CONSTRAINT debts_debtor_fk FOREIGN KEY(debtor_id) REFERENCES users(id),
    CONSTRAINT chk_positive_debt CHECK (total_amount > 0),
    CONSTRAINT chk_different_users CHECK (creditor_id != debtor_id)
);