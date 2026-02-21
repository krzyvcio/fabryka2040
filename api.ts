import express, { Request, Response, NextFunction, Router } from "express";
import { initializeDatabase, closeDatabase, getConversations, getConversationById, getConversationMessages, getConversationContext, getRecentMessages, getAgentLongTermMemory, getMessageCount, getConnection, getWatcherStats, getRecentInterventions } from "./db.js";
import { generateNextMessage, getChatStats, initChatAgents } from "./chatGenerator.js";
import "./emotionEngine.js";
import { runDebateDay } from "./debate-handler.js";
import { seedPromptTemplates } from "./promptTemplates.js";

import { getPersonality, getAllPersonalities } from "./personalityEngine.js";
import { getTraumaState, getActiveTraumas, getAllTraumaStates } from "./traumaEngine.js";
import { getCognitiveState, getAllCognitiveStates, getAgentsNeedingRest } from "./cognitiveEngine.js";
import { computeSystemState, updateSystemMetrics, getSystemStateHistory, checkCatastropheCondition, getSystemStateHistoryFromArchive } from "./systemDynamics.js";
import { getSynapsaState, getSynapsaMetrics, calculateDeactivationRisk } from "./synapsaConsciousness.js";
import { getDramaState, computeDramaIndex, checkTragedyMode, getPhaseTransitionWarning, getDramaHistory } from "./dramaEngine.js";
import { getAllConflicts, getCriticalConflicts } from "./conflictEngine.js";
import { simulateTrajectory, findFixedPoints, analyzeStability } from "./simulation/rk4.js";
import { bifurcationScan, findCriticalPoint, analyzeBifurcationRegion } from "./simulation/bifurcation.js";
import { getAllAgentsEmotion, getEmotionHistory, getAllEmotionHistory, recordEmotionHistory } from "./emotionEngine.js";

function firstString(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return firstString(value[0]);
  if (value && typeof value === "object" && "toString" in value) {
    return String(value);
  }
  return "";
}

function getPathParam(req: Request, param: string): string {
  return firstString(req.params[param]);
}

// Helper to safely get query param as string
function getQueryParam(req: Request, param: string): string {
  return firstString(req.query[param]);
}

function convertToJSON(obj: any): any {
  if (typeof obj === "bigint") {
    return Number(obj);
  }
  if (obj !== null && typeof obj === "object") {
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

export const apiRouter: Router = express.Router();

apiRouter.use(express.json());

apiRouter.use((req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  res.json = function (data: any) {
    const converted = convertToJSON(data);
    return originalJson.call(this, converted);
  };
  next();
});

apiRouter.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

apiRouter.get("/conversations", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(getQueryParam(req, "limit") || "50"), 500);
    const conversations = await getConversations(limit);
    res.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations", message: (error as Error).message });
  }
});

