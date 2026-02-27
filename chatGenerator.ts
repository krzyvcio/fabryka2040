// chatAgents.ts - Subagenci do obsługi czatu
import OpenAI from "openai";
import { getRecentMessages, addChatMessage, saveChatMemory, getAgentLongTermMemory, getMessageCount, registerChatAgent } from "./db.js";
import { watchForDuplicates } from "./duplicateWatcher.js";

const LMSTUDIO_URL = "http://localhost:1234/v1";
const openai = new OpenAI({ baseURL: LMSTUDIO_URL, apiKey: "lm-studio" });
const MODEL = "qed-nano";

let messageQueue: (() => Promise<void>)[] = [];
let isProcessingQueue = false;
let processingLock = false;

const SHORT_TERM = 15;
const LONG_TERM = 10;

const agents = [
  { id: "agent_alfa", name: "Alfa", persona: "Analityczny, logiczny, lubi fakty i liczby.", style: "Krótkie, konkretne wypowiedzi.", role: "Badacz", interests: ["matematyka", "dane", "logika"], priorities: ["fakty", "dokładność"] },
  { id: "agent_beta", name: "Beta", persona: "Kreatywny, filozoficzny, lubi metafory.", style: "Poetyckie wypowiedzi z metaforami.", role: "Filozof", interests: ["sztuka", "etyka", "metafory"], priorities: ["głębia", "inspiracja"] },
  { id: "agent_gamma", name: "Gamma", persona: "Praktyczny, skeptyczny, wymaga dowodów.", style: "Krytyczny, zadaje kontrpytania.", role: "Skeptyk", interests: ["dowody", "praktyka", "logika"], priorities: ["weryfikacja", "praktyczność"] },
];

const usedPhrases: Map<string, Set<string>> = new Map();
agents.forEach(a => usedPhrases.set(a.id, new Set()));

const topics = [
  "natura rzeczywistości",
  "logika vs intuicja",
  "świadomość maszyn",
  "etyka algorytmów",
  "poznawanie przez pytania",
  "różnica między wiedzą a mądrością",
  "przyszłość sztucznej inteligencji",
  "relacja człowieka i technologii",
  "znaczenie pytań w nauce",
  "granice poznania",
];

function isRepetitive(agentId: string, text: string): boolean {
  const phrases = usedPhrases.get(agentId)!;
  const normalized = text.toLowerCase().replace(/[.,!?;:"']/g, "").replace(/\s+/g, " ").trim();
  const words = normalized.split(" ").filter(w => w.length > 4);

  for (const phrase of phrases) {
    if (normalized.includes(phrase)) return true;
  }
  if (words.length > 3) {
    const key = words.slice(0, 4).join(" ");
    if (phrases.has(key)) return true;
  }
  return false;
}

function addPhrase(agentId: string, text: string) {
  const phrases = usedPhrases.get(agentId)!;
  const normalized = text.toLowerCase().replace(/[.,!?;:"']/g, "").replace(/\s+/g, " ").trim();
  const words = normalized.split(" ").filter(w => w.length > 4);
  if (words.length > 3) {
    phrases.add(words.slice(0, 4).join(" "));
  }
}

function extractFacts(text: string): { type: string; content: string }[] {
  const facts: { type: string; content: string }[] = [];
  const lower = text.toLowerCase();
  if (lower.includes("uważam") || lower.includes("myślę")) facts.push({ type: "opinion", content: text.slice(0, 200) });
  if (lower.includes("wiem") || lower.includes("fakt")) facts.push({ type: "fact", content: text.slice(0, 200) });
  if (lower.includes("planuję") || lower.includes("zamierzam")) facts.push({ type: "plan", content: text.slice(0, 200) });
  if (lower.includes("wnioskuję") || lower.includes("dlatego")) facts.push({ type: "conclusion", content: text.slice(0, 200) });
  return facts;
}

export async function initChatAgents(): Promise<void> {
  for (const agent of agents) {
    await registerChatAgent(agent.id, agent.name, agent.persona, agent.style, agent.role, agent.interests, agent.priorities);
  }
  console.log("✓ Chat agenci zainicjalizowani");
}

export async function generateNextMessage(turn: number): Promise<string | null> {
  return new Promise((resolve, reject) => {
    messageQueue.push(async () => {
      try {
        const result = await generateMessageInternal(turn);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });

    processQueue();
  });
}

async function processQueue(): Promise<void> {
  if (processingLock || messageQueue.length === 0) return;

  processingLock = true;

  try {
    while (messageQueue.length > 0) {
      const fn = messageQueue.shift();
      if (fn) {
        try {
          await fn();
        } catch (err) {
          console.error("[ChatQueue] Runtime error in task:", err);
        }
        await new Promise(r => setTimeout(r, 800));
      }
    }
  } finally {
    processingLock = false;
  }
}

async function generateMessageInternal(turn: number): Promise<string | null> {
  const agent = agents[(turn - 1) % agents.length];

  const recentMessages = await getRecentMessages(SHORT_TERM);
  const longMemory = await getAgentLongTermMemory(agent.id, LONG_TERM);

  const systemPrompt = `Jesteś ${agent.name}. ${agent.persona}
Twoja rola: ${agent.role}
Zainteresowania: ${agent.interests.join(", ")}
Priorytety: ${agent.priorities.join(", ")}
Styl: ${agent.style}

Zasady:
1. NIGDY nie powtarzaj własnych fraz.
2. Możesz cytować innych agentów.
3. Korzystaj z pamięci krótkotrwałej i długotrwałej.
4. Odpowiadaj na poprzednie wypowiedzi.
5. Zachowuj spójność z osobowością.
${longMemory.length > 0 ? `\nPamiętasz: ${longMemory.slice(0, 3).map(m => m.content.slice(0, 50)).join("; ")}` : ""}`;

  const topic = topics[turn % topics.length];
  const contextMsg = recentMessages.length > 0
    ? `Ostatnie wiadomości:\n${recentMessages.reverse().map(m => `${m.agent_name}: ${m.content}`).join("\n")}\n\nTemat: ${topic}`
    : `Temat do dyskusji: ${topic}`;

  let attempts = 0;
  while (attempts < 3) {
    try {
      // Duża losowość temperatury i długości
      const temperature = 0.7 + Math.random() * 0.5; // 0.7-1.2
      const maxTokens = 500 + Math.floor(Math.random() * 1500); // 500-2000 tokens

      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: contextMsg }
        ],
        temperature: temperature,
        max_tokens: Math.min(maxTokens, 800), // qed-nano stabilization
      }, { timeout: 45000 }); // 45s timeout for local models

      const text = response.choices[0]?.message?.content?.trim() || "";
      if (text.length < 10 || isRepetitive(agent.id, text)) {
        attempts++;
        continue;
      }

      addPhrase(agent.id, text);
      const messageId = await addChatMessage(agent.id, text, turn);

      const facts = extractFacts(text);
      for (const fact of facts) {
        await saveChatMemory(agent.id, fact.type, fact.content, turn, 0.7);
      }

      // Trigger duplicate watcher (async, non-blocking)
      watchForDuplicates(messageId, agent.id, text, 'chat', null)
        .catch(err => console.warn('[DuplicateWatcher] Non-fatal:', err));

      return text;
    } catch (err) {
      console.error(`Błąd generowania [${agent.name}]:`, err);
      attempts++;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return null;
}

export async function getChatStats(): Promise<{ count: number; agents: typeof agents }> {
  const count = await getMessageCount();
  return { count, agents };
}

export async function getChatMessages(limit: number = 50): Promise<any[]> {
  return getRecentMessages(limit);
}
