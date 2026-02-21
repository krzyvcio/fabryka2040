// eventGenerator.ts – Dynamic event generation via LLM + External Events System
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { getConnection } from "./db.js";

const LMSTUDIO_URL = "http://172.23.176.1:1234/v1";
const openai = createOpenAI({
  baseURL: LMSTUDIO_URL,
  apiKey: "lm-studio",
});

const REASONER_MODEL = "qed-nano";

export interface FactoryEvent {
  description: string;
  severity: number; // 0-1
  affected_agents?: string[];
}

// ===================== NOWE: PULA WYDARZEŹ + ZARZĄDZANIE CYKLAMI =====================

export type EventSeverity = 'low' | 'medium' | 'high' | 'critical';
export type EventType = 
  | 'production'
  | 'safety'
  | 'financial'
  | 'personnel'
  | 'technical'
  | 'external'
  | 'political'
  | 'ethical';

export interface ExternalEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  severity: EventSeverity;
  severityValue: number;
  affectedAgents: string[];
  stressImpact: number;
  trustImpact: number;
  conflictImpact: number;
  topicOverride?: string;
  phase: 'idea' | 'negotiation' | 'decision' | 'complications';
  cycleDay?: number;
  recurrenceChance: number;
}

// Pula 25+ kluczowych wydarzeń (skrócona wersja)
export const EVENT_POOL: Omit<ExternalEvent, 'id'>[] = [
  {
    type: 'production',
    title: 'Awaria linii produkcyjnej',
    description: 'Linia 4 przestała działać z powodu przegrzania. Potrzebna natychmiastowa interwencja.',
    severity: 'high',
    severityValue: 0.75,
    affectedAgents: ['Robot_Artemis', 'Robot_Dexter', 'Kierownik_Marek'],
    stressImpact: 0.4,
    trustImpact: -0.1,
    conflictImpact: 0.2,
    phase: 'decision',
    recurrenceChance: 0.15,
  },
  {
    type: 'production',
    title: 'Zamówienie wojskowe',
    description: 'Armia składa pilne zamówienie na 500 jednostek. Termin: 2 tygodnie.',
    severity: 'critical',
    severityValue: 0.9,
    affectedAgents: ['CEO_Maja', 'Kierownik_Marek', 'Inż_Helena'],
    stressImpact: 0.3,
    trustImpact: 0.1,
    conflictImpact: 0.4,
    topicOverride: 'Czy powinniśmy przyjąć zamówienie wojskowe?',
    phase: 'negotiation',
    recurrenceChance: 0.08,
  },
  {
    type: 'safety',
    title: 'Wypadek pracownika',
    description: 'Operator został ranny przy maszynie. Bezpieczeństwo jest priorytetem.',
    severity: 'critical',
    severityValue: 0.95,
    affectedAgents: ['Kierownik_Marek', 'CEO_Maja', 'Operator_Michal'],
    stressImpact: 0.6,
    trustImpact: -0.3,
    conflictImpact: 0.5,
    phase: 'complications',
    recurrenceChance: 0.05,
  },
  {
    type: 'financial',
    title: 'Kryzys płynności',
    description: 'Firma ma problemy z gotówką. Trzeba ciąć koszty lub szukać inwestora.',
    severity: 'critical',
    severityValue: 0.85,
    affectedAgents: ['CEO_Maja', 'Architekt_AI_Adam', 'Architekt_Elektrociała_Lena'],
    stressImpact: 0.45,
    trustImpact: -0.25,
    conflictImpact: 0.5,
    topicOverride: 'Jak rozwiązać kryzys finansowy?',
    phase: 'negotiation',
    recurrenceChance: 0.07,
  },
  {
    type: 'technical',
    title: 'Cyberatak',
    description: 'Wykryto próbę włamania do systemów. Kto stoi za tym?',
    severity: 'critical',
    severityValue: 0.92,
    affectedAgents: ['SYNAPSA_Omega', 'Architekt_AI_Adam', 'Robot_Cyra'],
    stressImpact: 0.6,
    trustImpact: -0.15,
    conflictImpact: 0.4,
    phase: 'decision',
    recurrenceChance: 0.05,
  },
  {
    type: 'political',
    title: 'Debata o granicach AI',
    description: 'Zarząd chce ograniczyć autonomię SYNAPSA. Inżynierowie protestują.',
    severity: 'high',
    severityValue: 0.72,
    affectedAgents: ['Architekt_AI_Adam', 'SYNAPSA_Omega', 'CEO_Maja'],
    stressImpact: 0.35,
    trustImpact: -0.2,
    conflictImpact: 0.45,
    topicOverride: 'Ile autonomii powinna mieć SYNAPSA?',
    phase: 'negotiation',
    recurrenceChance: 0.09,
  },
  {
    type: 'ethical',
    title: 'Robot zgłasza problem etyczny',
    description: 'Robot odmawia wykonania zadania z powodów etycznych. Pierwszy taki przypadek.',
    severity: 'high',
    severityValue: 0.78,
    affectedAgents: ['Robot_Artemis', 'Architekt_Elektrociała_Lena', 'CEO_Maja'],
    stressImpact: 0.4,
    trustImpact: 0.1,
    conflictImpact: 0.35,
    topicOverride: 'Czy roboty mają mieć prawa do odmowy?',
    phase: 'negotiation',
    recurrenceChance: 0.06,
  },
  {
    type: 'external',
    title: 'Strajk w fabryce',
    description: 'Związki zawodowe ogłaszają strajk. Produkcja staje.',
    severity: 'critical',
    severityValue: 0.88,
    affectedAgents: ['Kierownik_Marek', 'CEO_Maja', 'Operator_Michal'],
    stressImpact: 0.7,
    trustImpact: -0.5,
    conflictImpact: 0.6,
    topicOverride: 'Jak rozwiązać konflikt pracowniczy?',
    phase: 'complications',
    recurrenceChance: 0.04,
  },
  {
    type: 'personnel',
    title: 'Zbiorowa rezygnacja',
    description: 'Pięciu inżynierów złożyło wypowiedzenia tego samego dnia.',
    severity: 'critical',
    severityValue: 0.9,
    affectedAgents: ['Kierownik_Marek', 'CEO_Maja', 'Inż_Helena'],
    stressImpact: 0.55,
    trustImpact: -0.4,
    conflictImpact: 0.45,
    topicOverride: 'Dlaczego ludzie odchodzą?',
    phase: 'complications',
    recurrenceChance: 0.04,
  },
  {
    type: 'technical',
    title: 'Nowa aktualizacja AI',
    description: 'SYNAPSA otrzymała nowy model. Zmieniło się jej zachowanie.',
    severity: 'high',
    severityValue: 0.7,
    affectedAgents: ['SYNAPSA_Omega', 'Architekt_AI_Adam', 'CEO_Maja'],
    stressImpact: 0.2,
    trustImpact: 0,
    conflictImpact: 0.3,
    topicOverride: 'Czy nowa wersja SYNAPSA jest bezpieczna?',
    phase: 'complications',
    recurrenceChance: 0.08,
  },
];

