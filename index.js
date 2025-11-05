const express = require("express");
const path = require("path");

const app = express();

app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("index");
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server started: http://127.0.0.1:${PORT}`);
});

//проверка comit
