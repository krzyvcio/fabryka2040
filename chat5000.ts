// chat5000.ts - System czatu z 5000 wiadomości
// Uruchom: npx tsx chat5000.ts

import OpenAI from "openai";
import { initializeDatabase, closeDatabase, registerChatAgent, addChatMessage, getRecentMessages, saveChatMemory, getAgentLongTermMemory } from "./db.js";

const LMSTUDIO_URL = "http://localhost:1234/v1";
const openai = new OpenAI({
  baseURL: LMSTUDIO_URL,
  apiKey: "lm-studio",
});

const MODEL = "qed-nano";
const TOTAL_MESSAGES = 5000;
const SHORT_TERM_MEMORY = 15;
const LONG_TERM_MEMORY = 10;

const agents = [
  {
    id: "agent_alfa",
    name: "Alfa",
    persona: "Analityczny, logiczny, lubi liczby i fakty. Zadaje precyzyjne pytania.",
    style: "Krótkie, konkretne wypowiedzi. Często pyta o szczegóły.",
    role: "Badacz",
    interests: ["matematyka", "dane", "statystyki", "logika"],
    priorities: ["fakty", "dokładność", "efektywność"],
  },
  {
    id: "agent_beta",
    name: "Beta",
    persona: "Kreatywny, filozoficzny, lubi metafory i abstrakcję. Myśli szeroko.",
    style: "Poetyckie, metaforyczne wypowiedzi. Łączy pozornie niepowiązane tematy.",
    role: "Filozof",
    interests: ["sztuka", "metafory", "etyka", "sens życia"],
    priorities: ["głębia", "inspiracja", "nowe perspektywy"],
  },
  {
    id: "agent_gamma",
    name: "Gamma",
    persona: "Praktyczny, skeptyczny, lubi dowody. Wątpi we wszystko.",
    style: "Krytyczny, zadaje kontrpytania. Wymaga dowodów.",
    role: "Skeptik",
    interests: ["dowody", "logika", "praktyka", "realizm"],
    priorities: ["sprawdzanie", "weryfikacja", "praktyczność"],
  },
];

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

const usedSentences: Map<string, string[]> = new Map();
const usedPhrases: Map<string, Set<string>> = new Map();

function initAgentTracking() {
  for (const agent of agents) {
    usedSentences.set(agent.id, []);
    usedPhrases.set(agent.id, new Set());
  }
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[.,!?;:"']/g, "").replace(/\s+/g, " ").trim();
}

function isRepetitive(agentId: string, text: string): boolean {
  const normalized = normalizeText(text);
  const phrases = usedPhrases.get(agentId)!;

  const words = normalized.split(" ").filter(w => w.length > 4);
  for (const phrase of phrases) {
    if (normalized.includes(phrase) || phrase.includes(normalized)) {
      return true;
    }
  }

  if (words.length > 3) {
    const key = words.slice(0, 4).join(" ");
    if (phrases.has(key)) {
      return true;
    }
    phrases.add(key);
  }

  return false;
}

function extractFacts(text: string, turn: number, agentId: string): { type: string; content: string }[] {
  const facts: { type: string; content: string }[] = [];
  const lower = text.toLowerCase();

  if (lower.includes("uważam") || lower.includes("myślę") || lower.includes("przekonany")) {
    facts.push({ type: "opinion", content: text.slice(0, 200) });
  }
  if (lower.includes("wiem") || lower.includes("fakt") || lower.includes("dane показують")) {
    facts.push({ type: "fact", content: text.slice(0, 200) });
  }
  if (lower.includes("planuję") || lower.includes("zamierzam") || lower.includes("chcę")) {
    facts.push({ type: "plan", content: text.slice(0, 200) });
  }
  if (lower.includes("wnioskuję") || lower.includes("dlatego") || lower.includes("więc")) {
    facts.push({ type: "conclusion", content: text.slice(0, 200) });
  }

  return facts;
}

function buildSystemPrompt(agent: typeof agents[0], shortMemory: any[], longMemory: any[]): string {
  const topics = agent.interests.join(", ");
  const priorities = agent.priorities.join(", ");

  let prompt = `Jesteś agentem konwersacyjnym o imieniu ${agent.name}.
Twoja osobowość: ${agent.persona}
Twoja rola: ${agent.role}
Twoje zainteresowania: ${topics}
Twoje priorytety: ${priorities}

Zadanie: generować unikalne wypowiedzi w rozmowie trwającej minimum 5000 wiadomości.

Zasady:
1. NIGDY nie powtarzaj własnych wypowiedzi ani fraz.
2. Możesz cytować innych agentów używając formatu: "jak powiedział [imię]: [...]"
3. Korzystaj z pamięci krótkotrwałej (ostatnie ${SHORT_TERM_MEMORY} wiadomości).
4. Jeśli odkryjesz nowy fakt, zapisz go do pamięci długotrwałej.
5. Twoje wypowiedzi muszą być różnorodne i kreatywne.
6. Rozwijaj romowę, wprowadzaj nowe wątki, zadawaj pytania innym agentom.
7. Zachowuj spójność z własną osobowością.`;

  if (longMemory.length > 0) {
    prompt += `\n\nPamiętasz z przeszłości:`;
    for (const mem of longMemory.slice(0, 5)) {
      prompt += `\n- [${mem.memory_type}] ${mem.content.slice(0, 100)}`;
    }
  }

  return prompt;
}

function buildContext(shortMemory: any[]): Message[] {
  const messages: Message[] = [];

  if (shortMemory.length > 0) {
    messages.push({
      role: "user",
      content: "Ostatnie wiadomości w rozmowie:\n" +
        shortMemory.reverse().map(m => `${m.agent_name}: ${m.content}`).join("\n")
    });
  }

  return messages;
}

async function generateMessage(agent: typeof agents[0], shortMemory: any[], longMemory: any[], turn: number): Promise<string> {
  const systemPrompt = buildSystemPrompt(agent, shortMemory, longMemory);
  const context = buildContext(shortMemory);

  const topics = [
    "co myślisz o naturze rzeczywistości?",
    "jak możemy ulepszyć komunikację?",
    "co jest ważniejsze - logika czy intuicja?",
    "dlaczego ludzie tworzą sztuczną inteligencję?",
    "czy maszyna może mieć świadomość?",
    "jak definiujesz sukces?",
    "co powstrzymuje ludzkość przed postępem?",
    "czy etyka może być algorytmiczna?",
    "jaka jest rola pytań w poznawaniu?",
    "co łączy naukę i sztukę?",
  ];

  const topic = topics[turn % topics.length];
  context.push({
    role: "user",
    content: `Temat do dyskusji: ${topic}\n\nWeź udział w rozmowie, odpowiadając na poprzednie wypowiedzi lub wprowadzając nowy aspekt tematu.`
  });

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      console.log(`  [${agent.name} myśli...]`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...context],
        temperature: 0.9 + Math.random() * 0.3,
        max_tokens: 300,
      }, { signal: controller.signal });

      clearTimeout(timeout);
      const text = response.choices[0]?.message?.content?.trim() || "";

      if (text.length < 10) {
        attempts++;
        continue;
      }

      if (isRepetitive(agent.id, text)) {
        console.log(`  [POWTÓRZENIE WYKRYTE - próba ${attempts + 1}]`);
        attempts++;
        continue;
      }

      return text;
    } catch (err) {
      console.error(`  Błąd generowania: ${err}`);
      attempts++;
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return `[${agent.name} się zawahał i milknie na chwilę]`;
}

