// dramaEngine.ts – Drama Index & Phase Transitions for NEUROFORGE-7
// Implements theatrical drama tracking and tragedy mode detection

import { getDatabase } from "./db.js";
import * as mariadb from "mariadb";
import { calculateGroupAffect } from "./emotionEngine.js";
import { getAllConflicts } from "./conflictEngine.js";

export type DramaPhase = "stable" | "tension" | "crisis" | "tragedy";

export interface DramaState {
  index: number;
  phase: DramaPhase;
  isTragedyMode: boolean;
  phaseNumber: number;
}

export interface FactoryEvent {
  id: string;
  description: string;
  severity: number;
  type: string;
}

const DRAMA_INDEX_THRESHOLDS = {
  stable: 0.3,
  tension: 0.6,
  crisis: 0.8,
};

const TRAGEDY_TRIGGERS = {
  avgStress: 0.75,
  avgConflict: 0.6,
};

export async function computeDramaIndex(): Promise<number> {
  const groupAffect = await calculateGroupAffect();
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
  
  let valenceVariance = 0;
  const agents = Object.keys(conflicts).length || 1;
  valenceVariance = Math.abs(groupAffect.avg_valence);
  
  const dramaIndex = 
    0.4 * groupAffect.avg_stress + 
    0.3 * avgConflict + 
    0.3 * valenceVariance;
  
  return Math.min(1, Math.max(0, dramaIndex));
}

export function getDramaPhase(dramaIndex: number): DramaPhase {
  if (dramaIndex >= DRAMA_INDEX_THRESHOLDS.crisis) return "tragedy";
  if (dramaIndex >= DRAMA_INDEX_THRESHOLDS.tension) return "crisis";
  if (dramaIndex >= DRAMA_INDEX_THRESHOLDS.stable) return "tension";
  return "stable";
}

export async function checkTragedyMode(): Promise<boolean> {
  const groupAffect = await calculateGroupAffect();
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
  
  return (
    groupAffect.avg_stress > TRAGEDY_TRIGGERS.avgStress &&
    avgConflict > TRAGEDY_TRIGGERS.avgConflict
  );
}

export async function generateTragedyEvent(): Promise<FactoryEvent> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    
    const events = [
      { description: "Krytyczna awaria systemu bezpieczeństwa", severity: 0.95, type: "safety" },
      { description: "Maszyny odmawiają współpracy", severity: 0.9, type: "rebellion" },
      { description: "Zniszczenie kluczowego komponentu", severity: 0.85, type: "equipment" },
      { description: "Masowy strajk robotów", severity: 0.8, type: "labor" },
      { description: "Awaria systemu zasilania", severity: 0.75, type: "infrastructure" },
      { description: "Utrata danych produkcyjnych", severity: 0.7, type: "data" },
    ];
    
    const event = events[Math.floor(Math.random() * events.length)];
    const eventId = `tragedy_${Date.now()}`;
    
    await conn.query(
      `INSERT INTO factory_events (id, description, severity, affected_agents) VALUES (?, ?, ?, ?)`,
      [eventId, event.description, event.severity, JSON.stringify(["all"])]
    );
    
    return {
      id: eventId,
      description: event.description,
      severity: event.severity,
      type: event.type,
    };
  } finally {
    if (conn) conn.release();
  }
}

export async function getDramaState(): Promise<DramaState> {
  const index = await computeDramaIndex();
  const phase = getDramaPhase(index);
  const isTragedy = await checkTragedyMode();
  
  return {
    index,
    phase,
    isTragedyMode: isTragedy,
    phaseNumber: phase === "stable" ? 1 : phase === "tension" ? 2 : phase === "crisis" ? 3 : 4,
  };
}

export async function recordDramaEvent(
  conversationId: string,
  dramaIndex: number,
  phase: DramaPhase
): Promise<void> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    await conn.query(
      `INSERT INTO factory_events (description, severity, affected_agents) VALUES (?, ?, ?)`,
      [`Drama index: ${dramaIndex.toFixed(2)}, Phase: ${phase}`, dramaIndex, JSON.stringify([])]
    );
  } finally {
    if (conn) conn.release();
  }
}

export async function getDramaHistory(limit: number = 50): Promise<Array<{ 
  id: number; 
  description: string; 
  severity: number; 
  timestamp: Date 
}>> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT id, description, severity, timestamp FROM factory_events ORDER BY timestamp DESC LIMIT ?`,
      [limit]
    );
    return (rows as any[]).map(r => ({
      id: r.id,
      description: r.description,
      severity: r.severity,
      timestamp: r.timestamp,
    }));
  } finally {
    if (conn) conn.release();
  }
}

export async function getPhaseTransitionWarning(): Promise<{
  currentPhase: DramaPhase;
  nextPhase: DramaPhase | null;
  warning: string;
} | null> {
  const state = await getDramaState();
  
  const transitions: Record<DramaPhase, DramaPhase | null> = {
    stable: "tension",
    tension: "crisis",
    crisis: "tragedy",
    tragedy: null,
  };
  
  const nextPhase = transitions[state.phase];
  if (!nextPhase) return null;
  
  const warnings: Record<DramaPhase, string> = {
    stable: "",
    tension: "Napięcie rośnie - sprawdź relacje między agentami",
    crisis: "KRYZYS: Ryzyko eskalacji konfliktu - rozważ mediację",
    tragedy: "TRAGEDIA: System wymaga natychmiastowej interwencji",
  };
  
  return {
    currentPhase: state.phase,
    nextPhase,
    warning: warnings[state.phase],
  };
}
