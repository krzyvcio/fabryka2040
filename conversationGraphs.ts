// conversationGraphs.ts – Dynamic conversation routing graphs
// Defines probable paths for conversations based on emotional state

export interface ConversationNode {
  from: string;
  targets: Array<{
    agent: string;
    baseWeight: number;
    emotionalCondition?: (agentEmotions: Record<string, any>) => number; // Additional weight multiplier
    description?: string;
  }>;
}

export interface ConversationGraph {
  nodes: ConversationNode[];
  randomnessFactor: number; // 0-1, probability to ignore graph and pick random
}

// Graph 1: Hardware vs Software conflict
const hardwareSoftwareGraph: ConversationGraph = {
  nodes: [
    {
      from: "Kierownik_Marek",
      targets: [
        {
          agent: "Inż_Helena",
          baseWeight: 0.35,
          description: "Bezpośrednio do inżyniera ds. software",
        },
        {
          agent: "Dr_Piotr_Materiały",
          baseWeight: 0.35,
          description: "Materiały zawsze są problem",
        },
        {
          agent: "SYNAPSA_System",
          baseWeight: 0.2,
          emotionalCondition: (emotions) =>
            emotions["Kierownik_Marek"]?.stress > 0.7 ? 1.5 : 0.5,
          description: "Jeśli zestresowany, szuka arbitrażu",
        },
        {
          agent: "Pracownik_Tomek",
          baseWeight: 0.1,
          emotionalCondition: (emotions) =>
            emotions["Kierownik_Marek"]?.valence < -0.3 ? 1.2 : 0,
          description: "Jeśli negatywny, szuka człowieka",
        },
      ],
    },

    {
      from: "Inż_Helena",
      targets: [
        {
          agent: "Dr_Piotr_Materiały",
          baseWeight: 0.4,
          description: "Natura konfliktu - kod vs fizyka",
        },
        {
          agent: "Robot_Artemis",
          baseWeight: 0.3,
          description: "Robot zgadza się z logiką",
        },
        {
          agent: "Kierownik_Marek",
          baseWeight: 0.2,
          emotionalCondition: (emotions) =>
            emotions["Inż_Helena"]?.stress > 0.8 ? 2.0 : 0.5,
          description: "Jeśli wysoki stres, eskaluje do kierownika",
        },
        {
          agent: "SYNAPSA_System",
          baseWeight: 0.1,
          description: "System potwierdzi dane",
        },
      ],
    },

    {
      from: "Dr_Piotr_Materiały",
      targets: [
        {
          agent: "Inż_Helena",
          baseWeight: 0.4,
          description: "Kontruje kod argument materiałowy",
        },
        {
          agent: "Robot_Artemis",
          baseWeight: 0.25,
          description: "Robot zna limity sprzętu",
        },
        {
          agent: "Pracownik_Tomek",
          baseWeight: 0.2,
          emotionalCondition: (emotions) =>
            emotions["Dr_Piotr_Materiały"]?.arousal > 0.7 ? 1.5 : 0.7,
          description: "Operator rozumie ograniczenia sprzętu",
        },
        {
          agent: "SYNAPSA_System",
          baseWeight: 0.15,
          description: "Potwierdzenie danych fizycznych",
        },
      ],
    },

    {
      from: "Robot_Artemis",
      targets: [
        {
          agent: "Kierownik_Marek",
          baseWeight: 0.35,
          emotionalCondition: (emotions) =>
            emotions["Robot_Artemis"]?.valence < -0.2 ? 2.0 : 1.0,
          description: "Raportuje do kierownika",
        },
        {
          agent: "SYNAPSA_System",
          baseWeight: 0.3,
          description: "Podziela dane z systemem",
        },
        {
          agent: "Inż_Helena",
          baseWeight: 0.2,
          emotionalCondition: (emotions) =>
            emotions["Robot_Artemis"]?.arousal > 0.6 ? 1.5 : 0.5,
          description: "Jeśli aktywny, szuka optymalizacji software",
        },
        {
          agent: "Dr_Piotr_Materiały",
          baseWeight: 0.15,
          description: "Weryfikacja ograniczeń sprzętu",
        },
      ],
    },

    {
      from: "Pracownik_Tomek",
      targets: [
        {
          agent: "Kierownik_Marek",
          baseWeight: 0.4,
          emotionalCondition: (emotions) =>
            emotions["Pracownik_Tomek"]?.arousal > 0.7 ? 1.8 : 1.0,
          description: "Emocjonalnie do kierownika",
        },
        {
          agent: "Dr_Piotr_Materiały",
          baseWeight: 0.3,
          description: "Poparcie dla ograniczeń fizyki",
        },
        {
          agent: "Robot_Artemis",
          baseWeight: 0.15,
          emotionalCondition: (emotions) =>
            emotions["Pracownik_Tomek"]?.valence > 0.5 ? 0.8 : 2.0,
          description: "Jeśli zły, konfrontuje robota",
        },
        {
          agent: "Inż_Helena",
          baseWeight: 0.15,
          emotionalCondition: (emotions) =>
            emotions["Pracownik_Tomek"]?.stress > 0.8 ? 2.0 : 0.3,
          description: "Jeśli wysoki stres, krytykuje kod",
        },
      ],
    },

    {
      from: "SYNAPSA_System",
      targets: [
        {
          agent: "Kierownik_Marek",
          baseWeight: 0.35,
          emotionalCondition: (emotions) => {
            const groupStress = Object.values(emotions).reduce((sum: any, e: any) => sum + e.stress, 0) / 6;
            return groupStress > 0.7 ? 1.5 : 1.0;
          },
          description: "Jeśli wysoki stres grupy, raportuje",
        },
        {
          agent: "Robot_Artemis",
          baseWeight: 0.25,
          description: "Synchronizacja danych operacyjnych",
        },
        {
          agent: "Inż_Helena",
          baseWeight: 0.2,
          emotionalCondition: (emotions) =>
            emotions["Inż_Helena"]?.valence < 0 ? 2.0 : 0.5,
          description: "Jeśli inżynierka negatywna, wspiera dane",
        },
        {
          agent: "Dr_Piotr_Materiały",
          baseWeight: 0.2,
          description: "Potwierdza parametry fizyczne",
        },
      ],
    },
  ],

  randomnessFactor: 0.15, // 15% szans na random wybór
};

