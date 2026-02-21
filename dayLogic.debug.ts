// dayLogic.debug.ts – Debug variant with verbose logging

export interface DayState {
  dayNumber: number;
  messageCount: number;
  lastSpeaker: string;
  shouldResetDay: boolean;
  shouldEndDay: boolean;
  endReason: string;
  nextDayStarterAgent: string;
}

function dbg(prefix: string, details: any) {
  const stackLine = (new Error().stack || '').split('\n')[2] || '';
  console.log(`[VERBOSE] ${prefix} | ${stackLine.trim()} | ${JSON.stringify(details)}`);
}

/**
 * Determine if day should automatically reset (SYNAPSA spoke last)
 */
export function checkAutoReset(lastSpeaker: string): {
  shouldReset: boolean;
  reason: string;
} {
  dbg('checkAutoReset - entry', { lastSpeaker });
  if (lastSpeaker === "SYNAPSA_System") {
    dbg('checkAutoReset - condition true', { condition: 'lastSpeaker === "SYNAPSA_System"', lastSpeaker });
    return {
      shouldReset: true,
      reason: "SYNAPSA wydała ostateczną ocenę. Następny dzień.",
    };
  }
  dbg('checkAutoReset - condition false', { condition: 'lastSpeaker === "SYNAPSA_System"', lastSpeaker });
  return { shouldReset: false, reason: "" };
}

/**
 * Determine if day should end with CEO decision (Kierownik_Marek spoke last)
 */
export function checkCEOEnding(lastSpeaker: string): {
  shouldEnd: boolean;
  reason: string;
} {
  dbg('checkCEOEnding - entry', { lastSpeaker });
  if (lastSpeaker === "Kierownik_Marek") {
    dbg('checkCEOEnding - condition true', { condition: 'lastSpeaker === "Kierownik_Marek"', lastSpeaker });
    return {
      shouldEnd: true,
      reason:
        "Kierownik wydał decyzję. Dzień kończy się bez pełnego rozwiązania.",
    };
  }
  dbg('checkCEOEnding - condition false', { condition: 'lastSpeaker === "Kierownik_Marek"', lastSpeaker });
  return { shouldEnd: false, reason: "" };
}

/**
 * Determine next day starter based on last speaker (robot → człowiek rule)
 */
export function getNextDayStarter(lastSpeaker: string): string {
  dbg('getNextDayStarter - entry', { lastSpeaker });
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
    dbg('getNextDayStarter - robot branch', { lastSpeaker });
    return humans[Math.floor(Math.random() * humans.length)];
  }

  // If last speaker is human, rotate to next human or robot
  if (humans.includes(lastSpeaker)) {
    const humanIndex = humans.indexOf(lastSpeaker);
    dbg('getNextDayStarter - human branch', { lastSpeaker, humanIndex });
    return humans[(humanIndex + 1) % humans.length];
  }

  // Default fallback
  dbg('getNextDayStarter - fallback', { lastSpeaker });
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

  dbg('generateDayEndingSummary', { dayNumber, messageCount, lastSpeaker, endReason, finalAffect });

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
  dbg('checkDayEndingConditions - entry', { lastSpeaker, messageCount, maxMessages, groupStress });

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
  dbg('checking SYNAPSA auto-reset', { condition: 'lastSpeaker === "SYNAPSA_System"', lastSpeaker });
  const synapasaReset = checkAutoReset(lastSpeaker);
  if (synapasaReset.shouldReset) {
    dbg('SYNAPSA reset triggered', { synapasaReset, messageCount, groupStress });
    state.shouldResetDay = true;
    state.endReason = synapasaReset.reason;
    return state;
  }

  // Check CEO decision ending
  dbg('checking CEO ending', { condition: 'lastSpeaker === "Kierownik_Marek"', lastSpeaker });
  const ceoEnding = checkCEOEnding(lastSpeaker);
  if (ceoEnding.shouldEnd) {
    dbg('CEO end triggered', { ceoEnding, messageCount, groupStress });
    state.shouldEndDay = true;
    state.endReason = ceoEnding.reason;
    return state;
  }

  // Check critical stress (> 0.95)
  dbg('checking critical stress', { condition: 'groupStress > 0.95', groupStress });
  if (groupStress > 0.95) {
    dbg('critical stress triggered', { groupStress });
    state.shouldEndDay = true;
    state.endReason = `Krytyczny stres grupy (${(groupStress * 100).toFixed(0)}%) - zabezpieczenie`;
    return state;
  }

  // Check max messages reached
  dbg('checking max messages', { condition: 'messageCount >= maxMessages', messageCount, maxMessages });
  if (messageCount >= maxMessages) {
    dbg('max messages triggered', { messageCount, maxMessages });
    state.shouldEndDay = true;
    state.endReason = `Osiągnięto maksymalną liczbę wiadomości (${maxMessages})`;
    return state;
  }

  // No ending condition - continue
  dbg('no end condition met', { messageCount, groupStress, lastSpeaker });
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
  dbg('formatDayTransition', { currentDay, nextDay, nextStarter, reason });
  return `\n\x1b[1;36m╔════════════════════════════════════════╗\x1b[0m\n\x1b[1;36m║       PRZEJŚCIE DO DNIA ${nextDay.toString().padEnd(24)}║\x1b[0m\n\x1b[1;36m╠════════════════════════════════════════╣\x1b[0m\n\x1b[1;36m║ Powód: ${reason.substring(0, 42).padEnd(42)}║\x1b[0m\n\x1b[1;36m║ Następny start: ${nextStarter.padEnd(38)}║\x1b[0m\n\x1b[1;36m╚════════════════════════════════════════╝\x1b[0m\n`;
}

/**
 * Calculate emotional continuity from previous day
 */
export function calculateDayCarryover(
  previousDayAffect: { avg_valence: number; avg_stress: number }
): { carry_valence: number; carry_stress: number } {
  dbg('calculateDayCarryover', { previousDayAffect });
  const decayFactor = 0.6; // 60% of emotion carries over

  return {
    carry_valence: previousDayAffect.avg_valence * decayFactor,
    carry_stress: previousDayAffect.avg_stress * decayFactor,
  };
}
