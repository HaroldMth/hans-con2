const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = 3000;

// Paths for JSON databases
const DB1_PATH = path.join(__dirname, "db1.json");
const DB2_PATH = path.join(__dirname, "db2.json");

// Middleware
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static("public"));

// Helper functions for JSON database handling
const readDB = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));
const writeDB = (filePath, data) =>
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

// Middleware to enforce login
app.use((req, res, next) => {
  if (["/login", "/signup"].includes(req.path) || req.path.startsWith("/public"))
    return next();
  if (!req.cookies.username) return res.redirect("/index.html");
  next();
});

// Signup route
app.post("/signup", (req, res) => {
  const { username, email, password } = req.body;
  const users = readDB(DB1_PATH);

  if (users.find((user) => user.username === username || user.email === email)) {
    return res
      .status(400)
      .json({ success: false, message: "Username or Email already exists!" });
  }

  users.push({ username, email, password });
  writeDB(DB1_PATH, users);

  res.json({ success: true, message: "Signup successful!" });
});

// Login route
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = readDB(DB1_PATH);

  const user = users.find(
    (u) => u.username === username && u.password === password
  );
  if (!user)
    return res
      .status(400)
      .json({ success: false, message: "Invalid username or password!" });

  // Set cookie for persistent login
  res.cookie("username", username, { maxAge: 365 * 24 * 60 * 60 * 1000 }); // 1 year
  res.json({ success: true, message: "Login successful!" });
});

// Logout route
app.post("/logout", (req, res) => {
  res.clearCookie("username");
  res.json({ success: true, message: "Logged out successfully!" });
});

// Get all users
app.get("/users", (req, res) => {
  const username = req.cookies.username; // Get the username from cookies
  if (!username) {
    return res.status(401).json({ success: false, message: "Not logged in" });
  }

  const users = readDB(DB1_PATH).map((u) => ({
    username: u.username === username ? "You" : u.username,
  }));

  res.json({ success: true, users, currentUser: username }); // Include the current user's name
});

// Get chat messages
app.get("/chat/:user", (req, res) => {
  const username = req.cookies.username;
  const targetUser = req.params.user === "You" ? username : req.params.user;
  const chats = readDB(DB2_PATH);

  const chatKey = `${username}:${targetUser}`;
  const reverseChatKey = `${targetUser}:${username}`;

  res.json(chats[chatKey] || chats[reverseChatKey] || []);
});

// Send a chat message
app.post("/chat/:user", (req, res) => {
  const username = req.cookies.username;
  const targetUser = req.params.user === "You" ? username : req.params.user;
  const { message } = req.body;
  const chats = readDB(DB2_PATH);

  const chatKey = `${username}:${targetUser}`;
  if (!chats[chatKey]) chats[chatKey] = [];

  chats[chatKey].push({
    from: username,
    message,
    timestamp: new Date().toISOString(),
  });
  writeDB(DB2_PATH, chats);

  res.json({ success: true, message: "Message sent!" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