// Graph 2: Escalation/Resolution path
const escalationGraph: ConversationGraph = {
  nodes: [
    {
      from: "Pracownik_Tomek",
      targets: [
        {
          agent: "Kierownik_Marek",
          baseWeight: 0.6,
          emotionalCondition: (emotions) =>
            emotions["Pracownik_Tomek"]?.stress > 0.75 ? 2.0 : 1.2,
          description: "Bezpośrednia eskalacja",
        },
        {
          agent: "Robot_Artemis",
          baseWeight: 0.2,
          description: "Techniczny support",
        },
        {
          agent: "Dr_Piotr_Materiały",
          baseWeight: 0.2,
          description: "Materialny problem",
        },
      ],
    },

    {
      from: "Kierownik_Marek",
      targets: [
        {
          agent: "SYNAPSA_System",
          baseWeight: 0.4,
          emotionalCondition: (emotions) =>
            emotions["Kierownik_Marek"]?.arousal > 0.8 ? 2.0 : 0.8,
          description: "Szuka decyzji systemowej",
        },
        {
          agent: "Inż_Helena",
          baseWeight: 0.35,
          description: "Potrzebuje szybkiego rozwiązania",
        },
        {
          agent: "Dr_Piotr_Materiały",
          baseWeight: 0.25,
          description: "Analiza przyczyn",
        },
      ],
    },

    {
      from: "SYNAPSA_System",
      targets: [
        {
          agent: "Kierownik_Marek",
          baseWeight: 0.5,
          description: "Raport końcowy",
        },
        {
          agent: "Robot_Artemis",
          baseWeight: 0.35,
          description: "Implementacja decyzji",
        },
        {
          agent: "Inż_Helena",
          baseWeight: 0.15,
          emotionalCondition: (emotions) =>
            emotions["Inż_Helena"]?.valence < -0.4 ? 2.0 : 0.3,
          description: "Jeśli inżynierka negatywna, wymaga justyfikacji",
        },
      ],
    },
  ],

  randomnessFactor: 0.2, // 20% szans na random
};

