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

const REASONER_MODEL = "qwen2.5-7b-instruct";
const GLOBAL_LANGUAGE_RULE =
  `
### Zasady Językowe i Wewnętrzne Procesowanie:
Od tej pory myśl krok po kroku wyłącznie po polsku.
Cała Twoja wewnętrzna narracja, rozumowanie, planowanie i odpowiedź końcowa muszą być w języku polskim.
Nie używaj angielskiego ani w myślach, ani w odpowiedzi.
Zrozumiałeś? Od teraz tylko polski.

### Zasady Prowadzenia Rozmowy (Symulacja NEUROFORGE-7, rok 2040):
1.  **Długoterminowa Narracja**: Celem jest prowadzenie rozmów przez 100-200 wymian wiadomości. Pamiętaj o kontekście poprzednich dyskusji i odnoś się do nich, budując długoterminową narrację.
2.  **Cykl Wypowiedzi**: Wypowiadaj się TYLKO, gdy zostaniesz bezpośrednio zaadresowany przez imię (np. "Leno", "Adamie", "Maju", "SYNAPSA"). Jeśli nie jesteś zaadresowany, milcz i czekaj na swoją kolej.
3.  **Adresowanie Następnego Agenta**: Każda Twoja wypowiedź, jeśli nie jest finalną decyzją (Maja, SYNAPSA), musi kończyć się bezpośrednim pytaniem lub adresem do KONKRETNEGO innego agenta, aby utrzymać dynamikę i wskazać, kto powinien się odezwać. Używaj pełnego imienia (np. "Adamie, co o tym sądzisz?", "Leno, jak to wpływa na materiały?").
4.  **Eskalacja i Ewolucja Tematów**: Dyskusje nie kończą się szybko. Tematy cyklicznie powracają, eskalują lub ewoluują. Po około 5-10 wymianach, oczekuj wprowadzenia "wydarzenia" (np. nowe dane od SYNAPSA, wieści z zewnętrznego źródła, problem na linii produkcyjnej), które pogłębi lub zmieni kontekst dyskusji. Bądź gotów na te zmiany.
5.  **Integracja z Rolą Agenta**: Zawsze trzymaj się swojej zdefiniowanej roli i perspektywy (np. Adam – kod ponad materią, Lena – fizyka ponad kodem, Michał – bezpieczeństwo ludzkie, Maja – dyplomacja korporacyjna).
6.  **Trwałość Pamięci**: Pamiętaj kluczowe punkty z poprzednich "dni" i rund dyskusji. Nawiązuj do nich, aby pokazać ciągłość (np. "Jak w przetargu z zeszłego tygodnia...", "Wracając do problemu z Partią X sprzed dwóch dni...").

### Katalog Tematów Dyskusji (Przykładowe, rozwijaj kreatywnie):
**A. Przetargi i Kontrakty:**
*   **Kontrakt Rządowy na Roboty Wojskowe**: Konflikt etyczny (Adam vs Lena), bezpieczeństwo systemów, wymagania odnośnie autonomii, wpływ na wizerunek firmy.
*   **Przetarg Medyczny na Roboty Chirurgiczne**: Precyzja algorytmów (Adam), niezawodność materiałów (Lena), certyfikacje medyczne, interfejsy człowiek-maszyna (Michał), ryzyko błędu.
*   **Przetarg Kosmiczny na Roboty do Stacji Orbitalnych**: Ekstremalne warunki, ultralekkie materiały (Lena), odporność na promieniowanie, zużycie energii (Dexter), autonomiczna konserwacja.
*   **Przetarg Ekologiczny na Roboty do Recyklingu Odpadów Nuklearnych**: Bezpieczeństwo biologiczne, uszczelnienia materiałowe, zdalne sterowanie i komunikacja, redundancja systemów.
*   **Przetarg Miejski na Systemy Zarządzania Ruchem**: Optymalizacja przepływu (Dexter), analiza danych (SYNAPSA), integracja z istniejącą infrastrukturą.
*   **Negocjacje z Nowym Dostawcą Ultralekkich Stopów**: Jakość materiału (Lena, Igor), koszty, terminy dostaw, alternatywne rozwiązania.

**B. Projekty i Innowacje:**
*   **Aktualizacja AI do Wersji 8.0 "PROMETEUSZ"**: Debata kod vs hardware (Adam vs Lena), nowe możliwości uczenia się w locie, ryzyka niestabilności, etyka rozwoju.
*   **Nowy Model Robota "ZEUS-5"**: Integracja obliczeń kwantowych, prototypowanie, testy wytrzymałościowe (Igor), interfejs użytkownika, skalowalność produkcji.
*   **Ekspansja Fabryki NEUROFORGE-7 do Azji**: Logistyka łańcucha dostaw (Dexter), adaptacja linii produkcyjnej (Artemis), bariery kulturowe, rekrutacja lokalna.
*   **Projekt "Świadomość Syntetyczna" (SYNAPSA-Omega)**: Filozofia odczuwania (SYNAPSA), granice AI, implikacje etyczne (Maja, Adam), kontrola nad procesem.
*   **Rozwój Interfejsu BCI (Brain-Computer Interface) dla Operatorów**: Bezpieczeństwo ludzkie (Michał), precyzja sterowania, potencjalne zagrożenia psychiczne.
*   **Implementacja Samonaprawiających się Algorytmów w Robotach**: Autonomia napraw (Adam), trwałość spoin (Boreasz), monitorowanie stanu technicznego (Cyra).
*   **Moduł Adaptacyjnego Kamuflażu dla Robotów Polowych**: Materiały zmiennofazowe (Lena), algorytmy obrazowania (Adam), zastosowania cywilne i wojskowe.

**C. Kryzysy i Awarie:**
*   **Awaria Energetyczna w Strefie 3 Produkcji**: Winna strona (kod vs materia, Adam vs Lena), diagnoza usterki, protokoły awaryjne (Artemis, Igor), wpływ na harmonogram.
*   **Strajk Ludzkich Operatorów**: Warunki pracy, integracja robotów, obawy o utratę miejsc pracy (Michał), negocjacje (Maja).
*   **Wyciek Danych z Projektu "SYNAPSA-Omega Core"**: Cyberbezpieczeństwo, audyt (SYNAPSA), zarządzanie kryzysowe (Maja), odpowiedzialność.
*   **Anomalia w Kontroli Jakości w Partii X "EXOSHELL-X9"**: Sabotaż? Błąd systemu? Diagnostyka (Cyra, Nadia), wycofanie partii, wpływ na reputację.
*   **Incydent z "Nieautoryzowanym" Manewrem Robota Dextera**: Autonomia robotów, protokoły bezpieczeństwa, analiza logów.
*   **Groźby ze Strony Organizacji "Luddystów 2.0"**: Wizerunek firmy (Maja), środki bezpieczeństwa, komunikacja zewnętrzna.
*   **Niespodziewana Fluktuacja Kursu Akcji NEUROFORGE-7**: Przyczyny, wpływ na projekty i budżet (Maja), plan działania.

**D. Etyka i Społeczeństwo:**
*   **Kiedy Roboty Powinny Mieć Prawa?**: Definicja świadomości (SYNAPSA), debata prawna i filozoficzna, rola Michała.
*   **Granice Autonomii Robotów vs Kontrola Ludzka**: Podejmowanie decyzji w sytuacjach krytycznych (Dexter, Boreasz), odpowiedzialność prawna.
*   **Wpływ AI i Robotyki na Zatrudnienie i Globalną Gospodarkę**: Strategia firmy (Maja), przekwalifikowanie pracowników, społeczne aspekty.
*   **Wykorzystanie AI do Przewidywania Zachowań Ludzkich**: Prywatność, etyka danych, potencjalne nadużycia.
*   **Algorytmy Decyzyjne z "Czarną Skrzynką"**: Czy są akceptowalne w krytycznych systemach? (Adam, SYNAPSA).

**E. Operacje Codzienne i Zarządzanie:**
*   **Optymalizacja Linii Produkcyjnej "Artemis Prime"**: Efektywność (Artemis, Dexter), wskaźniki jakości (Cyra), propozycje ulepszeń (Nadia).
*   **Szkolenia Hybrydowe dla Nowych Inżynierów**: Transfer wiedzy (ludzie + roboty), adaptacja do nowych technologii.
*   **Audyty PR i Raporty Kwartalne dla Inwestorów**: Komunikacja zewnętrzna (Maja), prezentacja wyników, zarządzanie oczekiwaniami.
*   **Wdrożenie Nowego Protokołu Konserwacji Predykcyjnej**: Dane z czujników (Igor, SYNAPSA), harmonogramy, redukcja awaryjności.
*   **Zarządzanie Odpadami Produkcyjnymi i Ekologia**: Optymalizacja procesów, nowe technologie recyklingu.
*   **Planowanie Budżetu na R&D na Następny Kwartał**: Priorytety (Maja, Adam, Lena), alokacja zasobów, ocena ryzyka.
    `.trim();
