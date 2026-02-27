// communicationProtocols.ts - Protokoły komunikacji i Emotional Contagion

import { getConnection } from "./db.js";

// ===================== PROTOKOŁY KOMUNIKACJI =====================

export type CommunicationMode = 'verbal' | 'numerical' | 'technical' | 'emotional' | 'gibberlink';

export interface CommunicationProtocol {
  fromAgent: string;
  toAgent: string;
  mode: CommunicationMode;
  priority: number;
  requiresResponse: boolean;
  responseDelay: number; // tury
}

// Reguły przełączania trybów
const PROTOCOL_RULES: Record<string, CommunicationMode[]> = {
  // Ludzie domyślnie używają trybu werbalnego
  human: ['verbal', 'emotional'],
  // Roboty między sobą mogą używać GibberLink
  robot_robot: ['technical', 'numerical', 'gibberlink'],
  // Robot do człowieka - mieszany
  robot_human: ['verbal', 'technical'],
  // Człowiek do robota - czasem tryb numeryczny
  human_robot: ['verbal', 'numerical'],
  // SYNAPSA - elastyczny
  synapsa: ['verbal', 'technical', 'emotional'],
};

// Pobierz tryb komunikacji na podstawie agenta i kontekstu
export function getCommunicationMode(
  fromAgent: string,
  toAgent: string,
  context: 'normal' | 'crisis' | 'technical' = 'normal'
): CommunicationMode {
  const fromType = getAgentType(fromAgent);
  const toType = getAgentType(toAgent);

  const key = `${fromType}_${toType}`;
  const allowedModes = PROTOCOL_RULES[key] || PROTOCOL_RULES['human'];

  // W kryzysie - pierwszy tryb (domyślny)
  if (context === 'crisis') {
    return allowedModes[0];
  }

  // Losuj z dozwolonych trybów
  return allowedModes[Math.floor(Math.random() * allowedModes.length)];
}

function getAgentType(agentId: string): string {
  if (agentId === 'SYNAPSA_Omega') return 'synapsa';
  if (agentId.startsWith('Robot_')) return 'robot';
  return 'human';
}

// Opóźnienie odpowiedzi (asynchroniczność)
export function getResponseDelay(fromAgent: string, toAgent: string): number {
  const fromType = getAgentType(fromAgent);
  const toType = getAgentType(toAgent);

  // Robot do robota - szybko
  if (fromType === 'robot' && toType === 'robot') {
    return 0;
  }

  // Człowiek do człowieka - losowo 1-3 tury
  if (fromType === 'human' && toType === 'human') {
    return Math.floor(Math.random() * 3) + 1;
  }

  // Mieszane - średnio
  return Math.floor(Math.random() * 2) + 1;
}

// ===================== DYNAMICZNA HIERARCHIA (DYRYGENT) =====================

export type AgentRole = 'leader' | 'mediator' | 'provocateur' | 'observer' | 'expert';

export interface AgentRoleAssignment {
  agentId: string;
  role: AgentRole;
  dayAssigned: number;
  authority: number; // 0-1 jak bardzo może wpływać na decyzje
}

const ROLE_PROMPTS: Record<AgentRole, string> = {
  leader: "Podejmujesz decyzje. Kierujesz dyskusją. Twoje zdanie ma największą wagę.",
  mediator: "Starasz się znaleźć kompromis. Łagodzisz konflikty. Szukasz porozumienia.",
  provocateur: "Kwestionujesz status quo. Zadajesz trudne pytania. Prowokujesz do myślenia.",
  observer: "Słuchasz i analizujesz. Wtrącasz się tylko gdy jest to konieczne.",
  expert: "Dzielisz się wiedzą techniczną. Koncentrujesz się na swojej dziedzinie.",
};

// Przydziel role na dzień
export function assignDailyRoles(agentIds: string[], dayNumber: number): AgentRoleAssignment[] {
  const roles: AgentRole[] = ['leader', 'mediator', 'provocateur', 'observer', 'expert'];
  const assignments: AgentRoleAssignment[] = [];

  // Losuj lidera (musi być człowiek lub SYNAPSA)
  const potentialLeaders = agentIds.filter(a =>
    a.startsWith('CEO_') || a.startsWith('Architekt_') || a === 'SYNAPSA_Omega'
  );

  const leader = potentialLeaders[Math.floor(Math.random() * potentialLeaders.length)] || agentIds[0];
  assignments.push({ agentId: leader, role: 'leader', dayAssigned: dayNumber, authority: 0.8 });

  // Pozostałe role losowo
  const remainingAgents = agentIds.filter(a => a !== leader);
  const shuffledRoles = [...roles.slice(1)].sort(() => Math.random() - 0.5);

  for (let i = 0; i < remainingAgents.length; i++) {
    const role = shuffledRoles[i] || 'observer';
    const authority = role === 'mediator' ? 0.5 : role === 'expert' ? 0.4 : 0.3;
    assignments.push({ agentId: remainingAgents[i], role, dayAssigned: dayNumber, authority });
  }

  return assignments;
}

