// debate-handler.debug.ts - Debug variant with verbose logging and debug imports

import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import {
  initializeAgent,
  calculateGroupAffect,
  applyEmotionalDecay,
  getEmotionalState,
  analyzeReplyEmotion,
  updateEmotionalState,
  recordGrudge,
} from "./emotionEngine.js";
import { initializeDatabase } from "./db.js";
import {
  startConversationSession,
  logMessage,
  endConversationSession,
} from "./conversationLogger.js";
import {
  getAddressedAgent,
  selectNextSpeakerBasedOnEmotion,
  getAgentList,
} from "./speakerSelector.js";
import { generateDynamicEvent, recordEvent } from "./eventGenerator.js";
import {
  selectNextSpeakerFromGraph,
  selectGraphForContext,
  type ConversationGraph,
} from "./conversationGraphs.js";
import {
  detectPersonalConflict,
  shouldSynapasaMediate,
  generateMediationMessage,
  type ConflictEvent,
} from "./conflictDetector.js";
import * as debugDayLogic from "./dayLogic.debug.js";
const { checkDayEndingConditions, generateDayEndingSummary, formatDayTransition, getNextDayStarter, calculateDayCarryover } = debugDayLogic as any; // debug imports
import {
  calculateResponseLength,
  generateDirectResponse,
  formatLengthInfo,
  getMaxTokensForResponse,
} from "./responseLength.js";

const LMSTUDIO_URL = "http://localhost:1234/v1";
const openai = createOpenAI({
  baseURL: LMSTUDIO_URL,
  apiKey: "lm-studio",
});

// Debate configuration
const MAX_MESSAGES = 5000; // Maximum messages per debate
const EVENT_INTERVAL = 15; // Generate event every N turns
const MAX_CONCURRENT_SPEECHES = 150; // Prevent infinite loops
const POLISH_LANGUAGE_REQUIREMENT = true;

// Verbose debugging for development (set true while debugging conversation flow)
const VERBOSE = true;

function dbg(prefix: string, details: any) {
  const stackLine = (new Error().stack || '').split('\n')[2] || '';
  console.log(`[VERBOSE] ${prefix} | ${stackLine.trim()} | ${JSON.stringify(details)}`);
}

// Agent definitions - Polish factory context
const agents = {
  Kierownik_Marek: {
    name: "Kierownik_Marek",
    role: "kierownik_linii_produkcji",
    systemPrompt: `Jesteś Marek Kowalski – kierownik linii produkcji...`.trim(),
  },
  // ... (omitted for brevity in debug copy) - keep same structure as original in real debug file
} as any;

let debateActive = false;

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

// For brevity, we'll reuse most of the original implementation but add debug logs around messageCount increments and conversation pushes

