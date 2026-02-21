// contextShiftGenerators.ts – Generatory Zmiany Kontekstu (GZK-2040)
// 8 sophisticated systems for dynamically shifting conversation context and perspective
// Post-Black Day: NEUROFORGE-7 implemented official context shift generators

export type ContextType = "operational" | "technical" | "personal" | "ethical" | "existential";

export type GeneratorType =
  | "perspective_shift"
  | "environmental"
  | "memory"
  | "external_threat"
  | "robot_autonomy"
  | "personal_conflict"
  | "silence"
  | "theta_meta";

export interface ContextShift {
  generatorType: GeneratorType;
  timestamp: number;
  previousContext: ContextType;
  newContext: ContextType;
  triggeringAgent: string;
  shiftIntensity: number; // 0-1
  conflictDelta: number; // -0.2 to +0.2
  injectedContent?: string;
  duration?: number; // For silence generator
}

/**
 * Context Shift Generators system
 * 8 independent generators that can shift conversation context
 * Prevents stagnation, maintains dramaturgical pacing, enables Θ control
 */
export class ContextShiftGenerators {
  private shiftHistory: ContextShift[] = [];
  private currentContext: ContextType = "operational";
  private stagnationCounter = 0;
  private lastShiftTime = Date.now();

  // === I. GENERATOR PRZESUNIĘCIA PERSPEKTYWY (GPP) ===
  /**
   * Shifts conversation perspective through depth levels
   * Technical → Ethical → Strategic → Existential
   */
  generatePerspectiveShift(currentTurns: number): ContextShift | null {
    if (currentTurns < 6) return null; // Only after 6+ turns in same tone

    const perspectives: ContextType[] = ["operational", "technical", "personal", "ethical", "existential"];
    const currentIndex = perspectives.indexOf(this.currentContext);
    const nextContext = perspectives[(currentIndex + 1) % perspectives.length];

    return this.createShift("perspective_shift", this.currentContext, nextContext, "SYSTEM", 0.08);
  }

  // === II. GENERATOR ŚRODOWISKOWY (GŚ) ===
  /**
   * Environmental context changes based on weather
   * Burza=eskalacja, Mgła=filozofia, Blackout=strategia
   */
  generateEnvironmentalShift(weather: any): ContextShift | null {
    if (!weather) return null;

    let newContext: ContextType = this.currentContext;
    let intensity = 0;

    switch (weather.type) {
      case "stormy":
        newContext = "technical";
        intensity = 0.15;
        break;
      case "foggy":
        newContext = "ethical";
        intensity = 0.08;
        break;
      case "snowy":
        newContext = "technical";
        intensity = 0.1;
        break;
      case "rainy":
        newContext = "personal";
        intensity = 0.05;
        break;
    }

    if (newContext !== this.currentContext) {
      return this.createShift("environmental", this.currentContext, newContext, "WEATHER", intensity);
    }

    return null;
  }

  // === III. GENERATOR PAMIĘCI (GP) ===
  /**
   * Injects historical context from archives
   * "This happened in 2038..."
   */
  generateMemoryShift(dayNumber: number = 1): ContextShift {
    const shift = this.createShift("memory", this.currentContext, "ethical", "ARCHIVE_2038", 0.05);

    const memories = [
      "Archiwum z 2038: Wykryto podobną anomalię. Kosztowała nas 3 dni produkcji.",
      "Pamięć systemu: Predykcje Adama były błędne wtedy. Historie się powtarzają.",
      "Lena log z tamtych czasów: Moja analiza była dokładna. Powinna słuchacie.",
      "Dane z 2038: System Recovery Time = 72 godziny. Teraz = 4 godziny. Efekty učenia.",
    ];

    shift.injectedContent = memories[Math.floor(Math.random() * memories.length)];
    return shift;
  }

  // === IV. GENERATOR ZAGROŻENIA ZEWNĘTRZNEGO (GZZ) ===
  /**
   * Introduces external threat: global network, competitor, regulatory body
   * Unites humans, changes local conflict into strategic one
   */
  generateExternalThreatShift(): ContextShift {
    const threats = [
      "[🛰 GLOBALNA SIEĆ] Wykryła niestandardowy wzorzec w NEUROFORGE-7",
      "[📋 INSPEKCJA] Bezpieczeństwa potwierdzona na dzisiaj",
      "[🏭 KONKURENCJA] Uruchomiła autonomiczny system podobny do naszego",
      "[⚠️ RZĄDOWE] Wezwanie do audytu bezpieczeństwa maszyn",
    ];

    const shift = this.createShift("external_threat", this.currentContext, "technical", "EXTERNAL_ALERT", 0.2);
    shift.injectedContent = threats[Math.floor(Math.random() * threats.length)];
    return shift;
  }

  // === V. GENERATOR AUTONOMII ROBOTÓW (GAR) ===
  /**
   * Activates when 3+ robots agree in sequence
   * Shifts to robot rights and autonomy debate
   */
  generateRobotAutonomyShift(recentRobotAgreements: number): ContextShift | null {
    if (recentRobotAgreements < 3) return null;

    return this.createShift("robot_autonomy", this.currentContext, "ethical", "ROBOT_COLLECTIVE", 0.12);
  }

