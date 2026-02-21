import mariadb from 'mariadb';
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initMigrations } from "./migrations.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_HOST = process.env.DB_HOST || "127.0.0.1";
const DB_USER = process.env.DB_USER || "neuroforge_user";
const DB_PASSWORD = process.env.DB_PASSWORD || "neuroforge_password";
const DB_DATABASE = process.env.DB_DATABASE || "neuroforge_db";
const DB_PORT = parseInt(process.env.DB_PORT || "3306");

let pool: mariadb.Pool | null = null;

// Extended connection type with release method
export interface DBConnection {
  query<T>(sql: string, params?: any[]): Promise<T>;
  release(): void;
}

export async function initializeDatabase(): Promise<mariadb.Pool> {
  if (pool) return pool;

  pool = mariadb.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_DATABASE,
    port: DB_PORT,
    connectionLimit: 5,
  });

  await initMigrations();
  
  return pool;
}

export async function getConnection(): Promise<DBConnection> {
  if (!pool) await initializeDatabase();
  const conn = await pool!.getConnection();
  // Add release method to connection
  return {
    query: (sql: string, params?: any[]) => conn.query(sql, params),
    release: () => conn.release()
  };
}

export function getDatabase(): mariadb.Pool {
  if (!pool) throw new Error("Database not initialized");
  return pool;
}

export async function closeDatabase() {
  try {
    if (!pool) return;
    await pool.end();
    pool = null;
    console.log("✓ Database closed");
  } catch (error) {
    console.error("Error closing database:", error);
  }
}