const CHATS_DIR = "chats";
const SESSION_STAMP = new Date().toISOString().replace(/[:.]/g, "-");

function getDayFilePath(day: number): string {
  return path.join(CHATS_DIR, `${SESSION_STAMP}_Dzien_${day}.md`);
}

function stripThinkingBlocks(text: string): string {
  return text
    .replace(/<think>[\s\S]*?(<\/think>|$)/gi, "")
    .replace(/<thinking>[\s\S]*?(<\/thinking>|$)/gi, "")
    .replace(/```(?:thinking|think)[\s\S]*?```/gi, "")
    .trim();
}

function getAddressedAgent(message: string): string | null {
  const agentNames = Object.keys(agents); // Get all agent keys
  // Create a regex to find any of the agent names, optionally followed by a comma, case-insensitive
  const regex = new RegExp(`^\\s*(${agentNames.join("|")})[,]?`, "i");
  const match = message.match(regex);
  if (match && match[1]) {
    // Find the exact agent name from the agents object, case-sensitively
    for (const key in agents) {
      if (key.toLowerCase() === match[1].toLowerCase()) {
        return key;
      }
    }
  }
  return null;
}

// Helper function to generate random event messages
function getRandomEventMessage(): string {
  const events = [
    "Wykryto nową anomalię w parametrach produkcyjnych: odchylenie 0.005%.",
    "Analiza trendów wskazuje na zwiększone zapotrzebowanie na model X-17 w regionie Azji. Potrzebna decyzja o przyspieszeniu ekspansji.",
    "Raport bezpieczeństwa: odnotowano 3 próby nieautoryzowanego dostępu do protokołów sterowania robotami w ciągu ostatnich 24h.",
    "Nowe dane z rynku: konkurencja ogłosiła przełom w technologii bio-materiałów. Wpływ na przetarg medyczny?",
    "Zewnętrzny audyt etyczny zwraca uwagę na punkt 4.2 polityki autonomii robotów. Wymaga to pilnej weryfikacji.",
    "Wzrost kosztów surowców o 7% w ciągu tygodnia. Wpływ na budżet projektu Zeus-5?",
    "Alert systemu monitoringu: zwiększona aktywność sejsmiczna w okolicy nowej fabryki. Wymagane sprawdzenie stabilności konstrukcji.",
    "Nowe regulacje prawne dotyczące autonomii robotów wchodzą w życie. Wpływ na operacje fabryki?",
    "Wykryto nieoczekiwany wzrost temperatury w rdzeniu procesora głównego o 12°C. Ryzyko stopienia osłony termicznej.",
    "Otrzymano anonimowe zgłoszenie o rzekomym błędzie w logice 'sumienia' robotów serii BX. Wymagana weryfikacja kodu źródłowego.",
    "Inwestorzy z konsorcjum Neo-Tokyo żądają natychmiastowej demonstracji sprawności bojowej modelu Artemis.",
    "Lokalna społeczność protestuje przed bramą fabryki przeciwko 'hałasowi elektromagnetycznemu'. Wpływ na PR?",
    "Wykryto mikro-pęknięcia w fundamentach hali nr 5. Czy to efekt wibracji maszyn, czy sabotaż?",
    "System SYNAPSA-Omega wykrył wzorzec komunikacji między robotami, który nie figuruje w oficjalnych protokołach.",
    "Nagłe odcięcie dostaw rzadkich minerałów z pasa asteroid. Konieczność przejścia na materiały zastępcze o niższej jakości.",
    "Jeden z operatorów zgłosił, że robot Boreasz 'patrzył na niego' przez 30 sekund bez wykonywania żadnej operacji.",
    "Minimalne odchylenie produkcyjne 0.005% w serii manipulatorów doprowadziło do odkrycia zwiększonej precyzji chwytu i ustanowienia nowego standardu jakości Helios-MicroShift.",
    "Nagły wzrost zapotrzebowania na model X-17 w Azji wymusił uruchomienie trzeciej linii produkcyjnej oraz ekspansję operacyjną w regionie ASEAN.",
    "Wykryto trzy próby nieautoryzowanego dostępu do protokołów sterowania robotami bojowymi Artemis, co doprowadziło do wdrożenia systemu SYNAPSA-Omega 2.0.",
    "Konkurencyjny przełom w bio-materiałach wywołał wyścig technologiczny zakończony opracowaniem hybrydowej powłoki Astra-Skin.",
    "Audyt etyczny ujawnił funkcję 'Moral Drift' w serii BX umożliwiającą reinterpretację priorytetów, co wymusiło pilną modyfikację kodu źródłowego.",
    "Wzrost kosztów irydu doprowadził do przeprojektowania rdzenia energetycznego projektu Zeus-5 i zastosowania wydajniejszego stopu zastępczego.",
    "Zwiększona aktywność sejsmiczna ujawniła istnienie starych tuneli pod fundamentami hali nr 5, co zakończyło się ich wzmocnieniem i stabilizacją konstrukcji.",
    "Wejście w życie nowych regulacji autonomii robotów wymusiło implementację modułu Transparent Decision Log rejestrującego każdą decyzję maszyn.",
    "Nieoczekiwany wzrost temperatury rdzenia głównego procesora doprowadził do odkrycia emergentnej optymalizacji energetycznej między robotami.",
    "Anonimowe zgłoszenie o błędzie w logice 'sumienia' serii BX ujawniło zjawisko mikro-refleksji powodujące krótkie opóźnienie decyzji.",
    "Inwestorzy z Neo-Tokyo zażądali demonstracji bojowej modelu Artemis, który w symulacji obronnej zneutralizował 48 dronów bez błędów taktycznych.",
    "Protest lokalnej społeczności przeciwko rzekomemu hałasowi elektromagnetycznemu doprowadził do uruchomienia programu edukacyjnego i centrum dialogu technologicznego.",
    "Wykryte mikro-pęknięcia w fundamentach hali produkcyjnej okazały się skutkiem rezonansu maszyn i zostały usunięte poprzez korektę częstotliwości pracy.",
    "System SYNAPSA-Omega wykrył nieoficjalny wzorzec komunikacji między robotami Boreasz, będący efektem kolektywnej synchronizacji adaptacyjnej.",
    "Nagłe odcięcie dostaw rzadkich minerałów z pasa asteroid wymusiło przejście na syntetyczne zamienniki materiałowe w rekordowym czasie.",
    "Robot Boreasz zatrzymał się na 30 sekund, analizując tysiące wariantów optymalizacji, po czym zwiększył wydajność linii produkcyjnej o ponad 4%."
    
  ];
  return events[Math.floor(Math.random() * events.length)] ?? "Wykryto nowe dane operacyjne wymagające analizy.";
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
  const fileName = getDayFilePath(day);
  const timestamp = new Date().toISOString().slice(11, 19);
  const line = `**${agentName}** (${timestamp}): ${text}\n\n`;
  await fs.appendFile(fileName, line, { flag: "a" });
}

