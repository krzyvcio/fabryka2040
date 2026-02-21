// responseLength.ts – Dynamic response length based on emotional state

export interface ResponseLengthConfig {
  minTokens: number;
  maxTokens: number;
  type:
    | "tiny"
    | "ultra_short"
    | "short"
    | "medium"
    | "long"
    | "very_long";
  category:
    | "minimal"
    | "direct_answer"
    | "dismissive"
    | "elaborate"
    | "emotional_outburst"
    | "technical_deep_dive";
}

/**
 * Determine response length based on agent's emotional state
 * Creates dynamic, natural-feeling conversation variety
 */
export function calculateResponseLength(emotionalState: {
  emotion: string;
  valence: number;
  stress: number;
  arousal: number;
}): ResponseLengthConfig {
  const rand = Math.random();

  // TINY RESPONSES (1-3 words, 2-8 tokens)
  // Extreme frustration, intense emotions, rejection
  if (
    emotionalState.emotion === "angry" ||
    emotionalState.emotion === "frustrated"
  ) {
    if (rand < 0.12) {
      // 12% chance of tiny dismissive
      return {
        minTokens: 2,
        maxTokens: 8,
        type: "tiny",
        category: "minimal",
      };
    }
  }

  // ULTRA SHORT RESPONSES (5-20 tokens)
  // When frustrated, dismissive, or tired
  if (
    emotionalState.emotion === "frustrated" ||
    (emotionalState.arousal > 0.8 && emotionalState.stress > 0.7)
  ) {
    if (rand < 0.2) {
      // 20% chance of ultra-short dismissive
      return {
        minTokens: 5,
        maxTokens: 20,
        type: "ultra_short",
        category: "dismissive",
      };
    }
  }

  // VERY SHORT RESPONSES (20-50 tokens)
  // Simple agreements, basic answers
  if (rand < 0.15) {
    return {
      minTokens: 20,
      maxTokens: 50,
      type: "short",
      category: "direct_answer",
    };
  }

  // SHORT RESPONSES (50-100 tokens)
  // Normal conversation, quick replies
  if (rand < 0.35) {
    return {
      minTokens: 50,
      maxTokens: 100,
      type: "short",
      category: "direct_answer",
    };
  }

  // MEDIUM RESPONSES (100-200 tokens)
  // Standard explanation, default behavior
  if (rand < 0.60) {
    return {
      minTokens: 100,
      maxTokens: 200,
      type: "medium",
      category: "elaborate",
    };
  }

  // LONG RESPONSES (200-400 tokens)
  // When passionate, stressed, or technical
  if (emotionalState.stress > 0.6 || emotionalState.arousal > 0.7) {
    if (rand < 0.80) {
      return {
        minTokens: 200,
        maxTokens: 400,
        type: "long",
        category:
          emotionalState.emotion === "angry" ||
          emotionalState.emotion === "frustrated"
            ? "emotional_outburst"
            : "elaborate",
      };
    }
  }

  // VERY LONG RESPONSES (400-600+ tokens)
  // When very stressed, passionate, or technical deep-dive
  if (
    emotionalState.stress > 0.75 ||
    emotionalState.arousal > 0.85
  ) {
    if (rand < 0.95) {
      return {
        minTokens: 400,
        maxTokens: 650,
        type: "very_long",
        category: "technical_deep_dive",
      };
    }
  }

  // Default: Medium response
  return {
    minTokens: 100,
    maxTokens: 200,
    type: "medium",
    category: "elaborate",
  };
}

/**
 * Generate ultra-short pre-defined responses (bypass LLM)
 * For dismissive, frustrated, or quick answers
 */
