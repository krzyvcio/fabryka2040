// emotionEngine.ts – Emotion and relation management
import OpenAI from "openai";
import { getDatabase } from "./db.js";
import * as mariadb from "mariadb";

const LMSTUDIO_URL = "http://localhost:1234/v1";
const REASONER_MODEL = "qed-nano";

console.log(`Connecting to LM Studio at: ${LMSTUDIO_URL} with model: ${REASONER_MODEL}`);
const openai = new OpenAI({ baseURL: LMSTUDIO_URL, apiKey: "lm-studio" });
console.log("LM Studio OpenAI client configured.");

export type Emotion = "neutral" | "angry" | "frustrated" | "proud" | "fearful" | "hopeful" | "skeptical";

export interface EmotionalState {
  emotion: Emotion;
  intensity: number;
  valence: number; // -1 (negative) to 1 (positive)
  arousal: number; // 0 (low) to 1 (high)
  stress: number; // 0 to 1
  mood_valence: number;
  mood_arousal: number;
}

export interface Relation {
  anger: number;
  trust: number;
  respect: number;
  rapport: number;
  goal_alignment: number;
}

export async function initializeAgent(agentId: string) {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();

    await conn.query(`
    INSERT IGNORE INTO agents_emotion (agent_id, emotion, intensity, valence, arousal)
    VALUES (?, 'neutral', 0.5, 0.0, 0.0)
  `, [agentId]);

    // Initialize relations with all other agents
    const agents = [
      "CEO_Maja",
      "Architekt_AI_Adam",
      "Architekt_Elektrociała_Lena",
      "SYNAPSA_Omega",
      "Robot_Artemis",
      "Robot_Boreasz",
      "Robot_Cyra",
      "Robot_Dexter",
      "Operator_Michal",
      "Inzynier_Nadia",
      "Inzynier_Igor",
    ];

    for (const other of agents) {
      if (other !== agentId) {
        await conn.query(`
        INSERT IGNORE INTO agent_relations (agent_id, target_id, anger, trust, respect, rapport, goal_alignment)
        VALUES (?, ?, 0.0, 0.5, 0.5, 0.0, 0.5)
      `, [agentId, other]);
      }
    }
  } finally {
    if (conn) conn.release();
  }
}

export async function getEmotionalState(agentId: string): Promise<EmotionalState> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT * FROM agents_emotion WHERE agent_id = ?`,
      [agentId]
    );

    if (rows.length === 0) {
      await initializeAgent(agentId);
      return {
        emotion: "neutral",
        intensity: 0.5,
        valence: 0.0,
        arousal: 0.0,
        stress: 0.0,
        mood_valence: 0.0,
        mood_arousal: 0.0,
      };
    }

    const row = rows[0] as any;
    return {
      emotion: row.emotion || "neutral",
      intensity: row.intensity || 0.5,
      valence: row.valence || 0.0,
      arousal: row.arousal || 0.0,
      stress: row.stress || 0.0,
      mood_valence: row.mood_valence || 0.0,
      mood_arousal: row.mood_arousal || 0.0,
    };
  } finally {
    if (conn) conn.release();
  }
}

export async function getRelation(agentId: string, targetId: string): Promise<Relation> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT * FROM agent_relations WHERE agent_id = ? AND target_id = ?`,
      [agentId, targetId]
    );

    if (rows.length === 0) {
      return { anger: 0.0, trust: 0.5, respect: 0.5, rapport: 0.0, goal_alignment: 0.5 };
    }

    return rows[0] as any;
  } finally {
    if (conn) conn.release();
  }
}

export async function updateEmotionalState(agentId: string, state: Partial<EmotionalState>) {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const updates = Object.entries(state)
      .map(([k]) => `${k} = ?`)
      .join(", ");
    const values = [...Object.values(state), agentId];

    await conn.query(
      `UPDATE agents_emotion SET ${updates}, last_update = CURRENT_TIMESTAMP WHERE agent_id = ?`,
      values
    );
  } finally {
    if (conn) conn.release();
  }
}

export async function updateRelation(
  agentId: string,
  targetId: string,
  relation: Partial<Relation>
) {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const updates = Object.entries(relation)
      .map(([k]) => `${k} = ${k} + ?`)
      .join(", ");
    const values = [...Object.values(relation), agentId, targetId];

    await conn.query(
      `UPDATE agent_relations SET ${updates} WHERE agent_id = ? AND target_id = ?`,
      values
    );
  } finally {
    if (conn) conn.release();
  }
}

