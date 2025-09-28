require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql2/promise');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MySQL pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'alignbox_chat',
  waitForConnections: true,
  connectionLimit: 10,
});

// Fetch recent messages
app.get('/messages', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM messages ORDER BY timestamp ASC LIMIT 500');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Track online users
let onlineUsers = [];

io.on('connection', (socket) => {
  console.log('Client connected', socket.id);

  // Send recent messages
  (async () => {
    try {
      const [rows] = await pool.query('SELECT * FROM messages ORDER BY timestamp ASC LIMIT 200');
      socket.emit('initMessages', rows);
    } catch (err) {
      console.error('DB error on initMessages', err);
    }
  })();

  // Login event
  socket.on('login', (username) => {
    socket.username = username;
    if (!onlineUsers.includes(username)) onlineUsers.push(username);
    io.emit('onlineUsers', onlineUsers);
  });

  // New message
  socket.on('sendMessage', async (msg) => {
    if (!msg || !msg.text) return;
    try {
      const [result] = await pool.query(
        'INSERT INTO messages (username, text) VALUES (?, ?)',
        [msg.username || 'Guest', msg.text]
      );
      const [rows] = await pool.query('SELECT * FROM messages WHERE id = ?', [result.insertId]);
      const saved = rows[0];
      io.emit('newMessage', saved);
    } catch (err) {
      console.error('DB insert error', err);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
    if (socket.username) {
      onlineUsers = onlineUsers.filter(u => u !== socket.username);
      io.emit('onlineUsers', onlineUsers);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
