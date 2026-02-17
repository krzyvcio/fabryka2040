// narrativeEngine.ts – Narrative, drama level, and emergent behaviors
import { getConnection } from "./db.ts";
import { getEmotionalState, getRelation, getUnresolvedGrudges } from "./emotionEngine.ts";

export interface NarrativeContext {
  temperature: number;
  maxTokens: number;
  emotionalOverride?: string;
  dramaLevel: number;
}

export async function getNarrativeContext(
  agentId: string,
  targetAgentId: string,
  baseDramaLevel: number = 0.8
): Promise<NarrativeContext> {
  const state = await getEmotionalState(agentId);
  const relation = await getRelation(agentId, targetAgentId);
  const grudges = await getUnresolvedGrudges(agentId);

  let temperature = 0.7;
  let maxTokens = 320;
  let emotionalOverride: string | undefined;
  let dramaLevel = baseDramaLevel;

  // High anger + low trust = volatile, unpredictable
  if (relation.anger > 0.8 && relation.trust < 0.3) {
    temperature = 0.95;
    dramaLevel = Math.min(dramaLevel + 0.2, 1.0);
    emotionalOverride = "Masz bardzo wyraźną frustrację wobec tej osoby. Wyrażaj to bez detali.";
  }

  // High stress = rushed, shorter responses
  if (state.stress > 0.75) {
    maxTokens = 200;
    temperature = Math.min(temperature + 0.15, 0.95);
  }

  // High trust = measured, collaborative
  if (relation.trust > 0.8) {
    temperature = Math.max(temperature - 0.15, 0.3);
    emotionalOverride = "Masz zaufanie do tej osoby. Spróbuj znaleźć wspólne pole.";
  }

  // Unresolved grudges = add resentment
  if (grudges.length > 0) {
    const totalIntensity = grudges.reduce((s, g) => s + g.intensity, 0);
    if (totalIntensity > 2.5 && grudges[0]) {
      emotionalOverride = `Masz niewyrażoną frustrację: ${grudges[0].reason}. Będzie się to przejawiać.`;
      temperature = Math.min(temperature + 0.1, 1.0);
      dramaLevel = Math.min(dramaLevel + 0.15, 1.0);
    }
  }

  // Negative valence = more cynical/challenging
  if (state.valence < -0.5) {
    emotionalOverride = "Masz pesymistyczne nastawienie. Kwestionuj, podważaj.";
    temperature = Math.min(temperature + 0.1, 0.9);
  }

  return {
    temperature,
    maxTokens,
    emotionalOverride,
    dramaLevel,
  };
}

export async function shouldInitiateConflict(
  agentId: string,
  targetId: string
): Promise<boolean> {
  const relation = await getRelation(agentId, targetId);
  const state = await getEmotionalState(agentId);
  const grudges = await getUnresolvedGrudges(agentId);

  // Conflict if: high anger + low trust + high stress
  if (
    relation.anger > 0.7 &&
    relation.trust < 0.4 &&
    state.stress > 0.6 &&
    grudges.length > 0
  ) {
    return true;
  }

  return false;
}

export async function shouldSabotage(agentId: string): Promise<boolean> {
  const state = await getEmotionalState(agentId);
  const grudges = await getUnresolvedGrudges(agentId);

  // Silent sabotage if trust is very low and unresolved grudges are high
  const totalGrudgeIntensity = grudges.reduce((s, g) => s + g.intensity, 0);

  return (
    state.stress > 0.85 &&
    state.valence < -0.6 &&
    totalGrudgeIntensity > 3.0
  );
}

export async function recordDailySignature(
  day: number,
  avgValence: number,
  avgStress: number
): Promise<void> {
  const conn = getConnection();
  const signature = `day${day}_v${avgValence.toFixed(2)}_s${avgStress.toFixed(2)}`;

  await conn.run(
    `INSERT INTO daily_emotional_signatures (day, signature, average_valence, average_stress) 
     VALUES (?, ?, ?, ?)`,
    [day, signature, avgValence, avgStress]
  );
}

export async function checkForRecurringConflict(
  currentValence: number,
  threshold: number = 0.85
): Promise<boolean> {
  const conn = getConnection();
  const result = await conn.run(
    `SELECT COUNT(*) as count FROM daily_emotional_signatures 
     WHERE average_valence < -0.5 AND average_stress > 0.7
     ORDER BY timestamp DESC LIMIT 3`
  );
  const rows = await result.getRowObjects();

  if (rows.length > 0 && (rows[0] as any).count >= 2) {
    return true; // Conflict pattern detected
  }

  return false;
}
