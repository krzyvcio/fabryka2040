import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const HOST = "127.0.0.1";

const app = express();

app.use(express.static(path.join(__dirname, "web")));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "web", "index.html"));
});

app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
