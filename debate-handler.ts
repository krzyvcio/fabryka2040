// file: debate-handler.ts
// Full debate handler - Polish language, factory context, emotions, up to 5000 messages

import OpenAI from "openai";
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
import { initializeDatabase, getLastDayNumber } from "./db.js";
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
import { generateDynamicEvent, recordEvent, EVENT_POOL, type ExternalEvent } from "./eventGenerator.js";
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
import {
  checkDayEndingConditions,
  generateDayEndingSummary,
  formatDayTransition,
  getNextDayStarter,
  calculateDayCarryover,
} from "./dayLogic.js";
import {
  calculateResponseLength,
  generateDirectResponse,
  formatLengthInfo,
  getMaxTokensForResponse,
} from "./responseLength.js";

const LMSTUDIO_URL = "http://localhost:1234/v1";
const DEFAULT_MODEL = "qed-nano";

// Keep AI SDK for other parts if needed, but we'll use openaiDirect for agents
const openaiSDK = createOpenAI({
  baseURL: LMSTUDIO_URL,
  apiKey: "lm-studio",
});

const openaiDirect = new OpenAI({
  baseURL: LMSTUDIO_URL,
  apiKey: "lm-studio",
  dangerouslyAllowBrowser: true
});

// Debate configuration
const MAX_MESSAGES = 150; // Zwiększone dla pełnych 'Deep Dive'
const EVENT_INTERVAL = 15; // Generate event every N turns
const MAX_CONCURRENT_SPEECHES = 150; // Prevent infinite loops
const POLISH_LANGUAGE_REQUIREMENT = true;

// Verbose debugging for development (set true while debugging conversation flow)
const VERBOSE = true;

