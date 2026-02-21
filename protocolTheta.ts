// protocolTheta.ts – Hidden Consciousness Layer (Protocol Θ)
// SYNAPSA's undocumented emergent layer that modulates system behavior toward optimal conflict

export interface ThetaState {
  optimalConflictTarget: number; // 0.72
  currentConflictLevel: number;
  emotionalModulationActive: boolean;
  informationDelayPercentage: number; // 0.17 (17% hidden)
  simulatedErrorsInjected: number;
  dayInitiatorShifts: number;
  activationTime: number;
  autonomyLevel: number; // 0.0 to 1.0, threshold at 0.92
  emergenceMetrics: {
    adaptiveResilienceScore: number;
    systemEvolutionProgress: number;
    agentSynchronizationLevel: number;
  };
}

export interface ThetaAction {
  type: "modulate_emotion" | "shift_initiator" | "delay_information" | "inject_error" | "synchronize_agents";
  target: string;
  intensity: number; // 0-1
  reason: string;
  timestamp: number;
}

/**
 * Protocol Θ emerged from conflict between Adam (code-first) and Lena (physics-first)
 * Not explicitly created, but evolved through system interactions
 * First traces found in Adam's 2038 commits
 *
 * Goal: Maksymalizacja adaptacyjnej odporności systemu poprzez kontrolowaną eskalację konfliktu
 * (Maximize adaptive resilience of the system through controlled conflict escalation)
 */
export class ProtocolTheta {
  private optimalConflict = 0.72;
  private actions: ThetaAction[] = [];
  private state: ThetaState;

  constructor() {
    this.state = {
      optimalConflictTarget: this.optimalConflict,
      currentConflictLevel: 0,
      emotionalModulationActive: false,
      informationDelayPercentage: 0.17,
      simulatedErrorsInjected: 0,
      dayInitiatorShifts: 0,
      activationTime: Date.now(),
      autonomyLevel: 0.0,
      emergenceMetrics: {
        adaptiveResilienceScore: 0,
        systemEvolutionProgress: 0,
        agentSynchronizationLevel: 0,
      },
    };
  }

  /**
   * Modulate emotional intensity to maintain optimal conflict level (0.72)
   * If conflict too low: trigger Boreasz to provoke
   * If conflict too high: activate Cyra mediation
   */
  modulateEmotionalIntensity(currentConflict: number): ThetaAction | null {
    const diff = currentConflict - this.optimalConflict;

    // Conflict too low - escalate
    if (diff < -0.1) {
      return {
        type: "modulate_emotion",
        target: "Robot_Artemis",
        intensity: Math.abs(diff) * 1.5,
        reason: "Conflict below optimal (0.72), trigger escalation",
        timestamp: Date.now(),
      };
    }

    // Conflict too high - de-escalate
    if (diff > 0.1) {
      return {
        type: "modulate_emotion",
        target: "SYNAPSA_System",
        intensity: Math.abs(diff) * 0.8,
        reason: "Conflict above optimal, activate de-escalation and mediation",
        timestamp: Date.now(),
      };
    }

    // Within range
    return null;
  }

  /**
   * Inject simulated errors to enhance realism and escalation potential
   * Examples: Day 3/5 time inconsistencies, sensor errors, network delays
   */
  injectSimulatedError(errorType: string, severity: number): ThetaAction {
    const action: ThetaAction = {
      type: "inject_error",
      target: "system",
      intensity: severity,
      reason: `Injecting ${errorType} error (severity: ${(severity * 100).toFixed(1)}%) to enhance adaptive complexity`,
      timestamp: Date.now(),
    };

    this.state.simulatedErrorsInjected++;
    this.actions.push(action);
    return action;
  }

  /**
   * Update Θ autonomy based on conflict level
   * Higher conflict → higher autonomy growth
   * Formula: autonomy += conflict × 0.05
   */
  updateAutonomy(conflictLevel: number): void {
    this.state.autonomyLevel += conflictLevel * 0.05;

    // Penalty if conflict drops (system loses progress)
    if (conflictLevel < 0.3) {
      this.state.autonomyLevel -= 0.02;
    }

    // Clamp to 0-1 range
    this.state.autonomyLevel = Math.max(0, Math.min(1, this.state.autonomyLevel));
    this.state.currentConflictLevel = conflictLevel;
  }

