// duplicateWatcher.ts – Duplicate message detection and emotional intervention
import {
  storeFingerprint,
  getRecentFingerprints,
  logDuplicateDetection,
  logWatcherIntervention,
  getRandomTemplateByCategory,
} from "./db.js";
import { getEmotionalState, updateEmotionalState } from "./emotionEngine.js";
import { getPersonality } from "./personalityEngine.js";
import { getTraumaState } from "./traumaEngine.js";
import { getCognitiveState } from "./cognitiveEngine.js";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const LMSTUDIO_URL = "http://localhost:1234/v1";
const REASONER_MODEL = "unsloth/gpt-oss-20b";

const openai = createOpenAI({
  baseURL: LMSTUDIO_URL,
  apiKey: "lm-studio",
});

export interface WatcherResult {
  messageId: number;
  isDuplicate: boolean;
  similarity?: number;
  interventionTriggered?: boolean;
}

// === TEXT PROCESSING ===

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 0);
}

function computeNgrams(text: string, n: number = 5): Set<string> {
  const tokens = tokenize(text);
  if (tokens.length < n) {
    return new Set([tokens.join(' ')]);
  }

  const ngrams = new Set<string>();
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.add(tokens.slice(i, i + n).join(' '));
  }
  return ngrams;
}

function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

// === EMOTION STATE RETRIEVAL ===

interface CombinedState {
  emotional: any;
  personality: any;
  trauma: any;
  cognitive: any;
}

async function getCombinedState(agentId: string): Promise<CombinedState> {
  const [emotional, personality, trauma, cognitive] = await Promise.all([
    getEmotionalState(agentId),
    getPersonality(agentId),
    getTraumaState(agentId),
    getCognitiveState(agentId),
  ]);

  return { emotional, personality, trauma, cognitive };
}

function calculateHumorLevel(personality: any): number {
  const openness = personality?.openness || 0.5;
  const stress = personality?.neuroticism || 0.5;
  return openness * 0.5 + (1 - stress) * 0.5;
}

// === MAIN WATCHER FUNCTION ===

export async function watchForDuplicates(
  messageId: number,
  agentId: string,
  content: string,
  pipeline: 'conversation' | 'chat',
  conversationId: string | null = null,
  threshold: number = 0.5
): Promise<WatcherResult> {
  try {
    // Skip if content is too short
    const tokens = tokenize(content);
    if (tokens.length < 5) {
      return { messageId, isDuplicate: false };
    }

    // Compute fingerprint
    const ngrams = Array.from(computeNgrams(content));
    const fpId = await storeFingerprint(messageId, pipeline, agentId, conversationId, ngrams);

    // Get recent fingerprints in scope
    const recentFps = await getRecentFingerprints(agentId, pipeline, conversationId, 50);

    // Compute similarities
    let maxSimilarity = 0;
    let bestMatchId = 0;

    const currentNgramSet = new Set(ngrams);

    for (const recentFp of recentFps) {
      if (recentFp.id === fpId) continue; // Skip self-comparison

      const historicalSet = new Set(recentFp.ngrams);
      const similarity = jaccardSimilarity(currentNgramSet, historicalSet);

      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        bestMatchId = recentFp.id;
      }
    }

    // Check if duplicate detected
    const isDuplicate = maxSimilarity >= threshold;

    if (isDuplicate && bestMatchId > 0) {
      const detectionId = await logDuplicateDetection(
        pipeline,
        agentId,
        fpId,
        bestMatchId,
        maxSimilarity,
        threshold,
        true
      );

      // Fire intervention asynchronously (non-blocking)
      fireIntervention(detectionId, agentId, maxSimilarity).catch(err => {
        console.warn('[DuplicateWatcher] Non-fatal intervention error:', err);
      });

      return {
        messageId,
        isDuplicate: true,
        similarity: maxSimilarity,
        interventionTriggered: true,
      };
    }

    return { messageId, isDuplicate: false, similarity: maxSimilarity };
  } catch (err) {
    console.error('[DuplicateWatcher] Error in watchForDuplicates:', err);
    return { messageId, isDuplicate: false };
  }
}

