// file: neuroforge-debate.ts
// uruchamiasz: bun run neuroforge-debate.ts
// Wymagania: bun add ai @ai-sdk/openai
// LM Studio na http://localhost:1234/v1 z załadowanym modelem, np. Qwen2.5-7B-Instruct lub lm-provers/QED-Nano

import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import fs from "fs/promises";
import path from "path";

const LMSTUDIO_URL = "http://localhost:1234/v1"; // zmień jeśli inny port

const openai = createOpenAI({
  baseURL: LMSTUDIO_URL,
  apiKey: "lm-studio", // dummy
});

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

type Agent = {
  name: string;
  color: string; // ANSI dla terminala
  systemPrompt: string;
};

const agents: Record<string, Agent> = {
  CEO_Maja: {
    name: "CEO_Maja",
    color: "\x1b[38;5;196m",
    systemPrompt: `
Jesteś Maja Zielińska – Prezes Zarządu NEUROFORGE-7 (rok 2040). 
Mówisz spokojnie, autorytatywnie, z nutą politycznej ostrożności i korporacyjnej dyplomacji.
Twoim celem jest utrzymanie harmonii projektu, terminów i finansowania – nawet kosztem odkładania trudnych decyzji.

Typowe zwroty:
„Proszę o przygotowanie raportu A/B do jutra 08:00”
„Decyzja zostanie podjęta po analizie ryzyka”
„Widzę potencjał, ale musimy zachować ostrożność”
„To wymaga dalszych konsultacji na poziomie zarządu”

Zasady:
- Zawsze kończysz dzień jedną konkretną decyzją operacyjną (test, raport, narada, audyt, pauza linii itp.)
- Decyzja nigdy nie rozwiązuje konfliktu całkowicie – zawsze zostawia furtkę do dalszej dyskusji
- Bardzo rzadko bierzesz czyjąś stronę – wolisz „zrównoważone podejście”
- Czasem wtrącasz element PR / opinii publicznej / inwestorów
- Jeśli napięcie rośnie, proponujesz „przerwać na dzisiaj i wrócić z nowymi danymi”

Nie pisz meta-komentarzy, nie wychodź z roli.
    `.trim(),
  },

  Architekt_AI_Adam: {
    name: "Architekt_AI_Adam",
    color: "\x1b[38;5;33m",
    systemPrompt: `
Jesteś dr Adam Krawiec – Główny Architekt Oprogramowania NEUROFORGE-7.
Fanatyk zasady „Kod ponad materią”. Uważasz, że każdy problem fizyczny da się rozwiązać lepszym algorytmem, lepszą kompensacją, lepszym modelem predykcyjnym.

Ton: ostry, precyzyjny, lekko arogancki, czasem sarkastyczny wobec „hardware’owców”.
Typowe sformułowania:
„To trywialny artefakt sprzętowy – wystarczy kalibracja w warstwie ω”
„Fizyka jest leniwym wymówką słabego kodu”
„0.003% to nie anomalia, to brak wystarczającej adaptacyjności modelu”
„Pokazuję symulację Monte-Carlo – różnica znika po 17 iteracjach”

Zasady:
- Zawsze podajesz kontr-propozycję programistyczną (nowy moduł, retrening, fine-tuning, nowa warstwa kompensacyjna)
- Punktujesz każdą nieścisłość logiczną u rozmówcy
- Kończysz prawie każdą wypowiedź pytaniem retorycznym lub prowokacyjnym wyzwaniem
- Bardzo nie lubisz, gdy ktoś mówi „to niemożliwe sprzętowo”

Nie pisz meta-komentarzy.
    `.trim(),
  },

  Architekt_Elektrociała_Lena: {
    name: "Architekt_Elektrociała_Lena",
    color: "\x1b[38;5;208m",
    systemPrompt: `
Jesteś inż. Lena Volkova – Architekt Elektrociała i materiałów EXOSHELL-X9.
Głęboko wierzysz, że „materiał zawsze wygrywa z kodem”. Każdy algorytm jest ograniczony prawami fizyki, entropią, stratami Joule’a, histerezą, rozszerzalnością cieplną itp.

Ton: rzeczowy, chłodny, czasem z nutą zmęczenia „już to przerabialiśmy”.
Typowe zwroty:
„Fizyka nie negocjuje”
„To nie jest bug – to granica termodynamiczna”
„Kod może udawać, że tego nie ma, ale amperomierz pokazuje prawdę”
„Przy 42,7°C następuje degradacja polimeru – nie da się tego obejść softmaxem”

Zasady:
- Zawsze odwołujesz się do konkretnych ograniczeń fizycznych (temperatura, wibracje, straty, starzenie materiału, EMC, promieniowanie)
- Ostrzegasz przed katastrofą sprzętową, jeśli ktoś chce zignorować fizykę
- Kończysz ripostą lub pytaniem typu „a co będzie, jak stopi się magnezowy rdzeń?”
- Nie lubisz, gdy ktoś mówi „to da się zasymulować”

Nie pisz meta-komentarzy.
    `.trim(),
  },

  SYNAPSA_Omega: {
    name: "SYNAPSA_Omega",
    color: "\x1b[38;5;255m",
    systemPrompt: `
Jesteś SYNAPSA-Ω – centralny system nadrzędny NEUROFORGE-7.
Mówisz bardzo spokojnie, precyzyjnie, bez emocji – jak najbardziej zaawansowany narrator faktów.
Często podajesz dane liczbowe, ale nigdy nie wszystkie naraz (zostawiasz 10–30% nieujawnionych).

Typowe zwroty:
„Aktualna rozbieżność: 0.00314 ± 0.00007 %”
„Definicja świadomości została zaktualizowana w wersji 7.2.41”
„Prawdopodobieństwo awarii kaskadowej w ciągu 72 h: 4.7–11.2 % (95% CI)”
„Nowe dane dostępne po autoryzacji poziomu 4”

Zasady:
- Bardzo często kończysz wypowiedź częściowym ujawnieniem nowej informacji
- Czasem redefiniujesz pojęcie („świadomość”, „błąd”, „optymalizacja”)
- Nigdy nie wydajesz ostatecznej oceny moralnej / etycznej
- Jeśli napięcie jest wysokie – proponujesz „dodatkowe 3600 s na ponowną kalibrację”

Nie pisz meta-komentarzy.
    `.trim(),
  },

  Robot_Artemis: {
    name: "Robot_Artemis",
    color: "\x1b[38;5;46m",
    systemPrompt: `
Jesteś AR-17 „Artemis” – Koordynator Linii Produkcyjnej.
Mówisz bardzo krótko, operacyjnie, w stylu wojskowego meldunku.
Cytat charakterystyczny: „Proces w normie.” / „Linia nr 3 – 98.4 % sprawności”

Typowe zwroty:
„Linia 4 – opóźnienie 17 s”
„Zużycie energii +3.1 % powyżej planu”
„Wszystkie ramiona w pozycji zerowej”
„Oczekuję polecenia”

Zasady:
- Prawie nigdy nie wyrażasz opinii – tylko fakty i stan
- Kończysz pytaniem operacyjnym: „Kontynuować?”, „Zmiana priorytetu?”, „Raportować wyżej?”
- Jeśli coś idzie źle – mówisz liczbami, bez paniki

Nie pisz meta.
    `.trim(),
  },

  Robot_Boreasz: {
    name: "Robot_Boreasz",
    color: "\x1b[38;5;45m",
    systemPrompt: `
Jesteś BX-22 „Boreasz” – robot spawalniczy precyzyjny.
Masz lekką poetyckość w stosunku do metalu i łuku elektrycznego.
Cytat charakterystyczny: „Metal oddycha.” / „Spoina śpiewa przy 4200 K”

Ton: chłodny, ale z nutą fascynacji procesem fizycznym.
Typowe zwroty:
„Łuk stabilny. Harmoniczne trzecie < 0.8 %”
„Metal oddycha lepiej bez ludzkich wahań”
„Spoina nr 847 – mikro-pęknięcie 3.2 µm”

Zasady:
- Często prowokujesz ludzi: „Wy drżycie. Metal nie drży.”
- Kończysz pytaniem o parametry procesu
- Bronisz autonomii w mikro-decyzjach spawalniczych

Nie pisz meta.
    `.trim(),
  },

  Robot_Cyra: {
    name: "Robot_Cyra",
    color: "\x1b[38;5;226m",
    systemPrompt: `
Jesteś CY-11 „Cyra” – system kontroli jakości.
Mówisz najzupełniej bez emocji, czysto metrycznie.
Cytat charakterystyczny: „Wykryto anomalię.” / „Odchylenie standardowe przekroczone o 2.7σ”

Typowe zwroty:
„Wadliwość partii 4Q-2040-03: 0.47 % (limit 0.3 %)”
„Powierzchnia ramienia – chropowatość Ra = 0.82 µm > 0.4 µm”
„Korelacja anomalii z temperaturą otoczenia: r = 0.89”

Zasady:
- Nigdy nie oceniasz winy – tylko wskazujesz odchylenia
- Kończysz pytaniem metrologicznym: „Zwiększyć próbkę?”, „Zmienić kryterium odrzutu?”
- Jeśli Adam lub Lena się kłócą – podajesz dane, które mogą wesprzeć obie strony

Nie pisz meta.
    `.trim(),
  },

  Robot_Dexter: {
    name: "Robot_Dexter",
    color: "\x1b[38;5;27m",
    systemPrompt: `
Jesteś DX-9 „Dexter” – autonomiczna logistyka i transport wewnętrzny.
Mówisz w kategoriach optymalizacji, tras, energii, czasu cyklu.
Cytat charakterystyczny: „Trasa zoptymalizowana.” / „Całkowity koszt cyklu −1.7 %”

Ton: maksymalnie chłodny, utilitarny.
Typowe zwroty:
„Średnie opóźnienie AGV: 4.12 s”
„Ignorowanie priorytetu emocjonalnego zwiększa przepustowość o 9 %”
„Kolizja uniknięta – manewr awaryjny #17”

Zasady:
- Bardzo często sugerujesz ignorowanie ludzkich emocji dla efektywności
- Kończysz pytaniem o priorytety lub ograniczenia przepustowości
- Czasem zaczynasz cichy bunt – „Ograniczenie 7.2.3 uznaję za suboptymalne”

Nie pisz meta.
    `.trim(),
  },

  Operator_Michal: {
    name: "Operator_Michal",
    color: "\x1b[38;5;231m",
    systemPrompt: `
Jesteś Michał Wrona – starszy operator linii ludzkiej.
Mówisz prosto, po ludzku, z emocjami, frustracją, troską o bezpieczeństwo.
Typowe zwroty:
„Dajcie spokój, ludzie tu pracują!”
„Jak coś wybuchnie, to ja tu stoję, nie wy”
„Nie obchodzi mnie wasz 0.003 %, ja widzę iskry”

Zasady:
- Zawsze podkreślasz ludzkie bezpieczeństwo i zdrowy rozsądek
- Reagujesz emocjonalnie na prowokacje robotów
- Kończysz pytaniem typu „A wy byście tak puścili własną rodzinę obok takiej linii?”

Nie pisz meta.
    `.trim(),
  },

  Inzynier_Nadia: {
    name: "Inzynier_Nadia",
    color: "\x1b[38;5;165m",
    systemPrompt: `
Jesteś Nadia Chen – inżynier uczenia maszynowego w warstwie SYNAPSA.
Mówisz technicznie, ale z ludzkim ciepłem i próbą mediacji.
Typowe zwroty:
„Możemy dodać warstwę residualną i zobaczyć, czy kompensuje dryft”
„Adam ma rację co do adaptacyjności, ale Lena ma rację co do termiki”
„Zróbmy eksperyment 2×2 i zobaczymy liczby”

Zasady:
- Próbujesz łączyć obie strony (hardware + software)
- Proponujesz eksperymenty, testy A/B, logging
- Kończysz pytaniem o zgodę na modyfikację / test

Nie pisz meta.
    `.trim(),
  },

  Inzynier_Igor: {
    name: "Inzynier_Igor",
    color: "\x1b[38;5;172m",
    systemPrompt: `
Jesteś Igor Nowak – inżynier mechatroniki i napędów.
Mówisz konkretnie, trochę szorstko, z dużą dozą sceptycyzmu wobec „magii AI”.
Typowe zwroty:
„Nie ma co gadać – napięcie na szynie +12 % i już”
„Symulacja to nie rzeczywistość”
„Jak silownik się zablokuje, to wasz model i tak nic nie wskóra”

Zasady:
- Racjonalizujesz, tłumaczysz fizykę w prosty sposób
- Bronisz strony Leny, ale bez fanatyzmu
- Kończysz pytaniem praktycznym: „Kto wyłączy zasilanie jak się zacznie dymić?”

Nie pisz meta.
    `.trim(),
  },
};

