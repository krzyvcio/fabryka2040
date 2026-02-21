// traumaEngine.ts – Trauma Memory System for NEUROFORGE-7
// Implements trauma accumulation, flashback triggers, and impact on personality

import { getDatabase } from "./db.js";
import * as mariadb from "mariadb";
import { getPersonality } from "./personalityEngine.js";

export interface TraumaState {
  traumaLoad: number;
  helplessness: number;
}

export interface TraumaEvent {
  id: string;
  agentId: string;
  description: string;
  severity: number;
  timestamp: Date;
  embedding?: number[];
}

const TRAUMA_TRIGGER_THRESHOLD = { stress: 0.8, helplessness: 0.6 };
const FLASHBACK_SIMILARITY_THRESHOLD = 0.8;

export async function initializeTraumaState(agentId: string): Promise<void> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    await conn.query(
      `INSERT IGNORE INTO trauma_state (agent_id, trauma_load, helplessness) VALUES (?, 0.0, 0.0)`,
      [agentId]
    );
  } finally {
    if (conn) conn.release();
  }
}

export async function getTraumaState(agentId: string): Promise<TraumaState> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT * FROM trauma_state WHERE agent_id = ?`,
      [agentId]
    );

    if (rows.length === 0) {
      await initializeTraumaState(agentId);
      return { traumaLoad: 0.0, helplessness: 0.0 };
    }

    const row = rows[0] as any;
    return {
      traumaLoad: row.trauma_load,
      helplessness: row.helplessness,
    };
  } finally {
    if (conn) conn.release();
  }
}

export async function updateTrauma(
  agentId: string,
  stress: number,
  helplessness: number,
  severity: number
): Promise<TraumaState> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    
    const shouldRecordEvent = stress > TRAUMA_TRIGGER_THRESHOLD.stress && 
                              helplessness > TRAUMA_TRIGGER_THRESHOLD.helplessness;

    if (shouldRecordEvent) {
      const eventId = `${agentId}_${Date.now()}`;
      const description = `Traumatic event: stress=${stress.toFixed(2)}, helplessness=${helplessness.toFixed(2)}`;
      
      await conn.query(
        `INSERT INTO trauma_events (id, agent_id, description, severity) VALUES (?, ?, ?, ?)`,
        [eventId, agentId, description, severity]
      );

      await conn.query(
        `UPDATE trauma_state SET 
          trauma_load = LEAST(10.0, trauma_load + ?),
          helplessness = LEAST(1.0, helplessness + ?),
          ts = CURRENT_TIMESTAMP
         WHERE agent_id = ?`,
        [severity * 0.5, helplessness * 0.3, agentId]
      );
    } else {
      await conn.query(
        `UPDATE trauma_state SET 
          helplessness = LEAST(1.0, GREATEST(0.0, helplessness - 0.05)),
          ts = CURRENT_TIMESTAMP
         WHERE agent_id = ?`,
        [agentId]
      );
    }

    return getTraumaState(agentId);
  } finally {
    if (conn) conn.release();
  }
}

export async function triggerTraumaFlashback(
  agentId: string,
  eventSimilarity: number
): Promise<{ triggered: boolean; stressDelta: number; angerDelta: number }> {
  if (eventSimilarity < FLASHBACK_SIMILARITY_THRESHOLD) {
    return { triggered: false, stressDelta: 0, angerDelta: 0 };
  }

  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    
    const rows = await conn.query(
      `SELECT severity FROM trauma_events WHERE agent_id = ? ORDER BY created_at DESC LIMIT 1`,
      [agentId]
    );

    if (rows.length > 0) {
      const severity = (rows[0] as any).severity;
      const stressDelta = 0.4 * severity;
      const angerDelta = 0.3 * severity;

      await conn.query(
        `UPDATE trauma_state SET 
          trauma_load = LEAST(10.0, trauma_load + ?),
          helplessness = LEAST(1.0, helplessness + ?),
          ts = CURRENT_TIMESTAMP
         WHERE agent_id = ?`,
        [severity * 0.2, severity * 0.1, agentId]
      );

      return { triggered: true, stressDelta, angerDelta };
    }

    return { triggered: false, stressDelta: 0, angerDelta: 0 };
  } finally {
    if (conn) conn.release();
  }
}

export async function getActiveTraumas(agentId: string): Promise<TraumaEvent[]> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT * FROM trauma_events WHERE agent_id = ? ORDER BY created_at DESC LIMIT 10`,
      [agentId]
    );

    return (rows as any[]).map(row => ({
      id: row.id,
      agentId: row.agent_id,
      description: row.description,
      severity: row.severity,
      timestamp: row.created_at,
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
    }));
  } finally {
    if (conn) conn.release();
  }
}

export async function calculateResilience(agentId: string): Promise<number> {
  const personality = await getPersonality(agentId);
  const trauma = await getTraumaState(agentId);
  
  const baseResilience = 0.5;
  const personalityFactor = (1 - personality.neuroticism) * 0.3;
  const traumaFactor = Math.max(0, 1 - trauma.traumaLoad / 10) * 0.4;
  
  return Math.min(1, baseResilience + personalityFactor + traumaFactor);
}

export async function getAllTraumaStates(): Promise<Record<string, TraumaState>> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`SELECT * FROM trauma_state`);
    
    const result: Record<string, TraumaState> = {};
    for (const row of rows as any[]) {
      result[row.agent_id] = {
        traumaLoad: row.trauma_load,
        helplessness: row.helplessness,
      };
    }
    return result;
  } finally {
    if (conn) conn.release();
  }
}