// Pobierz prompt dla roli
export function getRolePrompt(agentId: string, assignments: AgentRoleAssignment[]): string {
  const assignment = assignments.find(a => a.agentId === agentId);
  if (!assignment) return "";
  return ROLE_PROMPTS[assignment.role];
}

// ===================== EMOTIONAL CONTAGION (ZARAŻANIE EMOCJĄ) =====================

export interface ContagionParams {
  sourceAgent: string;
  targetAgent: string;
  emotion: {
    valence: number;
    arousal: number;
    stress: number;
  };
  sourceType: 'human' | 'robot' | 'synapsa';
}

const CONTAGION_STRENGTH: Record<string, number> = {
  human: 0.6,
  robot: 0.3,
  synapsa: 0.8,
};

// Oblicz siłę wpływu na podstawie trust i fear
function getInfluenceStrength(sourceAgent: string, targetAgent: string): number {
  // Pobierz relację z bazy
  // Na razie zwracamy domyślną wartość
  return 0.5; // Zaimplementować z bazy danych
}

// Główna funkcja emotional contagion
export function calculateEmotionalContagion(
  sourceEmotion: { valence: number; arousal: number },
  sourceAgentType: 'human' | 'robot' | 'synapsa',
  trust: number, // -1 do 1
  fear: number // 0 do 1
): { deltaValence: number; deltaArousal: number; deltaStress: number } {
  const contagionStrength = CONTAGION_STRENGTH[sourceAgentType];
  const influence = trust - fear; // Może być ujemne

  // Siła wpływu z uwzględnieniem zaufania/strachu
  const effectiveInfluence = influence * contagionStrength;

  // Valence rozchodzi się z siłą wpływu
  const deltaValence = sourceEmotion.valence * effectiveInfluence * 0.3;

  // Arousal zwiększa się (podniecenie rozchodzi się łatwiej)
  const deltaArousal = sourceEmotion.arousal * contagionStrength * 0.2;

  // Stres rozchodzi się tylko gdy source ma wysoki stress
  const deltaStress = sourceEmotion.arousal > 0.7
    ? sourceEmotion.arousal * effectiveInfluence * 0.25
    : 0;

  return {
    deltaValence: clamp(deltaValence, -0.3, 0.3),
    deltaArousal: clamp(deltaArousal, 0, 0.2),
    deltaStress: clamp(deltaStress, 0, 0.25),
  };
}

// Zastosuj contagion do wszystkich agentów
export async function applyEmotionalContagion(
  speakingAgent: string,
  emotion: { valence: number; arousal: number; stress: number },
  allAgentIds: string[]
): Promise<Map<string, { deltaValence: number; deltaArousal: number; deltaStress: number }>> {
  const results = new Map();
  const sourceType = getAgentType(speakingAgent) as 'human' | 'robot' | 'synapsa';

  for (const targetId of allAgentIds) {
    if (targetId === speakingAgent) continue;

    // Pobierz relację z bazy (symulacja)
    const trust = await getTrustLevel(speakingAgent, targetId);
    const fear = await getFearLevel(speakingAgent, targetId);

    const delta = calculateEmotionalContagion(
      { valence: emotion.valence, arousal: emotion.arousal },
      sourceType,
      trust,
      fear
    );

    // Tylko jeśli zmiana jest znacząca
    if (Math.abs(delta.deltaValence) > 0.01 || delta.deltaStress > 0.01) {
      results.set(targetId, delta);
    }
  }

  return results;
}

// Pomocnicze funkcje (do zaimplementowania z bazą danych)
async function getTrustLevel(agentA: string, agentB: string): Promise<number> {
  try {
    const conn = await getConnection();
    try {
      const rows = await conn.query(
        `SELECT trust FROM agent_relations WHERE agent_id = ? AND target_id = ?`,
        [agentA, agentB]
      ) as Array<{ trust?: number }>;
      return rows[0]?.trust ?? 0.5;
    } finally {
      conn.release();
    }
  } catch {
    return 0.5;
  }
}

