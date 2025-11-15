const express = require("express");
const path = require("path");
const db = require("./db");

const app = express();

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");

app.get("/", async (req, res) => {
  try {
    const usersResult = await db.query("SELECT * FROM users LIMIT 5");
    const tripsResult = await db.query("SELECT * FROM trips LIMIT 5");

    res.render("index", {
      users: usersResult.rows,
      trips: tripsResult.rows,
    });
  } catch (error) {
    console.error("Database error:", error);
    res.render("index", {
      users: [],
      trips: [],
      error: "Ошибка загрузки данных",
    });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server started: http://127.0.0.1:${PORT}`);
});

//проверка comit
