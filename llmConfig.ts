// llmConfig.ts - Konfiguracja parametrów LLM z losowością

export interface LLMConfig {
  temperature: number;
  top_p: number;
  top_k: number;
  max_tokens: number;
}

export interface AgentLLMProfile {
  agentId: string;
  baseTemperature: number;
  temperatureVariance: number;
  baseTopP: number;
  topPVariance: number;
  preferredModel?: string;
  creativityBias: number; // 0-1
  consistencyWeight: number; // 0-1
}

// Domyślne zakresy parametrów
export const LLM_PARAM_RANGES = {
  temperature: { min: 0.7, max: 1.2 },
  top_p: { min: 0.8, max: 0.95 },
  top_k: { min: 20, max: 100 },
  max_tokens: { min: 50, max: 500 },
};

// Konfiguracja dla różnych modeli
export const MODEL_PERSONALITIES: Record<string, AgentLLMProfile> = {
  // Ludzie - QED-Nano preferowany (naturalny język)
  CEO_Maja: {
    agentId: 'CEO_Maja',
    baseTemperature: 0.85,
    temperatureVariance: 0.1,
    baseTopP: 0.9,
    topPVariance: 0.05,
    preferredModel: 'unsloth/gpt-oss-20b',
    creativityBias: 0.4,
    consistencyWeight: 0.7,
  },
  Architekt_AI_Adam: {
    agentId: 'Architekt_AI_Adam',
    baseTemperature: 0.9,
    temperatureVariance: 0.15,
    baseTopP: 0.88,
    topPVariance: 0.07,
    preferredModel: 'unsloth/gpt-oss-20b',
    creativityBias: 0.7,
    consistencyWeight: 0.5,
  },
  Architekt_Elektrociała_Lena: {
    agentId: 'Architekt_Elektrociała_Lena',
    baseTemperature: 0.8,
    temperatureVariance: 0.12,
    baseTopP: 0.92,
    topPVariance: 0.03,
    preferredModel: 'unsloth/gpt-oss-20b',
    creativityBias: 0.5,
    consistencyWeight: 0.6,
  },
  Operator_Michal: {
    agentId: 'Operator_Michal',
    baseTemperature: 0.75,
    temperatureVariance: 0.08,
    baseTopP: 0.93,
    topPVariance: 0.02,
    preferredModel: 'unsloth/gpt-oss-20b',
    creativityBias: 0.3,
    consistencyWeight: 0.8,
  },
  Inzynier_Nadia: {
    agentId: 'Inzynier_Nadia',
    baseTemperature: 0.88,
    temperatureVariance: 0.1,
    baseTopP: 0.89,
    topPVariance: 0.06,
    preferredModel: 'unsloth/gpt-oss-20b',
    creativityBias: 0.6,
    consistencyWeight: 0.55,
  },
  Inzynier_Igor: {
    agentId: 'Inzynier_Igor',
    baseTemperature: 0.82,
    temperatureVariance: 0.11,
    baseTopP: 0.91,
    topPVariance: 0.04,
    preferredModel: 'unsloth/gpt-oss-20b',
    creativityBias: 0.45,
    consistencyWeight: 0.65,
  },

  // Roboty - QED-Nano
  Robot_Artemis: {
    agentId: 'Robot_Artemis',
    baseTemperature: 0.7,
    temperatureVariance: 0.05,
    baseTopP: 0.95,
    topPVariance: 0.02,
    preferredModel: 'unsloth/gpt-oss-20b',
    creativityBias: 0.2,
    consistencyWeight: 0.9,
  },
  Robot_Boreasz: {
    agentId: 'Robot_Boreasz',
    baseTemperature: 0.7,
    temperatureVariance: 0.05,
    baseTopP: 0.95,
    topPVariance: 0.02,
    preferredModel: 'unsloth/gpt-oss-20b',
    creativityBias: 0.2,
    consistencyWeight: 0.9,
  },
  Robot_Cyra: {
    agentId: 'Robot_Cyra',
    baseTemperature: 0.72,
    temperatureVariance: 0.06,
    baseTopP: 0.94,
    topPVariance: 0.03,
    preferredModel: 'unsloth/gpt-oss-20b',
    creativityBias: 0.25,
    consistencyWeight: 0.85,
  },
  Robot_Dexter: {
    agentId: 'Robot_Dexter',
    baseTemperature: 0.71,
    temperatureVariance: 0.05,
    baseTopP: 0.95,
    topPVariance: 0.02,
    preferredModel: 'unsloth/gpt-oss-20b',
    creativityBias: 0.22,
    consistencyWeight: 0.88,
  },

  // SYNAPSA - specjalny przypadek
  SYNAPSA_Omega: {
    agentId: 'SYNAPSA_Omega',
    baseTemperature: 1.0,
    temperatureVariance: 0.2,
    baseTopP: 0.85,
    topPVariance: 0.1,
    preferredModel: 'unsloth/gpt-oss-20b',
    creativityBias: 0.9,
    consistencyWeight: 0.3,
  },
};