// Graph 3: Technical deep-dive
const technicalGraph: ConversationGraph = {
  nodes: [
    {
      from: "Inż_Helena",
      targets: [
        {
          agent: "Robot_Artemis",
          baseWeight: 0.45,
          description: "Wsparcie operacyjne",
        },
        {
          agent: "SYNAPSA_System",
          baseWeight: 0.3,
          description: "Analiza danych",
        },
        {
          agent: "Dr_Piotr_Materiały",
          baseWeight: 0.25,
          emotionalCondition: (emotions) =>
            emotions["Inż_Helena"]?.stress > 0.7 ? 2.0 : 0.5,
          description: "Jeśli stres, szuka oparcia",
        },
      ],
    },

    {
      from: "Robot_Artemis",
      targets: [
        {
          agent: "Inż_Helena",
          baseWeight: 0.4,
          description: "Feedback do inżynierki",
        },
        {
          agent: "SYNAPSA_System",
          baseWeight: 0.35,
          description: "Raport systemowy",
        },
        {
          agent: "Kierownik_Marek",
          baseWeight: 0.25,
          emotionalCondition: (emotions) =>
            emotions["Robot_Artemis"]?.valence < -0.3 ? 1.8 : 0.8,
          description: "Jeśli problem, do kierownika",
        },
      ],
    },

    {
      from: "SYNAPSA_System",
      targets: [
        {
          agent: "Robot_Artemis",
          baseWeight: 0.4,
          description: "Instrukcje operacyjne",
        },
        {
          agent: "Inż_Helena",
          baseWeight: 0.35,
          description: "Feedback inżynierski",
        },
        {
          agent: "Dr_Piotr_Materiały",
          baseWeight: 0.25,
          description: "Parametry fizyczne",
        },
      ],
    },
  ],

  randomnessFactor: 0.1, // 10% szans na random
};

// Graph 4: Emotional/Personnel
const emotionalGraph: ConversationGraph = {
  nodes: [
    {
      from: "Pracownik_Tomek",
      targets: [
        {
          agent: "Kierownik_Marek",
          baseWeight: 0.5,
          emotionalCondition: (emotions) =>
            emotions["Pracownik_Tomek"]?.arousal > 0.8 ? 2.0 : 1.0,
          description: "Szuka wsparcia",
        },
        {
          agent: "Dr_Piotr_Materiały",
          baseWeight: 0.3,
          description: "Solidarność materiałowa",
        },
        {
          agent: "Robot_Artemis",
          baseWeight: 0.2,
          emotionalCondition: (emotions) =>
            emotions["Pracownik_Tomek"]?.valence < -0.5 ? 2.0 : 0.3,
          description: "Jeśli zły, skrytykuje robota",
        },
      ],
    },

    {
      from: "Kierownik_Marek",
      targets: [
        {
          agent: "Pracownik_Tomek",
          baseWeight: 0.4,
          emotionalCondition: (emotions) =>
            emotions["Pracownik_Tomek"]?.stress > 0.7 ? 1.8 : 0.8,
          description: "Wsparcie dla operatora",
        },
        {
          agent: "SYNAPSA_System",
          baseWeight: 0.35,
          description: "Szuka danych do decyzji",
        },
        {
          agent: "Inż_Helena",
          baseWeight: 0.25,
          description: "Techniczne rozwiązanie",
        },
      ],
    },

    {
      from: "Dr_Piotr_Materiały",
      targets: [
        {
          agent: "Pracownik_Tomek",
          baseWeight: 0.4,
          emotionalCondition: (emotions) =>
            emotions["Pracownik_Tomek"]?.valence < -0.3 ? 2.0 : 1.0,
          description: "Poparcie dla człowieka",
        },
        {
          agent: "Kierownik_Marek",
          baseWeight: 0.35,
          description: "Raport do kierownika",
        },
        {
          agent: "Robot_Artemis",
          baseWeight: 0.25,
          description: "Ograniczenia sprzętu",
        },
      ],
    },
  ],

  randomnessFactor: 0.25, // 25% szans na random - emocje są bardziej chaotyczne
};

