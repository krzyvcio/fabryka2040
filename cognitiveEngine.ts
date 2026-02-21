// cognitiveEngine.ts – Cognitive Fatigue System for NEUROFORGE-7
// Implements decision fatigue with regeneration and low-energy effects

import { getDatabase } from "./db.js";
import * as mariadb from "mariadb";

export interface CognitiveState {
  energy: number;
  decisionCount: number;
  lastRestTime: Date | null;
}

export interface CognitiveEffects {
  responseLengthMod: number;
  impulsivity: number;
  isCognitiveErrorMode: boolean;
  recommendation: string;
}

const ENERGY_THRESHOLDS = {
  LOW: 0.3,
  CRITICAL: 0.15,
};

export async function initializeCognitiveState(agentId: string): Promise<void> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    await conn.query(
      `INSERT IGNORE INTO cognitive_state (agent_id, energy, decision_count, last_rest_time) VALUES (?, 1.0, 0, NULL)`,
      [agentId]
    );
  } finally {
    if (conn) conn.release();
  }
}

export async function getCognitiveState(agentId: string): Promise<CognitiveState> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT * FROM cognitive_state WHERE agent_id = ?`,
      [agentId]
    );

    if (rows.length === 0) {
      await initializeCognitiveState(agentId);
      return { energy: 1.0, decisionCount: 0, lastRestTime: null };
    }

    const row = rows[0] as any;
    return {
      energy: row.energy,
      decisionCount: row.decision_count,
      lastRestTime: row.last_rest_time,
    };
  } finally {
    if (conn) conn.release();
  }
}

export async function updateCognitiveEnergy(
  agentId: string,
  complexity: number,
  conflict: number,
  resting: boolean
): Promise<CognitiveState> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    
    const currentState = await getCognitiveState(agentId);
    const dt = 0.1;
    
    let drain = 0.1 * complexity + 0.15 * conflict;
    let regeneration = 0;
    
    if (resting) {
      regeneration = 0.05;
    } else {
      const timeSinceRest = currentState.lastRestTime 
        ? (Date.now() - new Date(currentState.lastRestTime).getTime()) / 60000 
        : 999;
      if (timeSinceRest > 30) {
        regeneration = 0.02;
      }
    }
    
    const newEnergy = Math.max(0, Math.min(1, currentState.energy - drain * dt + regeneration));
    const newDecisionCount = resting ? 0 : currentState.decisionCount + 1;
    const newLastRestTime = resting ? new Date() : currentState.lastRestTime;

    await conn.query(
      `UPDATE cognitive_state SET 
        energy = ?,
        decision_count = ?,
        last_rest_time = ?,
        ts = CURRENT_TIMESTAMP
       WHERE agent_id = ?`,
      [newEnergy, newDecisionCount, newLastRestTime, agentId]
    );

    return { energy: newEnergy, decisionCount: newDecisionCount, lastRestTime: newLastRestTime };
  } finally {
    if (conn) conn.release();
  }
}

export function getCognitiveEffects(energy: number): CognitiveEffects {
  if (energy < ENERGY_THRESHOLDS.CRITICAL) {
    return {
      responseLengthMod: 0.3,
      impulsivity: 0.9,
      isCognitiveErrorMode: true,
      recommendation: "CRITICAL: Agent requires immediate rest - high error probability",
    };
  }
  
  if (energy < ENERGY_THRESHOLDS.LOW) {
    return {
      responseLengthMod: 0.5,
      impulsivity: 0.6,
      isCognitiveErrorMode: false,
      recommendation: "LOW ENERGY: Consider scheduling rest period",
    };
  }
  
  const normalMod = 0.7 + (energy - ENERGY_THRESHOLDS.LOW) / (1 - ENERGY_THRESHOLDS.LOW) * 0.3;
  return {
    responseLengthMod: normalMod,
    impulsivity: 0.1,
    isCognitiveErrorMode: false,
    recommendation: "NORMAL: Agent operating at optimal capacity",
  };
}

export async function forceRest(agentId: string): Promise<CognitiveState> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    
    await conn.query(
      `UPDATE cognitive_state SET 
        energy = LEAST(1.0, energy + 0.3),
        decision_count = 0,
        last_rest_time = CURRENT_TIMESTAMP,
        ts = CURRENT_TIMESTAMP
       WHERE agent_id = ?`,
      [agentId]
    );

    return getCognitiveState(agentId);
  } finally {
    if (conn) conn.release();
  }
}

export async function getAllCognitiveStates(): Promise<Record<string, CognitiveState>> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`SELECT * FROM cognitive_state`);
    
    const result: Record<string, CognitiveState> = {};
    for (const row of rows as any[]) {
      result[row.agent_id] = {
        energy: row.energy,
        decisionCount: row.decision_count,
        lastRestTime: row.last_rest_time,
      };
    }
    return result;
  } finally {
    if (conn) conn.release();
  }
}

export async function getAgentsNeedingRest(energyThreshold: number = 0.3): Promise<string[]> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT agent_id FROM cognitive_state WHERE energy < ?`,
      [energyThreshold]
    );
    
    return (rows as any[]).map(row => row.agent_id);
  } finally {
    if (conn) conn.release();
  }
}
