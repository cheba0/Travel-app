const result = await pool.query(
  `INSERT INTO users (username, email, password_hash) 
       VALUES ($1, $2, $3) 
       RETURNING id, username, email, created_at`,
  [username, email, passwordHash]
);
