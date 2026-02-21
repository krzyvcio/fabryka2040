import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { apiRouter, initializeApiResources, closeApiResources } from "./api.js";
import dotenv from 'dotenv';
import fs from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const HOST = "0.0.0.0";
const LM_STUDIO_URL = "http://172.23.176.1:1234/v1";
const LOCK_FILE = path.join(__dirname, ".server.lock");

async function killProcessOnPort(port: number): Promise<boolean> {
  try {
    if (process.platform === "win32") {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      const lines = stdout.trim().split("\n");
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const pid = parts[parts.length - 1];
          if (pid && !isNaN(parseInt(pid))) {
            console.log(`   🔪 Zabijam proces PID ${pid} na porcie ${port}...`);
            try {
              await execAsync(`taskkill /PID ${pid} /F`);
            } catch {}
          }
        }
      }
    } else {
      const { stdout } = await execAsync(`lsof -ti:${port}`);
      const pids = stdout.trim().split("\n");
      for (const pid of pids) {
        if (pid) {
          console.log(`   🔪 Zabijam proces PID ${pid} na porcie ${port}...`);
          try {
            await execAsync(`kill -9 ${pid}`);
          } catch {}
        }
      }
    }
    await new Promise(r => setTimeout(r, 500));
    return true;
  } catch {
    return false;
  }
}

async function isPortInUse(port: number): Promise<boolean> {
  try {
    if (process.platform === "win32") {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      return stdout.trim().length > 0;
    } else {
      const { stdout } = await execAsync(`lsof -ti:${port}`);
      return stdout.trim().length > 0;
    }
  } catch {
    return false;
  }
}

function acquireLock(): boolean {
  if (fs.existsSync(LOCK_FILE)) {
    try {
      const pid = fs.readFileSync(LOCK_FILE, "utf-8").trim();
      console.log(`🔒 Serwer już uruchomiony (PID: ${pid})`);
      console.log(`   Jeśli to błąd, usuń plik: ${LOCK_FILE}`);
      return false;
    } catch {
      fs.unlinkSync(LOCK_FILE);
    }
  }
  fs.writeFileSync(LOCK_FILE, process.pid.toString());
  return true;
}

function releaseLock(): void {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch {}
}

async function checkLMStudio(): Promise<boolean> {
  try {
    const res = await fetch(`${LM_STUDIO_URL}/models`, { 
      method: "GET",
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) {
      console.log("❌ LM Studio: błąd HTTP", res.status);
      return false;
    }
    const data = await res.json() as { data?: Array<{ id: string }> };
    const models = data.data || [];
    if (models.length === 0) {
      console.log("❌ LM Studio: brak modeli");
      return false;
    }
    console.log("✅ LM Studio: " + models[0].id);
    console.log("   Dostępne: " + models.map((m: any) => m.id).slice(0, 3).join(", ") + "...");
    return true;
  } catch (err: any) {
    console.log("❌ LM Studio: " + err.message);
    return false;
  }
}

const app = express();

app.use('/web', express.static(path.join(__dirname, "web")));
app.use('/api', apiRouter);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, "web", "index.html"));
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "web", "index.html"));
});

process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down server...");
  releaseLock();
  await closeApiResources();
  process.exit(0);
});

process.on("exit", () => {
  releaseLock();
});

async function startServer() {
  // Kill any process on port 3000
  const portInUse = await isPortInUse(PORT);
  if (portInUse) {
    console.log(`⚠️  Port ${PORT} jest zajęty - zamykam stary proces...`);
    await killProcessOnPort(PORT);
  }

  if (!acquireLock()) {
    console.log("❌ Nie można uruchomić - serwer już działa!");
    process.exit(1);
  }
  
  console.log("\n🔍 Sprawdzanie systemu...\n");
  
  const lmOk = await checkLMStudio();
  if (!lmOk) {
    console.log("\n⚠️  LM Studio nie jest dostępny!");
    console.log("   Uruchom LM Studio i załaduj model przed startem serwera.\n");
  }
  
  console.log("🌐 Uruchamianie serwera...");
  try {
    await initializeApiResources();
    app.listen(PORT, HOST, () => {
      console.log(`\n✅ Server running at http://${HOST}:${PORT}`);
      console.log(
        `\n╔════════════════════════════════════════╗
║   🌐 NEUROFORGE-7 Web UI & API Started ║
╠════════════════════════════════════════╣
║  🔗 Web UI:  http://localhost:${PORT}          ║
║  📡 API:     http://localhost:${PORT}/api/      ║
║  💚 Health:  http://localhost:${PORT}/api/health║
╚════════════════════════════════════════╝`
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