export async function analyzeReplyEmotion(agentId: string, text: string): Promise<Partial<EmotionalState>> {
  try {
    const res = await openai.chat.completions.create({
      model: REASONER_MODEL,
      messages: [
        { role: "system", content: "Jesteś analizatorem emocji. Na podstawie tekstu odpowiedzi oceń (w JSON): emotion (neutral/angry/frustrated/proud/fearful/hopeful/skeptical), intensity (0-1), valence (-1 to 1), arousal (0-1), stress (0-1). Odpowiadaj TYLKO JSON bez komentarzy." },
        { role: "user", content: `Tekst: "${text}"\n\nEmocje w JSON:` }
      ],
      temperature: 0.3,
      max_tokens: 256,
    });

    const jsonMatch = res.choices[0]?.message?.content?.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        emotion: parsed.emotion || "neutral",
        intensity: Math.min(Math.max(parsed.intensity || 0.5, 0), 1),
        valence: Math.min(Math.max(parsed.valence || 0, -1), 1),
        arousal: Math.min(Math.max(parsed.arousal || 0, 0), 1),
        stress: Math.min(Math.max(parsed.stress || 0, 0), 1),
      };
    }
  } catch (err) {
    console.warn("Błąd analizy emocji:", err);
  }

  return { emotion: "neutral", intensity: 0.5 };
}

export async function applyEmotionalDecay(daysPassed: number = 1) {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();

    // Decay emotion intensity
    await conn.query(
      `UPDATE agents_emotion SET intensity = intensity * POWER(0.85, ?), stress = stress * POWER(0.90, ?)`,
      [daysPassed, daysPassed]
    );

    // Decay grudges
    await conn.query(
      `UPDATE emotional_grudges SET intensity = intensity * POWER(0.97, ?)`,
      [daysPassed]
    );
  } finally {
    if (conn) conn.release();
  }
}

export async function getUnresolvedGrudges(agentId: string): Promise<Array<{ target_id: string; reason: string; intensity: number }>> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT target_id, reason, intensity FROM emotional_grudges WHERE agent_id = ? ORDER BY intensity DESC LIMIT 3`,
      [agentId]
    );
    return rows as any;
  } finally {
    if (conn) conn.release();
  }
}

export async function recordGrudge(agentId: string, targetId: string, reason: string, intensity: number = 1.0) {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    await conn.query(
      `INSERT INTO emotional_grudges (agent_id, target_id, reason, intensity) VALUES (?, ?, ?, ?)`,
      [agentId, targetId, reason, intensity]
    );
  } finally {
    if (conn) conn.release();
  }
}

export async function calculateGroupAffect(): Promise<{ avg_valence: number; avg_stress: number }> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`
      SELECT AVG(valence) as avg_valence, AVG(stress) as avg_stress
      FROM agents_emotion
    `);

    return (rows[0] as any) || { avg_valence: 0.0, avg_stress: 0.0 };
  } finally {
    if (conn) conn.release();
  }
}

export async function recordEmotionHistory(): Promise<void> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const agents = await conn.query(`SELECT agent_id, valence, arousal, stress, mood_valence, mood_arousal FROM agents_emotion`);

    for (const agent of (agents as any[])) {
      await conn.query(
        `INSERT INTO emotion_history (agent_id, valence, arousal, stress, mood_valence, mood_arousal) VALUES (?, ?, ?, ?, ?, ?)`,
        [agent.agent_id, agent.valence, agent.arousal, agent.stress, agent.mood_valence, agent.mood_arousal]
      );
    }

    await conn.query(`
      DELETE FROM emotion_history 
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id FROM emotion_history 
          ORDER BY ts DESC 
          LIMIT 5000
        ) AS keep
      )
    `);
  } finally {
    if (conn) conn.release();
  }
}

export async function getAllAgentsEmotion(): Promise<Array<{
  agent_id: string;
  emotion: string;
  intensity: number;
  valence: number;
  arousal: number;
  stress: number;
}>> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`SELECT agent_id, emotion, intensity, valence, arousal, stress FROM agents_emotion`);
    return (rows as any[]).map(row => ({
      agent_id: row.agent_id,
      emotion: row.emotion,
      intensity: row.intensity,
      valence: row.valence,
      arousal: row.arousal,
      stress: row.stress,
    }));
  } finally {
    if (conn) conn.release();
  }
}

export async function getEmotionHistory(agentId: string, limit: number = 50): Promise<Array<{
  agent_id: string;
  valence: number;
  arousal: number;
  stress: number;
  ts: Date;
}>> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT agent_id, valence, arousal, stress, ts FROM emotion_history WHERE agent_id = ? ORDER BY ts DESC LIMIT ?`,
      [agentId, limit]
    );
    return (rows as any[]).map(row => ({
      agent_id: row.agent_id,
      valence: row.valence,
      arousal: row.arousal,
      stress: row.stress,
      ts: row.ts,
    }));
  } finally {
    if (conn) conn.release();
  }
}

export async function getAllEmotionHistory(limit: number = 50): Promise<Array<{
  agent_id: string;
  valence: number;
  arousal: number;
  stress: number;
  ts: Date;
}>> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT agent_id, valence, arousal, stress, ts FROM emotion_history ORDER BY ts DESC LIMIT ?`,
      [limit]
    );
    return (rows as any[]).map(row => ({
      agent_id: row.agent_id,
      valence: row.valence,
      arousal: row.arousal,
      stress: row.stress,
      ts: row.ts,
    }));
  } finally {
    if (conn) conn.release();
  }
}