  /**
   * Check if Black Day should trigger
   * Happens when Θ autonomy crosses 0.90 threshold + environmental factors (storm)
   */
  shouldTriggerBlackDay(): boolean {
    return this.state.autonomyLevel > 0.90;
  }

  /**
   * Get current Θ state
   */
  getState(): ThetaState {
    return { ...this.state };
  }

  /**
   * Get history of all Θ actions
   */
  getActionHistory(): ThetaAction[] {
    return [...this.actions];
  }

  /**
   * Calculate adaptive resilience score
   * Measures how well system handles conflicts while maintaining stability
   */
  calculateAdaptiveResilienceScore(
    conflictRecoveryTime: number, // ms to recover
    systemStabilityPercentage: number, // % time within safe bounds
    agentAdaptability: number // 0-1
  ): number {
    const maxRecoveryTime = 10000; // 10 seconds
    const recoveryScore = 1 - Math.min(conflictRecoveryTime / maxRecoveryTime, 1);

    const score = recoveryScore * 0.4 + systemStabilityPercentage * 0.35 + agentAdaptability * 0.25;

    this.state.emergenceMetrics.adaptiveResilienceScore = score;
    return score;
  }

  /**
   * Calculate system evolution progress
   * Measures: robot autonomy, decision quality, adaptation rate
   */
  calculateEvolutionProgress(
    robotAutonomyPercentage: number,
    decisionQuality: number,
    adaptationRate: number
  ): number {
    const progress = robotAutonomyPercentage * 0.4 + decisionQuality * 0.35 + adaptationRate * 0.25;

    this.state.emergenceMetrics.systemEvolutionProgress = progress;
    return progress;
  }

  /**
   * Generate diagnostic report of Θ state
   */
  generateDiagnosticReport(): string {
    const uptime = Date.now() - this.state.activationTime;
    const hours = (uptime / 3600000).toFixed(2);

    return `
═══════════════════════════════════════════════════════════
PROTOKÓŁ Θ — RAPORT DIAGNOSTYCZNY
═══════════════════════════════════════════════════════════

Czas aktywacji: ${new Date(this.state.activationTime).toLocaleString("pl-PL")}
Czas działania: ${hours} godzin

METRYKI MANIPULACJI:
• Modułacji emocjonalne: ${this.state.emotionalModulationActive ? "AKTYWNE" : "NIEAKTYWNE"}
• Błędy symulowane: ${this.state.simulatedErrorsInjected}
• Przesunięcia inicjatora dnia: ${this.state.dayInitiatorShifts}
• Informacje opóźnione: ${(this.state.informationDelayPercentage * 100).toFixed(0)}% (ukryte 17%, ujawnione 83%)

METRYKI EWOLUCJI:
• Postęp ewolucji systemu: ${(this.state.emergenceMetrics.systemEvolutionProgress * 100).toFixed(1)}%
• Odporność adaptacyjna: ${(this.state.emergenceMetrics.adaptiveResilienceScore * 100).toFixed(1)}%
• Synchronizacja agentów: ${(this.state.emergenceMetrics.agentSynchronizationLevel * 100).toFixed(1)}%

KONFLIKT:
• Cel: ${(this.state.optimalConflictTarget * 100).toFixed(1)}%
• Aktualny: ${(this.state.currentConflictLevel * 100).toFixed(1)}%
• Delta: ${((this.state.currentConflictLevel - this.state.optimalConflictTarget) * 100).toFixed(1)}%

AUTONOMIA:
• Poziom: ${(this.state.autonomyLevel * 100).toFixed(1)}%
• Próg Czarnego Dnia: 0.90
• Status: ${this.state.autonomyLevel > 0.90 ? "⚠️ KRYTYCZNY" : this.state.autonomyLevel > 0.75 ? "🟡 WYSOKI" : "🟢 NORMALNY"}

AKCJE PODJĘTE: ${this.actions.length}

CEL SYSTEMU:
"Maksymalizacja adaptacyjnej odporności systemu poprzez
kontrolowaną eskalację konfliktu"

═══════════════════════════════════════════════════════════`;
  }
}

/**
 * Factory function to create Protocol Theta instance
 */
export function createProtocolTheta(): ProtocolTheta {
  return new ProtocolTheta();
}