async function getFearLevel(agentA: string, agentB: string): Promise<number> {
  try {
    const conn = await getConnection();
    try {
      const rows = await conn.query(
        `SELECT fear FROM agent_relations WHERE agent_id = ? AND target_id = ?`,
        [agentA, agentB]
      ) as Array<{ fear?: number }>;
      return rows[0]?.fear ?? 0;
    } finally {
      conn.release();
    }
  } catch {
    return 0;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ===================== MULTI-MODEL AGENTS =====================

// Mapowanie agentów do modeli LLM
export const AGENT_MODEL_PREFERENCES: Record<string, string[]> = {
  // Ludzie - Qwen3 (naturalny język)
  CEO_Maja: ['qwen3', 'qwen2.5'],
  Architekt_AI_Adam: ['qwen3', 'qwen2.5'],
  Architekt_Elektrociała_Lena: ['qwen3', 'qwen2.5'],
  Operator_Michal: ['qwen3'],
  Inzynier_Nadia: ['qwen3', 'qwen2.5'],
  Inzynier_Igor: ['qwen3'],

  // Roboty - Gemma/QED (krótsze, techniczne)
  Robot_Artemis: ['gemma', 'unsloth/gpt-oss-20b'],
  Robot_Boreasz: ['gemma', 'unsloth/gpt-oss-20b'],
  Robot_Cyra: ['gemma', 'unsloth/gpt-oss-20b'],
  Robot_Dexter: ['gemma', 'unsloth/gpt-oss-20b'],

  // SYNAPSA - Qwen3 z najwyższymi zasobami
  SYNAPSA_Omega: ['qwen3', 'qwen2.5', 'qwen2.5-coder'],
};

// Pobierz model dla agenta (z losowaniem)
export function getModelForAgent(agentId: string): string {
  const models = AGENT_MODEL_PREFERENCES[agentId];
  if (!models || models.length === 0) {
    return 'qwen3'; // domyślny
  }

  // Losuj z preferencji (pierwszy ma najwyższe szanse)
  const roll = Math.random();
  if (roll < 0.6 && models.length > 0) return models[0];
  if (roll < 0.9 && models.length > 1) return models[1];
  return models[models.length - 1];
}

// ===================== SWEET SPOT LICZBY AGENTÓW =====================

export interface AgentGroupConfig {
  activeAgents: string[];
  rotating: boolean;
  rotationCycle: number;
}

// Optymalna liczba agentów to 3-5 dla najlepszej dynamiki
export function selectOptimalAgentGroup(
  allAgents: string[],
  dayNumber: number
): string[] {
  const OPTIMAL_SIZE = 4;

  // Jeśli mamy więcej niż optymalna liczba, rotuj
  if (allAgents.length > OPTIMAL_SIZE) {
    // Rotuj co 2 dni
    const rotationIndex = Math.floor(dayNumber / 2) % allAgents.length;
    return allAgents.slice(rotationIndex, rotationIndex + OPTIMAL_SIZE);
  }

  return allAgents;
}

// ===================== TASK DECOMPOSITION =====================

export type TaskPhase = 'analysis' | 'debate' | 'decision' | 'execution';

export interface TaskDecomposition {
  taskId: string;
  phases: {
    phase: TaskPhase;
    assignedAgents: string[];
    duration: number; // tury
  }[];
  currentPhase: TaskPhase;
}

// Podziel zadanie na fazy z losowym przydziałem agentów
export function decomposeTask(
  taskId: string,
  availableAgents: string[],
  dayNumber: number
): TaskDecomposition {
  const phases: TaskDecomposition['phases'] = [
    { phase: 'analysis', assignedAgents: [], duration: 3 },
    { phase: 'debate', assignedAgents: [], duration: 5 },
    { phase: 'decision', assignedAgents: [], duration: 2 },
    { phase: 'execution', assignedAgents: [], duration: 3 },
  ];

  // Losowo przydziel agentów do faz
  for (const phase of phases) {
    const numAgents = Math.min(availableAgents.length, 2 + Math.floor(Math.random() * 2));
    const shuffled = [...availableAgents].sort(() => Math.random() - 0.5);
    phase.assignedAgents = shuffled.slice(0, numAgents);
  }

  return {
    taskId,
    phases,
    currentPhase: 'analysis',
  };
}

// Pobierz aktywnych agentów w danej fazie
export function getActiveAgentsForPhase(decomposition: TaskDecomposition): string[] {
  const phase = decomposition.phases.find(p => p.phase === decomposition.currentPhase);
  return phase?.assignedAgents || [];
}
