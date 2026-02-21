// conflictEngine.ts – Conflict Escalation Spiral System for NEUROFORGE-7
// Implements conflict dynamics between agents with phase transitions and faction formation

import { getDatabase } from "./db.js";
import * as mariadb from "mariadb";

export type ConflictPhase = "latent" | "active" | "critical" | "explosive";

export interface ConflictState {
  level: number;
  phase: ConflictPhase;
  escalationMultiplier: number;
  pointOfNoReturn: boolean;
}

export interface Faction {
  name: string;
  members: string[];
  ideology: string;
  cohesion: number;
}

const PHASE_THRESHOLDS = {
  latent: 0.3,
  active: 0.5,
  critical: 0.7,
  explosive: 0.85,
};

const ESCALATION_THRESHOLD = 0.7;
const POINT_OF_NO_RETURN_THRESHOLD = 0.9;

export async function getConflictState(
  agentId: string,
  targetId: string
): Promise<ConflictState> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT * FROM conflict_state WHERE agent_id = ? AND target_id = ?`,
      [agentId, targetId]
    );

    if (rows.length === 0) {
      await initializeConflict(agentId, targetId);
      return { level: 0, phase: "latent", escalationMultiplier: 1.0, pointOfNoReturn: false };
    }

    const row = rows[0] as any;
    return {
      level: row.level,
      phase: row.phase as ConflictPhase,
      escalationMultiplier: row.escalation_multiplier,
      pointOfNoReturn: row.point_of_no_return,
    };
  } finally {
    if (conn) conn.release();
  }
}

export async function initializeConflict(
  agentId: string,
  targetId: string
): Promise<void> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    await conn.query(
      `INSERT IGNORE INTO conflict_state (agent_id, target_id, level, phase, escalation_multiplier, point_of_no_return)
       VALUES (?, ?, 0.0, 'latent', 1.0, FALSE)`,
      [agentId, targetId]
    );
  } finally {
    if (conn) conn.release();
  }
}

export async function updateConflict(
  agentId: string,
  targetId: string,
  interactionValence: number
): Promise<ConflictState> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    
    const current = await getConflictState(agentId, targetId);
    
    const k1 = 0.3;
    const k2 = 0.2;
    
    const negativeInteraction = Math.max(0, -interactionValence);
    const repair = interactionValence > 0 ? interactionValence * 0.5 : 0;
    
    let delta = k1 * negativeInteraction - k2 * repair;
    
    if (current.level > ESCALATION_THRESHOLD) {
      delta *= current.escalationMultiplier;
      if (current.escalationMultiplier < 2.5) {
        await conn.query(
          `UPDATE conflict_state SET escalation_multiplier = LEAST(2.5, escalation_multiplier * 1.1)
           WHERE agent_id = ? AND target_id = ?`,
          [agentId, targetId]
        );
      }
    }
    
    const newLevel = Math.max(0, Math.min(1, current.level + delta));
    const newPhase = getConflictPhase(newLevel);
    const newPonr = newLevel > POINT_OF_NO_RETURN_THRESHOLD;

    await conn.query(
      `UPDATE conflict_state SET 
        level = ?,
        phase = ?,
        point_of_no_return = ?,
        ts = CURRENT_TIMESTAMP
       WHERE agent_id = ? AND target_id = ?`,
      [newLevel, newPhase, newPonr, agentId, targetId]
    );

    return {
      level: newLevel,
      phase: newPhase,
      escalationMultiplier: newLevel > ESCALATION_THRESHOLD ? Math.min(2.5, current.escalationMultiplier * 1.1) : 1.0,
      pointOfNoReturn: newPonr,
    };
  } finally {
    if (conn) conn.release();
  }
}

export function getConflictPhase(level: number): ConflictPhase {
  if (level >= PHASE_THRESHOLDS.explosive) return "explosive";
  if (level >= PHASE_THRESHOLDS.critical) return "critical";
  if (level >= PHASE_THRESHOLDS.active) return "active";
  return "latent";
}

export async function checkPointOfNoReturn(
  agentId: string,
  targetId: string
): Promise<boolean> {
  const state = await getConflictState(agentId, targetId);
  return state.pointOfNoReturn;
}

export async function detectFactionFormation(): Promise<Faction[]> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    
    const relations = await conn.query(
      `SELECT agent_id, target_id, trust, level FROM conflict_state`
    );

    const agents = new Set<string>();
    for (const r of relations as any[]) {
      agents.add(r.agent_id);
      agents.add(r.target_id);
    }

    const adj: Record<string, Record<string, number>> = {};
    for (const a of agents) {
      adj[a] = {};
    }
    for (const r of relations as any[]) {
      const weight = (r.trust || 0.5) - (r.level || 0);
      adj[r.agent_id][r.target_id] = weight;
      adj[r.target_id][r.agent_id] = weight;
    }

    const visited = new Set<string>();
    const factions: Faction[] = [];

    const AGENT_IDEOLOGIES: Record<string, string> = {
      Architekt_AI_Adam: "AI-first",
      Architekt_Elektrociała_Lena: "Hardware-first",
      Inzynier_Nadia: "AI-first",
      Inzynier_Igor: "Hardware-first",
      Robot_Artemis: "Robot autonomy",
      Robot_Boreasz: "Robot autonomy",
      Robot_Cyra: "Robot autonomy",
      Robot_Dexter: "Robot autonomy",
      CEO_Maja: "Management",
      Operator_Michal: "Operations",
      SYNAPSA_Omega: "System integration",
    };

    for (const start of agents) {
      if (visited.has(start)) continue;
      
      const faction: string[] = [];
      const stack = [start];
      
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (visited.has(current)) continue;
        
        visited.add(current);
        faction.push(current);
        
        for (const neighbor of agents) {
          if (!visited.has(neighbor) && adj[current][neighbor] > 0.2) {
            stack.push(neighbor);
          }
        }
      }

      if (faction.length >= 2) {
        const ideologies = faction.map(a => AGENT_IDEOLOGIES[a] || "neutral");
        const dominantIdeology = ideologies.sort((a, b) =>
          ideologies.filter(v => v === a).length - ideologies.filter(v => v === b).length
        ).pop() || "neutral";

        const cohesion = faction.reduce((sum, a) => {
          return sum + faction.filter(b => adj[a][b] > 0.3).length;
        }, 0) / (faction.length * faction.length);

        factions.push({
          name: `Faction_${factions.length + 1}`,
          members: faction,
          ideology: dominantIdeology,
          cohesion: Math.min(1, cohesion),
        });
      }
    }

    return factions;
  } finally {
    if (conn) conn.release();
  }
}

export async function resolveConflict(
  agentId: string,
  targetId: string
): Promise<void> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    await conn.query(
      `UPDATE conflict_state SET 
        level = GREATEST(0, level - 0.4),
        phase = 'latent',
        escalation_multiplier = 1.0,
        point_of_no_return = FALSE,
        ts = CURRENT_TIMESTAMP
       WHERE agent_id = ? AND target_id = ?`,
      [agentId, targetId]
    );
  } finally {
    if (conn) conn.release();
  }
}

export async function getAllConflicts(): Promise<Record<string, Record<string, ConflictState>>> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`SELECT * FROM conflict_state`);
    
    const result: Record<string, Record<string, ConflictState>> = {};
    for (const row of rows as any[]) {
      if (!result[row.agent_id]) result[row.agent_id] = {};
      result[row.agent_id][row.target_id] = {
        level: row.level,
        phase: row.phase,
        escalationMultiplier: row.escalation_multiplier,
        pointOfNoReturn: row.point_of_no_return,
      };
    }
    return result;
  } finally {
    if (conn) conn.release();
  }
}

export async function getCriticalConflicts(): Promise<Array<{ agent: string; target: string; level: number }>> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT agent_id, target_id, level FROM conflict_state WHERE level > 0.6 ORDER BY level DESC LIMIT 10`
    );
    
    return (rows as any[]).map(r => ({ agent: r.agent_id, target: r.target_id, level: r.level }));
  } finally {
    if (conn) conn.release();
  }
}