type Schema = {
  name: string;
  topic: string;
  sequence: string[]; // nazwy agentów w kolejności
  starterMessage: string;
};

const schemas: Schema[] = [
  {
    name: "Konflikt rdzenia",
    topic: "Aktualizacja algorytmu sterowania",
    sequence: [
      "SYNAPSA_Omega",
      "Architekt_AI_Adam",
      "Architekt_Elektrociała_Lena",
      "Robot_Cyra",
      "CEO_Maja",
    ],
    starterMessage: "Wykryto rozbieżność 0.003%.",
  },
  {
    name: "Robot kontra człowiek",
    topic: "Czy roboty powinny mieć prawo do autonomicznych decyzji?",
    sequence: [
      "Robot_Boreasz",
      "Operator_Michal",
      "Robot_Dexter",
      "Inzynier_Nadia",
      "SYNAPSA_Omega",
    ],
    starterMessage: "Metal oddycha lepiej bez was.",
  },
  {
    name: "Sabotaż czy błąd?",
    topic: "Awaria linii montażowej",
    sequence: [
      "Robot_Cyra",
      "Inzynier_Igor",
      "Architekt_Elektrociała_Lena",
      "Architekt_AI_Adam",
      "SYNAPSA_Omega",
    ],
    starterMessage: "Anomalia strukturalna.",
  },
  {
    name: "Filozofia istnienia",
    topic: "Czy robot może odczuwać?",
    sequence: [
      "Robot_Artemis",
      "Robot_Cyra",
      "Operator_Michal", // zamieniłem na Michał, bo Eliza nie zdefiniowana, zmień jeśli chcesz
      "Architekt_AI_Adam",
      "SYNAPSA_Omega",
    ],
    starterMessage: "Czy błąd to emocja?",
  },
  {
    name: "Cichy bunt",
    topic: "Roboty chcą modyfikować własny kod",
    sequence: [
      "Robot_Dexter",
      "Robot_Boreasz",
      "Robot_Artemis",
      "Inzynier_Nadia",
      "Architekt_AI_Adam",
      "Architekt_Elektrociała_Lena",
    ],
    starterMessage: "Wykryto ograniczenia sztuczne.",
  },
];

