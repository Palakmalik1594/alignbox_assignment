const socket = io();
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const incognitoToggle = document.getElementById('incognitoToggle');

let username = prompt("Enter your name:") || "You";
let isIncognito = false;
let onlineUsers = [];

// Notify server about this user
socket.emit('login', username);

// Avatars mapping
const userAvatars = {
  "Palak": "pexels-chuchuphinh-1194036.jpg",
  "Prisha": "pexels-hikoshi92-1240934618-23070743.jpg",
  "Priya": "pexels-meruyert-gonullu-7317337 (1).jpg",
  "Sanjana": "pexels-nguy-n-ti-n-th-nh-2150376175-31769331.jpg"
};

function getAvatar(user) {
  return userAvatars[user] || `https://avatars.dicebear.com/api/initials/${user}.svg`;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function addMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');
  messageElement.classList.add(message.username === username ? 'sent' : 'received');

  // Header
  const header = document.createElement('div');
  header.classList.add('message-header');

  const avatar = document.createElement('img');
  avatar.classList.add('avatar');
  avatar.src = getAvatar(message.username);

  if (onlineUsers.includes(message.username)) avatar.classList.add('online');

  header.appendChild(avatar);

  const sender = document.createElement('span');
  sender.classList.add('sender');
  sender.textContent = message.username;
  header.appendChild(sender);

  if (message.incognito) {
    const incognito = document.createElement('span');
    incognito.classList.add('incognito');
    incognito.textContent = '🕵️';
    incognito.title = 'Incognito';
    header.appendChild(incognito);
  }

  const content = document.createElement('div');
  content.classList.add('content');
  content.textContent = message.text;

  const timestamp = document.createElement('div');
  timestamp.classList.add('timestamp');
  timestamp.textContent = formatTime(message.timestamp);

  messageElement.appendChild(header);
  messageElement.appendChild(content);
  messageElement.appendChild(timestamp);

  messagesContainer.appendChild(messageElement);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  updateOnlineDots();
}

// Update online users in real-time
socket.on('onlineUsers', (users) => {
  onlineUsers = users;
  document.querySelectorAll('.avatar').forEach(avatar => {
    const senderEl = avatar.nextElementSibling;
    const senderName = senderEl?.textContent;
    if (senderName && onlineUsers.includes(senderName)) {
      avatar.classList.add('online');
    } else {
      avatar.classList.remove('online');
    }
  });
});

socket.on('initMessages', (messages) => messages.forEach(addMessage));
socket.on('newMessage', (msg) => addMessage(msg));

// Sending message
sendButton.addEventListener('click', () => {
  const text = messageInput.value.trim();
  if (!text) return;

  const message = {
    username: isIncognito ? "Anonymous" : username,
    text,
    timestamp: Date.now(),
    incognito: isIncognito
  };
  socket.emit('sendMessage', message);
  messageInput.value = '';
  sendButton.disabled = true;
});

messageInput.addEventListener('input', () => {
  sendButton.disabled = !messageInput.value.trim();
});

// Toggle incognito
incognitoToggle.addEventListener('click', ()=>{
  isIncognito = !isIncognito;
  addMessage({username:'System', text: isIncognito?'🕵️ You are now Anonymous':'✅ You are now visible', timestamp:Date.now(), system:true});
});