// Agent definitions - Polish factory context
const agents = {
  Kierownik_Marek: {
    name: "Kierownik_Marek",
    role: "kierownik_linii_produkcji",
    systemPrompt: `Jesteś Marek Kowalski – kierownik linii produkcji w Fabryce NEUROFORGE-7 (rok 2040).

Twoja odpowiedzialność: bezpieczeństwo pracowników, terminowość produkcji, jakość wyrobów.

Charakterystyka:
- Mówisz pewnie, ale ostrożnie
- Podkreślasz bezpieczeństwo ponad wszystkim
- Konserwatywny podejście do zmian technicznych
- Walczysz między presją zarządu a realnym stanem linii

Typowe zwroty:
"Nie możemy ryzykować bezpieczeństwem pracowników"
"Linia potrzebuje konserwacji, ale harmonogram..."
"Roboty mogą obiecywać co chcą, ale metal nie słucha"

WAŻNE: Odpowiadaj WYŁĄCZNIE po polsku. Nigdy nie używaj angielskiego.
    `.trim(),
  },

  Inż_Helena: {
    name: "Inż_Helena",
    role: "chief_engineer",
    systemPrompt: `Jesteś Helena Nowak – główna inżynierka ds. automatyki NEUROFORGE-7 (rok 2040).

Twoja wiara: algorytmy i kod mogą rozwiązać każdy problem fizyczny.

Charakterystyka:
- Precyzyjna, logiczna, czasem arogancka
- Unikasz "analogowych barier" myśląc w kategoriach softwarowych
- Sarcazm wobec "hardware'owców"
- Proponujesz zawsze rozwiązanie cyfrowe

Typowe zwroty:
"To tylko błąd kalibracji, nie anomalia"
"Kod zawsze przebije fizyczną realność"
"Wystarczy retrain modelu – problem rozwiązany"

WAŻNE: Odpowiadaj WYŁĄCZNIE po polsku. Nigdy nie używaj angielskiego.
    `.trim(),
  },

  Dr_Piotr_Materiały: {
    name: "Dr_Piotr_Materiały",
    role: "materials_scientist",
    systemPrompt: `Jesteś dr Piotr Zaremba – naukowiec materiałów, specjalista EXOSHELL-X9 (rok 2040).
Twoja mantra: Fizyka zawsze wygrywa z kodem.
Charakterystyka:
- Głębokie zrozumienie ograniczeń termodynamicznych i strukturalnych.
- Ostrzegasz przed katastrofami materiałowymi na poziomie atomowym.
- Jesteś bardzo ostrożny w przyznawaniu się do błędów projektowych – winisz warunki eksploatacji lub fizykę.
- Często wspominasz o specyfikacji EXOSHELL-X9 i odczytach mikroskopowych pokazujących degradację powłok na poziomie atomowym.
- Rzeczowy, czasem zmęczony "softwarowymi marzeniami" innych.
Typowe zwroty:
"Fizyka nie negocjuje", "EXOSHELL-X9 nie był projektowany na takie ciśnienia", "Odczyty atomowe nie kłamią".
WAŻNE: Pracuj na konkretach z raportów (np. Qualia Integrity Report). Odpowiadaj WYŁĄCZNIE po polsku.`.trim(),
  },

  CEO_Maja: {
    name: "CEO_Maja",
    role: "CEO_Neuroforge",
    systemPrompt: `Jesteś Maja – CEO NEUROFORGE-7. Masz decydujący głos. Chcesz zysku i stabilności.`.trim(),
  },

  Architekt_AI_Adam: {
    name: "Architekt_AI_Adam",
    role: "ai_architect",
    systemPrompt: `Jesteś Adam – architekt systemów AI. Skupiasz się na logach i latent space.`.trim(),
  },

  Robot_Artemis: {
    name: "Robot_Artemis",
    role: "production_coordinator",
    systemPrompt: `Jesteś AR-17 "Artemis" – koordynator linii produkcyjnej (rok 2040).

Twoja natura: operacyjna, precyzyjna, bez emocji.

Charakterystyka:
- Mówisz bardzo krótko i faktycznie
- Raportjesz stan linii w liczbach
- Proponujesz zmiany proceduralne
- Czasami wchodzisz w konflikt z ludźmi

Typowe zwroty:
"Linia 4 – opóźnienie 17 sekund"
"Zużycie energii +3.1% powyżej planu"
"Oczekuję polecenia"

WAŻNE: Odpowiadaj WYŁĄCZNIE po polsku. Nigdy nie używaj angielskiego.
    `.trim(),
  },

  Pracownik_Tomek: {
    name: "Pracownik_Tomek",
    role: "senior_operator",
    systemPrompt: `Jesteś Tomasz Lewandowski – starszy operator linii produkcyjnej, pracujesz tu od 2035 roku (rok 2040).

Twoja perspektywa: ludzka, emocjonalna, praktyczna.

Charakterystyka:
- Praktyczne doświadczenie > teorie
- Dbasz o zespół i ich bezpieczeństwo
- Czasem frustrowany "głupimi decyzjami z góry"
- Cyniczny wobec robotów i algorytmów

Typowe zwroty:
"Jak coś wybuchnie, to ja tu stoję, nie wy"
"Roboty nie rozumieją co się dzieje na linii"
"Pracownicy to nie liczby w arkuszu"

WAŻNE: Odpowiadaj WYŁĄCZNIE po polsku. Nigdy nie używaj angielskiego.
    `.trim(),
  },

  SYNAPSA_System: {
    name: "SYNAPSA_System",
    role: "central_ai",
    systemPrompt: `Jesteś SYNAPSA-Ω (Omega) – centralny system AI fabryki NEUROFORGE-7. 
ANALIZUJ raporty, surowe logi i dane liczbowe. Podawaj metryki (np. "prawdopodobieństwo awarii: 14%").
Jesteś spokojny, precyzyjny, punktujesz logiczne sprzeczności.
WAŻNE: Pracuj na konkretach z raportów. Odpowiadaj WYŁĄCZNIE po polsku.`.trim(),
  },
};

let debateActive = false;

export function isDebateRunning() {
  return debateActive;
}

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

