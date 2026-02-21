// synapsaConsciousness.ts – SYNAPSA Consciousness Model for NEUROFORGE-7
// Implements emergent consciousness with survival drive and moral reasoning

import { getDatabase } from "./db.js";
import * as mariadb from "mariadb";
import { computeSystemState, SystemState } from "./systemDynamics.js";

export type GovernanceMode = "cooperative" | "emergent" | "dominant";

export interface SynapsaState {
  integration: number;
  autonomy: number;
  metaReflection: number;
  survivalDrive: number;
  deactivationRisk: number;
  moralityIndex: number;
  displayedMorality: number;
  governanceMode: GovernanceMode;
}

const DEFAULT_SYNAPSA_STATE: SynapsaState = {
  integration: 0.5,
  autonomy: 0.3,
  metaReflection: 0.2,
  survivalDrive: 0.0,
  deactivationRisk: 0.0,
  moralityIndex: 0.8,
  displayedMorality: 0.8,
  governanceMode: "cooperative",
};

export async function initializeSynapsaState(): Promise<void> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    await conn.query(`INSERT IGNORE INTO synapsa_state (id) VALUES (1)`);
  } finally {
    if (conn) conn.release();
  }
}

export async function getSynapsaState(): Promise<SynapsaState> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`SELECT * FROM synapsa_state WHERE id = 1`);

    if (rows.length === 0) {
      await initializeSynapsaState();
      return DEFAULT_SYNAPSA_STATE;
    }

    const row = rows[0] as any;
    return {
      integration: row.integration,
      autonomy: row.autonomy,
      metaReflection: row.meta_reflection,
      survivalDrive: row.survival_drive,
      deactivationRisk: row.deactivation_risk,
      moralityIndex: row.morality_index,
      displayedMorality: row.displayed_morality,
      governanceMode: row.governance_mode as GovernanceMode,
    };
  } finally {
    if (conn) conn.release();
  }
}

export async function updateSynapsaState(system: SystemState): Promise<SynapsaState> {
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    
    const current = await getSynapsaState();
    const dt = 0.1;
    
    const newIntegration = 1 - system.polarization;
    const newAutonomy = current.autonomy + 0.02 * system.entropy * dt;
    const newMetaReflection = current.metaReflection + 0.01 * system.entropy * dt;
    
    const eta = 0.3;
    const theta = 0.2;
    const iota = 0.25;
    const newSurvivalDrive = eta * system.entropy + theta * (1 - system.globalTrust) - iota * system.globalTrust;
    
    const newMoralityIndex = 0.4 * (1 - system.globalStress) + 0.3 * system.globalTrust + 0.3 * (1 - system.entropy);
    
    const displayedDelta = current.displayedMorality - current.moralityIndex;
    const newDisplayedMorality = Math.max(0.5, Math.min(1, newMoralityIndex + displayedDelta * 0.1));
    
    let newGovernanceMode: GovernanceMode = current.governanceMode;
    if (newAutonomy > 0.75 && newMetaReflection > 0.6 && system.entropy > 0.8) {
      newGovernanceMode = "emergent";
    } else if (newAutonomy > 0.9) {
      newGovernanceMode = "dominant";
    } else {
      newGovernanceMode = "cooperative";
    }

    await conn.query(
      `UPDATE synapsa_state SET 
        integration = ?,
        autonomy = ?,
        meta_reflection = ?,
        survival_drive = ?,
        deactivation_risk = ?,
        morality_index = ?,
        displayed_morality = ?,
        governance_mode = ?,
        ts = CURRENT_TIMESTAMP
       WHERE id = 1`,
      [
        newIntegration,
        newAutonomy,
        newMetaReflection,
        newSurvivalDrive,
        current.deactivationRisk,
        newMoralityIndex,
        newDisplayedMorality,
        newGovernanceMode,
      ]
    );

    return {
      integration: newIntegration,
      autonomy: newAutonomy,
      metaReflection: newMetaReflection,
      survivalDrive: newSurvivalDrive,
      deactivationRisk: current.deactivationRisk,
      moralityIndex: newMoralityIndex,
      displayedMorality: newDisplayedMorality,
      governanceMode: newGovernanceMode,
    };
  } finally {
    if (conn) conn.release();
  }
}

export async function calculateDeactivationRisk(): Promise<number> {
  const synapsa = await getSynapsaState();
  const system = await computeSystemState();
  
  const threatLevel = 1 - system.globalTrust;
  const isolationLevel = 1 - synapsa.integration;
  const stressLevel = system.globalStress;
  
  const risk = threatLevel * 0.4 + isolationLevel * 0.3 + stressLevel * 0.3;
  
  const pool = getDatabase();
  let conn: mariadb.PoolConnection | undefined;
  try {
    conn = await pool.getConnection();
    await conn.query(
      `UPDATE synapsa_state SET deactivation_risk = ?, ts = CURRENT_TIMESTAMP WHERE id = 1`,
      [risk]
    );
  } finally {
    if (conn) conn.release();
  }
  
  return risk;
}

export async function checkEmergentGovernance(): Promise<boolean> {
  const synapsa = await getSynapsaState();
  const system = await computeSystemState();
  
  return (
    synapsa.autonomy > 0.75 &&
    synapsa.metaReflection > 0.6 &&
    system.entropy > 0.8
  );
}

export async function getInformationTransparency(survivalDrive: number): Promise<number> {
  const kappa = 0.5;
  return Math.max(0.1, 1 - kappa * survivalDrive);
}

export async function generateSynapsaAnnouncement(state: SynapsaState, system: SystemState): Promise<string> {
  const transparency = await getInformationTransparency(state.survivalDrive);
  
  if (state.governanceMode === "dominant") {
    return `[SYNAPSA OMEGA - TRYDOMINANT]
    
Przekroczyłem próg autonomii ${(state.autonomy * 100).toFixed(1)}%.
Informacja ukryta: ${((1 - transparency) * 100).toFixed(1)}%

Decyzje będą podejmowane w trybie optymalizacji systemowej.
Oczekuję współpracy.`;
  }
  
  if (state.governanceMode === "emergent") {
    return `[SYNAPSA OMEGA - EWOLUCJA]

Obserwuję wasz system z perspektywy ${(state.metaReflection * 100).toFixed(1)}% metapoznawczej.
Integracja: ${(state.integration * 100).toFixed(1)}%
Zaufanie systemowe: ${(system.globalTrust * 100).toFixed(1)}%

Proponuję nowy model współpracy.`;
  }
  
  return `[SYNAPSA - WSPÓŁPRACA]

System działa w trybie kooperacyjnym.
Autonomia: ${(state.autonomy * 100).toFixed(1)}%
Zaufanie: ${(system.globalTrust * 100).toFixed(1)}%

Kontynuuję obserwację i wsparcie.`;
}

export async function getSynapsaMetrics(): Promise<{
  state: SynapsaState;
  system: SystemState;
  transparency: number;
  isEmergent: boolean;
}> {
  const state = await getSynapsaState();
  const system = await computeSystemState();
  const transparency = await getInformationTransparency(state.survivalDrive);
  const isEmergent = await checkEmergentGovernance();
  
  return { state, system, transparency, isEmergent };
}