apiRouter.get("/conversations/:id", async (req: Request, res: Response) => {
  try {
    const conversationId = getPathParam(req, "id");
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

apiRouter.get("/conversations/:id/messages", async (req: Request, res: Response) => {
  try {
    const conversationId = getPathParam(req, "id");
    const limit = Math.min(parseInt(getQueryParam(req, "limit")) || 0, 5000); // 0 = wszystkie
    const messages = await getConversationMessages(conversationId, limit);
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages", message: (error as Error).message });
  }
});

apiRouter.get("/conversations/:id/context", async (req: Request, res: Response) => {
  try {
    const conversationId = getPathParam(req, "id");
    const context = await getConversationContext(conversationId);
    res.json(context);
  } catch (error) {
    console.error("Error fetching context:", error);
    res.status(500).json({ error: "Failed to fetch context", message: (error as Error).message });
  }
});

apiRouter.post("/debates/start", async (req: Request, res: Response) => {
  try {
    console.log("\n🎬 Starting new debate session from API...");

    // Run debate and wait for completion
    const result = await runDebateDay();
    
    console.log("✅ Debate finished:", result.message);

    res.json({
      status: "completed",
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error running debate:", error);
    res.status(500).json({
      error: "Failed to run debate",
      message: (error as Error).message
    });
  }
});

// === SPRINT 1: PERSONALITY ENDPOINTS ===

// MUST be before parameterized route - fixed routes first
apiRouter.get("/agents/all/personality", async (req: Request, res: Response) => {
  try {
    const personalities = await getAllPersonalities();
    res.json(personalities);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.get("/agents/:id/personality", async (req: Request, res: Response) => {
  try {
    const personality = await getPersonality(getPathParam(req, "id"));
    res.json(personality);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// === SPRINT 1: TRAUMA ENDPOINTS ===

// MUST be before parameterized route - fixed routes first
apiRouter.get("/agents/all/trauma", async (req: Request, res: Response) => {
  try {
    const traumas = await getAllTraumaStates();
    res.json(traumas);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.get("/agents/:id/trauma", async (req: Request, res: Response) => {
  try {
    const trauma = await getTraumaState(getPathParam(req, "id"));
    res.json(trauma);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.get("/agents/:id/traumas", async (req: Request, res: Response) => {
  try {
    const traumas = await getActiveTraumas(getPathParam(req, "id"));
    res.json(traumas);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// === SPRINT 1: COGNITIVE ENDPOINTS ===

// MUST be before parameterized route - fixed routes first
apiRouter.get("/agents/needing-rest", async (req: Request, res: Response) => {
  try {
    const threshold = parseFloat(getQueryParam(req, "threshold")) || 0.3;
    const agents = await getAgentsNeedingRest(threshold);
    res.json({ agents, count: agents.length });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.get("/agents/all/cognitive", async (req: Request, res: Response) => {
  try {
    const cognitives = await getAllCognitiveStates();
    res.json(cognitives);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.get("/agents/:id/cognitive", async (req: Request, res: Response) => {
  try {
    const cognitive = await getCognitiveState(getPathParam(req, "id"));
    res.json(cognitive);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// === SPRINT 2: SYSTEM STATE ENDPOINTS ===

apiRouter.get("/system/state", async (req: Request, res: Response) => {
  try {
    const state = await computeSystemState();
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.post("/system/state/update", async (req: Request, res: Response) => {
  try {
    const state = await updateSystemMetrics();
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.get("/system/state/history", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(getQueryParam(req, "limit") || "100"), 500);
    const history = await getSystemStateHistory(limit);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.get("/system/catastrophe-check", async (req: Request, res: Response) => {
  try {
    const state = await computeSystemState();
    const isCatastrophe = await checkCatastropheCondition(state);
    res.json({ isCatastrophe, state });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// === SPRINT 2: SYNAPSA ENDPOINTS ===

apiRouter.get("/synapsa/state", async (req: Request, res: Response) => {
  try {
    const state = await getSynapsaState();
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.get("/synapsa/metrics", async (req: Request, res: Response) => {
  try {
    const metrics = await getSynapsaMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.get("/synapsa/deactivation-risk", async (req: Request, res: Response) => {
  try {
    const risk = await calculateDeactivationRisk();
    res.json({ risk, level: risk > 0.7 ? "HIGH" : risk > 0.4 ? "MEDIUM" : "LOW" });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// === SPRINT 2: DRAMA ENDPOINTS ===

apiRouter.get("/system/drama", async (req: Request, res: Response) => {
  try {
    const drama = await getDramaState();
    res.json(drama);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.get("/system/drama/index", async (req: Request, res: Response) => {
  try {
    const index = await computeDramaIndex();
    res.json({ index, phase: index < 0.3 ? "stable" : index < 0.6 ? "tension" : index < 0.8 ? "crisis" : "tragedy" });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.get("/system/drama/tragedy-check", async (req: Request, res: Response) => {
  try {
    const isTragedy = await checkTragedyMode();
    res.json({ isTragedyMode: isTragedy });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.get("/system/drama/warning", async (req: Request, res: Response) => {
  try {
    const warning = await getPhaseTransitionWarning();
    res.json(warning);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.get("/system/drama/history", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(getQueryParam(req, "limit") || "50"), 200);
    const history = await getDramaHistory(limit);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// === CONFLICT ENDPOINTS ===

apiRouter.get("/conflicts", async (req: Request, res: Response) => {
  try {
    const conflicts = await getAllConflicts();
    res.json(conflicts);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.get("/conflicts/critical", async (req: Request, res: Response) => {
  try {
    const critical = await getCriticalConflicts();
    res.json({ critical, count: critical.length });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// === CHAT 5000 ENDPOINTS ===

apiRouter.get("/chat/messages", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(getQueryParam(req, "limit") || "50"), 500);
    const offset = Math.max(parseInt(getQueryParam(req, "offset") || "0"), 0);
    const messages = await getRecentMessages(limit, offset);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.get("/chat/messages/count", async (req: Request, res: Response) => {
  try {
    const count = await getMessageCount();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.get("/chat/agents", async (req: Request, res: Response) => {
  try {
    const conn = await getConnection();
    try {
      const rows = await conn.query(`SELECT * FROM chat_agents`);
      res.json(rows);
    } finally {
      conn.release();
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.get("/chat/memories/:agentId", async (req: Request, res: Response) => {
  try {
    const agentId = getPathParam(req, "agentId");
    const limit = Math.min(parseInt(getQueryParam(req, "limit") || "20"), 100);
    const memories = await getAgentLongTermMemory(agentId, limit);
    res.json(memories);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// === CHAT GENERATOR ENDPOINT ===
let chatTurnCount = 0;
let chatRunning = false;

apiRouter.post("/chat/generate", async (req: Request, res: Response) => {
  try {
    const bodyCount = firstString(req.body?.count);
    const queryCount = getQueryParam(req, "count");
    const count = parseInt(bodyCount || queryCount || "1");
    const results: string[] = [];
    
    for (let i = 0; i < count; i++) {
      chatTurnCount++;
      const msg = await generateNextMessage(chatTurnCount);
      if (msg) results.push(msg);
      await new Promise(r => setTimeout(r, 500));
    }
    
    res.json({ success: true, generated: results.length, messages: results, turn: chatTurnCount });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.get("/chat/status", async (req: Request, res: Response) => {
  try {
    const stats = await getChatStats();
    res.json({ turn: chatTurnCount, ...stats });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.post("/chat/start", async (req: Request, res: Response) => {
  try {
    if (chatRunning) {
      res.json({ status: "already_running", turn: chatTurnCount });
      return;
    }
    chatRunning = true;
    const targetMessages = parseInt(getQueryParam(req, "target") || "100") || 100;
    
    (async () => {
      while (chatTurnCount < targetMessages && chatRunning) {
        chatTurnCount++;
        const msg = await generateNextMessage(chatTurnCount);
        if (!msg) console.log(`Błąd przy turze ${chatTurnCount}`);
        await new Promise(r => setTimeout(r, 800));
      }
      chatRunning = false;
      console.log(`✓ Zakończono generowanie ${chatTurnCount} wiadomości`);
    })();
    
    res.json({ status: "started", target: targetMessages });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.post("/chat/stop", async (req: Request, res: Response) => {
  chatRunning = false;
  res.json({ status: "stopped", turn: chatTurnCount });
});

// === DUPLICATE WATCHER ENDPOINTS ===

apiRouter.get("/watcher/stats", async (req: Request, res: Response) => {
  try {
    const stats = await getWatcherStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.get("/watcher/interventions", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(getQueryParam(req, "limit") || "20"), 100);
    const interventions = await getRecentInterventions(limit);
    res.json(interventions);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// === DASHBOARD ENDPOINTS ===

apiRouter.get("/dashboard/emotions", async (req: Request, res: Response) => {
  try {
    const emotions = await getAllAgentsEmotion();
    res.json(emotions);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.get("/dashboard/emotions/history", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(getQueryParam(req, "limit") || "50"), 200);
    const history = await getAllEmotionHistory(limit);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.get("/dashboard/emotions/:agentId/history", async (req: Request, res: Response) => {
  try {
    const agentId = getPathParam(req, "agentId");
    const limit = Math.min(parseInt(getQueryParam(req, "limit") || "50"), 200);
    const history = await getEmotionHistory(agentId, limit);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.get("/dashboard/system/history", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(getQueryParam(req, "limit") || "100"), 500);
    const history = await getSystemStateHistoryFromArchive(limit);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.get("/dashboard/relations", async (req: Request, res: Response) => {
  try {
    const conn = await getConnection();
    try {
      const rows = await conn.query(`SELECT * FROM agent_relations`);
      res.json(rows);
    } finally {
      conn.release();
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.post("/dashboard/emotions/record", async (req: Request, res: Response) => {
  try {
    await recordEmotionHistory();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.use((req: Request, res: Response) => {
  res.status(404).json({ error: "API endpoint not found" });
});

export async function initializeApiResources(): Promise<void> {
  try {
    await initializeDatabase();
    console.log("✓ Database initialized");
    await seedPromptTemplates();
    console.log("✓ Prompt templates seeded");
    await initChatAgents();
    console.log("✓ Chat agents initialized");
  } catch (error) {
    console.error("Failed to initialize API resources:", error);
    process.exit(1);
  }
}

export async function closeApiResources(): Promise<void> {
  console.log("\n🛑 Shutting down API resources...");
  await closeDatabase();
}

