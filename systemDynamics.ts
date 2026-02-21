// systemDynamics.ts – Global System State for NEUROFORGE-7
// Implements macro-level dynamics with differential equations

import { getDatabase } from "./db.js";
import * as mariadb from "mariadb";
import { calculateGroupAffect } from "./emotionEngine.js";
import { getAllConflicts } from "./conflictEngine.js";

export interface SystemState {
  globalTrust: number;
  globalStress: number;
  polarization: number;
  entropy: number;
  capital: number;
  innovation: number;
  reputation: number;
}

const DEFAULT_SYSTEM_STATE: SystemState = {
  globalTrust: 0.7,
  globalStress: 0.3,
  polarization: 0.2,
  entropy: 0.3,
  capital: 0.8,
  innovation: 0.5,
  reputation: 0.7,
};

export async function initializeSystemState(): Promise<void> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    await conn.query(`INSERT IGNORE INTO system_state (id) VALUES (1)`);
  } finally {
    if (conn) conn.release();
  }
}

export async function computeSystemState(): Promise<SystemState> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`SELECT * FROM system_state WHERE id = 1`);

    if (rows.length === 0) {
      await initializeSystemState();
      return DEFAULT_SYSTEM_STATE;
    }

    const row = rows[0] as any;
    return {
      globalTrust: row.global_trust,
      globalStress: row.global_stress,
      polarization: row.polarization,
      entropy: row.entropy,
      capital: row.capital,
      innovation: row.innovation,
      reputation: row.reputation,
    };
  } finally {
    if (conn) conn.release();
  }
}

export async function updateSystemMetrics(): Promise<SystemState> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    
    const groupAffect = await calculateGroupAffect();
    const avgStress = groupAffect.avg_stress;
    const avgValence = groupAffect.avg_valence;
    
    const conflicts = await getAllConflicts();
    let totalConflict = 0;
    let count = 0;
    for (const agent in conflicts) {
      for (const target in conflicts[agent]) {
        totalConflict += conflicts[agent][target].level;
        count++;
      }
    }
    const avgConflict = count > 0 ? totalConflict / count : 0;
    
    const valenceVariance = Math.abs(avgValence);
    
    const alpha = 0.15;
    const beta = 0.1;
    const dt = 0.1;
    
    let current = await computeSystemState();
    
    const dTrust = -alpha * current.entropy - beta * avgStress;
    const dEntropy = 0.3 * valenceVariance + 0.3 * (1 - current.globalTrust) + 0.2 * avgStress + 0.2 * current.polarization;
    const dPolarization = avgConflict - 0.5 * current.globalTrust;
    const dCapital = 0.05 * (1 - avgStress) - 0.02 * current.polarization;
    const dInnovation = 0.03 * current.globalTrust - 0.01 * avgStress;
    const dReputation = 0.02 * current.globalTrust - 0.03 * avgConflict;
    
    const newTrust = Math.max(0, Math.min(1, current.globalTrust + dTrust * dt));
    const newStress = Math.max(0, Math.min(1, avgStress));
    const newPolarization = Math.max(0, Math.min(1, current.polarization + dPolarization * dt));
    const newEntropy = Math.max(0, Math.min(1, current.entropy + dEntropy * dt));
    const newCapital = Math.max(0, Math.min(1, current.capital + dCapital * dt));
    const newInnovation = Math.max(0, Math.min(1, current.innovation + dInnovation * dt));
    const newReputation = Math.max(0, Math.min(1, current.reputation + dReputation * dt));

    await conn.query(
      `UPDATE system_state SET 
        global_trust = ?,
        global_stress = ?,
        polarization = ?,
        entropy = ?,
        capital = ?,
        innovation = ?,
        reputation = ?,
        ts = CURRENT_TIMESTAMP
       WHERE id = 1`,
      [newTrust, newStress, newPolarization, newEntropy, newCapital, newInnovation, newReputation]
    );

    await recordSystemStateHistory({
      globalTrust: newTrust,
      globalStress: newStress,
      polarization: newPolarization,
      entropy: newEntropy,
      capital: newCapital,
      innovation: newInnovation,
      reputation: newReputation,
    });

    return {
      globalTrust: newTrust,
      globalStress: newStress,
      polarization: newPolarization,
      entropy: newEntropy,
      capital: newCapital,
      innovation: newInnovation,
      reputation: newReputation,
    };
  } finally {
    if (conn) conn.release();
  }
}

export async function computeEntropy(agents: Array<{ valence: number; stress: number }>): Promise<number> {
  if (agents.length === 0) return 0;
  
  const avgValence = agents.reduce((s, a) => s + a.valence, 0) / agents.length;
  const avgStress = agents.reduce((s, a) => s + a.stress, 0) / agents.length;
  
  let valenceVariance = 0;
  let stressVariance = 0;
  for (const a of agents) {
    valenceVariance += Math.pow(a.valence - avgValence, 2);
    stressVariance += Math.pow(a.stress - avgStress, 2);
  }
  valenceVariance /= agents.length;
  stressVariance /= agents.length;
  
  return Math.min(1, (valenceVariance + stressVariance) / 2);
}

export async function checkCatastropheCondition(system: SystemState): Promise<boolean> {
  return (
    system.globalTrust < 0.2 &&
    system.polarization > 0.8 &&
    system.globalStress > 0.8
  );
}

export async function getSystemStateHistory(limit: number = 100): Promise<SystemState[]> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT * FROM system_state ORDER BY ts DESC LIMIT ?`,
      [limit]
    );

    return (rows as any[]).map(row => ({
      globalTrust: row.global_trust,
      globalStress: row.global_stress,
      polarization: row.polarization,
      entropy: row.entropy,
      capital: row.capital,
      innovation: row.innovation,
      reputation: row.reputation,
    }));
  } finally {
    if (conn) conn.release();
  }
}

export async function recordSystemStateHistory(state: SystemState): Promise<void> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    await conn.query(
      `INSERT INTO system_state_history (global_trust, global_stress, polarization, entropy, capital, innovation, reputation) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [state.globalTrust, state.globalStress, state.polarization, state.entropy, state.capital, state.innovation, state.reputation]
    );

    await conn.query(`
      DELETE FROM system_state_history 
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id FROM system_state_history 
          ORDER BY ts DESC 
          LIMIT 1000
        ) AS keep
      )
    `);
  } finally {
    if (conn) conn.release();
  }
}

export async function getSystemStateHistoryFromArchive(limit: number = 100): Promise<SystemState[]> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT * FROM system_state_history ORDER BY ts DESC LIMIT ?`,
      [limit]
    );

    return (rows as any[]).map(row => ({
      globalTrust: row.global_trust,
      globalStress: row.global_stress,
      polarization: row.polarization,
      entropy: row.entropy,
      capital: row.capital,
      innovation: row.innovation,
      reputation: row.reputation,
    }));
  } finally {
    if (conn) conn.release();
  }
}
