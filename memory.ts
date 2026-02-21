// memory.ts – Build rich context for each agent
import { getConnection } from "./db.js";
import { getEmotionalState, getRelation, getUnresolvedGrudges } from "./emotionEngine.js";

export async function buildAgentContext(agentId: string, targetAgentId?: string): Promise<string> {
  const emotionalState = await getEmotionalState(agentId);
  const grudges = await getUnresolvedGrudges(agentId);
  
  let contextBlock = `
### Twój stan emocjonalny:
Emotion: ${emotionalState.emotion} (intensity: ${emotionalState.intensity.toFixed(2)})
Stress: ${emotionalState.stress.toFixed(2)}
Valence (mood): ${emotionalState.valence.toFixed(2)}
Arousal: ${emotionalState.arousal.toFixed(2)}
`;

  if (targetAgentId) {
    const relation = await getRelation(agentId, targetAgentId);
    contextBlock += `
### Twoja relacja do ${targetAgentId}:
anger: ${relation.anger.toFixed(2)}
trust: ${relation.trust.toFixed(2)}
respect: ${relation.respect.toFixed(2)}
rapport: ${relation.rapport.toFixed(2)}
goal_alignment: ${relation.goal_alignment.toFixed(2)}
`;
  }

  if (grudges.length > 0) {
    contextBlock += `
### Nierozwiązane urazy:
`;
    for (const grudge of grudges) {
      contextBlock += `- ${grudge.target_id}: "${grudge.reason}" (intensity ${grudge.intensity.toFixed(2)})\n`;
    }
  }

  // Get recent messages to provide short-term memory
  const conn = await getConnection();
  const rows = await conn.query(
    `SELECT speaker, content, timestamp FROM interaction_history ORDER BY timestamp DESC LIMIT ?`,
    [10]
  );
  const recentMessages = rows as any;

  if (recentMessages.length > 0) {
    contextBlock += `
### Ostatnie interkacje (ostatnie 10 minut):
`;
    for (const msg of recentMessages.reverse()) {
      contextBlock += `${msg.speaker}: "${msg.content.substring(0, 80)}..."\n`;
    }
  }

  return contextBlock;
}

export async function recordInteraction(
  speaker: string,
  target: string,
  content: string,
  valence: number = 0.0,
  arousal: number = 0.0
) {
  const conn = await getConnection();
  await conn.query(
    `INSERT INTO interaction_history (speaker, target, content, valence, arousal) VALUES (?, ?, ?, ?, ?)`,
    [speaker, target, content, valence, arousal]
  );
}

export async function getAgentMemory(agentId: string, limit: number = 5) {
  const conn = await getConnection();
  const rows = await conn.query(
    `SELECT content, speaker FROM interaction_history WHERE speaker = ? ORDER BY timestamp DESC LIMIT ?`,
    [agentId, limit]
  );
  return rows as any;
}
