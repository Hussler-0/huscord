const express = require('express');
const http = require('http');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

const JWT_SECRET = 'supersecretkey'; // use env variable in real apps!

// Simple in-memory user store
const users = []; // { username, passwordHash }

// In-memory chat messages
const messages = []; // { username, text, timestamp }

// Register endpoint
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ message: 'Username taken' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  users.push({ username, passwordHash });
  res.json({ message: 'Registered successfully' });
});

// Login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user) return res.status(400).json({ message: 'Invalid username or password' });
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(400).json({ message: 'Invalid username or password' });
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// Middleware to authenticate socket connections
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.username = payload.username;
    next();
  } catch {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.username);

  // Send existing messages to the user
  socket.emit('chat-history', messages);

  // Broadcast when a new user joins
  socket.broadcast.emit('user-joined', socket.username);

  socket.on('chat-message', (msg) => {
    const message = { username: socket.username, text: msg, timestamp: Date.now() };
    messages.push(message);
    io.emit('chat-message', message);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.username);
    socket.broadcast.emit('user-left', socket.username);
  });
});

const PORT = 4000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