export async function runDebateDay(): Promise<{
  success: boolean;
  conversationId?: string;
  messageCount?: number;
  message: string;
}> {
  if (debateActive) {
    console.warn("⚠️  Debate already running");
    return {
      success: false,
      message: "Debate session already in progress",
    };
  }

  debateActive = true;

  try {
    console.log("\n\x1b[1;36m🎬 INICJALIZACJA SESJI DEBATY - FABRYKA 2040\x1b[0m\n");
    console.log("⏱️  Start:", new Date().toISOString());

    // Initialize database
    await initializeDatabase();
    console.log("✓ Baza danych zainicjalizowana");

    // Initialize all agents
    const agentNames = Object.keys(agents);
    for (const agentName of agentNames) {
      await initializeAgent(agentName);
      if (VERBOSE) dbg('Initialized agent', { agentName });
    }
    console.log(`✓ Agenci zainicjalizowani (${agentNames.length} uczestników)\n`);

    // Debate schema
    const schema = {
      name: "Dyskusja produktywności linii",
      topic:
        "Optymalizacja wydajności linii produkcyjnej - hardware vs software",
      starterMessage:
        "Zespół, musimy osiągnąć cel 200 jednostek/dzień do końca miesiąca. Jak proponujecie rozwiązać problem opóźnień na linii 4?",
      initiator: "Kierownik_Marek",
    } as any;

    // Initialize conversation session
    const groupAffectStart = await calculateGroupAffect();

    console.log(`\x1b[1;36m📝 Temat: "${schema.topic}"\x1b[0m`);
    console.log(`\x1b[1;36m👥 Uczestnicy: ${agentNames.join(", ")}\x1b[0m\n`);

    const conversationId = await startConversationSession(
      1,
      schema.topic,
      schema.name,
      schema.initiator,
      agentNames,
      [],
      {
        avg_valence: groupAffectStart.avg_valence,
        avg_stress: groupAffectStart.avg_stress,
        avg_arousal: 0.5,
      },
      []
    );

    console.log(`✓ Sesja rozmowy utworzona: ${conversationId}\n`);

    // Start conversation
    let conversationHistory: Message[] = [
      {
        role: "system",
        content: `Jesteś uczestnikiem dyskusji w fabryce NEUROFORGE-7 w roku 2040. Temat: "${schema.topic}"`,
      },
      {
        role: "user",
        content: schema.starterMessage,
      },
    ];

    let messageCount = 0;
    let currentSpeaker = schema.initiator;
    let previousSpeaker = "SYSTEM"; // Track for conflict detection
    let currentGraph: ConversationGraph | null = null;
    const maxAttempts = MAX_MESSAGES;
    const availableAgents = agentNames;
    const recentConflicts: ConflictEvent[] = []; // Track conflicts for escalation
    let dayNumber = 1;
    let lastDayAffect = { avg_valence: 0, avg_stress: 0 };

    console.log(`\x1b[1;33m▶ Rozpoczęcie dyskusji...\x1b[0m\n`);
    console.log(`\x1b[1;36m[TEMAT]\x1b[0m: ${schema.starterMessage}\n`);

    // Main conversation loop
    while (messageCount < maxAttempts) {
      // increment and log
      messageCount++;
      dbg('messageCount incremented', { messageCount });

      if (messageCount % 50 === 0) {
        const currentAffect = await calculateGroupAffect();
        console.log(
          `\n\x1b[2m📊 Punkt kontrolny (${messageCount}): Walencja=${currentAffect.avg_valence.toFixed(2)}, Stres=${currentAffect.avg_stress.toFixed(2)}\x1b[0m\n`
        );
      }

      // Agent thinking
      const agent = agents[currentSpeaker as keyof typeof agents];
      if (!agent) {
        console.warn(`⚠️  Unknown agent: ${currentSpeaker}`);
        break;
      }

      process.stdout.write(`\x1b[1m[${messageCount}] ${currentSpeaker}: \x1b[0m`);
      if (VERBOSE) dbg('Loop start', { messageCount, currentSpeaker });

      let reply: string;
      try {
        reply = await (async () => {
          // Minimal stub for agent reply in debug environment (avoid LLM calls for speed)
          return `${currentSpeaker} debug reply #${messageCount}`;
        })();
      } catch (error) {
        console.error(`\n❌ Błąd LLM: ${(error as Error).message}`);
        reply =
          "Przepraszam, mam problem z połączeniem. Mogę powtórzyć ostatnie stanowisko?";
      }

      console.log(reply);
      console.log("");

      // Log to conversation
      await logMessage(currentSpeaker, null, reply, messageCount);

      // Update emotional state based on reply
      const emotionUpdate = await analyzeReplyEmotion(
        currentSpeaker,
        reply
      );
      await updateEmotionalState(currentSpeaker, emotionUpdate);

      // Conflict detection (kept minimal)
      const conflict = await detectPersonalConflict(
        currentSpeaker,
        reply,
        previousSpeaker
      );
      recentConflicts.push(conflict);
      if (recentConflicts.length > 10) recentConflicts.shift();

      // Add to conversation history AND log with stack
      conversationHistory.push({
        role: "assistant",
        content: reply,
      });
      dbg('conversation.push', { cause: 'assistant reply', messageCount, currentSpeaker, lastSpeaker: previousSpeaker });

      // Mediation logic simplified for debug
      let shouldMediate = shouldSynapasaMediate(conflict, recentConflicts);
      if (conflict.detected) {
        console.log(`\x1b[1;35m⚠️  KONFLIKT ZADETEKTOWANY\x1b[0m`);
        console.log(`   Typ: ${conflict.type} | Siła: ${(conflict.severity * 100).toFixed(0)}%`);
        console.log(`   Powód: ${conflict.reason}`);

        if (shouldMediate) {
          console.log(`\x1b[1;36m   → SYNAPSA-Ω wkracza jako mediator\x1b[0m\n`);

          const mediationMsg = generateMediationMessage(conflict);
          console.log(`\x1b[1;36m[${messageCount}] SYNAPSA_System (MEDIATION):\x1b[0m`);
          console.log(mediationMsg);
          console.log("");

          await logMessage("SYNAPSA_System", null, mediationMsg, messageCount);

          const synapasaEmotion = await analyzeReplyEmotion(
            "SYNAPSA_System",
            mediationMsg
          );
          await updateEmotionalState("SYNAPSA_System", synapasaEmotion);

          conversationHistory.push({
            role: "assistant",
            content: mediationMsg,
          });
          dbg('conversation.push', { cause: 'SYNAPSA mediation', messageCount, mediationMsg });

          previousSpeaker = "SYNAPSA_System";
          currentSpeaker =
            availableAgents[Math.floor(Math.random() * availableAgents.length)];
        }
      }

      // Event trigger every N messages
      if (messageCount % EVENT_INTERVAL === 0 && messageCount < maxAttempts) {
        console.log(`\n\x1b[1;35m⚡ ZDARZENIE FABRYCZNE:\x1b[0m`);
        const event = await generateDynamicEvent(schema.topic, 0.7);
        console.log(`  ${event.description}\n`);
        await recordEvent(event);

        const eventMessage = `Nowe zdarzenie fabryki: "${event.description}" (siła: ${(event.severity * 100).toFixed(0)}%). Jak to wpływa na Twoją pozycję?`;
        conversationHistory.push({
          role: "user",
          content: eventMessage,
        });
        dbg('conversation.push', { cause: 'event', messageCount, eventMessage });

        // Log as current speaker to avoid system agent issues
        await logMessage(currentSpeaker, null, eventMessage, messageCount + 1);
      }

      // Select next speaker (simplified)
      const groupAffect = await calculateGroupAffect();

      previousSpeaker = currentSpeaker;
      currentSpeaker = availableAgents[Math.floor(Math.random() * availableAgents.length)];

      if (VERBOSE) dbg('Selected nextSpeaker', { currentSpeaker, previousSpeaker, messageCount });

      // Small delay to avoid overwhelming LLM
      await new Promise((r) => setTimeout(r, 200));

      // CHECK DAY ENDING CONDITIONS
      const currentGroupAffect = await calculateGroupAffect();
      if (VERBOSE) dbg('GroupAffect', { valence: currentGroupAffect.avg_valence.toFixed(2), stress: currentGroupAffect.avg_stress.toFixed(2) });
      const dayState = checkDayEndingConditions(
        previousSpeaker,
        messageCount,
        maxAttempts,
        currentGroupAffect.avg_stress
      );

      dbg('dayState result', { dayState });

      // AUTO-RESET: SYNAPSA spoke last
      if (dayState.shouldResetDay) {
        if (VERBOSE) dbg('Day reset triggered', { reason: dayState.endReason });
        lastDayAffect = groupAffect;
        console.log(
          formatDayTransition(
            dayNumber,
            dayNumber + 1,
            dayState.nextDayStarterAgent,
            dayState.endReason
          )
        );

        // Reset for next day
        dayNumber++;
        messageCount = 0;
        previousSpeaker = "SYSTEM";
        currentSpeaker = dayState.nextDayStarterAgent;
        conversationHistory = [
          {
            role: "system",
            content: `Dzień ${dayNumber}. Rozmowa trwa dalej...`,
          },
        ];
        recentConflicts.length = 0;
        continue;
      }

      // CEO DECISION: Kierownik_Marek spoke last → end day
      if (dayState.shouldEndDay && previousSpeaker === "Kierownik_Marek") {
        console.log(
          generateDayEndingSummary(
            dayNumber,
            messageCount,
            previousSpeaker,
            dayState.endReason,
            groupAffect
          )
        );
        console.log(
          `\n\x1b[1;33m📋 Dzień zakończony: CEO wydała decyzję bez pełnego rozwiązania.\x1b[0m\n`
        );
        break;
      }

      // ... other endings omitted for brevity

    }

    // Finalize conversation (omitted details)
    const finalAffect = await calculateGroupAffect();
    console.log("\x1b[1;32m" + "=".repeat(80) + "\x1b[0m");
    console.log(`\x1b[1;32m✓ DYSKUSJA ZAKOŃCZONA\x1b[0m`);
    console.log(`   Wiadomości: ${messageCount}`);
    console.log("=".repeat(80) + "\n");

    await endConversationSession(
      finalAffect.avg_valence,
      finalAffect.avg_stress,
      `Dyskusja fabryki: ${schema.name} - ${messageCount} wiadomości`
    );

    await applyEmotionalDecay(1);

    return {
      success: true,
      conversationId,
      messageCount,
      message: `Dyskusja zakończona: ${messageCount} wiadomości, Walencja: ${finalAffect.avg_valence.toFixed(2)}, Stres: ${finalAffect.avg_stress.toFixed(2)}`,
    };
  } catch (error) {
    console.error("\x1b[1;31m❌ BŁĄD DYSKUSJI:\x1b[0m", error);
    return {
      success: false,
      message: `Dyskusja nie powiodła się: ${(error as Error).message}`,
    };
  } finally {
    debateActive = false;
    console.log("\n✓ Sesja dyskusji zamknięta\n");
  }
}