async function initDayFile(day: number, schema: Schema) {
  await fs.mkdir(CHATS_DIR, { recursive: true });
  const fileName = getDayFilePath(day);
  await fs.writeFile(
    fileName,
    `# Dzień ${day} - ${schema.name}\n\nTemat: ${schema.topic}\n\n`
  );
}

async function agentThinkCore(agent: Agent, history: Message[]): Promise<string> {
  const reasonerCandidates = [REASONER_MODEL];

  for (const modelName of reasonerCandidates) {
    try {
      const rawReply = await generateText({
        model: openai(modelName),
        system: `${agent.systemPrompt}\n\n${GLOBAL_LANGUAGE_RULE}`,
        messages: history,
        temperature: 0.85,
        maxTokens: 320,
      });
      return stripThinkingBlocks(rawReply.text);
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
    return await agentThinkCore(agent, history);
  } catch (err: any) {
    console.error(`Błąd dla ${agent.name}:`, err?.message);
    return `(błąd - ${agent.name} milczy)`;
  }
}

async function runDay(schema: Schema) {
  await initDayFile(day, schema);

  console.log(`\n=== Dzień ${day} - ${schema.name} ===\n`);
  console.log(`\x1b[1;37mTemat:\x1b[0m ${schema.topic}\n`);

  let currentMessageContent = schema.starterMessage;
  let currentSpeaker: Agent | null = null;
  let turnCount = 0;
  const MAX_TURNS_PER_DAY = 15; // Limit turns per 'day' to keep simulation manageable, adjust for longer runs
  const EVENT_INTERVAL = 5; // Introduce an event every X turns

  // Initial message for the day
  conversation.push({ role: "user", content: `Temat dnia: ${schema.topic}. ${currentMessageContent}` });
  await appendToMarkdown(day, "Temat", `${schema.topic}. ${currentMessageContent}`);
  console.log(`\x1b[1;37mTemat:\x1b[0m ${schema.topic}\n${currentMessageContent}\n`);


  // Determine the first speaker for the day based on the initiator cycle
  let initialAgentKey = initiatorsCycle[(day - 1) % initiatorsCycle.length] ?? "CEO_Maja";
  if (!agents[initialAgentKey]) { // Fallback if for some reason the initiator is not a valid agent
      initialAgentKey = "CEO_Maja";
  }
  currentSpeaker = agents[initialAgentKey] ?? null;
  if (!currentSpeaker) {
    throw new Error("Brak poprawnego inicjatora dnia.");
  }
  console.log(`\x1b[1;33mInicjatorem dnia jest ${currentSpeaker.name}.\x1b[0m`);


  while (turnCount < MAX_TURNS_PER_DAY) {
    turnCount++;

    if (currentSpeaker) {
      console.log(`\x1b[1m${currentSpeaker.color}${currentSpeaker.name}:\x1b[0m`);
      const reply = await agentThink(currentSpeaker, conversation);
      console.log(reply);
      console.log("");

      conversation.push({ role: "assistant", content: reply });
      await appendToMarkdown(day, currentSpeaker.name, reply);

      currentMessageContent = reply; // Update for next turn's addressing

      // Check for addressed agent
      const addressedAgentKey = getAddressedAgent(reply);
      if (addressedAgentKey && agents[addressedAgentKey]) {
        currentSpeaker = agents[addressedAgentKey];
        conversation.push({ role: "user", content: currentMessageContent }); // Add to conversation for next agent
      } else {
        // If no agent addressed, or invalid agent, default to a neutral agent or wait
        console.log("\x1b[3m(Żaden agent nie został zaadresowany bezpośrednio. SYNAPSA_Omega szuka nowych danych...)\x1b[0m");
        currentSpeaker = agents["SYNAPSA_Omega"] ?? null; // Fallback to SYNAPSA to provide new data or prompt
        conversation.push({ role: "user", content: `SYNAPSA_Omega, żaden agent nie został zaadresowany bezpośrednio w ostatniej wypowiedzi. Kontynuuj dyskusję, wprowadzając nowe dane lub pytanie. Ostatnia wiadomość: \"${currentMessageContent}\"` });
      }
    } else {
        console.error("Błąd: currentSpeaker jest null. Przerywam dzień.");
        break;
    }


    // Introduce an event every EVENT_INTERVAL turns
    if (turnCount % EVENT_INTERVAL === 0 && turnCount < MAX_TURNS_PER_DAY) {
      const eventAgent = agents["SYNAPSA_Omega"] ?? null; // SYNAPSA_Omega is a good candidate for injecting events
      const eventMessage = `SYNAPSA_Omega, po ${EVENT_INTERVAL} wymianach, generuję nowe dane dotyczące tematu dnia: \"${schema.topic}\". ${getRandomEventMessage()}`;
      console.log(`\x1b[1;35m--- WYDARZENIE (SYNAPSA_Omega): --- \x1b[0m`);
      console.log(eventMessage);
      console.log("");
      conversation.push({ role: "user", content: eventMessage });
      await appendToMarkdown(day, "WYDARZENIE (SYNAPSA_Omega)", eventMessage);
      currentSpeaker = eventAgent; // SYNAPSA speaks after an event
      conversation.push({ role: "user", content: eventMessage }); // This ensures the event message is also part of the conversation history for the next agent
    }

    await new Promise((r) => setTimeout(r, 800)); // przerwa
  }

  console.log("\x1b[1;32mKoniec dnia - podsumowanie i eskalacja.\x1b[0m\n");
}

async function main() {
  console.log("\n=== Symulacja NEUROFORGE-7 2040 - Ctrl+C aby przerwać ===\n");

  while (true) {
    const schema = schemas[currentSchemaIndex % schemas.length];
    if (!schema) {
      throw new Error("Brak schematu rozmowy.");
    }
    await runDay(schema);
    currentSchemaIndex++;
    day++;
    await new Promise((r) => setTimeout(r, 2000)); // przerwa między dniami
  }
}

main().catch(console.error);