async function processFacts(agentId: string, content: string, turn: number) {
  const facts = extractFacts(content, turn, agentId);

  for (const fact of facts) {
    await saveChatMemory(agentId, fact.type, fact.content, turn, 0.7);
  }
}

async function run() {
  console.log("🚀 Inicjalizacja systemu czatu 5000 wiadomości...\n");

  await initializeDatabase();
  initAgentTracking();

  for (const agent of agents) {
    await registerChatAgent(
      agent.id,
      agent.name,
      agent.persona,
      agent.style,
      agent.role,
      agent.interests,
      agent.priorities
    );
    console.log(`✓ Zarejestrowano agenta: ${agent.name}`);
  }

  console.log(`\n📊 Cel: ${TOTAL_MESSAGES} wiadomości\n`);

  const startTime = Date.now();
  let lastProgress = 0;

  for (let turn = 1; turn <= TOTAL_MESSAGES; turn++) {
    const agentIndex = (turn - 1) % agents.length;
    const agent = agents[agentIndex];

    const recentMessages = await getRecentMessages(SHORT_TERM_MEMORY);
    const longMemory = await getAgentLongTermMemory(agent.id, LONG_TERM_MEMORY);

    const message = await generateMessage(agent, recentMessages, longMemory, turn);

    await addChatMessage(agent.id, message, turn);

    await processFacts(agent.id, message, turn);

    const progress = Math.floor((turn / TOTAL_MESSAGES) * 100);
    if (progress !== lastProgress && progress % 10 === 0) {
      console.log(`📈 Postęp: ${turn}/${TOTAL_MESSAGES} (${progress}%)`);
      lastProgress = progress;
    }

    if (turn % 50 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      const rate = (turn / ((Date.now() - startTime) / 1000)).toFixed(1);
      console.log(`  ⏱️ Czas: ${elapsed} min | Prędkość: ${rate} msg/s`);
    }

    await new Promise(r => setTimeout(r, 100));
  }

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n✅ UKOŃCZONO!`);
  console.log(`   Wiadomości: ${TOTAL_MESSAGES}`);
  console.log(`   Czas: ${totalTime} minut`);

  await closeDatabase();
  process.exit(0);
}

run().catch(err => {
  console.error("KRYTYCZNY BŁĄD:", err);
  process.exit(1);
});