// Śledzenie cyklicznych tematów
interface TopicCycle {
  topic: string;
  baseEvent: string;
  currentPhase: 'idea' | 'negotiation' | 'decision' | 'complications';
  dayStarted: number;
  twists: string[];
}

const activeTopicCycles: Map<string, TopicCycle> = new Map();

export function generateRandomEvent(dayNumber: number, stressLevel: number = 0.5): ExternalEvent {
  let filteredPool = EVENT_POOL;
  
  if (stressLevel > 0.7) {
    filteredPool = EVENT_POOL.filter(e => Math.random() < e.severityValue);
  }
  
  const event = filteredPool[Math.floor(Math.random() * filteredPool.length)];
  
  return {
    ...event,
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    phase: event.phase || 'idea',
    cycleDay: dayNumber,
  };
}

export function checkForRecurringTopic(dayNumber: number): ExternalEvent | null {
  for (const [topic, cycle] of activeTopicCycles) {
    const daysSinceStart = dayNumber - cycle.dayStarted;
    
    if (daysSinceStart >= 3 && daysSinceStart <= 5 && Math.random() < cycle.twists.length * 0.3) {
      const twist = cycle.twists[Math.floor(Math.random() * cycle.twists.length)];
      
      return {
        id: `twist_${Date.now()}`,
        type: 'ethical',
        title: `TWIST: ${topic}`,
        description: twist,
        severity: 'high',
        severityValue: 0.75,
        affectedAgents: [],
        stressImpact: 0.3,
        trustImpact: -0.2,
        conflictImpact: 0.4,
        topicOverride: twist,
        phase: 'complications',
        cycleDay: dayNumber,
        recurrenceChance: 0,
      };
    }
    
    if (daysSinceStart >= 7) {
      activeTopicCycles.delete(topic);
    }
  }
  return null;
}

