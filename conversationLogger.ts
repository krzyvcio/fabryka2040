// conversationLogger.ts – Log conversations to database
import {
  startConversation,
  addConversationMessage,
  endConversation,
  setConversationContext,
} from "./db.ts";
import { getEmotionalState } from "./emotionEngine.ts";

interface ConversationSession {
  id: string;
  day: number;
  startTime: Date;
  turnCount: number;
  topic: string;
  scenario: string;
  initiator: string;
  participants: string[];
  precedingEvents: string[];
  groupMoodAtStart: { avg_valence: number; avg_stress: number; avg_arousal: number };
  unresolvedConflicts: Array<{ agent: string; reason: string; intensity: number }>;
  messages: Array<{
    turnNumber: number;
    speaker: string;
    targetAgent: string | null;
    content: string;
    emotion: string;
    valence: number;
    arousal: number;
    stress: number;
  }>;
  averageValence: number;
  averageStress: number;
  hadConflict: boolean;
}

let currentSession: ConversationSession | null = null;

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateConversationId(): string {
  // Use timestamp + random for unique conversation IDs
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `conv_${timestamp}_${random}`;
}

export async function startConversationSession(
  day: number,
  topic: string,
  scenario: string,
  initiator: string,
  participants: string[],
  precedingEvents: string[],
  groupMood: { avg_valence: number; avg_stress: number; avg_arousal: number },
  unresolvedConflicts: Array<{ agent: string; reason: string; intensity: number }>
): Promise<string> {
  const conversationId = generateConversationId();

  currentSession = {
    id: conversationId,
    day,
    startTime: new Date(),
    turnCount: 0,
    topic,
    scenario,
    initiator,
    participants,
    precedingEvents,
    groupMoodAtStart: groupMood,
    unresolvedConflicts,
    messages: [],
    averageValence: 0,
    averageStress: 0,
    hadConflict: false,
  };

  // Save to database
  await startConversation(conversationId, day, topic, scenario, initiator, participants);

  // Save context
  await setConversationContext(
    conversationId,
    JSON.stringify(precedingEvents),
    JSON.stringify(groupMood),
    JSON.stringify(participants),
    JSON.stringify(unresolvedConflicts)
  );

  return conversationId;
}

export async function logMessage(
  speaker: string,
  targetAgent: string | null,
  content: string,
  turnNumber: number
): Promise<void> {
  if (!currentSession) {
    console.warn("⚠️ No active conversation session to log message");
    return;
  }

  // Get speaker's emotional state
  const emotionalState = await getEmotionalState(speaker);

  const message = {
    turnNumber,
    speaker,
    targetAgent,
    content,
    emotion: emotionalState.emotion,
    valence: emotionalState.valence,
    arousal: emotionalState.arousal,
    stress: emotionalState.stress,
  };

  currentSession.messages.push(message);
  currentSession.turnCount = turnNumber;

  // Check for conflict emotions
  if (
    emotionalState.emotion === "angry" ||
    emotionalState.emotion === "frustrated"
  ) {
    currentSession.hadConflict = true;
  }

  // Save to database
  await addConversationMessage(
    currentSession.id,
    turnNumber,
    speaker,
    targetAgent,
    content,
    {
      emotion: emotionalState.emotion,
      valence: emotionalState.valence,
      arousal: emotionalState.arousal,
      stress: emotionalState.stress,
    }
  );
}

export async function endConversationSession(
  avgValence: number,
  avgStress: number,
  summary?: string
): Promise<void> {
  if (!currentSession) {
    console.warn("⚠️ No active conversation session to end");
    return;
  }

  currentSession.averageValence = avgValence;
  currentSession.averageStress = avgStress;

  // Save final stats to database
  await endConversation(
    currentSession.id,
    currentSession.turnCount,
    avgValence,
    avgStress,
    currentSession.hadConflict,
    summary || `Day ${currentSession.day}: ${currentSession.topic}`
  );

  // Log summary
  console.log(`
✓ Conversation logged: ${currentSession.id}
  Topic: ${currentSession.topic}
  Turns: ${currentSession.turnCount}
  Avg Valence: ${avgValence.toFixed(2)}
  Avg Stress: ${avgStress.toFixed(2)}
  Conflict: ${currentSession.hadConflict ? "Yes ⚠️" : "No ✓"}
  `);

  currentSession = null;
}

export function getCurrentConversationId(): string | null {
  return currentSession?.id || null;
}

export function isConversationActive(): boolean {
  return currentSession !== null;
}