export function generateDirectResponse(
  agentName: string,
  emotionalState: {
    emotion: string;
    valence: number;
  }
): string | null {
  // TINY responses (1-3 words)
  const tiny = [
    "Tak.",
    "Nie.",
    "Okej.",
    "Stop.",
    "Nie.",
    "Dość.",
    "Wystarczy.",
    "Tak jest.",
    "Zgoda.",
    "Następny.",
    "Koniec.",
    "Co?",
    "Hm.",
    "Jasne.",
    "Potem.",
  ];

  // Ultra-short dismissive responses
  const dismissive = [
    "Okej, zrobię to.",
    "Już wystarczy.",
    "Nie mam czasu na to.",
    "Odwal się.",
    "To bez sensu.",
    "Following orders.",
    "Zrozumiano.",
    "Tak, cokolwiek.",
    "Następny punkt.",
    "Koniec dyskusji.",
    "Nie da się.",
    "To niemożliwe.",
    "Nie moja sprawa.",
    "Poczekaj.",
    "Może później.",
  ];

  // Frustrated responses
  const frustrated = [
    "Ty chyba żartujesz!",
    "To jest szaleństwo!",
    "Nie słuchasz!",
    "To jest tragedia!",
    "Mam dość!",
    "KONIEC!",
    "Żaden sens!",
    "Beznadzieja!",
    "Wariactwo!",
    "Po co w ogóle mówimy?",
    "Nikt mnie nie słucha!",
    "To bez nadziei!",
    "Fatalnie!",
  ];

  // Agreement responses
  const agree = [
    "Zgadzam się.",
    "Racja.",
    "Dokładnie.",
    "Oczywiście.",
    "Prawda.",
    "Słuszna obserwacja.",
    "Masz rację.",
    "Dokładnie taka jest sytuacja.",
    "Bez wątpienia.",
  ];

  // Disagreement responses
  const disagree = [
    "Się nie zgadzam.",
    "Wątpliwę.",
    "To błąd.",
    "Ależ skąd!",
    "Nieścisłe.",
    "To niemiłe.",
    "Kompletnie się mylisz.",
    "Śmieszne podejście.",
  ];

  // Robot responses
  const robotResponses = [
    "Parametry w normie.",
    "Linia aktywna.",
    "Oczekuję instrukcji.",
    "Proces kontynuowany.",
    "Status: OK.",
    "Implementacja trwa.",
    "Dane synchronizowane.",
    "Operacja zakończona.",
    "Gotów do następnego zadania.",
  ];

  // Select pool based on emotion
  let responsePool = dismissive;

  if (emotionalState.emotion === "angry") {
    responsePool = tiny;  // Angry = ultra minimal!
  } else if (emotionalState.emotion === "frustrated") {
    responsePool = frustrated;
  } else if (
    emotionalState.emotion === "proud" ||
    emotionalState.valence > 0.5
  ) {
    responsePool = agree;
  } else if (emotionalState.emotion === "skeptical") {
    responsePool = disagree;
  }

  // Check if robot
  if (agentName.includes("Robot")) {
    responsePool = robotResponses;
  }

  // 30% chance to return direct response (don't use LLM)
  if (Math.random() < 0.3) {
    return responsePool[Math.floor(Math.random() * responsePool.length)];
  }

  return null;
}

/**
 * Format response length type to human-readable string
 */
export function formatLengthInfo(config: ResponseLengthConfig): string {
  const lengths = {
    tiny: "MINIMALNA",
    ultra_short: "ULTRA-KRÓTKA",
    short: "KRÓTKA",
    medium: "STANDARDOWA",
    long: "DŁUGA",
    very_long: "BARDZO DŁUGA",
  };

  const categories = {
    minimal: "(1-3 słowa)",
    direct_answer: "(bezpośrednia)",
    dismissive: "(odrzucająca)",
    elaborate: "(szczegółowa)",
    emotional_outburst: "(emocjonalny wybuch)",
    technical_deep_dive: "(głębia techniczna)",
  };

  return `${lengths[config.type]} ${categories[config.category]}`;
}

/**
 * Calculate response token limit for LLM call
 * Adds some randomness to exact token count
 */
export function getMaxTokensForResponse(config: ResponseLengthConfig): number {
  // Add ±10% randomness to max tokens
  const variance = config.maxTokens * 0.1;
  const randomVariance = (Math.random() - 0.5) * 2 * variance;
  return Math.round(config.maxTokens + randomVariance);
}
