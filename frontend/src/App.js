import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const BACKEND_URL = 'http://localhost:4000';

function App() {
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const socketRef = useRef(null);

  // Login or Register handlers
  async function register() {
    const res = await fetch(`${BACKEND_URL}/register`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    alert(data.message);
  }

  async function login() {
    const res = await fetch(`${BACKEND_URL}/login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.token) {
      setToken(data.token);
      setLoggedInUser(username);
    } else {
      alert(data.message || 'Login failed');
    }
  }

  // Setup socket connection on login
  useEffect(() => {
    if (!token) return;

    const socket = io(BACKEND_URL, {
      auth: { token }
    });
    socketRef.current = socket;

    socket.on('connect_error', (err) => {
      alert('Socket connection error: ' + err.message);
    });

    socket.on('chat-history', (msgs) => {
      setMessages(msgs);
    });

    socket.on('chat-message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('user-joined', (user) => {
      setMessages(prev => [...prev, { system: true, text: `${user} joined.` }]);
    });

    socket.on('user-left', (user) => {
      setMessages(prev => [...prev, { system: true, text: `${user} left.` }]);
    });

    return () => socket.disconnect();
  }, [token]);

  function sendMessage() {
    if (!messageInput.trim()) return;
    socketRef.current.emit('chat-message', messageInput);
    setMessageInput('');
  }

  if (!loggedInUser) {
    return (
      <div style={{ maxWidth: 400, margin: 'auto', paddingTop: 50 }}>
        <h2>Login or Register</h2>
        <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        <div style={{ marginTop: 10 }}>
          <button onClick={login}>Login</button>
          <button onClick={register} style={{ marginLeft: 10 }}>Register</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: 'auto', paddingTop: 20 }}>
      <h3>Welcome, {loggedInUser}</h3>
      <div style={{ border: '1px solid #ccc', height: 400, overflowY: 'scroll', padding: 10, marginBottom: 10 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 8, fontStyle: msg.system ? 'italic' : 'normal' }}>
            {msg.system
              ? msg.text
              : <><b>{msg.username}</b>: {msg.text}</>}
          </div>
        ))}
      </div>
      <input
        placeholder="Type your message..."
        value={messageInput}
        onChange={e => setMessageInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
        style={{ width: '80%' }}
      />
      <button onClick={sendMessage} style={{ width: '18%', marginLeft: '2%' }}>Send</button>
    </div>
  );
}

export default App;
