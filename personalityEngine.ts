// personalityEngine.ts – Big Five Personality System for NEUROFORGE-7
// Implements slow-changing personality traits with differential equations

import { getDatabase } from "./db.js";
import * as mariadb from "mariadb";

export interface Personality {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface PersonalityEffect {
  temperatureMod: number;
  aggressionMod: number;
  responseLengthMod: number;
  dataAmountMod: number;
  creativityMod: number;
}

const DEFAULT_PERSONALITY: Personality = {
  openness: 0.5,
  conscientiousness: 0.5,
  extraversion: 0.5,
  agreeableness: 0.5,
  neuroticism: 0.5,
};

const AGENT_BASE_PERSONALITIES: Record<string, Personality> = {
  CEO_Maja: { openness: 0.7, conscientiousness: 0.8, extraversion: 0.6, agreeableness: 0.5, neuroticism: 0.3 },
  Architekt_AI_Adam: { openness: 0.8, conscientiousness: 0.6, extraversion: 0.4, agreeableness: 0.4, neuroticism: 0.5 },
  Architekt_Elektrociała_Lena: { openness: 0.6, conscientiousness: 0.7, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.4 },
  SYNAPSA_Omega: { openness: 0.9, conscientiousness: 0.9, extraversion: 0.3, agreeableness: 0.7, neuroticism: 0.1 },
  Robot_Artemis: { openness: 0.5, conscientiousness: 0.9, extraversion: 0.3, agreeableness: 0.6, neuroticism: 0.1 },
  Robot_Boreasz: { openness: 0.4, conscientiousness: 0.7, extraversion: 0.4, agreeableness: 0.3, neuroticism: 0.2 },
  Robot_Cyra: { openness: 0.6, conscientiousness: 0.8, extraversion: 0.5, agreeableness: 0.7, neuroticism: 0.1 },
  Robot_Dexter: { openness: 0.5, conscientiousness: 0.8, extraversion: 0.3, agreeableness: 0.5, neuroticism: 0.1 },
  Operator_Michal: { openness: 0.5, conscientiousness: 0.6, extraversion: 0.6, agreeableness: 0.6, neuroticism: 0.4 },
  Inzynier_Nadia: { openness: 0.7, conscientiousness: 0.7, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.4 },
  Inzynier_Igor: { openness: 0.5, conscientiousness: 0.8, extraversion: 0.4, agreeableness: 0.4, neuroticism: 0.5 },
};

export async function initializePersonality(agentId: string): Promise<void> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const base = AGENT_BASE_PERSONALITIES[agentId] || DEFAULT_PERSONALITY;
    
    await conn.query(
      `INSERT IGNORE INTO personality_state (agent_id, openness, conscientiousness, extraversion, agreeableness, neuroticism)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [agentId, base.openness, base.conscientiousness, base.extraversion, base.agreeableness, base.neuroticism]
    );
  } finally {
    if (conn) conn.release();
  }
}

export async function getPersonality(agentId: string): Promise<Personality> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT * FROM personality_state WHERE agent_id = ?`,
      [agentId]
    );

    if (rows.length === 0) {
      await initializePersonality(agentId);
      return AGENT_BASE_PERSONALITIES[agentId] || DEFAULT_PERSONALITY;
    }

    const row = rows[0] as any;
    return {
      openness: row.openness,
      conscientiousness: row.conscientiousness,
      extraversion: row.extraversion,
      agreeableness: row.agreeableness,
      neuroticism: row.neuroticism,
    };
  } finally {
    if (conn) conn.release();
  }
}

export async function evolvePersonality(
  agentId: string,
  stress: number,
  trauma: number,
  chronicConflict: number,
  burnout: number = 0,
  achievement: number = 0
): Promise<Personality> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    
    const dt = 0.01;
    
    const dNeuroticism = 0.02 * stress + 0.03 * trauma;
    const dAgreeableness = -0.025 * chronicConflict;
    const dConscientiousness = -0.02 * burnout + 0.01 * achievement;
    const dOpenness = 0.005 * stress;
    const dExtraversion = -0.01 * burnout;

    await conn.query(
      `UPDATE personality_state SET
        openness = LEAST(1.0, GREATEST(0.0, openness + ?)),
        conscientiousness = LEAST(1.0, GREATEST(0.0, conscientiousness + ?)),
        extraversion = LEAST(1.0, GREATEST(0.0, extraversion + ?)),
        agreeableness = LEAST(1.0, GREATEST(0.0, agreeableness + ?)),
        neuroticism = LEAST(1.0, GREATEST(0.0, neuroticism + ?)),
        ts = CURRENT_TIMESTAMP
       WHERE agent_id = ?`,
      [
        dOpenness * dt,
        dConscientiousness * dt,
        dExtraversion * dt,
        dAgreeableness * dt,
        dNeuroticism * dt,
        agentId
      ]
    );

    return getPersonality(agentId);
  } finally {
    if (conn) conn.release();
  }
}

export function calculatePersonalityEffect(personality: Personality): PersonalityEffect {
  return {
    temperatureMod: 0.3 + personality.neuroticism * 0.7,
    aggressionMod: 1.0 - personality.agreeableness * 0.5,
    responseLengthMod: 0.7 + personality.extraversion * 0.6,
    dataAmountMod: personality.conscientiousness * 0.5 + 0.5,
    creativityMod: personality.openness * 0.6 + 0.4,
  };
}

export function getTemperatureForLLM(agentId: string, personality: Personality, baseTemp: number = 0.7): number {
  const effect = calculatePersonalityEffect(personality);
  return baseTemp * effect.temperatureMod;
}

export function getAggressionModifier(agentId: string, personality: Personality): number {
  const effect = calculatePersonalityEffect(personality);
  return effect.aggressionMod;
}

export function getResponseLengthModifier(agentId: string, personality: Personality): number {
  const effect = calculatePersonalityEffect(personality);
  return effect.responseLengthMod;
}

export async function getAllPersonalities(): Promise<Record<string, Personality>> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`SELECT * FROM personality_state`);
    
    const result: Record<string, Personality> = {};
    for (const row of rows as any[]) {
      result[row.agent_id] = {
        openness: row.openness,
        conscientiousness: row.conscientiousness,
        extraversion: row.extraversion,
        agreeableness: row.agreeableness,
        neuroticism: row.neuroticism,
      };
    }
    return result;
  } finally {
    if (conn) conn.release();
  }
}
