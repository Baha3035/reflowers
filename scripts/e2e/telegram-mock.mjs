// Minimal Telegram Bot API mock: records calls, answers like Telegram.
import http from "node:http";
const calls = []; let webhook = "";
http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/calls") { res.end(JSON.stringify(calls)); return; }
  let body = ""; for await (const c of req) body += c;
  const method = req.url.split("/").pop(); const payload = body ? JSON.parse(body) : {};
  calls.push({ method, payload });
  let result = true;
  if (method === "getWebhookInfo") result = { url: webhook };
  if (method === "setWebhook") webhook = payload.url;
  if (method === "sendMessage") result = { message_id: calls.length };
  res.setHeader("content-type", "application/json"); res.end(JSON.stringify({ ok: true, result }));
}).listen(4599, "127.0.0.1", () => console.log("mock on 4599"));