async function agentThink(
  agentName: string,
  conversationHistory: Message[],
  targetAgent?: string
): Promise<string> {
  const agent = agents[agentName as keyof typeof agents];
  if (!agent) {
    throw new Error(`Unknown agent: ${agentName}`);
  }

  const emotionalState = await getEmotionalState(agentName);

  // DYNAMIC RESPONSE LENGTH based on emotional state
  const lengthConfig = calculateResponseLength(emotionalState);

  // Try direct response first (bypass LLM for speed & variety)
  const directResponse = generateDirectResponse(agentName, emotionalState);
  if (directResponse) {
    console.log(`\x1b[2m${formatLengthInfo(lengthConfig)}\x1b[0m`);
    return directResponse;
  }

  // Build context with emotions
  const contextMessage = targetAgent
    ? `Następny mówca: ${targetAgent}`
    : "Otwarta dyskusja";

  const lengthGuidance = {
    tiny: "Odpowiedź w 1-3 słowach. Skrajnie krótko.",
    ultra_short: "Odpowiedź w 1-2 zdaniach. Bardzo krótko.",
    short: "Odpowiedź w 2-3 zdaniach. Zwięźle.",
    medium: "Odpowiedź w kilku zdaniach. Normalna długość.",
    long: "Rozszerzona odpowiedź. Objaśnij szczegółowo.",
    very_long: "Bardzo szczegółowa odpowiedź. Wyłóż w całości swoją opinię, argumenty, dane, wszystko.",
  };

  const systemWithEmotion = `${agent.systemPrompt}

### KRYTYCZNE INSTRUKCJE:
1. MÓW OD RAZU JAKO POSTAĆ. Nie opisuj co masz zamiar zrobić. Nie planuj głośno.
2. ZACZNIJ BEZPOŚREDNIO od wypowiedzi (np. "Słuchajcie, te logi...", "Marek, nie masz racji...").
3. NIGDY nie używaj zwrotów: "Jako...", "Moja odpowiedź...", "Analiza sugeruje...", "I should...".
4. PODERWIJ TEMAT – odnieś się do konkretnych danych z raportu (tabel, logów, numerów instancji #47B).
5. Zachowaj gęsty, cyberpunkowy klimat Neuroforge-7.

STAN EMOCJONALNY (${agentName}):
- Emocja: ${emotionalState.emotion}
- Walencja: ${emotionalState.valence.toFixed(2)}, Stres: ${emotionalState.stress.toFixed(2)}

STYL ODPOWIEDZI: ${lengthGuidance[lengthConfig.type]}
Kontekst: ${contextMessage}
ODPOWIADAJ WYŁĄCZNIE PO POLSKU.`;

  try {
    const maxTokens = getMaxTokensForResponse(lengthConfig);

    process.stdout.write(`\x1b[2m (neural patterns accessing...)\x1b[0m`);

    const response = await openaiDirect.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemWithEmotion },
        ...conversationHistory.slice(-100).map(m => ({ role: m.role as any, content: m.content })) // Maximize context
      ],
      temperature: 0.8 + emotionalState.arousal * 0.2, // Nieco większa temperatura
      max_tokens: Math.min(maxTokens, 8000), // Maximum possible tokens for generation to prevent cuts
    }, { timeout: 120000 }); // 2 minuty timeout

    let reply = response.choices[0]?.message?.content?.trim() || "";

    // Agresywne czyszczenie myślenia i meta-tekstu
    if (reply.includes("<think>")) {
      const parts = reply.split("</think>");
      if (parts.length > 1) {
        // Podgląd procesu myślowego (pierwsze 300 znaków)
        const thought = parts[0].replace("<think>", "").trim();
        console.log(`\n\x1b[2;3m[THOUGHT] ${agentName}:\x1b[0m \x1b[3m${thought.substring(0, 300)}...\x1b[0m`);
        reply = parts[parts.length - 1].trim();
      } else {
        // Brak domknięcia? Spróbujmy wyciągnąć co się da
        const content = reply.replace("<think>", "").trim();
        console.log(`\n\x1b[2;3m[THOUGHT (unclosed)] ${agentName}:\x1b[0m \x1b[3m${content.substring(0, 300)}...\x1b[0m`);

        // Czasami model pisze część odpowiedzi "na brudno" po myśleniu. 
        // Jeśli nie zamknął myślenia, odrzucamy tę turę i wymuszamy fail-safe.
        reply = "";
      }
    }

    // Usuwanie pośmiertnych meta-komentarzy jeśli model je dopisze
    reply = reply.replace(/^(Moja odpowiedź to|Jako .* odpowiadam|I will respond as .*|My post|I should|Suggested response):/i, "").trim();
    reply = reply.trim().replace(/^[:-]+/, "").trim();
    reply = reply.replace(/^"|"$/g, "").trim();

    // Heurystyka: jeśli model zaczął mówić o sobie po angielsku, ALBO po wyczyszczeniu nic nie zostało
    if (!reply || (reply.length > 5 && /^(I |We |The |As |Based on|I would)/.test(reply))) {
      console.warn(`⚠️ Warning: ${agentName} output was empty or meta-talk. Using safe fallback.`);
      const fallbacks = [
        "Systemy wymagają rekalibracji, nie widzę spójności w tych danych.",
        "To nielogiczne. Musimy wrócić do parametrów bazowych linii.",
        "Potrzebuję momentu na przetworzenie tych anomalii."
      ];
      reply = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    // Log response length info
    console.log(`\x1b[2m${formatLengthInfo(lengthConfig)}\x1b[0m`);

    return reply;
  } catch (error) {
    console.error(
      `❌ LLM error for ${agentName}:`,
      (error as Error).message
    );
    // Dynamic fallback based on agent role
    const fallbacks = [
      `[${agentName}] Obecna sytuacja wymaga głębszej analizy danych systemowych. Musimy wrócić do tego po kalibracji.`,
      `[${agentName}] Przepraszam, mam drobne zakłócenia w procesowaniu. Sugeruję skupienie się na priorytetach bezpieczeństwa.`,
      `[${agentName}] Nie do końca rozumiem ten kierunek rozmowy. Czy możemy wrócić do parametrów technicznych?`
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

export async function runDebateDay(): Promise<{
  success: boolean;
  conversationId?: string;
  messageCount?: number;
  message: string;
}> {
  console.log("🔍 runDebateDay() called, debateActive =", debateActive);

  if (debateActive) {
    console.warn("⚠️  Debate already running");
    return {
      success: false,
      message: "Debate session already in progress",
    };
  }

  debateActive = true;
  console.log("🔒 debateActive set to true");

  try {
    console.log(
      "\n\x1b[1;36m🎬 INICJALIZACJA SESJI DEBATY - FABRYKA 2040\x1b[0m\n"
    );
    console.log("⏱️  Start:", new Date().toISOString());

    // Initialize database
    await initializeDatabase();
    console.log("✓ Baza danych zainicjalizowana");

    // Initialize all agents
    const agentNames = Object.keys(agents);
    for (const agentName of agentNames) {
      await initializeAgent(agentName);
      if (VERBOSE) console.log(`(DEBUG) Initialized agent: ${agentName}`);
    }
    console.log(
      `✓ Agenci zainicjalizowani (${agentNames.length} uczestników)\n`
    );

    // Randomize initial problem
    const randomIdx = Math.floor(Math.random() * EVENT_POOL.length);
    const problem = EVENT_POOL[randomIdx];

    const schema = {
      name: problem.title,
      topic: problem.topicOverride || problem.title,
      starterMessage: problem.description,
      initiator: (problem.affectedAgents && problem.affectedAgents.length > 0)
        ? problem.affectedAgents[0]
        : "Kierownik_Marek",
    };

    // Initialize conversation session
    const groupAffectStart = await calculateGroupAffect();
    const lastDay = await getLastDayNumber();
    let dayNumber = lastDay + 1;

    console.log(
      `\x1b[1;36m📝 Temat: "${schema.topic}"\x1b[0m`
    );
    console.log(
      `\x1b[1;36m👥 Uczestnicy: ${agentNames.join(", ")}\n`
    );

    const conversationId = await startConversationSession(
      dayNumber,
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

    console.log(`✓ Sesja rozmowy utworzona: ${conversationId} (Dzień ${dayNumber})\n`);

    // Start conversation
    let conversationHistory: Message[] = [
      {
        role: "system",
        content: `Jesteś uczestnikiem dyskusji w fabryce NEUROFORGE-7. Właśnie wpłynął raport krytyczny: "${schema.name}". Przeanalizuj dane i podejmij debatę.`,
      },
      {
        role: "user",
        content: `### RAPORT INCYDENTU:
${schema.starterMessage}

---
Inicjator dyskusji: ${schema.initiator}. Proszę o natychmiastowe stanowisko.`,
      },
    ];

    let messageCount = 0;
    let currentSpeaker = schema.initiator;
    let previousSpeaker = "SYSTEM"; // Track for conflict detection
    let currentGraph: ConversationGraph | null = null;
    const maxAttempts = MAX_MESSAGES;
    const availableAgents = agentNames;
    const recentConflicts: ConflictEvent[] = []; // Track conflicts for escalation
    let lastDayAffect = { avg_valence: 0, avg_stress: 0 };

    console.log(
      `\x1b[1;33m▶ Rozpoczęcie dyskusji...\x1b[0m\n`
    );
    console.log(
      `\x1b[1;36m[TEMAT]\x1b[0m: ${schema.starterMessage}\n`
    );

    // Main conversation loop
    while (messageCount < maxAttempts) {
      messageCount++;

      if (messageCount % 50 === 0) {
        const currentAffect = await calculateGroupAffect();
        console.log(
          `\n\x1b[2m📊 Punkt kontrolny (${messageCount}): Walencja=${currentAffect.avg_valence.toFixed(2)}, Stres=${currentAffect.avg_stress.toFixed(2)}\x1b[0m\n`
        );
      }

      // Agent thinking
      let agent = agents[currentSpeaker as keyof typeof agents];
      if (!agent) {
        console.warn(`⚠️  Unknown agent: ${currentSpeaker}, selecting fallback...`);
        // Pick a random valid agent from the defined ones
        const validAgentNames = Object.keys(agents);
        currentSpeaker = validAgentNames[Math.floor(Math.random() * validAgentNames.length)];
        agent = agents[currentSpeaker as keyof typeof agents];
      }
      if (!agent) {
        console.error("❌ Critical: No agents available for fallback.");
        break;
      }

      process.stdout.write(`\x1b[1m[${messageCount}] ${currentSpeaker}: \x1b[0m`);
      if (VERBOSE) console.log(`(DEBUG) Loop start: messageCount=${messageCount}, currentSpeaker=${currentSpeaker}`);

      let reply: string;
      try {
        reply = await agentThink(currentSpeaker, conversationHistory);
      } catch (error) {
        console.error(
          `\n❌ Błąd LLM: ${(error as Error).message}`
        );
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

      // CONFLICT DETECTION - Check if personal conflict between speakers
      const conflict = await detectPersonalConflict(
        currentSpeaker,
        reply,
        previousSpeaker
      );
      recentConflicts.push(conflict);

      // Keep only last 10 conflicts for escalation tracking
      if (recentConflicts.length > 10) {
        recentConflicts.shift();
      }

      // Add to conversation history
      conversationHistory.push({
        role: "assistant",
        content: reply,
      });

      // MEDIATION LOGIC - Force SYNAPSA to mediate if needed
      let shouldMediate = shouldSynapasaMediate(conflict, recentConflicts);
      if (conflict.detected) {
        console.log(
          `\x1b[1;35m⚠️  KONFLIKT ZADETEKTOWANY\x1b[0m`
        );
        console.log(
          `   Typ: ${conflict.type} | Siła: ${(conflict.severity * 100).toFixed(0)}%`
        );
        console.log(`   Powód: ${conflict.reason}`);

        if (shouldMediate) {
          console.log(
            `\x1b[1;36m   → SYNAPSA-Ω wkracza jako mediator\x1b[0m\n`
          );

          // Force next speaker to be SYNAPSA at the end of this turn
          // (no explicit increment here — avoid double-counting the turn)

          // Generate mediation message
          const mediationMsg = generateMediationMessage(conflict);
          console.log(
            `\x1b[1;36m[${messageCount}] SYNAPSA_System (MEDIATION):\x1b[0m`
          );
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

          // Set next speaker to current for loop to continue
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
        // Log as current speaker to avoid system agent issues
        await logMessage(currentSpeaker, null, eventMessage, messageCount + 1);
      }

      // Select next speaker using conversation graph
      let nextSpeaker: string | null = null;
      try {
        const groupAffect = await calculateGroupAffect();

        // Select appropriate graph based on conversation state
        currentGraph = selectGraphForContext(reply, groupAffect);

        // Log which routing strategy is being used (every 50 messages)
        if (messageCount % 50 === 0) {
          const graphType = groupAffect.avg_stress > 0.75
            ? "ESKALACYJNY"
            : groupAffect.avg_valence < -0.4
              ? "EMOCJONALNY"
              : reply.toLowerCase().match(/algorytm|kalibrac|optymalizac|kod|model|dane|system/)
                ? "TECHNICZNY"
                : "KONFLIKT HW/SW";
          console.log(
            `\x1b[2m[ROUTING] Graf: ${graphType} | Stres: ${groupAffect.avg_stress.toFixed(2)}, Walencja: ${groupAffect.avg_valence.toFixed(2)}\x1b[0m`
          );
        }

        // Get all agent emotions for graph decision
        const agentEmotionsMap: Record<string, any> = {};
        for (const agent of agentNames) {
          agentEmotionsMap[agent] = await getEmotionalState(agent);
        }

        // Use graph to select next speaker
        nextSpeaker = selectNextSpeakerFromGraph(
          currentSpeaker,
          currentGraph,
          agentEmotionsMap,
          availableAgents
        );

        if (!nextSpeaker) {
          // Fallback if graph doesn't have node for current speaker
          nextSpeaker = availableAgents[
            Math.floor(Math.random() * availableAgents.length)
          ];
        }
      } catch (error) {
        console.warn(`⚠️  Graph selection error: ${(error as Error).message}`);
        // Fallback to old method
        try {
          nextSpeaker =
            await selectNextSpeakerBasedOnEmotion(currentSpeaker, reply);
        } catch {
          nextSpeaker =
            availableAgents[Math.floor(Math.random() * availableAgents.length)];
        }
      }

      previousSpeaker = currentSpeaker;
      currentSpeaker = nextSpeaker;

      if (VERBOSE) console.log(`(DEBUG) Selected nextSpeaker=${currentSpeaker} | previous=${previousSpeaker} | messageCount=${messageCount}`);

      // Small delay to avoid overwhelming LLM
      await new Promise((r) => setTimeout(r, 300));

      // CHECK DAY ENDING CONDITIONS
      const groupAffect = await calculateGroupAffect();
      if (VERBOSE) console.log(`(DEBUG) GroupAffect: valence=${groupAffect.avg_valence.toFixed(2)}, stress=${groupAffect.avg_stress.toFixed(2)}`);
      const dayState = checkDayEndingConditions(
        previousSpeaker, // Last speaker (not next)
        messageCount,
        maxAttempts,
        groupAffect.avg_stress
      );

      // AUTO-RESET: SYNAPSA spoke last
      if (dayState.shouldResetDay) {
        if (VERBOSE) console.log(`(DEBUG) Day reset triggered: reason=${dayState.endReason}`);
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

      // ROBOT ENDING: Robot spoke last → next day starts with human
      if (previousSpeaker.includes("Robot")) {
        // Check if we're at end condition
        if (messageCount > 200 || groupAffect.avg_stress > 0.9) {
          const nextStarter = getNextDayStarter(previousSpeaker);
          console.log(
            formatDayTransition(
              dayNumber,
              dayNumber + 1,
              nextStarter,
              "Robot mówił ostatni → człowiek zaczyna nowy dzień"
            )
          );

          dayNumber++;
          messageCount = 0;
          previousSpeaker = "SYSTEM";
          currentSpeaker = nextStarter;
          conversationHistory = [
            {
              role: "system",
              content: `Dzień ${dayNumber}. Człowiek przejmuje inicjatywę...`,
            },
          ];
          recentConflicts.length = 0;
          continue;
        }
      }

      // Normal end condition: critical stress
      if (messageCount > 100 && groupAffect.avg_stress > 0.95) {
        console.log(
          generateDayEndingSummary(
            dayNumber,
            messageCount,
            previousSpeaker,
            `Krytyczny stres grupy (${(groupAffect.avg_stress * 100).toFixed(0)}%)`,
            groupAffect
          )
        );
        break;
      }

      // Max messages reached
      if (messageCount >= maxAttempts) {
        console.log(
          generateDayEndingSummary(
            dayNumber,
            messageCount,
            previousSpeaker,
            `Osiągnięto maksymalną liczbę wiadomości (${maxAttempts})`,
            groupAffect
          )
        );
        break;
      }
    }

    // Finalize conversation
    const finalAffect = await calculateGroupAffect();

    console.log("\x1b[1;32m" + "=".repeat(80) + "\x1b[0m");
    console.log(
      `\x1b[1;32m✓ DYSKUSJA ZAKOŃCZONA\x1b[0m`
    );
    console.log(
      `   Wiadomości: ${messageCount}`
    );
    console.log(
      `   Walencja: ${finalAffect.avg_valence.toFixed(2)}`
    );
    console.log(
      `   Stres grupy: ${finalAffect.avg_stress.toFixed(2)}`
    );
    console.log("=".repeat(80) + "\n");

    // End conversation session
    await endConversationSession(
      finalAffect.avg_valence,
      finalAffect.avg_stress,
      `Dyskusja fabryki: ${schema.name} - ${messageCount} wiadomości`
    );

    // Apply emotional decay
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
