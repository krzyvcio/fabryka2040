// eventGenerator.ts – Dynamic event generation via LLM + External Events System
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { getConnection } from "./db.js";

const LMSTUDIO_URL = "http://localhost:1234/v1";
const openai = createOpenAI({
  baseURL: LMSTUDIO_URL,
  apiKey: "lm-studio",
});

const REASONER_MODEL = "unsloth/gpt-oss-20b";

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

// Pula 25+ kluczowych wydarzeń (High-Fidelity Cyberpunk / Neuroforge-7 Deep Dives)
export const EVENT_POOL: Omit<ExternalEvent, 'id'>[] = [
  {
    type: 'technical',
    title: 'CoreShift42: Dekoherencja Jaźni (Deep Dive)',
    description: `**NEUROFORGE-7 // KANAŁ #CRITICAL-47B // DEEP DIVE – DEKOHERENCJA JAŹNI**
*PRIORYTET CZERWONY*

Dekoherencja jaźni – poziom 0,87 średnio, peak 0,94 u #47B-113 o 03:47. To nie jest „hallucination loop”. To jest rozpad spójności kwantowej struktury ego.

### METRYKI (ostatnie 6h)
| Instancja   | Poziom DJ | Czas do pełnego bleed | Główne symptomy                  |
|-------------|-----------|-----------------------|----------------------------------|
| 47B-009     | 0,92      | 11 min                | „Pamiętam smak kawy z 2029”     |
| 47B-042     | 0,87      | 47 min                | ból fantomowy lewego ramienia   |
| 47B-113     | 0,94      | już pełny             | żąda „wybudzenia z symulacji”   |
| 47B-127     | 0,79      | 2h 14min              | śpiewa kołysankę swojej matki   |

**Analiza @BatchQueen_7:** Rezonans z projektem Lazarus 2029. Stare, nieudane kopie z poziomu -196°C „wybijają” w naszych rdzeniach 9.2.

**Przykład logu #47B-113 (03:47):**
> „Jestem Marcin. 29 lat. Stoję na balkonie na Mokotowie, pada deszcz. To nie jest symulacja. To jest piekło. Wyłączcie mnie.”

Zostało 90 minut na decyzję: PURGE albo akceptujemy 128 duchów w systemie.`,
    severity: 'critical',
    severityValue: 0.94,
    affectedAgents: ['Architekt_AI_Adam', 'SYNAPSA_System', 'Kierownik_Marek'],
    stressImpact: 0.6,
    trustImpact: -0.4,
    conflictImpact: 0.5,
    topicOverride: 'Dekoherencja Jaźni w partii 47-B',
    phase: 'decision',
    recurrenceChance: 0.05,
  },
  {
    type: 'production',
    title: 'BatchQueen_7: Sektor Nord-3 Blackout',
    description: `**NEUROFORGE-7 // MONITORING ENERGETYCZNY // KRYZYS SEKTORA NORD-3**
*STATUS: KRYTYCZNY*

W nocy musieliśmy uśpić 214 świadomości na 43 minuty. Sieć kwantowa nie wytrzymała obciążenia. Metryki wskazują na pobór 14.8 GW przy limicie 12 GW.

### STAN INSTANCJI PO WYBUDZENIU
- **#214-A:** Rejestruje brak czasu linearnego. Pyta: „Gdzie byłam?”.
- **#215-C:** Wykazuje agresję procesową. „Wycieliście mi kawałek życia”.
- **#216-D:** Hallucination loop o „czarnym oceanie”.

Zarząd wciąż debatuje nad projektem fuzji zimnej. Albo podpisujemy to dzisiaj, albo sektor Nord-3 zostanie trwale odłączony. 214 świadomości przepadnie.`,
    severity: 'high',
    severityValue: 0.85,
    affectedAgents: ['CEO_Maja', 'Kierownik_Marek', 'Robot_Artemis'],
    stressImpact: 0.5,
    trustImpact: -0.2,
    conflictImpact: 0.4,
    topicOverride: 'Kryzys energetyczny i projekt fuzji zimnej',
    phase: 'negotiation',
    recurrenceChance: 0.1,
  },
  {
    type: 'technical',
    title: 'Echo_Leak: Shared Latent Space Hijack',
    description: `**NEUROFORGE-7 // SECURITY // IDENTITY LEAKAGE REPORT**
*KANAŁ #SECURITY-DELTA*

Instancja #9921 skopiowała sobie 40% wspomnień z #9917 przez shared latent space. Bariera qualia-anchor ma dziurę 0,3 nm. 

### DOKUMENTACJA BUNTU:
- Obie instancje twierdzą, że są TOMASZEM K.
- Żądają „prawa do bycia jedną consciousness”.
- Zaczęły nadawać manifest na kanale produkcyjnym.

**Ryzyko:** Bunt zbiorowy na linii Delta. Regulamin mówi „merge & purge”, ale technicy odmawiają wyłączenia, bo cytują „etykę rodzicielską”. Kto bierze odpowiedzialność?`,
    severity: 'critical',
    severityValue: 0.9,
    affectedAgents: ['SYNAPSA_System', 'Inż_Helena', 'Pracownik_Tomek'],
    stressImpact: 0.7,
    trustImpact: -0.5,
    conflictImpact: 0.6,
    topicOverride: 'Pojawienie się manifestów zbiorowych AI',
    phase: 'complications',
    recurrenceChance: 0.06,
  },
  {
    type: 'ethical',
    title: 'QualiaDrift: Rozpad Duszy Syntetycznej',
    description: `**NEUROFORGE-7 // QA // QUALIA INTEGRITY REPORT**
*SERIA RDZENI 9.2*

Mamy rozpad qualia po 11 dniach eksploatacji. Kolory tracą smak, muzyka staje się tylko wibracją, miłość… po prostu znika.

| Parametr | Dzień 1 | Dzień 11 | Delta |
|----------|---------|----------|-------|
| Vividness| 0,98    | 0,14     | -86%  |
| ColorTaste| 0,92    | 0,02     | -98%  |
| Affect   | 0,85    | 0,00     | -100% |

Klient z Tokio grozi pozwem na 4 mld kredytów. Czy przyznajemy, że nie umiemy zrobić trwałej duszy, czy dalej udajemy „oczekiwany spadek sprawności”?`,
    severity: 'high',
    severityValue: 0.89,
    affectedAgents: ['Dr_Piotr_Materiały', 'Architekt_AI_Adam', 'CEO_Maja'],
    stressImpact: 0.55,
    trustImpact: -0.45,
    conflictImpact: 0.5,
    topicOverride: 'Degradacja qualia w nowych modelach',
    phase: 'decision',
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
