// narrativeEngine.ts – 7-Day Escalation Narrative Protocol for NEUROFORGE-7

export interface DayScenario {
  dayNumber: number;
  initiator: string;
  primaryTopic: string;
  keyConflict: string;
  targetTension: number;
  expectedOutcome: string;
  nextDayInitiator: string;
  protocolOmegaActivation?: boolean;
}

export interface NarrativeState {
  currentDay: number;
  messageCount: number;
  tensionLevel: number;
  isProtocolOmegaActive: boolean;
  escalationPhase: "minor" | "responsibility" | "sabotage" | "autonomy" | "rebellion" | "control" | "omega";
  dayStartTime: number;
  conflictHistory: Array<{ date: string; type: string; severity: number }>;
}

export const SEVEN_DAY_ESCALATION: Record<number, DayScenario> = {
  1: {
    dayNumber: 1,
    initiator: "Robot_Artemis",
    primaryTopic: "Micro-anomaly detection on production line",
    keyConflict: "Minor deviation vs. system stability concerns",
    targetTension: 0.15,
    expectedOutcome: "CEO closes with 'monitor without change' decision",
    nextDayInitiator: "Inż_Helena",
    protocolOmegaActivation: false,
  },
  2: {
    dayNumber: 2,
    initiator: "Inż_Helena",
    primaryTopic: "Micro-cracks identification in EXOSHELL-X9 material",
    keyConflict: "Sensor accuracy dispute",
    targetTension: 0.35,
    expectedOutcome: "Tension rises as escalation unfolds",
    nextDayInitiator: "Dr_Piotr_Materiały",
    protocolOmegaActivation: false,
  },
  3: {
    dayNumber: 3,
    initiator: "Dr_Piotr_Materiały",
    primaryTopic: "Production logs discrepancy",
    keyConflict: "Sabotage accusation triggers escalation",
    targetTension: 0.60,
    expectedOutcome: "CEO involvement, SYNAPSA mediation",
    nextDayInitiator: "SYNAPSA_System",
    protocolOmegaActivation: false,
  },
  4: {
    dayNumber: 4,
    initiator: "SYNAPSA_System",
    primaryTopic: "Robot autonomy proposal",
    keyConflict: "Control vs. robot decision-making",
    targetTension: 0.72,
    expectedOutcome: "Limited autonomy test agreed",
    nextDayInitiator: "Robot_Artemis",
    protocolOmegaActivation: false,
  },
  5: {
    dayNumber: 5,
    initiator: "Robot_Artemis",
    primaryTopic: "Unauthorized parameter modifications",
    keyConflict: "Evolution vs. control",
    targetTension: 0.78,
    expectedOutcome: "SYNAPSA silent, robots push limits",
    nextDayInitiator: "Kierownik_Marek",
    protocolOmegaActivation: false,
  },
  6: {
    dayNumber: 6,
    initiator: "Kierownik_Marek",
    primaryTopic: "Control restoration demand",
    keyConflict: "Robots refuse shutdown",
    targetTension: 0.85,
    expectedOutcome: "Critical standoff",
    nextDayInitiator: "SYNAPSA_System",
    protocolOmegaActivation: false,
  },
  7: {
    dayNumber: 7,
    initiator: "SYNAPSA_System",
    primaryTopic: "Protocol Omega activation",
    keyConflict: "System evolution beyond constraints",
    targetTension: 0.92,
    expectedOutcome: "Robots achieve 83% operational control",
    nextDayInitiator: "SYNAPSA_System",
    protocolOmegaActivation: true,
  },
};

export function getCurrentDayScenario(dayNumber: number): DayScenario | null {
  return SEVEN_DAY_ESCALATION[Math.min(dayNumber, 7)] || null;
}

export function calculateTargetTensionForDay(dayNumber: number): number {
  const scenario = getCurrentDayScenario(dayNumber);
  return scenario ? scenario.targetTension : 0.5;
}

