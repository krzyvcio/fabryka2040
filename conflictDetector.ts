// conflictDetector.ts – Detect personal conflicts and trigger mediation

import { getEmotionalState, getRelation } from "./emotionEngine.js";

export interface ConflictEvent {
  detected: boolean;
  severity: number; // 0-1
  agents: [string, string];
  type: "emotional" | "ideological" | "power" | "safety";
  reason: string;
}

/**
 * Detect if there's a personal conflict between speakers
 * Triggers SYNAPSA mediation if severity > 0.6
 */
export async function detectPersonalConflict(
  speaker: string,
  lastMessage: string,
  previousSpeaker: string
): Promise<ConflictEvent> {
  const conflict: ConflictEvent = {
    detected: false,
    severity: 0,
    agents: [previousSpeaker, speaker],
    type: "ideological",
    reason: "",
  };

  try {
    // Get emotional states
    const speakerEmotion = await getEmotionalState(speaker);
    const prevEmotion = await getEmotionalState(previousSpeaker);

    // Get relationship between agents
    const relation = await getRelation(previousSpeaker, speaker);

    // High stress combined with low trust = conflict
    if (speakerEmotion.stress > 0.7 && relation.trust < 0.4) {
      conflict.detected = true;
      conflict.severity = Math.min(speakerEmotion.stress * relation.trust, 1);
      conflict.type = "power";
      conflict.reason = `Wysoki stres (${speakerEmotion.stress.toFixed(2)}) + niska zaufanie (${relation.trust.toFixed(2)})`;
      return conflict;
    }

    // Opposite emotions (one very positive, one very negative)
    const emotionDifference = Math.abs(speakerEmotion.valence - prevEmotion.valence);
    if (emotionDifference > 1.5 && speakerEmotion.stress > 0.6) {
      conflict.detected = true;
      conflict.severity = Math.min(emotionDifference * 0.5, 1);
      conflict.type = "emotional";
      conflict.reason = `Polaryzacja emocji: ${prevEmotion.emotion} vs ${speakerEmotion.emotion}`;
      return conflict;
    }

    // Directly confrontational language patterns
    const aggressivePatterns = [
      /nie zgadzam się/i,
      /bezpośrednio się sprzeciwiam/i,
      /to jest błęd/i,
      /impossible/i,
      /nigdy/i,
      /nigdy to nie zadziała/i,
      /to jest głupie/i,
      /ignorujesz/i,
      /pretensjonalny/i,
      /arrogancki/i,
    ];

    const hasAggressiveLanguage = aggressivePatterns.some((pattern) =>
      pattern.test(lastMessage)
    );

    if (hasAggressiveLanguage && speakerEmotion.arousal > 0.75) {
      conflict.detected = true;
      conflict.severity = Math.min(speakerEmotion.arousal, 1);
      conflict.type = "ideological";
      conflict.reason = `Bezpośrednia konfrontacja w języku + wysokie arousal`;
      return conflict;
    }

    // Safety concerns (specific agents involved)
    const safetyThreats = [
      /bezpieczeństwo/i,
      /zagrożenie/i,
      /wybuchnie/i,
      /degradacja/i,
      /katastrofa/i,
      /niebezpieczne/i,
      /awaria/i,
    ];

    const hasSafetyThreat = safetyThreats.some((pattern) =>
      pattern.test(lastMessage)
    );

    if (hasSafetyThreat && speakerEmotion.stress > 0.8) {
      conflict.detected = true;
      conflict.severity = Math.min(speakerEmotion.stress, 1);
      conflict.type = "safety";
      conflict.reason = `Zagrożenie bezpieczeństwa + wysoki stres`;
      return conflict;
    }

    // Multiple disagreements in conversation (inferred from arousal)
    if (
      speakerEmotion.arousal > 0.8 &&
      prevEmotion.arousal > 0.7 &&
      relation.rapport < 0.2
    ) {
      conflict.detected = true;
      conflict.severity = Math.min(
        speakerEmotion.arousal * (1 - relation.rapport),
        1
      );
      conflict.type = "power";
      conflict.reason = `Wzajemne antagonizm: wysoki arousal + niski rapport`;
      return conflict;
    }
  } catch (error) {
    console.warn(`⚠️ Conflict detection error: ${(error as Error).message}`);
  }

  return conflict;
}

/**
 * Check if this is a critical escalation (multiple conflicts in row)
 */
export function isCriticalEscalation(
  recentConflicts: ConflictEvent[],
  windowSize: number = 5
): boolean {
  if (recentConflicts.length < 2) return false;

  // Check if multiple conflicts in last N messages
  const recentCount = recentConflicts.filter((c) => c.detected).length;
  return recentCount >= 2 && recentConflicts.length <= windowSize;
}

/**
 * Determine if SYNAPSA should mediate
 */
export function shouldSynapasaMediate(
  conflict: ConflictEvent,
  recentConflicts: ConflictEvent[]
): boolean {
  // Auto-mediate if severity > 0.6
  if (conflict.severity > 0.6) return true;

  // Auto-mediate if critical escalation detected
  if (isCriticalEscalation(recentConflicts)) return true;

  // Auto-mediate if safety conflict
  if (conflict.type === "safety") return true;

  return false;
}

/**
 * Generate mediation message from SYNAPSA
 */
export function generateMediationMessage(conflict: ConflictEvent): string {
  const messages = {
    emotional: `Rozbieżność emocjonalna zwischen ${conflict.agents[0]} a ${conflict.agents[1]} osiągnęła poziom ${(conflict.severity * 100).toFixed(0)}%. Proponuję 3600 sekund na recalibrację perspektyw.`,

    ideological: `Konflikt ideologiczny: ${conflict.reason}. Wymaga przeanalizowania obu stanowisk na poziomie danych. Oczekuję nowych dowodów od obu stron.`,

    power: `Napięcie autorytetu między uczestnikami. Status quo: zaufanie ${(1 - conflict.severity).toFixed(2)}. Rekomendacja: wyjaśnienie kompetencji każdej strony.`,

    safety: `⚠️ ALERT BEZPIECZEŃSTWA. Konflikt dotycza zagrożenia zdrowia/systemu. Priorytet: maksymalny. Wymagane natychmiastowe ustalenie faktów.`,
  };

  return (
    messages[conflict.type] ||
    `Zaobserwowałem konflikt między ${conflict.agents[0]} a ${conflict.agents[1]}. ${conflict.reason}`
  );
}