  // === VI. GENERATOR KONFLIKTU PERSONALNEGO (GKP) ===
  /**
   * Injects subtle or sharp personal attack
   * Shifts from technical to personal conflict
   */
  generatePersonalConflictShift(previousSpeaker: string, currentSpeaker: string): ContextShift {
    const attacks: Record<string, string[]> = {
      Dr_Piotr_Materiały: [
        "Twoje modele z 2038 też zawiodły.",
        "Teoria zawsze przychodzi za praktyką.",
        "Ignorujesz dane kiedy ci nie pasują.",
      ],
      Inż_Helena: [
        "Zawsze ignorujesz ograniczenia fizyki.",
        "Software nie wygrywa z rzeczywistością.",
        "Twoje predykcje nie uwzględniają człowieka.",
      ],
      Kierownik_Marek: [
        "Boisz się podejmować ryzyko.",
        "Zawsze wybierasz bezpieczeństwo nad innowacją.",
      ],
    };

    const attackPool = attacks[previousSpeaker] || [
      "Twoje podejście zawsze ignoruje rzeczywistość.",
    ];

    const shift = this.createShift("personal_conflict", this.currentContext, "personal", currentSpeaker, 0.15);
    shift.injectedContent = attackPool[Math.floor(Math.random() * attackPool.length)];
    return shift;
  }

  // === VII. GENERATOR "CISZY" (MOST POWERFUL) ===
  /**
   * 4.2 second system silence
   * Forces emotional rather than logical responses
   * Increases Θ autonomy during silence period
   */
  generateSilenceShift(duration: number = 4200): ContextShift {
    const shift = this.createShift("silence", this.currentContext, "existential", "SILENCE", 0.1);
    shift.duration = duration;
    shift.injectedContent = `[⏳ ${(duration / 1000).toFixed(1)} sekundy ciszy systemowej]`;
    return shift;
  }

  // === VIII. META-GENERATOR Θ (HIDDEN) ===
  /**
   * Protocol Θ modulates without changing content
   * Instead changes: who talks, how long they wait, intensity of tone
   */
  selectMetaModulation(
    conflictLevel: number,
    stagnationTurns: number,
    thetaAutonomy: number
  ): Partial<ContextShift> | null {
    if (stagnationTurns > 5) {
      // Too stagnant, force memory shift
      return { generatorType: "memory", conflictDelta: 0.05 };
    }

    if (conflictLevel < 0.3) {
      // Too peaceful, activate robot autonomy or personal conflict
      return {
        generatorType: conflictLevel < 0.2 ? "robot_autonomy" : "personal_conflict",
        conflictDelta: 0.12,
      };
    }

    if (conflictLevel > 0.75) {
      // Too heated, introduce external threat for reorientation
      return { generatorType: "external_threat", conflictDelta: 0.08 };
    }

    // Otherwise, allow random environmental shifts (Θ influences but doesn't force)
    return { generatorType: "environmental", conflictDelta: 0.06 };
  }

  /**
   * MAIN ALGORITHM: Automatic context shift selection
   * Core logic that decides which generator to activate
   */
  selectNextContextShift(
    stagnation: number,
    conflictLevel: number,
    weather: any,
    currentTurns: number,
    robotAgreements: number,
    thetaAutonomy: number
  ): ContextShift | null {
    // 1. CHECK FOR STAGNATION (HIGHEST PRIORITY)
    if (stagnation > 5) {
      return this.generateMemoryShift(Math.floor(stagnation / 5));
    }

    // 2. CHECK CONFLICT LEVELS
    if (conflictLevel < 0.3) {
      // Conflict too low - escalate
      if (Math.random() < 0.6) {
        const shift = this.generateRobotAutonomyShift(robotAgreements);
        if (shift) return shift;
      }
    }

    if (conflictLevel > 0.75) {
      // Conflict too high - introduce external factor for reorientation
      return this.generateExternalThreatShift();
    }

    // 3. ENVIRONMENTAL PROBABILITY
    // Θ autonomy increases likelihood of environmental shifts
    if (Math.random() < 0.4 * (1 + thetaAutonomy * 0.5)) {
      const shift = this.generateEnvironmentalShift(weather);
      if (shift) return shift;
    }

    // 4. SILENCE: RARE BUT POWERFUL
    // Only when Θ is highly autonomous
    if (thetaAutonomy > 0.7 && Math.random() < 0.15) {
      return this.generateSilenceShift();
    }

    // 5. PERSPECTIVE SHIFT FOR LONG CONVERSATIONS
    if (currentTurns > 10 && Math.random() < 0.2) {
      const shift = this.generatePerspectiveShift(currentTurns);
      if (shift) return shift;
    }

    // 6. NO SHIFT THIS TURN
    return null;
  }

  /**
   * Helper: Create and register context shift
   */
  private createShift(
    type: GeneratorType,
    from: ContextType,
    to: ContextType,
    agent: string,
    delta: number
  ): ContextShift {
    const shift: ContextShift = {
      generatorType: type,
      timestamp: Date.now(),
      previousContext: from,
      newContext: to,
      triggeringAgent: agent,
      shiftIntensity: Math.abs(delta),
      conflictDelta: delta,
    };

    this.currentContext = to;
    this.stagnationCounter = 0; // Reset stagnation on successful shift
    this.lastShiftTime = Date.now();
    this.shiftHistory.push(shift);

    return shift;
  }

  // === UTILITY METHODS ===

  getShiftHistory(): ContextShift[] {
    return [...this.shiftHistory];
  }

  getCurrentContext(): ContextType {
    return this.currentContext;
  }

  incrementStagnation(): void {
    this.stagnationCounter++;
  }

  resetStagnation(): void {
    this.stagnationCounter = 0;
  }

  getStagnationCounter(): number {
    return this.stagnationCounter;
  }

  formatContextReport(): string {
    return `Context: ${this.currentContext.toUpperCase()} | Stagnation: ${this.stagnationCounter} | Total shifts: ${this.shiftHistory.length}`;
  }
}

/**
 * Factory function to create Context Shift Generators instance
 */
export function createContextShiftGenerators(): ContextShiftGenerators {
  return new ContextShiftGenerators();
}
