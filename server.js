// import express from "express";
// import { WebSocketServer } from "ws";
// import http from "http";
// import fs from "fs";
// import QRCode from "qrcode";

// const app = express();
// const server = http.createServer(app);
// const wss = new WebSocketServer({ server });

// const USERS = {
//   "user1": {
//     password: "15082002",
//     name: "Hiếu"
//   },
//   "user2": {
//     password: "123456",
//     name: "Người dùng 2"
//   }
// };

// app.get("/auth", (req, res) => {
//   const pass = req.query.pass;
//   const userId = Object.keys(USERS).find(id => USERS[id].password === pass);

//   if (userId) {
//     return res.json({
//       ok: true,
//       userId,
//       name: USERS[userId].name,
//       messages // trả về toàn bộ tin nhắn
//     });
//   }

//   return res.status(401).json({ ok: false, error: "Sai mật khẩu" });
// });


// const clients = new Map();

// // API trả QR code
// app.get("/qr", async (req, res) => {
//   const url = `${req.protocol}://${req.get("host")}`;
//   const qr = await QRCode.toDataURL(url);
//   res.json({ qr });
// });

// app.use(express.static("public"));

// // API đăng nhập
// app.get("/auth", (req, res) => {
//   const pass = req.query.pass;
//   const userId = Object.keys(USERS).find(id => USERS[id].password === pass);

//   if (userId) {
//     return res.json({
//       ok: true,
//       userId,
//       name: USERS[userId].name,
//       messages: userMessages[userId] || []
//     });
//   }

//   return res.status(401).json({ ok: false, error: "Sai mật khẩu" });
// });

// // WebSocket
// wss.on("connection", (ws, req) => {
//   const userId = new URL(req.url, 'http://localhost').searchParams.get('userId');
//   if (!userId || !USERS[userId]) {
//     ws.close();
//     return;
//   }

//   clients.set(ws, userId);

//   if (!userMessages[userId]) {
//     userMessages[userId] = [];
//   }

//   ws.on("message", (msg) => {
//     let data;
//     try {
//       data = JSON.parse(msg);
//     } catch {
//       data = { type: 'text', content: msg.toString() };
//     }

//     const messageWithUser = {
//       ...data,
//       userId,
//       name: USERS[userId].name,
//       timestamp: new Date().toISOString()
//     };

//     // userMessages[userId].push(messageWithUser);
//     messages.push(messageWithUser);
//     saveMessages();

//     const messageToSend = JSON.stringify(messageWithUser);
//     for (const [client] of clients) {
//       if (client.readyState === 1) {
//         client.send(messageToSend);
//       }
//     }
//   });

//   ws.on("close", () => {
//     clients.delete(ws);
//   });
// });

// const PORT = process.env.PORT || 3000;
// server.listen(PORT, "0.0.0.0", () => {
//   console.log(`Server running on port ${PORT}`);
// });

import express from "express";
import { WebSocketServer } from "ws";
import http from "http";
import fs from "fs";
import QRCode from "qrcode";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

/**
 * Danh sách user (2 người)
 */
const USERS = {
  "user1": { password: "15082002", name: "Hiếu" },
  "user2": { password: "15082002", name: "Vỹ Vỹ" }
};s

/**
 * ====== Quản lý tin nhắn chung ======
 */
const MESSAGES_FILE = "messages.json";
let messages = [];

try {
  if (fs.existsSync(MESSAGES_FILE)) {
    const data = fs.readFileSync(MESSAGES_FILE, "utf8");
    messages = JSON.parse(data);
  }
} catch (err) {
  console.error("Error loading messages:", err);
}

function saveMessages() {
  try {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving messages:", err);
  }
}
/**
 * ===================================
 */

const clients = new Map();

/**
 * API xoá toàn bộ tin nhắn
 */
app.post("/clear", (req, res) => {
  messages = [];
  saveMessages();
  res.json({ ok: true, message: "Đã xoá toàn bộ tin nhắn" });
});

/**
 * API trả QR code
 */
app.get("/qr", async (req, res) => {
  const url = `${req.protocol}://${req.get("host")}`;
  const qr = await QRCode.toDataURL(url);
  res.json({ qr });
});

/**
 * Cấu hình static folder
 */
app.use(express.static("public"));

/**
 * API đăng nhập
 */
app.get("/auth", (req, res) => {
  const pass = req.query.pass;
  const userId = Object.keys(USERS).find(id => USERS[id].password === pass);

  if (userId) {
    return res.json({
      ok: true,
      userId,
      name: USERS[userId].name,
      messages: Array.isArray(messages) ? messages : []   // ✅ luôn là array
    });
  }

  return res.status(401).json({ ok: false, error: "Sai mật khẩu" });
});


/**
 * WebSocket xử lý chat
 */
wss.on("connection", (ws, req) => {
  const userId = new URL(req.url, "http://localhost").searchParams.get("userId");
  if (!userId || !USERS[userId]) {
    ws.close();
    return;
  }

  clients.set(ws, userId);

  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      data = { type: "text", content: msg.toString() };
    }

    const messageWithUser = {
      ...data,
      userId,
      name: USERS[userId].name,
      timestamp: new Date().toISOString()
    };

    // ✅ lưu vào mảng chung
    messages.push(messageWithUser);
    saveMessages();

    // gửi cho tất cả client
    const messageToSend = JSON.stringify(messageWithUser);
    for (const [client] of clients) {
      if (client.readyState === 1) {
        client.send(messageToSend);
      }
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
