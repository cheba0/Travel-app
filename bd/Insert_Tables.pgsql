-- INSERT INTO users (email, username, password_hash) VALUES
-- ('ivanov@mail.ru', 'Ivan Ivanov', 'hashed_password_1'),
-- ('petrov@mail.ru', 'Petr Petrov', 'hashed_password_2'),
-- ('sidorova@mail.ru', 'Anna Sidorova', 'hashed_password_3'),
-- ('kozlov@mail.ru', 'Alexey Kozlov', 'hashed_password_4');

-- -- Insert test trips
-- INSERT INTO trips (trip_name, description, start_date, end_date, creator_id) VALUES
-- ('Sochi Vacation', 'Beach trip with friends', '2024-06-15', '2024-06-25', 1),
-- ('Mountain Hike', 'Elbrus climbing expedition', '2024-07-10', '2024-07-20', 2);

-- -- Insert trip participants
-- INSERT INTO trip_participants (trip_id, user_id, is_active) VALUES
-- (1, 1, TRUE), (1, 2, TRUE), (1, 3, TRUE),  -- All participants in Sochi
-- (2, 2, TRUE), (2, 4, TRUE);  -- Participants in mountain hike

-- -- Insert test expenses
-- INSERT INTO expenses (trip_id, paid_by, category, amount, description, expense_date) VALUES
-- (1, 1, 'Accommodation', 45000.00, 'Apartment rental for 10 days', '2024-06-15'),
-- (1, 2, 'Food', 15000.00, 'Groceries for the whole group', '2024-06-16'),
-- (1, 3, 'Transport', 8000.00, 'Taxi from airport', '2024-06-15'),
-- (2, 2, 'Equipment', 25000.00, 'Mountain gear rental', '2024-07-10'),
-- (2, 4, 'Accommodation', 12000.00, 'Hostel at the base', '2024-07-10');

-- -- Insert expense distributions
-- INSERT INTO expense_distribution (expense_id, user_id, share_amount, share_percentage) VALUES
-- -- Expense distribution for Sochi trip (3 participants)
-- (1, 1, 15000.00, 33.33), (1, 2, 15000.00, 33.33), (1, 3, 15000.00, 33.34),
-- (2, 1, 5000.00, 33.33), (2, 2, 5000.00, 33.33), (2, 3, 5000.00, 33.34),
-- (3, 1, 2666.67, 33.33), (3, 2, 2666.67, 33.33), (3, 3, 2666.66, 33.34),
-- -- Expense distribution for mountain hike (2 participants)
-- (4, 2, 12500.00, 50.00), (4, 4, 12500.00, 50.00),
-- (5, 2, 6000.00, 50.00), (5, 4, 6000.00, 50.00);

-- -- Insert test debts
-- INSERT INTO debts (trip_id, creditor_id, debtor_id, total_amount, is_paid) VALUES
-- (1, 1, 2, 5000.00, FALSE),  -- Ivanov owes Petrov
-- (1, 1, 3, 5000.00, TRUE),   -- Ivanov owes Sidorova (already paid)
-- (2, 4, 2, 6000.00, FALSE);  -- Kozlov owes Petrov