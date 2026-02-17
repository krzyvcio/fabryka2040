import { DuckDBInstance, DuckDBConnection } from "@duckdb/node-api";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(process.cwd(), "neuroforge.db");
let db: DuckDBInstance | null = null;
let conn: DuckDBConnection | null = null;

export async function initializeDatabase(): Promise<DuckDBInstance> {
  if (db) return db;
  
  db = await DuckDBInstance.create(DB_PATH);
  conn = await db.connect();
  
  await conn.run(`
    CREATE TABLE IF NOT EXISTS agents_emotion (
      agent_id TEXT PRIMARY KEY,
      emotion TEXT DEFAULT 'neutral',
      intensity DOUBLE DEFAULT 0.5,
      valence DOUBLE DEFAULT 0.0,
      arousal DOUBLE DEFAULT 0.0,
      stress DOUBLE DEFAULT 0.0,
      mood_valence DOUBLE DEFAULT 0.0,
      mood_arousal DOUBLE DEFAULT 0.0,
      last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.run(`
    CREATE TABLE IF NOT EXISTS agent_relations (
      agent_id TEXT,
      target_id TEXT,
      anger DOUBLE DEFAULT 0.0,
      trust DOUBLE DEFAULT 0.5,
      respect DOUBLE DEFAULT 0.5,
      rapport DOUBLE DEFAULT 0.0,
      goal_alignment DOUBLE DEFAULT 0.5,
      PRIMARY KEY (agent_id, target_id)
    )
  `);

  await conn.run(`
    CREATE TABLE IF NOT EXISTS emotional_grudges (
      id INTEGER PRIMARY KEY,
      agent_id TEXT,
      target_id TEXT,
      intensity DOUBLE DEFAULT 1.0,
      reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.run(`
    CREATE TABLE IF NOT EXISTS interaction_history (
      id INTEGER PRIMARY KEY,
      speaker TEXT,
      content TEXT,
      target TEXT,
      valence DOUBLE DEFAULT 0.0,
      arousal DOUBLE DEFAULT 0.0,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.run(`
    CREATE TABLE IF NOT EXISTS factory_events (
      id INTEGER PRIMARY KEY,
      description TEXT,
      severity DOUBLE DEFAULT 0.5,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      affected_agents TEXT
    )
  `);

  await conn.run(`
    CREATE TABLE IF NOT EXISTS daily_emotional_signatures (
      id INTEGER PRIMARY KEY,
      day INTEGER,
      signature TEXT,
      average_valence DOUBLE,
      average_stress DOUBLE,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await conn.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      day INTEGER,
      topic TEXT,
      scenario TEXT,
      initiator TEXT,
      participants TEXT,
      start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      end_time TIMESTAMP,
      turn_count INTEGER DEFAULT 0,
      average_valence DOUBLE,
      average_stress DOUBLE,
      drama_level DOUBLE,
      had_conflict BOOLEAN DEFAULT FALSE,
      summary TEXT
    )
  `);

  await conn.run(`
    CREATE TABLE IF NOT EXISTS conversation_messages (
      id INTEGER PRIMARY KEY,
      conversation_id TEXT,
      turn_number INTEGER,
      speaker TEXT,
      target_agent TEXT,
      content TEXT,
      emotion_at_time TEXT,
      valence_at_time DOUBLE,
      arousal_at_time DOUBLE,
      stress_at_time DOUBLE,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )
  `);

  await conn.run(`
    CREATE TABLE IF NOT EXISTS conversation_context (
      id INTEGER PRIMARY KEY,
      conversation_id TEXT,
      preceding_events TEXT,
      group_mood_at_start TEXT,
      emotional_relationships_snapshot TEXT,
      unresolved_conflicts TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )
  `);

  await conn.run(`
    CREATE TABLE IF NOT EXISTS agent_mood_history (
      id INTEGER PRIMARY KEY,
      agent_id TEXT,
      conversation_id TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      emotion TEXT,
      valence DOUBLE,
      arousal DOUBLE,
      stress DOUBLE,
      notes TEXT,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )
  `);

  console.log("✓ DuckDB schema initialized");
  return db;
}

export function getDatabase(): DuckDBInstance {
  if (!db) throw new Error("Database not initialized");
  return db;
}

export function getConnection(): DuckDBConnection {
  if (!conn) throw new Error("Connection not initialized");
  return conn;
}

export async function closeDatabase() {
  try {
    if (conn) {
      try {
        await (conn as any).end();
      } catch (e) {
        console.warn("Warning closing connection:", e);
      }
      conn = null;
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (db) {
      try {
        await (db as any).close();
      } catch (e) {
        console.warn("Warning closing database:", e);
      }
      db = null;
    }
    
    console.log("✓ Database closed successfully");
  } catch (error) {
    console.error("Error closing database:", error);
  }
}

export async function startConversation(
  conversationId: string,
  day: number,
  topic: string,
  scenario: string,
  initiator: string,
  participants: string[]
): Promise<void> {
  const conn_instance = getConnection();
  await conn_instance.run(
    `INSERT INTO conversations (id, day, topic, scenario, initiator, participants, drama_level)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [conversationId, day, topic, scenario, initiator, JSON.stringify(participants), 0.8]
  );
}

export async function addConversationMessage(
  conversationId: string,
  turnNumber: number,
  speaker: string,
  targetAgent: string | null,
  content: string,
  emotionState: { emotion: string; valence: number; arousal: number; stress: number }
): Promise<void> {
  const conn_instance = getConnection();
  await conn_instance.run(
    `INSERT INTO conversation_messages 
     (conversation_id, turn_number, speaker, target_agent, content, emotion_at_time, valence_at_time, arousal_at_time, stress_at_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      conversationId,
      turnNumber,
      speaker,
      targetAgent,
      content,
      emotionState.emotion,
      emotionState.valence,
      emotionState.arousal,
      emotionState.stress,
    ]
  );
}

export async function endConversation(
  conversationId: string,
  turnCount: number,
  avgValence: number,
  avgStress: number,
  hadConflict: boolean,
  summary: string
): Promise<void> {
  const conn_instance = getConnection();
  await conn_instance.run(
    `UPDATE conversations 
     SET end_time = CURRENT_TIMESTAMP, turn_count = ?, average_valence = ?, 
         average_stress = ?, had_conflict = ?, summary = ?
     WHERE id = ?`,
    [turnCount, avgValence, avgStress, hadConflict, summary, conversationId]
  );
}

export async function setConversationContext(
  conversationId: string,
  precedingEvents: string,
  groupMood: string,
  emotionalRelationships: string,
  unresolvedConflicts: string
): Promise<void> {
  const conn_instance = getConnection();
  await conn_instance.run(
    `INSERT INTO conversation_context 
     (conversation_id, preceding_events, group_mood_at_start, emotional_relationships_snapshot, unresolved_conflicts)
     VALUES (?, ?, ?, ?, ?)`,
    [conversationId, precedingEvents, groupMood, emotionalRelationships, unresolvedConflicts]
  );
}

function convertBigInt(obj: any): any {
  if (typeof obj === "bigint") {
    return Number(obj);
  }
  if (obj !== null && typeof obj === "object") {
    if ("micros" in obj && Object.keys(obj).length === 1 && typeof obj.micros === "number") {
      return new Date(Math.floor(obj.micros / 1000)).toISOString();
    }
    if (!Array.isArray(obj)) {
      const converted: any = {};
      for (const key in obj) {
        converted[key] = convertBigInt(obj[key]);
      }
      return converted;
    }
  }
  if (Array.isArray(obj)) {
    return obj.map(convertBigInt);
  }
  return obj;
}

export async function getConversations(limit: number = 50): Promise<any[]> {
  const conn_instance = getConnection();
  const result = await conn_instance.run(
    `SELECT * FROM conversations ORDER BY start_time DESC LIMIT ?`,
    [limit]
  );
  const rows = await result.getRowObjects();
  return convertBigInt(rows) as any[];
}

export async function getConversationById(conversationId: string): Promise<any> {
  const conn_instance = getConnection();
  const result = await conn_instance.run(
    `SELECT * FROM conversations WHERE id = ?`,
    [conversationId]
  );
  const rows = (await result.getRowObjects()) as any;
  return convertBigInt(rows.length > 0 ? rows[0] : null);
}

export async function getConversationMessages(conversationId: string): Promise<any[]> {
  const conn_instance = getConnection();
  const result = await conn_instance.run(
    `SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY turn_number ASC`,
    [conversationId]
  );
  const messages = (await result.getRowObjects()) as any;
  return convertBigInt(messages);
}

export async function getConversationContext(conversationId: string): Promise<any> {
  const conn_instance = getConnection();
  const result = await conn_instance.run(
    `SELECT * FROM conversation_context WHERE conversation_id = ?`,
    [conversationId]
  );
  const rows = (await result.getRowObjects()) as any;
  return convertBigInt(rows.length > 0 ? rows[0] : null);
}
