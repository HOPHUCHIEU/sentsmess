import express from "express";
import { WebSocketServer } from "ws";
import http from "http";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PASSWORD = "15082002";
const clients = new Set();

import QRCode from "qrcode";
app.get("/qr", async (req, res) => {
  const url = `${req.protocol}://${req.get("host")}`;
  const qr = await QRCode.toDataURL(url);
  res.json({ qr });
});


app.use(express.static("public"));

// API kiểm tra mật khẩu
app.get("/auth", (req, res) => {
  if (req.query.pass === PASSWORD) return res.json({ ok: true });
  res.status(401).json({ ok: false });
});

// WebSocket
wss.on("connection", (ws) => {
  clients.add(ws);
  ws.on("message", (msg) => {
    for (const client of clients) {
      if (client.readyState === 1) client.send(msg.toString());
    }
  });
  ws.on("close", () => clients.delete(ws));
});

// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => console.log("Server chạy trên port", PORT));

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});