// === ASYNC INTERVENTION (FIRE AND FORGET) ===

async function fireIntervention(
  detectionId: number,
  agentId: string,
  similarity: number
): Promise<void> {
  let appliedSuccessfully = false;
  let errorMessage: string | null = null;

  try {
    // Get combined state
    const state = await getCombinedState(agentId);

    // Calculate humor level
    const humorLevel = calculateHumorLevel(state.personality);

    // Select template category (weights: humor 40%, mental_state 35%, emotion_redirect 25%)
    const rand = Math.random();
    let category: 'humor' | 'mental_state' | 'emotion_redirect';
    if (rand < 0.4) {
      category = 'humor';
    } else if (rand < 0.75) {
      category = 'mental_state';
    } else {
      category = 'emotion_redirect';
    }

    // Get random template by category
    const template = await getRandomTemplateByCategory(category);
    if (!template) {
      throw new Error(`No template found for category: ${category}`);
    }

    // Interpolate variables in prompts
    const interpolateVars = (text: string): string => {
      return text
        .replace(/{agentId}/g, agentId)
        .replace(/{similarity}/g, similarity.toFixed(2))
        .replace(/{humorLevel}/g, humorLevel.toFixed(2))
        .replace(/{dominantEmotion}/g, state.emotional.emotion)
        .replace(/{energy}/g, (state.cognitive.energy || 1).toFixed(2))
        .replace(/{neuroticism}/g, (state.personality.neuroticism || 0.5).toFixed(2))
        .replace(/{traumaLoad}/g, (state.trauma.traumaLoad || 0).toFixed(2));
    };

    const systemPrompt = interpolateVars(template.system_prompt);
    const userPrompt = interpolateVars(template.user_prompt);

    // Call model
    const response = await generateText({
      model: openai(REASONER_MODEL) as any,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.4,
      maxOutputTokens: 300,
    });

    // Parse JSON response
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in model response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Clamp deltas to safe ranges
    const valenceDelta = Math.max(-0.3, Math.min(0.3, parsed.valence_delta || 0));
    const arousalDelta = Math.max(-0.2, Math.min(0.4, parsed.arousal_delta || 0));
    const stressDelta = Math.max(-0.3, Math.min(0.0, parsed.stress_delta || 0));
    const humorBoost = Math.max(0, Math.min(0.7, parsed.humor_boost || 0));

    // Apply emotional update (absolute values, not deltas)
    const currentEmotional = state.emotional;
    const newValence = Math.max(-1, Math.min(1, currentEmotional.valence + valenceDelta));
    const newArousal = Math.max(0, Math.min(1, currentEmotional.arousal + arousalDelta));
    const newStress = Math.max(0, Math.min(1, currentEmotional.stress + stressDelta));

    await updateEmotionalState(agentId, {
      valence: newValence,
      arousal: newArousal,
      stress: newStress,
    });

    appliedSuccessfully = true;
    console.log(`[DuplicateWatcher] Intervention applied to ${agentId}: ${parsed.directive}`);

    // Log the intervention
    await logWatcherIntervention(
      detectionId,
      agentId,
      template.id || 0,
      similarity,
      humorLevel,
      userPrompt,
      response.text,
      valenceDelta,
      arousalDelta,
      stressDelta,
      humorBoost,
      parsed.directive || '',
      true,
      null
    );
  } catch (err) {
    errorMessage = (err as Error).message;
    console.warn(`[DuplicateWatcher] Intervention failed for ${agentId}:`, errorMessage);

    // Log failed intervention
    await logWatcherIntervention(
      detectionId,
      agentId,
      0,
      similarity,
      0,
      '',
      '',
      0,
      0,
      0,
      0,
      '',
      false,
      errorMessage
    ).catch(logErr => {
      console.warn('[DuplicateWatcher] Failed to log intervention error:', logErr);
    });
  }
}
