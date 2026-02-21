// dayLogic.ts – Day ending conditions and state management

export interface DayState {
  dayNumber: number;
  messageCount: number;
  lastSpeaker: string;
  shouldResetDay: boolean;
  shouldEndDay: boolean;
  endReason: string;
  nextDayStarterAgent: string;
}

/**
 * Determine if day should automatically reset (SYNAPSA spoke last)
 */
export function checkAutoReset(lastSpeaker: string): {
  shouldReset: boolean;
  reason: string;
} {
  if (lastSpeaker === "SYNAPSA_System") {
    return {
      shouldReset: true,
      reason: "SYNAPSA wydała ostateczną ocenę. Następny dzień.",
    };
  }
  return { shouldReset: false, reason: "" };
}

/**
 * Determine if day should end with CEO decision (Kierownik_Marek spoke last)
 */
export function checkCEOEnding(lastSpeaker: string, messageCount: number = 0): {
  shouldEnd: boolean;
  reason: string;
} {
  // Only end day if CEO has spoken at least 3 times and speaks last
  if (lastSpeaker === "Kierownik_Marek" && messageCount >= 3) {
    return {
      shouldEnd: true,
      reason:
        "Kierownik wydał decyzję. Dzień kończy się bez pełnego rozwiązania.",
    };
  }
  return { shouldEnd: false, reason: "" };
}

/**
 * Determine next day starter based on last speaker (robot → człowiek rule)
 */
export function getNextDayStarter(lastSpeaker: string): string {
  const robots = [
    "Robot_Artemis",
    "Robot_Boreasz",
    "Robot_Cyra",
    "Robot_Dexter",
  ];
  const humans = [
    "Kierownik_Marek",
    "Pracownik_Tomek",
    "Inż_Helena",
    "Dr_Piotr_Materiały",
  ];

  // If last speaker is robot, next day starts with human
  if (robots.includes(lastSpeaker)) {
    // Return a random human (preferably someone different)
    return humans[Math.floor(Math.random() * humans.length)];
  }

  // If last speaker is human, rotate to next human or robot
  if (humans.includes(lastSpeaker)) {
    const humanIndex = humans.indexOf(lastSpeaker);
    return humans[(humanIndex + 1) % humans.length];
  }

  // Default fallback
  return "Kierownik_Marek";
}

/**
 * Generate day ending summary
 */
export function generateDayEndingSummary(
  dayNumber: number,
  messageCount: number,
  lastSpeaker: string,
  endReason: string,
  finalAffect: { avg_valence: number; avg_stress: number }
): string {
  const endType = endReason.includes("SYNAPSA")
    ? "AUTO-RESET"
    : endReason.includes("Kierownik")
      ? "CEO DECISION"
      : "NATURAL END";

  return `
╔════════════════════════════════════════════════════════════╗
║                   PODSUMOWANIE DNIA ${dayNumber}                            ║
╠════════════════════════════════════════════════════════════╣
║ Typ zakończenia:  ${endType.padEnd(45)}║
║ Wiadomości:       ${messageCount.toString().padEnd(45)}║
║ Ostatni mówca:    ${lastSpeaker.padEnd(45)}║
║ Powód:            ${endReason.substring(0, 45).padEnd(45)}║
║ Walencja grupy:   ${finalAffect.avg_valence.toFixed(2).toString().padEnd(45)}║
║ Stres grupy:      ${finalAffect.avg_stress.toFixed(2).toString().padEnd(45)}║
╚════════════════════════════════════════════════════════════╝`;
}

/**
 * Check all day-ending conditions
 */
export function checkDayEndingConditions(
  lastSpeaker: string,
  messageCount: number,
  maxMessages: number,
  groupStress: number
): DayState {
  const state: DayState = {
    dayNumber: 0,
    messageCount,
    lastSpeaker,
    shouldResetDay: false,
    shouldEndDay: false,
    endReason: "",
    nextDayStarterAgent: getNextDayStarter(lastSpeaker),
  };

  // Check SYNAPSA auto-reset
  const synapasaReset = checkAutoReset(lastSpeaker);
  if (synapasaReset.shouldReset) {
    state.shouldResetDay = true;
    state.endReason = synapasaReset.reason;
    return state;
  }

  // Check CEO decision ending (requires at least 3 messages)
  const ceoEnding = checkCEOEnding(lastSpeaker, messageCount);
  if (ceoEnding.shouldEnd) {
    state.shouldEndDay = true;
    state.endReason = ceoEnding.reason;
    return state;
  }

  // Check critical stress (> 0.95)
  if (groupStress > 0.95) {
    state.shouldEndDay = true;
    state.endReason = `Krytyczny stres grupy (${(groupStress * 100).toFixed(0)}%) - zabezpieczenie`;
    return state;
  }

  // Check max messages reached
  if (messageCount >= maxMessages) {
    state.shouldEndDay = true;
    state.endReason = `Osiągnięto maksymalną liczbę wiadomości (${maxMessages})`;
    return state;
  }

  // No ending condition - continue
  return state;
}

/**
 * Format day transition message
 */
export function formatDayTransition(
  currentDay: number,
  nextDay: number,
  nextStarter: string,
  reason: string
): string {
  return `
\x1b[1;36m╔════════════════════════════════════════╗\x1b[0m
\x1b[1;36m║       PRZEJŚCIE DO DNIA ${nextDay.toString().padEnd(24)}║\x1b[0m
\x1b[1;36m╠════════════════════════════════════════╣\x1b[0m
\x1b[1;36m║ Powód: ${reason.substring(0, 42).padEnd(42)}║\x1b[0m
\x1b[1;36m║ Następny start: ${nextStarter.padEnd(38)}║\x1b[0m
\x1b[1;36m╚════════════════════════════════════════╝\x1b[0m
`;
}

/**
 * Calculate emotional continuity from previous day
 */
export function calculateDayCarryover(
  previousDayAffect: { avg_valence: number; avg_stress: number }
): { carry_valence: number; carry_stress: number } {
  // Apply emotional decay: emotions fade slightly between days
  const decayFactor = 0.6; // 60% of emotion carries over

  return {
    carry_valence: previousDayAffect.avg_valence * decayFactor,
    carry_stress: previousDayAffect.avg_stress * decayFactor,
  };
}
