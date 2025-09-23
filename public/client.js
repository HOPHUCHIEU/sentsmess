let ws;
let myLastMessage = '';
let currentUser = null;
let isAuthenticated = false;

function handleEnter(event, callback) {
  if (event.key === 'Enter') {
    callback();
  }
}

async function login() {
  const pass = document.getElementById("pass").value;
  if (!pass) {
    alert("Vui lòng nhập mật khẩu!");
    return;
  }

  try {
    const res = await fetch(`/auth?pass=${encodeURIComponent(pass)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (data.ok && data.userId) {
      currentUser = { userId: data.userId, name: data.name };
      isAuthenticated = true;

      document.getElementById("login").style.display = "none";
      document.getElementById("app").style.display = "block";

      // hiển thị tin nhắn cũ
      showServerMessages(data.messages);

      startChat();
    } else {
      alert("Sai mật khẩu!");
    }
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    alert("Máy chủ gặp sự cố, vui lòng thử lại!");
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
    if (ws) ws.close();
    document.getElementById("login").style.display = "block";
    document.getElementById("app").style.display = "none";
    document.getElementById("pass").value = "";
  }
});

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

// Hiển thị tin nhắn từ server
function showServerMessages(messages) {
  const chat = document.getElementById("chat");
  chat.innerHTML = ''; 
  
  messages.forEach(msg => {
    const type = msg.userId === currentUser.userId ? 'sent' : 'received';
    addMessage(msg, type);
  });
}

function startChat() {
  if (!currentUser || !currentUser.userId) {
    console.error('Không có thông tin người dùng');
    return;
  }

  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${location.host}?userId=${encodeURIComponent(currentUser.userId)}`;
  ws = new WebSocket(wsUrl);

  requestNotificationPermission();

  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      const type = data.userId === currentUser.userId ? 'sent' : 'received';
      if (data.content !== myLastMessage) {
        addMessage(data, type);
        showNotification(data);
      }
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  };

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
}

function sendMsg() {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    alert("⚠️ WebSocket chưa sẵn sàng, thử lại!");
    return;
  }

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

  event.target.value = '';
}

// Xoá toàn bộ tin nhắn
async function clearMessages() {
  try {
    const res = await fetch("/clear", { method: "POST" });
    const data = await res.json();
    if (data.ok) {
      document.getElementById("chat").innerHTML = "";
      alert("Đã xoá toàn bộ tin nhắn!");
    } else {
      alert("Không thể xoá tin nhắn!");
    }
  } catch (error) {
    console.error("Lỗi khi xoá tin nhắn:", error);
  }
}

// Load QR
fetch("/qr").then(r => r.json()).then(d => {
  const img = document.createElement("img");
  img.src = d.qr;
  document.getElementById("qr").appendChild(img);
});

function startChat() {
  if (!currentUser || !currentUser.userId) {
    console.error('Không có thông tin người dùng');
    return;
  }

  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${location.host}?userId=${encodeURIComponent(currentUser.userId)}`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log("✅ WebSocket đã kết nối");
  };

  ws.onerror = (err) => {
    console.error("❌ WebSocket error:", err);
  };

  ws.onclose = () => {
    console.log("⚠️ WebSocket đóng kết nối");
  };

  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      const type = data.userId === currentUser.userId ? 'sent' : 'received';
      if (data.content !== myLastMessage) {
        addMessage(data, type);
        showNotification(data);
      }
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  };

  document.getElementById('file-input').addEventListener('change', handleImageUpload);
}
