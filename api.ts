import express, { Request, Response, NextFunction } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getConversations,
  getConversationById,
  getConversationMessages,
  getConversationContext,
  initializeDatabase,
  closeDatabase,
} from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const HOST = "127.0.0.1";

function convertToJSON(obj: any): any {
  if (typeof obj === "bigint") {
    return Number(obj);
  }
  if (obj !== null && typeof obj === "object") {
    if ("micros" in obj && Object.keys(obj).length === 1 && typeof obj.micros === "number") {
      return new Date(Math.floor(obj.micros / 1000)).toISOString();
    }
    if (Array.isArray(obj)) {
      return obj.map(convertToJSON);
    } else {
      const converted: any = {};
      for (const key in obj) {
        converted[key] = convertToJSON(obj[key]);
      }
      return converted;
    }
  }
  return obj;
}

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "web")));

app.use((req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  res.json = function (data: any) {
    const converted = convertToJSON(data);
    return originalJson.call(this, converted);
  };
  next();
});

app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/conversations", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string || "50"), 500);
    const conversations = await getConversations(limit);
    res.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations", message: (error as Error).message });
  }
});

app.get("/api/conversations/:id", async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const conversation = await getConversationById(conversationId);

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const messages = await getConversationMessages(conversationId);
    const context = await getConversationContext(conversationId);

    res.json({ conversation, messages, context });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({ error: "Failed to fetch conversation", message: (error as Error).message });
  }
});

app.get("/api/conversations/:id/messages", async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const messages = await getConversationMessages(conversationId);
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages", message: (error as Error).message });
  }
});

app.get("/api/conversations/:id/context", async (req: Request, res: Response) => {
  try {
    const conversationId = req.params.id;
    const context = await getConversationContext(conversationId);
    res.json(context);
  } catch (error) {
    console.error("Error fetching context:", error);
    res.status(500).json({ error: "Failed to fetch context", message: (error as Error).message });
  }
});

app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "web", "index.html"));
});

app.use("/api", (req: Request, res: Response) => {
  res.status(404).json({ error: "API endpoint not found" });
});

process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down API server...");
  await closeDatabase();
  process.exit(0);
});

export async function startAPIServer(): Promise<void> {
  try {
    await initializeDatabase();
    console.log("✓ DuckDB schema initialized");
    console.log("✓ Database initialized");

    app.listen(PORT, HOST, () => {
      console.log(`Server listening at http://${HOST}:${PORT}`);
      console.log(
        `\n╔════════════════════════════════════════╗
║   🌐 NEUROFORGE-7 API Server Started   ║
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