// Export all graphs
export const allConversationGraphs = [
  hardwareSoftwareGraph,
  escalationGraph,
  technicalGraph,
  emotionalGraph,
];

/**
 * Select next speaker based on current speaker, conversation graph, and emotional states
 * Combines graph-based routing with emotional weighting and randomness
 * ENSURES MINIMUM 2 OPTIONS
 */
export function selectNextSpeakerFromGraph(
  currentSpeaker: string,
  graph: ConversationGraph,
  agentEmotions: Record<string, any>,
  availableAgents: string[]
): string | null {
  // Find current speaker's node in graph
  const node = graph.nodes.find((n) => n.from === currentSpeaker);
  if (!node) {
    return null;
  }

  // Calculate scores for each target
  const scores: Array<{ agent: string; score: number }> = [];

  for (const target of node.targets) {
    // Skip if agent not available
    if (!availableAgents.includes(target.agent)) {
      continue;
    }

    let score = target.baseWeight;

    // Apply emotional condition multiplier if exists
    if (target.emotionalCondition) {
      const emotionalMultiplier = target.emotionalCondition(agentEmotions);
      score *= emotionalMultiplier;
    }

    scores.push({ agent: target.agent, score });
  }

  // VALIDATION: Ensure minimum 2 options (if not in graph, add fallbacks)
  if (scores.length < 2) {
    // Add remaining available agents as fallback options
    const usedAgents = new Set(scores.map((s) => s.agent));
    const fallbacks = availableAgents.filter((a) => !usedAgents.has(a));

    for (const fallback of fallbacks.slice(0, 2 - scores.length)) {
      scores.push({
        agent: fallback,
        score: 0.3, // Low but viable score
      });
    }
  }

  if (scores.length === 0) {
    return null;
  }

  // Apply randomness factor - sometimes ignore graph
  if (Math.random() < graph.randomnessFactor) {
    // Pick random available agent
    return availableAgents[Math.floor(Math.random() * availableAgents.length)];
  }

  // Normalize scores
  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
  const normalized = scores.map((s) => ({
    agent: s.agent,
    probability: s.score / totalScore,
  }));

  // Weighted random selection (roulette wheel)
  let random = Math.random();
  let cumulative = 0;

  for (const option of normalized) {
    cumulative += option.probability;
    if (random <= cumulative) {
      return option.agent;
    }
  }

  return normalized[normalized.length - 1].agent;
}

/**
 * Select appropriate graph based on conversation state
 */
export function selectGraphForContext(
  lastMessage: string,
  currentAffect: { avg_stress: number; avg_valence: number }
): ConversationGraph {
  // High stress = escalation graph
  if (currentAffect.avg_stress > 0.75) {
    return escalationGraph;
  }

  // Low valence (negative) = emotional graph
  if (currentAffect.avg_valence < -0.4) {
    return emotionalGraph;
  }

  // Check if message contains technical keywords
  const technicalKeywords = [
    "algorytm",
    "kalibrac",
    "optymalizac",
    "kod",
    "model",
    "dane",
    "system",
  ];
  if (technicalKeywords.some((kw) => lastMessage.toLowerCase().includes(kw))) {
    return technicalGraph;
  }

  // Default to hardware/software conflict
  return hardwareSoftwareGraph;
}
