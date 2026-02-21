// emotionalContagion.ts – Emotional Contagion System for NEUROFORGE-7
// Implements emotion spreading between agents based on trust and fear

import { getDatabase } from "./db.js";
import * as mariadb from "mariadb";
import { getEmotionalState } from "./emotionEngine.js";

export interface EmotionDelta {
  valence: number;
  arousal: number;
  stress: number;
}

const CONTAGION_STRENGTH = {
  HUMAN: 0.6,
  ROBOT: 0.3,
  SYNAPSA: 0.8,
};

const AGENT_TYPES: Record<string, "human" | "robot" | "synapsa"> = {
  CEO_Maja: "human",
  Architekt_AI_Adam: "human",
  Architekt_Elektrociała_Lena: "human",
  SYNAPSA_Omega: "synapsa",
  Robot_Artemis: "robot",
  Robot_Boreasz: "robot",
  Robot_Cyra: "robot",
  Robot_Dexter: "robot",
  Operator_Michal: "human",
  Inzynier_Nadia: "human",
  Inzynier_Igor: "human",
};

function getContagionStrength(agentId: string): number {
  const type = AGENT_TYPES[agentId] || "human";
  return CONTAGION_STRENGTH[type.toUpperCase() as keyof typeof CONTAGION_STRENGTH] || 0.6;
}

export async function calculateInfluence(
  agentId: string,
  targetId: string
): Promise<number> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT trust, fear FROM agent_relations WHERE agent_id = ? AND target_id = ?`,
      [agentId, targetId]
    );

    if (rows.length === 0) return 0;

    const row = rows[0] as any;
    return (row.trust || 0.5) - (row.fear || 0);
  } finally {
    if (conn) conn.release();
  }
}

export async function propagateEmotions(
  sourceAgentId: string,
  intensity: number
): Promise<Record<string, EmotionDelta>> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    
    const sourceEmotion = await getEmotionalState(sourceAgentId);
    const sourceStrength = getContagionStrength(sourceAgentId);
    
    const rows = await conn.query(
      `SELECT agent_id FROM agents_emotion WHERE agent_id != ?`,
      [sourceAgentId]
    );

    const deltas: Record<string, EmotionDelta> = {};

    for (const row of rows as any[]) {
      const targetId = row.agent_id;
      const influence = await calculateInfluence(sourceAgentId, targetId);
      
      if (influence > -0.5) {
        const targetStrength = getContagionStrength(targetId);
        const contagion = sourceStrength * targetStrength * intensity * influence;
        
        const valenceDelta = sourceEmotion.valence * contagion * 0.5;
        const arousalDelta = sourceEmotion.arousal * contagion * 0.3;
        const stressDelta = sourceEmotion.stress * contagion * 0.2;

        if (Math.abs(valenceDelta) > 0.01 || Math.abs(arousalDelta) > 0.01) {
          await conn.query(
            `UPDATE agents_emotion SET 
              valence = LEAST(1.0, GREATEST(-1.0, valence + ?)),
              arousal = LEAST(1.0, GREATEST(0.0, arousal + ?)),
              stress = LEAST(1.0, GREATEST(0.0, stress + ?)),
              last_update = CURRENT_TIMESTAMP
             WHERE agent_id = ?`,
            [valenceDelta, arousalDelta, stressDelta, targetId]
          );
          
          deltas[targetId] = {
            valence: valenceDelta,
            arousal: arousalDelta,
            stress: stressDelta,
          };
        }
      }
    }

    return deltas;
  } finally {
    if (conn) conn.release();
  }
}

export async function applyContagionEffect(
  agentId: string,
  emotionDelta: EmotionDelta
): Promise<void> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    await conn.query(
      `UPDATE agents_emotion SET 
        valence = LEAST(1.0, GREATEST(-1.0, valence + ?)),
        arousal = LEAST(1.0, GREATEST(0.0, arousal + ?)),
        stress = LEAST(1.0, GREATEST(0.0, stress + ?)),
        last_update = CURRENT_TIMESTAMP
       WHERE agent_id = ?`,
      [emotionDelta.valence, emotionDelta.arousal, emotionDelta.stress, agentId]
    );
  } finally {
    if (conn) conn.release();
  }
}

export async function getContagionNetwork(): Promise<{
  nodes: Array<{ id: string; type: string; emotion: string }>;
  edges: Array<{ source: string; target: string; influence: number }>;
}> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    
    const agents = await conn.query(`SELECT agent_id, emotion FROM agents_emotion`);
    const relations = await conn.query(`SELECT agent_id, target_id, trust FROM agent_relations`);
    
    const nodes = (agents as any[]).map(row => ({
      id: row.agent_id,
      type: AGENT_TYPES[row.agent_id] || "human",
      emotion: row.emotion,
    }));
    
    const edges = (relations as any[])
      .filter(r => r.trust > 0.3)
      .map(r => ({
        source: r.agent_id,
        target: r.target_id,
        influence: r.trust,
      }));
    
    return { nodes, edges };
  } finally {
    if (conn) conn.release();
  }
}

export async function calculateGroupEmotionalSync(): Promise<number> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    
    const rows = await conn.query(`SELECT valence, arousal FROM agents_emotion`);
    if (rows.length < 2) return 1;

    const values = (rows as any[]).map(r => ({ valence: r.valence, arousal: r.arousal }));
    
    const avgValence = values.reduce((sum, v) => sum + v.valence, 0) / values.length;
    const avgArousal = values.reduce((sum, v) => sum + v.arousal, 0) / values.length;
    
    let varianceSum = 0;
    for (const v of values) {
      varianceSum += Math.pow(v.valence - avgValence, 2) + Math.pow(v.arousal - avgArousal, 2);
    }
    
    const avgVariance = varianceSum / values.length;
    return Math.max(0, 1 - avgVariance);
  } finally {
    if (conn) conn.release();
  }
}