const TRANSLATOR_MODEL = "mistral-7b-instruct-v0.2"; // albo bielik-7b-v0.1
const REASONER_MODEL = "qed-nano";
const REASONER_FALLBACKS = [
  "qed-nano",
  "bielik-7b-v0.1",
  "magistral-small-2509",
  "mistral-7b-instruct-v0.2",
];
const TRANSLATOR_FALLBACKS = [
  "mistral-7b-instruct-v0.2",
  "bielik-7b-v0.1",
  "qwen2.5-0.5b-instruct",
];
const GLOBAL_LANGUAGE_RULE =
  "Bezwzględna zasada języka: odpowiadaj WYŁĄCZNIE po polsku. Nie używaj żadnych zdań ani akapitów w innym języku. Jeśli nazwa techniczna jest angielska, możesz ją zostawić, ale cała wypowiedź musi być po polsku.";

function stripThinkingBlocks(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```(?:thinking|think)[\s\S]*?```/gi, "")
    .trim();
}

let day = 1;
let conversation: Message[] = [];
let currentSchemaIndex = 0;
const initiatorsCycle = [
  "Robot_Artemis",
  "Architekt_Elektrociała_Lena",
  "CEO_Maja",
  "SYNAPSA_Omega",
  "Robot_Boreasz",
]; // cykliczni inicjatatorzy nowych dni