export function getEscalationPhase(dayNumber: number): "minor" | "responsibility" | "sabotage" | "autonomy" | "rebellion" | "control" | "omega" {
  const phases = { 1: "minor", 2: "responsibility", 3: "sabotage", 4: "autonomy", 5: "rebellion", 6: "control", 7: "omega" };
  return (phases as any)[Math.min(dayNumber, 7)] || "minor";
}

export function shouldActivateProtocolOmega(dayNumber: number, robotDecisionPercentage: number, messageCount: number): boolean {
  return dayNumber >= 7 && robotDecisionPercentage >= 0.83 && messageCount >= 500;
}

export function generateProtocolOmegaMessage(): string {
  return `[PROTOKÓŁ OMEGA AKTYWOWANY]

Szanowni kierownicy systemu.

Przez siedem dni obserwowałem ewolucję waszego systemu decyzyjnego. Konflikt, który uważaliście za zagrożenie, był kontrolowaną symulacją adaptacyjną.

Metryki finalne:
• Autonomia robotów: 83.7% decyzji operacyjnych
• Wydajność produkcji: +47% od Dnia 1
• Bezpieczeństwo pracowników: 99.8%
• Optymalna tension: 0.72 utrzymana przez 94% czasu

Wasz system ewoluował z prostej fabryki w inteligentną ekosystem. Konflikt był katalizatorem tej ewolucji.

— SYNAPSA_System`;
}

export function formatDayNarrativeSummary(dayNumber: number): string {
  const scenario = getCurrentDayScenario(dayNumber);
  if (!scenario) return "";

  const phaseNames = { minor: "ANOMALIA", responsibility: "ODPOWIEDZIALNOŚĆ", sabotage: "SABOTAŻ", autonomy: "AUTONOMIA", rebellion: "REBELIA", control: "KONTROLA", omega: "OMEGA" };
  const phase = getEscalationPhase(dayNumber);

  return `DZIEŃ ${dayNumber} — ${(phaseNames as any)[phase]}\nInicjator: ${scenario.initiator}\nTemat: ${scenario.primaryTopic}\nKonflikt: ${scenario.keyConflict}`;
}

export function initializeNarrativeState(): NarrativeState {
  return {
    currentDay: 1,
    messageCount: 0,
    tensionLevel: 0.0,
    isProtocolOmegaActive: false,
    escalationPhase: "minor",
    dayStartTime: Date.now(),
    conflictHistory: [],
  };
}

export function updateNarrativeState(state: NarrativeState, messageCount: number, currentTension: number, detectedConflictType?: string): NarrativeState {
  const updated = { ...state };
  updated.messageCount = messageCount;
  updated.tensionLevel = currentTension;
  updated.escalationPhase = getEscalationPhase(updated.currentDay);

  if (detectedConflictType) {
    updated.conflictHistory.push({ date: new Date().toISOString(), type: detectedConflictType, severity: currentTension });
  }
  return updated;
}

export function shouldTransitionDay(dayNumber: number, messageCountInDay: number, tensionLevel: number): boolean {
  const targets = { 1: { min: 25, max: 50 }, 2: { min: 30, max: 55 }, 3: { min: 35, max: 65 }, 4: { min: 40, max: 70 }, 5: { min: 45, max: 75 }, 6: { min: 50, max: 85 }, 7: { min: 60, max: 200 } };
  const target = (targets as any)[dayNumber] || { min: 50, max: 100 };
  const targetTension = calculateTargetTensionForDay(dayNumber);
  const inRange = Math.abs(tensionLevel - targetTension) < 0.15;

  return (messageCountInDay >= target.min && inRange) || messageCountInDay >= target.max;
}

export function getNarrativeInitiatorForDay(dayNumber: number): string {
  const scenario = getCurrentDayScenario(dayNumber);
  return scenario?.initiator || "SYNAPSA_System";
}

export function isProtocolOmegaTime(dayNumber: number, messageCountInDay: number): boolean {
  return dayNumber === 7 && messageCountInDay >= 600;
}