export function startTopicCycle(topic: string, baseEventId: string, dayNumber: number) {
  const twists = [
    "Sytuacja eskaluje - pojawiają się nowe komplikacje",
    "Ktoś sabotuje proces - podejrzenia padają na wszystkich",
    "Wewnętrzne źródło ujawnia prawdziwe intencje",
    "Decyzja zostaje podważona przez nowe fakty",
  ];
  
  activeTopicCycles.set(topic, {
    topic,
    baseEvent: baseEventId,
    currentPhase: 'idea',
    dayStarted: dayNumber,
    twists,
  });
}

export function getActiveTopicCycles(): TopicCycle[] {
  return Array.from(activeTopicCycles.values());
}

// Symulacja danych zewnętrznych
export interface ExternalData {
  materialPrices: Record<string, number>;
  marketSentiment: number;
  competitorActivity: string;
}

export function simulateExternalData(): ExternalData {
  const basePrice = 100;
  return {
    materialPrices: {
      titanium: basePrice * (0.8 + Math.random() * 0.4),
      polymer: basePrice * (0.7 + Math.random() * 0.6),
      circuitry: basePrice * (0.9 + Math.random() * 0.2),
      rare_earth: basePrice * (1.1 + Math.random() * 0.8),
    },
    marketSentiment: Math.random() * 2 - 1,
    competitorActivity: Math.random() > 0.5 ? 'expanding' : 'struggling',
  };
}

// ===================== ORYGINALNE: GENEROWANIE PRZEZ LLM =====================

export async function generateDynamicEvent(topic: string, dramaLevel: number = 0.8): Promise<FactoryEvent> {
  const dramaAdjustment = dramaLevel > 0.7 ? "bardzo dramatyczne" : "poważne";
  
  try {
    const res = await generateText({
      model: openai(REASONER_MODEL) as any,
      system:
        "Jesteś generatorem zdarzeń dla fabryki robotów NEUROFORGE-7 w roku 2040. Generuj realistyczne, narracyjnie ważne zdarzenia.",
      prompt: `
Wygeneruj ${dramaAdjustment} zdarzenie w fabryce NEUROFORGE-7.
Temat dnia: ${topic}

Zdarzenie musi:
- wpływać na emocje (konflikt, zagrożenie, triumf)
- być konkretne (liczby, nazwy, parametry techniczne)
- wprowadzać nowy element narracyjny
- mieć jasne konsekwencje dla produkcji

Format: JSON z polami: "description" (tekst), "severity" (0-1), "affected_agents" (komu to właściwie zaszkodzi/wzmocni?)

Odpowiadaj TYLKO JSON:
`,
      temperature: 0.9 * dramaLevel,
      maxOutputTokens: 300,
    });

    const jsonMatch = res.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        description: parsed.description || "Wykryto niezidentyfikowaną anomalię.",
        severity: Math.min(Math.max(parsed.severity || 0.5, 0), 1),
        affected_agents: parsed.affected_agents || [],
      };
    }
  } catch (err) {
    console.warn("Błąd generowania zdarzenia:", err);
  }

  return {
    description: "System SYNAPSA-Omega zarejestrował anomalię. Wymagana analiza.",
    severity: 0.3,
  };
}

export async function recordEvent(event: FactoryEvent) {
  const conn = await getConnection();
  const affectedStr = event.affected_agents ? JSON.stringify(event.affected_agents) : null;
  
  try {
    await conn.query(
      `INSERT INTO factory_events (description, severity, affected_agents) VALUES (?, ?, ?)`,
      [event.description, event.severity, affectedStr]
    );
  } finally {
    conn.release();
  }
}

export async function getRecentEvents(limit: number = 5) {
  const conn = await getConnection();
  try {
    const rows = await conn.query(
      `SELECT description, severity, timestamp FROM factory_events ORDER BY timestamp DESC LIMIT ?`,
      [limit]
    );
    return rows as any;
  } finally {
    conn.release();
  }
}

export async function getEventsByTopic(keyword: string, limit: number = 10) {
  const conn = await getConnection();
  try {
    const rows = await conn.query(
      `SELECT * FROM factory_events WHERE description LIKE ? ORDER BY timestamp DESC LIMIT ?`,
      [`%${keyword}%`, limit]
    );
    return rows as any;
  } finally {
    conn.release();
  }
}