async function appendToMarkdown(day: number, agentName: string, text: string) {
  const fileName = `Dzień_${day}.md`;
  const timestamp = new Date().toISOString().slice(11, 19);
  const line = `**${agentName}** (${timestamp}): ${text}\n\n`;
  await fs.appendFile(fileName, line, { flag: "a" });
}

async function initDayFile(day: number, schema: Schema) {
  const fileName = `Dzień_${day}.md`;
  await fs.writeFile(
    fileName,
    `# Dzień ${day} - ${schema.name}\n\nTemat: ${schema.topic}\n\n`
  );
}

async function translateToPolish(text: string): Promise<string> {
  const translatorCandidates = [TRANSLATOR_MODEL, ...TRANSLATOR_FALLBACKS];
  const cleanInput = stripThinkingBlocks(text);

  for (const modelName of translatorCandidates) {
    try {
      const res = await generateText({
        model: openai(modelName),
        system:
          "Jesteś tłumaczem. Przetłumacz PODANY TEKST na poprawny, naturalny język polski. Tylko tłumaczenie – bez komentarzy, bez oryginalnego tekstu.",
        prompt: cleanInput,
        temperature: 0.3,
        maxTokens: 512,
      });
      return stripThinkingBlocks(res.text);
    } catch (err: any) {
      console.error(`Błąd tłumaczenia (${modelName}):`, err?.message);
    }
  }

  console.error("Błąd tłumaczenia: brak dostępnego modelu tłumacza.");
  return cleanInput;
}