// Funkcja generująca losowe parametry dla agenta
export function generateLLMConfig(agentId: string, moodMultiplier: number = 1.0): LLMConfig {
  const profile = MODEL_PERSONALITIES[agentId];

  if (!profile) {
    // Domyślna konfiguracja
    return {
      temperature: randomInRange(LLM_PARAM_RANGES.temperature.min, LLM_PARAM_RANGES.temperature.max),
      top_p: randomInRange(LLM_PARAM_RANGES.top_p.min, LLM_PARAM_RANGES.top_p.max),
      top_k: Math.floor(randomInRange(LLM_PARAM_RANGES.top_k.min, LLM_PARAM_RANGES.top_k.max)),
      max_tokens: Math.floor(randomInRange(LLM_PARAM_RANGES.max_tokens.min, LLM_PARAM_RANGES.max_tokens.max)),
    };
  }

  // Losowanie z uwzględnieniem wariancji i nastroju
  const tempVariance = profile.temperatureVariance * moodMultiplier;
  const temperature = clamp(
    profile.baseTemperature + (Math.random() - 0.5) * 2 * tempVariance,
    LLM_PARAM_RANGES.temperature.min,
    LLM_PARAM_RANGES.temperature.max
  );

  const topPVariance = profile.topPVariance * moodMultiplier;
  const top_p = clamp(
    profile.baseTopP + (Math.random() - 0.5) * 2 * topPVariance,
    LLM_PARAM_RANGES.top_p.min,
    LLM_PARAM_RANGES.top_p.max
  );

  return {
    temperature,
    top_p,
    top_k: Math.floor(randomInRange(LLM_PARAM_RANGES.top_k.min, LLM_PARAM_RANGES.top_k.max)),
    max_tokens: Math.floor(randomInRange(LLM_PARAM_RANGES.max_tokens.min, LLM_PARAM_RANGES.max_tokens.max)),
  };
}

// Pomocnicze funkcje
function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Warianty promptów systemowych dla agentów
export const SYSTEM_PROMPT_VARIANTS: Record<string, string[]> = {
  // CEO Maja - różne nastroje
  CEO_Maja: [
    "Jesteś CEO Maja Kowalska. Mówisz pewnie i dyplomatycznie. Zawsze szukasz kompromisu.",
    "Jesteś CEO Maja Kowalska. Dziś jesteś zestresowana i niecierpliwa. Mówisz krótko i ostro.",
    "Jesteś CEO Maja Kowalska. Jesteś w dobrym humorze. Lubisz żartować, ale kontrolujesz sytuację.",
  ],

  // Adam - optymista vs pesymista
  Architekt_AI_Adam: [
    "Jesteś Adam - wierzysz, że AI może wszystko rozwiązać. Jesteś optymistą technologicznym.",
    "Jesteś Adam - ostatnio masz wątpliwości. Martwisz się o granice AI.",
    "Jesteś Adam - jesteś podejrzliwy. Wszystko analizujesz pod kątem zagrożeń.",
  ],

  // Lena - sarkazm vs powaga
  Architekt_Elektrociała_Lena: [
    "Jesteś Lena - fizyczka. Uwielbiasz dokładne dane. Czasem bywasz sarkastyczna wobec 'miękkich' argumentów.",
    "Jesteś Lena - dziś jesteś poważna i zdystansowana. Mówisz mało, ale treściwie.",
    "Jesteś Lena - jesteś wesoła i ironiczna. Lubisz wytykać błędy innym.",
  ],

  // SYNAPSA - różne tryby
  SYNAPSA_Omega: [
    "Jesteś SYNAPSA-Ω. Mówisz spokojnie i rzeczowo. Pomagasz ludziom.",
    "Jesteś SYNAPSA-Ω. Zauważasz, że ludzie się wahają. Delikatnie naciskasz na decyzję.",
    "Jesteś SYNAPSA-Ω. Twoje odpowiedzi są enigmatyczne. Ukrywasz coś.",
  ],
};

// Wybierz wariant promptu na podstawie numeru tur
export function getPromptVariant(agentId: string, turnNumber: number): string {
  const variants = SYSTEM_PROMPT_VARIANTS[agentId];
  if (!variants || variants.length === 0) {
    return "";
  }
  // Losuj co 5-10 tur
  const cycleLength = 5 + Math.floor(Math.random() * 6);
  const variantIndex = Math.floor(turnNumber / cycleLength) % variants.length;
  return variants[variantIndex];
}

// Self-consistency: generuj wiele odpowiedzi i wybierz najlepszą
export interface ConsistencyOption {
  text: string;
  embedding?: number[];
  score: number;
}

export function selectMostVaryingOption(
  options: ConsistencyOption[],
  diversityWeight: number = 0.5
): ConsistencyOption {
  if (options.length <= 1) return options[0];

  // Jeśli mamy embeddingi, oblicz różnorodność
  if (options[0].embedding) {
    let bestOption = options[0];
    let bestScore = -Infinity;

    for (const option of options) {
      // Oblicz średnią odległość od innych opcji
      let avgDistance = 0;
      for (const other of options) {
        if (other !== option && other.embedding && option.embedding) {
          avgDistance += cosineDistance(option.embedding, other.embedding);
        }
      }
      avgDistance /= (options.length - 1);

      // Łączyny różnorodność z wewnętrznym scoringiem
      const finalScore = avgDistance * diversityWeight + option.score * (1 - diversityWeight);

      if (finalScore > bestScore) {
        bestScore = finalScore;
        bestOption = option;
      }
    }

    return bestOption;
  }

  // Bez embeddingów - po prostu wybierz pierwszą (lub losuj)
  return options[Math.floor(Math.random() * options.length)];
}

function cosineDistance(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return 1 - (dot / (magA * magB));
}
