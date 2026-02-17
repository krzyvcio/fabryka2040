// emotionEngine.ts – Emotion and relation management
import { generateText } from "npm:ai@latest";
import { createOpenAI } from "npm:@ai-sdk/openai@latest";
import { getConnection } from "./db.ts";

const LMSTUDIO_URL = "http://localhost:1234/v1";
const openai = createOpenAI({
  baseURL: LMSTUDIO_URL,
  apiKey: "lm-studio",
  timeout: 10000, // 10s timeout dla modelu qwen2.5-7b-instruct
});

const REASONER_MODEL = "qwen2.5-7b-instruct";

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
  const conn = getConnection();
  
  await conn.run(`
    INSERT OR IGNORE INTO agents_emotion (agent_id, emotion, intensity, valence, arousal)
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
      await conn.run(`
        INSERT OR IGNORE INTO agent_relations (agent_id, target_id, anger, trust, respect, rapport, goal_alignment)
        VALUES (?, ?, 0.0, 0.5, 0.5, 0.0, 0.5)
      `, [agentId, other]);
    }
  }
}

export async function getEmotionalState(agentId: string): Promise<EmotionalState> {
  const conn = getConnection();
  const result = await conn.run(
    `SELECT * FROM agents_emotion WHERE agent_id = ?`,
    [agentId]
  );
  const rows = await result.getRowObjects();

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
}

export async function getRelation(agentId: string, targetId: string): Promise<Relation> {
  const conn = getConnection();
  const result = await conn.run(
    `SELECT * FROM agent_relations WHERE agent_id = ? AND target_id = ?`,
    [agentId, targetId]
  );
  const rows = await result.getRowObjects();

  if (rows.length === 0) {
    return { anger: 0.0, trust: 0.5, respect: 0.5, rapport: 0.0, goal_alignment: 0.5 };
  }

  return rows[0] as any;
}

export async function updateEmotionalState(agentId: string, state: Partial<EmotionalState>) {
  const conn = getConnection();
  const updates = Object.entries(state)
    .map(([k]) => `${k} = ?`)
    .join(", ");
  const values = [...Object.values(state), agentId];

  await conn.run(
    `UPDATE agents_emotion SET ${updates}, last_update = CURRENT_TIMESTAMP WHERE agent_id = ?`,
    values
  );
}

export async function updateRelation(
  agentId: string,
  targetId: string,
  relation: Partial<Relation>
) {
  const conn = getConnection();
  const updates = Object.entries(relation)
    .map(([k]) => `${k} = ${k} + ?`)
    .join(", ");
  const values = [...Object.values(relation), agentId, targetId];

  await conn.run(
    `UPDATE agent_relations SET ${updates} WHERE agent_id = ? AND target_id = ?`,
    values
  );
}

export async function analyzeReplyEmotion(agentId: string, text: string): Promise<Partial<EmotionalState>> {
  try {
    const res = await generateText({
      model: openai(REASONER_MODEL),
      system:
        "Jesteś analizatorem emocji. Na podstawie tekstu odpowiedzi oceń (w JSON): emotion (neutral/angry/frustrated/proud/fearful/hopeful/skeptical), intensity (0-1), valence (-1 to 1), arousal (0-1), stress (0-1). Odpowiadaj TYLKO JSON bez komentarzy.",
      prompt: `Tekst: "${text}"\n\nEmocje w JSON:`,
      temperature: 0.3,
      maxTokens: 256,
    });

    const jsonMatch = res.text.match(/\{[\s\S]*\}/);
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
  const conn = getConnection();
  
  // Decay emotion intensity
  await conn.run(
    `UPDATE agents_emotion SET intensity = intensity * POWER(0.85, ?), stress = stress * POWER(0.90, ?)`,
    [daysPassed, daysPassed]
  );

  // Decay grudges
  await conn.run(
    `UPDATE emotional_grudges SET intensity = intensity * POWER(0.97, ?)`,
    [daysPassed]
  );
}

export async function getUnresolvedGrudges(agentId: string): Promise<Array<{ target_id: string; reason: string; intensity: number }>> {
  const conn = getConnection();
  const result = await conn.run(
    `SELECT target_id, reason, intensity FROM emotional_grudges WHERE agent_id = ? ORDER BY intensity DESC LIMIT 3`,
    [agentId]
  );
  const rows = await result.getRowObjects();
  return rows as any;
}

export async function recordGrudge(agentId: string, targetId: string, reason: string, intensity: number = 1.0) {
  const conn = getConnection();
  await conn.run(
    `INSERT INTO emotional_grudges (agent_id, target_id, reason, intensity) VALUES (?, ?, ?, ?)`,
    [agentId, targetId, reason, intensity]
  );
}

export async function calculateGroupAffect(): Promise<{ avg_valence: number; avg_stress: number }> {
  const conn = getConnection();
  const result = await conn.run(`
    SELECT AVG(valence) as avg_valence, AVG(stress) as avg_stress
    FROM agents_emotion
  `);
  const rows = await result.getRowObjects();
  
  return (rows[0] as any) || { avg_valence: 0.0, avg_stress: 0.0 };
}