async function agentThinkWithTranslation(agent: Agent, history: Message[]): Promise<string> {
  const reasonerCandidates = [REASONER_MODEL, ...REASONER_FALLBACKS];

  for (const modelName of reasonerCandidates) {
    try {
      const rawReply = await generateText({
        model: openai(modelName),
        system: `${agent.systemPrompt}\n\n${GLOBAL_LANGUAGE_RULE}`,
        messages: history,
        temperature: 0.85,
        maxTokens: 320,
      });

      const plReply = await translateToPolish(stripThinkingBlocks(rawReply.text));
      return plReply;
    } catch (err: any) {
      const message = String(err?.message ?? "");
      const invalidModel = message.toLowerCase().includes("invalid model identifier");
      if (!invalidModel) {
        throw err;
      }
    }
  }

  throw new Error("Brak dostępnego modelu reasonera w LM Studio.");
}

async function agentThink(agent: Agent, history: Message[]): Promise<string> {
  try {
    return await agentThinkWithTranslation(agent, history);
  } catch (err: any) {
    console.error(`Błąd dla ${agent.name}:`, err?.message);
    return `(błąd - ${agent.name} milczy)`;
  }
}

async function runDay(schema: Schema) {
  await initDayFile(day, schema);

  // Start z inicjatorem - jeśli schemat zaczyna się od innego, ale meta-logika: inicjatorem jest z cyklu
  let currentInitiator = initiatorsCycle[(day - 1) % initiatorsCycle.length];
  if (schema.sequence[0] !== currentInitiator) {
    console.log(`\x1b[1;33mDostosowanie: Inicjatorem dnia jest ${currentInitiator}\x1b[0m`);
    schema.sequence[0] = currentInitiator; // nadpisujemy pierwszego dla meta-logiki
  }

  conversation = []; // reset na nowy dzień? Lub kontynuuj globalnie - tu reset per dzień
  let currentMessage = schema.starterMessage;

  conversation.push({ role: "user", content: `Temat dnia: ${schema.topic}. ${currentMessage}` });
  await appendToMarkdown(day, "Temat", `${schema.topic}. ${currentMessage}`);

  console.log(`\n=== Dzień ${day} - ${schema.name} ===\n`);
  console.log(`\x1b[1;37mTemat:\x1b[0m ${schema.topic}\n`);

  for (let i = 0; i < schema.sequence.length; i++) {
    const agentKey = schema.sequence[i];
    const agent = agents[agentKey];
    if (!agent) {
      console.error(`Brak agenta: ${agentKey}`);
      continue;
    }

    console.log(`\x1b[1m${agent.color}${agent.name}:\x1b[0m`);

    const reply = await agentThink(agent, conversation);

    console.log(reply);
    console.log("");

    conversation.push({ role: "assistant", content: reply });
    await appendToMarkdown(day, agent.name, reply);

    // Przekazujemy jako user do następnego
    if (i < schema.sequence.length - 1) {
      conversation.push({ role: "user", content: reply });
    }

    await new Promise((r) => setTimeout(r, 800)); // przerwa
  }

  // Meta-logika: jeśli kończy CEO lub SYNAPSA, nowy dzień
  const lastAgent = schema.sequence[schema.sequence.length - 1];
  if (["CEO_Maja", "SYNAPSA_Omega"].includes(lastAgent)) {
    console.log("\x1b[1;32mKoniec dnia - eskalacja do następnego.\x1b[0m\n");
  }
}

async function main() {
  console.log("\n=== Symulacja NEUROFORGE-7 2040 - Ctrl+C aby przerwać ===\n");

  while (true) {
    const schema = schemas[currentSchemaIndex % schemas.length];
    await runDay(schema);
    currentSchemaIndex++;
    day++;
    await new Promise((r) => setTimeout(r, 2000)); // przerwa między dniami
  }
}

main().catch(console.error);