export async function startConversation(conversationId: string, day: number, topic: string, scenario: string, initiator: string, participants: string[]): Promise<void> {
  const conn = await getConnection();
  try {
    await conn.query(`INSERT INTO conversations (id, day, topic, scenario, initiator, participants, drama_level) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [conversationId, day, topic, scenario, initiator, JSON.stringify(participants), 0.8]);
  } finally {
    conn.release();
  }
}

export async function addConversationMessage(conversationId: string, turnNumber: number, speaker: string, targetAgent: string | null, content: string, emotionState: { emotion: string; valence: number; arousal: number; stress: number }): Promise<number> {
  const conn = await getConnection();
  try {
    const result = await conn.query(`INSERT INTO conversation_messages (conversation_id, turn_number, speaker, target_agent, content, emotion_at_time, valence_at_time, arousal_at_time, stress_at_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [conversationId, turnNumber, speaker, targetAgent, content, emotionState.emotion, emotionState.valence, emotionState.arousal, emotionState.stress]);
    return Number((result as any).insertId);
  } finally {
    conn.release();
  }
}

export async function endConversation(conversationId: string, turnCount: number, avgValence: number, avgStress: number, hadConflict: boolean, summary: string): Promise<void> {
  const conn = await getConnection();
  try {
    await conn.query(`UPDATE conversations SET end_time = CURRENT_TIMESTAMP, turn_count = ?, average_valence = ?, average_stress = ?, had_conflict = ?, summary = ? WHERE id = ?`,
      [turnCount, avgValence, avgStress, hadConflict, summary, conversationId]);
  } finally {
    conn.release();
  }
}

export async function setConversationContext(conversationId: string, precedingEvents: string, groupMood: string, emotionalRelationships: string, unresolvedConflicts: string): Promise<void> {
  const conn = await getConnection();
  try {
    await conn.query(`INSERT INTO conversation_context (conversation_id, preceding_events, group_mood_at_start, emotional_relationships_snapshot, unresolved_conflicts) VALUES (?, ?, ?, ?, ?)`,
      [conversationId, precedingEvents, groupMood, emotionalRelationships, unresolvedConflicts]);
  } finally {
    conn.release();
  }
}

export async function getConversations(limit: number = 50): Promise<any[]> {
  const conn = await getConnection();
  try {
    const rows = await conn.query(`SELECT * FROM conversations ORDER BY start_time DESC LIMIT ?`, [limit]);
    return rows as any[];
  } finally {
    conn.release();
  }
}

export async function getLastDayNumber(): Promise<number> {
  const conn = await getConnection();
  try {
    const rows = await conn.query(`SELECT MAX(day) as maxDay FROM conversations`) as any[];
    return rows[0]?.maxDay || 0;
  } finally {
    conn.release();
  }
}

export async function getConversationById(conversationId: string): Promise<any> {
  const conn = await getConnection();
  try {
    const rows = await conn.query(`SELECT * FROM conversations WHERE id = ?`, [conversationId]) as any[];
    return rows.length > 0 ? rows[0] : null;
  } finally {
    conn.release();
  }
}

export async function getConversationMessages(conversationId: string, limit: number = 0): Promise<any[]> {
  const conn = await getConnection();
  try {
    let query = `SELECT * FROM conversation_messages WHERE conversation_id = ? ORDER BY turn_number ASC`;
    const params: any[] = [conversationId];
    if (limit > 0) { query += ` LIMIT ?`; params.push(limit); }
    else { query += ` LIMIT 5000`; }
    const rows = await conn.query(query, params) as any[];
    return rows;
  } finally {
    conn.release();
  }
}

export async function getConversationContext(conversationId: string): Promise<any> {
  const conn = await getConnection();
  try {
    const rows = await conn.query(`SELECT * FROM conversation_context WHERE conversation_id = ?`, [conversationId]) as any[];
    return rows.length > 0 ? rows[0] : null;
  } finally {
    conn.release();
  }
}

export async function registerChatAgent(id: string, name: string, persona: string, style: string, role: string, interests: string[], priorities: string[]): Promise<void> {
  const conn = await getConnection();
  try {
    await conn.query(`INSERT IGNORE INTO chat_agents (id, name, persona, style, role, interests, priorities) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, name, persona, style, role, JSON.stringify(interests), JSON.stringify(priorities)]);
  } finally {
    conn.release();
  }
}

export async function addChatMessage(agentId: string, content: string, turnNumber: number, isQuote: boolean = false, quotedFrom: number | null = null): Promise<number> {
  const conn = await getConnection();
  try {
    const result = await conn.query(`INSERT INTO chat_messages (agent_id, content, turn_number, is_quote, quoted_from) VALUES (?, ?, ?, ?, ?)`,
      [agentId, content, turnNumber, isQuote, quotedFrom]);
    return Number((result as any).insertId);
  } finally {
    conn.release();
  }
}

export async function getRecentMessages(limit: number = 20, offset: number = 0): Promise<any[]> {
  const conn = await getConnection();
  try {
    const rows = await conn.query(`SELECT m.*, a.name as agent_name FROM chat_messages m JOIN chat_agents a ON m.agent_id = a.id ORDER BY m.turn_number DESC LIMIT ? OFFSET ?`, [limit, offset]) as any[];
    return rows;
  } finally {
    conn.release();
  }
}

export async function saveChatMemory(agentId: string, memoryType: string, content: string, sourceTurn: number, importance: number = 0.5): Promise<void> {
  const conn = await getConnection();
  try {
    await conn.query(`INSERT INTO chat_memories (agent_id, memory_type, content, source_turn, importance) VALUES (?, ?, ?, ?, ?)`,
      [agentId, memoryType, content, sourceTurn, importance]);
  } finally {
    conn.release();
  }
}

export async function getAgentLongTermMemory(agentId: string, limit: number = 20): Promise<any[]> {
  const conn = await getConnection();
  try {
    const rows = await conn.query(`SELECT * FROM chat_memories WHERE agent_id = ? ORDER BY importance DESC, timestamp DESC LIMIT ?`, [agentId, limit]) as any[];
    return rows;
  } finally {
    conn.release();
  }
}

export async function getMessageCount(): Promise<number> {
  const conn = await getConnection();
  try {
    const rows = await conn.query(`SELECT COUNT(*) as cnt FROM chat_messages`) as any[];
    return rows[0]?.cnt || 0;
  } finally {
    conn.release();
  }
}

export async function storeFingerprint(messageId: number, pipeline: 'conversation' | 'chat', agentId: string, conversationId: string | null, ngrams: string[]): Promise<number> {
  const conn = await getConnection();
  try {
    const result = await conn.query(`INSERT INTO message_fingerprints (message_id, pipeline, agent_id, conversation_id, ngrams) VALUES (?, ?, ?, ?, ?)`,
      [messageId, pipeline, agentId, conversationId, JSON.stringify(ngrams)]);
    return Number((result as any).insertId);
  } finally {
    conn.release();
  }
}

export async function getRecentFingerprints(agentId: string, pipeline: 'conversation' | 'chat', conversationId: string | null, limit: number = 50): Promise<Array<{ id: number; ngrams: string[] }>> {
  const conn = await getConnection();
  try {
    let query = `SELECT id, ngrams FROM message_fingerprints WHERE agent_id = ? AND pipeline = ?`;
    const params: any[] = [agentId, pipeline];
    if (pipeline === 'conversation' && conversationId) { query += ` AND conversation_id = ?`; params.push(conversationId); }
    query += ` ORDER BY created_at DESC LIMIT ?`; params.push(limit);
    const rows = await conn.query(query, params) as any[];
    return rows.map((row: any) => ({ id: row.id, ngrams: JSON.parse(row.ngrams) }));
  } finally {
    conn.release();
  }
}

export async function logDuplicateDetection(pipeline: 'conversation' | 'chat', agentId: string, newFpId: number, matchedFpId: number, similarity: number, threshold: number, triggeredIntervention: boolean): Promise<number> {
  const conn = await getConnection();
  try {
    const result = await conn.query(`INSERT INTO duplicate_detections (pipeline, agent_id, new_message_id, matched_message_id, similarity, threshold_used, triggered_intervention) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [pipeline, agentId, newFpId, matchedFpId, similarity, threshold, triggeredIntervention]);
    return Number((result as any).insertId);
  } finally {
    conn.release();
  }
}

export async function logWatcherIntervention(detectionId: number, agentId: string, templateId: number, similarity: number, humorLevel: number, promptUsed: string, modelResponse: string, valenceDelta: number, arousalDelta: number, stressDelta: number, humorBoost: number, directive: string, appliedSuccessfully: boolean, errorMessage: string | null): Promise<void> {
  const conn = await getConnection();
  try {
    await conn.query(`INSERT INTO watcher_interventions (detection_id, agent_id, template_id, similarity, humor_level, prompt_used, model_response, valence_delta, arousal_delta, stress_delta, humor_boost, directive, applied_successfully, error_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [detectionId, agentId, templateId, similarity, humorLevel, promptUsed, modelResponse, valenceDelta, arousalDelta, stressDelta, humorBoost, directive, appliedSuccessfully, errorMessage]);
  } finally {
    conn.release();
  }
}

export async function getRandomTemplateByCategory(category: 'humor' | 'mental_state' | 'emotion_redirect'): Promise<{ id: number; system_prompt: string; user_prompt: string } | null> {
  const conn = await getConnection();
  try {
    const rows = await conn.query(`SELECT id, system_prompt, user_prompt FROM prompt_templates WHERE category = ? AND active = TRUE ORDER BY RAND() LIMIT 1`, [category]) as any[];
    return rows.length > 0 ? rows[0] : null;
  } finally {
    conn.release();
  }
}

export async function getWatcherStats(): Promise<{ totalFingerprints: number; totalDetections: number; totalInterventions: number; successfulInterventions: number; successRate: number }> {
  const conn = await getConnection();
  try {
    const fpCount = await conn.query(`SELECT COUNT(*) as cnt FROM message_fingerprints`) as any[];
    const ddCount = await conn.query(`SELECT COUNT(*) as cnt FROM duplicate_detections`) as any[];
    const wiCount = await conn.query(`SELECT COUNT(*) as cnt FROM watcher_interventions`) as any[];
    const wiSuccess = await conn.query(`SELECT COUNT(*) as cnt FROM watcher_interventions WHERE applied_successfully = TRUE`) as any[];
    const total = wiCount[0]?.cnt || 0;
    const success = wiSuccess[0]?.cnt || 0;
    return { totalFingerprints: fpCount[0]?.cnt || 0, totalDetections: ddCount[0]?.cnt || 0, totalInterventions: total, successfulInterventions: success, successRate: total > 0 ? success / total : 0 };
  } finally {
    conn.release();
  }
}

export async function getRecentInterventions(limit: number = 20): Promise<any[]> {
  const conn = await getConnection();
  try {
    const rows = await conn.query(`SELECT wi.*, pt.name as template_name, pt.category FROM watcher_interventions wi LEFT JOIN prompt_templates pt ON wi.template_id = pt.id ORDER BY wi.created_at DESC LIMIT ?`, [limit]) as any[];
    return rows;
  } finally {
    conn.release();
  }
}
