let ws;
let myLastMessage = '';

function handleEnter(event, callback) {
  if (event.key === 'Enter') {
    callback();
  }
}

async function login() {
  const pass = document.getElementById("pass").value;
  const res = await fetch(`/auth?pass=${encodeURIComponent(pass)}`);
  if (res.ok) {
    document.getElementById("login").style.display = "none";
    document.getElementById("app").style.display = "block";
    document.getElementById("msg").focus();
    startChat();
  } else {
    alert("Sai mật khẩu!");
  }
}

function startChat() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}`);
  const chat = document.getElementById("chat");

  ws.onmessage = (e) => {
    // Chỉ hiển thị tin nhắn nhận được nếu không phải là tin nhắn cuối cùng của mình
    if (e.data !== myLastMessage) {
      addMessage(e.data, 'received');
    }
  };
}

function addMessage(text, type) {
  const chat = document.getElementById("chat");
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = text;
  chat.appendChild(messageDiv);
  chat.scrollTop = chat.scrollHeight;
}

function sendMsg() {
  const input = document.getElementById("msg");
  const text = input.value.trim();
  if (text) {
    ws.send(text);
    myLastMessage = text; // Lưu lại tin nhắn cuối cùng của mình
    addMessage(text, 'sent');
    input.value = "";
  }
}


fetch("/qr").then(r => r.json()).then(d => {
  const img = document.createElement("img");
  img.src = d.qr;
  document.getElementById("qr").appendChild(img);
});
