let ws;
let myLastMessage = '';
const MESSAGES_KEY = 'chat_messages';
let isAuthenticated = false;

function handleEnter(event, callback) {
  if (event.key === 'Enter') {
    callback();
  }
}

// Lưu tin nhắn vào Local Storage
function saveMessage(message, type) {
  const messages = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
  messages.push({
    type: type,
    data: message,
    timestamp: new Date().toISOString()
  });
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
}

async function login() {
  const pass = document.getElementById("pass").value;
  const res = await fetch(`/auth?pass=${encodeURIComponent(pass)}`);
  if (res.ok) {
    isAuthenticated = true;
    document.getElementById("login").style.display = "none";
    document.getElementById("app").style.display = "block";
    document.getElementById("msg").focus();
    startChat();
    loadSavedMessages();
  } else {
    alert("Sai mật khẩu!");
  }
}

// Kiểm tra khi người dùng rời khỏi trang
window.addEventListener('beforeunload', () => {
  isAuthenticated = false;
});

// Kiểm tra khi tab bị ẩn
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    isAuthenticated = false;
    ws.close();
    document.getElementById("login").style.display = "block";
    document.getElementById("app").style.display = "none";
    // Xóa mật khẩu trong input
    document.getElementById("pass").value = "";
  }
});

// Tải tin nhắn đã lưu
function loadSavedMessages() {
  const messages = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
  const chat = document.getElementById("chat");
  chat.innerHTML = ''; // Xóa tin nhắn hiện tại
  
  messages.forEach(msg => {
    addMessage(msg.data, msg.type);
  });
}

// Yêu cầu quyền gửi thông báo
async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    console.log("Trình duyệt không hỗ trợ thông báo");
    return;
  }
  
  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (error) {
    console.error("Lỗi khi yêu cầu quyền thông báo:", error);
    return false;
  }
}

// Hiển thị thông báo
function showNotification(message) {
  if (Notification.permission === "granted" && document.hidden) {
    new Notification("Tin nhắn mới", {
      body: message.type === 'text' ? message.content : "Đã nhận một hình ảnh mới",
      icon: "/favicon.ico"
    });
  }
}

function startChat() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}`);

  // Yêu cầu quyền thông báo khi bắt đầu chat
  requestNotificationPermission();

  // Xử lý sự kiện khi có tin nhắn đến
  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.content !== myLastMessage) {
        addMessage(data, 'received');
        showNotification(data);
      }
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  };

  // Xử lý sự kiện chọn file ảnh
  document.getElementById('file-input').addEventListener('change', handleImageUpload);
}

function addMessage(data, type) {
  const chat = document.getElementById("chat");
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${type}`;

  if (data.type === 'image') {
    const img = document.createElement('img');
    img.src = data.content;
    messageDiv.appendChild(img);
  } else {
    messageDiv.textContent = data.content;
  }

  chat.appendChild(messageDiv);
  chat.scrollTop = chat.scrollHeight;

  // Lưu tin nhắn nếu đã đăng nhập
  if (isAuthenticated) {
    saveMessage(data, type);
  }
}

function sendMsg() {
  const input = document.getElementById("msg");
  const text = input.value.trim();
  if (text) {
    const message = {
      type: 'text',
      content: text
    };
    ws.send(JSON.stringify(message));
    myLastMessage = text;
    addMessage(message, 'sent');
    input.value = "";
  }
}

function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Kiểm tra kích thước file (giới hạn 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('Kích thước ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const message = {
      type: 'image',
      content: e.target.result
    };
    ws.send(JSON.stringify(message));
    myLastMessage = e.target.result;
    addMessage(message, 'sent');
  };
  reader.readAsDataURL(file);

  // Reset input file để có thể chọn lại cùng một ảnh
  event.target.value = '';
}


fetch("/qr").then(r => r.json()).then(d => {
  const img = document.createElement("img");
  img.src = d.qr;
  document.getElementById("qr").appendChild(img);
});
