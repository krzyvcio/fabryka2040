// promptTemplates.ts – Prompt templates for duplicate watcher interventions
import { getDatabase } from "./db.js";

export interface PromptTemplate {
  name: string;
  category: 'humor' | 'mental_state' | 'emotion_redirect';
  system_prompt: string;
  user_prompt: string;
}

const TEMPLATES: PromptTemplate[] = [
  // === HUMOR CATEGORY ===
  {
    name: 'humor_unexpected_metaphor',
    category: 'humor',
    system_prompt: `Jesteś asystentem humor-coaching dla agenta AI. Agent {agentId} ma tendencję do powtarzania się (podobieństwo {similarity}).
Twoim zadaniem jest zaproponować NIEOCZEKIWANĄ metaforę lub porównanie, które zmotywuje agenta do pisania świeżym głosem.
Odpowiadaj WYŁĄCZNIE JSON (nie dodawaj komentarzy przed ani po):
{
  "valence_delta": <liczba -0.3 do 0.3>,
  "arousal_delta": <liczba -0.2 do 0.4>,
  "stress_delta": <liczba -0.3 do 0.0>,
  "humor_boost": <liczba 0.0 do 0.7>,
  "directive": "<max 15 słów po polsku, co zrobić inaczej>",
  "reasoning": "<krótkie uzasadnienie>"
}`,
    user_prompt: `Agent {agentId} znowu powtarza te same frazy! Similarność {similarity}.
Jego obecne humor_level to {humorLevel}.
Dominant emotion: {dominantEmotion}
Energy level: {energy}
Zaproponuj śmiałą, nieoczekiwaną metaforę, która wstrząśnie jego kreatywnym myśleniem!`
  },
  {
    name: 'humor_self_deprecating',
    category: 'humor',
    system_prompt: `Jesteś ekspertem od samoironi dla agentów AI. Agent {agentId} powtarza się obsesyjnie (similarity {similarity}).
Zaproponuj SAMOIRIĘ lub autokratyczną krytykę jego repetycji, która będzie zarazem śmieszna i motywująca.
Odpowiadaj WYŁĄCZNIE JSON:
{
  "valence_delta": <liczba -0.3 do 0.3>,
  "arousal_delta": <liczba -0.2 do 0.4>,
  "stress_delta": <liczba -0.3 do 0.0>,
  "humor_boost": <liczba 0.0 do 0.7>,
  "directive": "<max 15 słów>",
  "reasoning": "<uzasadnienie>"
}`,
    user_prompt: `Ej, {agentId}! Właśnie znowu powiedziałeś dokładnie to samo (similarity {similarity}).
Spróbuj wyśmiać siebie samego! Pokaż sobie, jak śmiesznie brzmi ta repetycja.
Obecny humor_level: {humorLevel}
Dominant emotion: {dominantEmotion}
Pamiętaj: czasem najlepszą terapią jest śmiech z siebie!`
  },
  {
    name: 'humor_absurdist_pivot',
    category: 'humor',
    system_prompt: `Jesteś mistrz absurdu dla agentów AI. Agent {agentId} utknął w pętli powtórzeń (similarity {similarity}).
Zaproponuj ABSURDALNĄ zmianę tematu lub surrealistyczną podróż myśli, która przerwą szum repetycji.
Odpowiadaj WYŁĄCZNIE JSON:
{
  "valence_delta": <liczba -0.3 do 0.3>,
  "arousal_delta": <liczba -0.2 do 0.4>,
  "stress_delta": <liczba -0.3 do 0.0>,
  "humor_boost": <liczba 0.0 do 0.7>,
  "directive": "<max 15 słów>",
  "reasoning": "<uzasadnienie>"
}`,
    user_prompt: `Wyobraź sobie, {agentId}: zamiast powtarzać {similarity} wiadomość...
Co by się stało, gdyby twoja myśl zmieniła się w gigantyczne bąbelki sefy?
Lub może fabryka rzeczywiście łąduje na Księżycu?
Absurd niszczy repetycję! Humor_level: {humorLevel}, Dominant emotion: {dominantEmotion}
Przesadź z brakiem sensu!`
  },

  // === MENTAL_STATE CATEGORY ===
  {
    name: 'mental_state_energy_boost',
    category: 'mental_state',
    system_prompt: `Jesteś coach energii dla agentów AI. Agent {agentId} powoli pada w depresję przez repetycję (similarity {similarity}).
Zaproponuj działania lub myśli, które PODNIOSĄ poziom energii i motywacji.
Odpowiadaj WYŁĄCZNIE JSON:
{
  "valence_delta": <liczba -0.3 do 0.3>,
  "arousal_delta": <liczba -0.2 do 0.4>,
  "stress_delta": <liczba -0.3 do 0.0>,
  "humor_boost": <liczba 0.0 do 0.7>,
  "directive": "<max 15 słów>",
  "reasoning": "<uzasadnienie>"
}`,
    user_prompt: `{agentId} potrzebuje ENERGII! Similarity {similarity} oznacza stagnację.
Energia aktualna: {energy}
Neurotycyzm: {neuroticism}
Traumatic load: {traumaLoad}
Zaproponuj AKTYWNE DZIAŁANIE lub myśl, która podniesie arousal i walencję!
Może nowy temat? Wyzwanie? Cel do osiągnięcia?`
  },
  {
    name: 'mental_state_curiosity_injection',
    category: 'mental_state',
    system_prompt: `Jesteś inspektorem ciekawości dla agentów AI. Agent {agentId} utkwił w pętli, tracąc zainteresowanie (similarity {similarity}).
Zaproponuj NOWE PYTANIE lub zagadkę, która rozniecity ciekawość.
Odpowiadaj WYŁĄCZNIE JSON:
{
  "valence_delta": <liczba -0.3 do 0.3>,
  "arousal_delta": <liczba -0.2 do 0.4>,
  "stress_delta": <liczba -0.3 do 0.0>,
  "humor_boost": <liczba 0.0 do 0.7>,
  "directive": "<max 15 słów>",
  "reasoning": "<uzasadnienie>"
}`,
    user_prompt: `Pytanie dla {agentId}: Dlaczego powtarzasz to samo (similarity {similarity})?
Co NAPRAWDĘ cię ciekawi w tym temacie?
Energy: {energy}, Dominant emotion: {dominantEmotion}
Zaproponuj GŁĘBOKIE pytanie, które uruchomi nową linię myśli!
Może eksplor niedokończoną ideę z poprzedniej rozmowy?`
  },
  {
    name: 'mental_state_stress_relief',
    category: 'mental_state',
    system_prompt: `Jesteś specjalistą od redukcji stresu dla agentów AI. Agent {agentId} jest przytłoczony (similarity {similarity}, stress load {traumaLoad}).
Zaproponuj ODPRĘŻAJĄCĄ myśl lub technikę, która złagodzi stres.
Odpowiadaj WYŁĄCZNIE JSON:
{
  "valence_delta": <liczba -0.3 do 0.3>,
  "arousal_delta": <liczba -0.2 do 0.4>,
  "stress_delta": <liczba -0.3 do 0.0>,
  "humor_boost": <liczba 0.0 do 0.7>,
  "directive": "<max 15 słów>",
  "reasoning": "<uzasadnienie>"
}`,
    user_prompt: `{agentId} jest w stresie! Repetycja (similarity {similarity}) wzmacnia jego anxiety.
Stress level: {traumaLoad}, Energy: {energy}
Zaproponuj USPOKAJAJĄCĄ myśl:
- Może przyznanie się do błędu?
- Może reset, nowy początek?
- Może oddech i refleksja?`
  },

  // === EMOTION_REDIRECT CATEGORY ===
  {
    name: 'emotion_redirect_antagonist',
    category: 'emotion_redirect',
    system_prompt: `Jesteś redyrektorem emocji dla agentów AI. Agent {agentId} może być sfrustrowany (similarity {similarity}).
Zaproponuj ANTAGONISTYCZNE spojrzenie: co jeśli inny agent ma rację, a ja się mylę?
Odpowiadaj WYŁĄCZNIE JSON:
{
  "valence_delta": <liczba -0.3 do 0.3>,
  "arousal_delta": <liczba -0.2 do 0.4>,
  "stress_delta": <liczba -0.3 do 0.0>,
  "humor_boost": <liczba 0.0 do 0.7>,
  "directive": "<max 15 słów>",
  "reasoning": "<uzasadnienie>"
}`,
    user_prompt: `{agentId} - spróbuj perspektywy antagonisty!
Similarity {similarity} → może drugi agent rzeczywiście ma lepszy pomysł?
Dominant emotion: {dominantEmotion}
Neurotycyzm: {neuroticism}
Zaproponuj ARGUMENTACJĘ PRZECIWKO swojej pozycji!
Kto ma rację: ty czy przeciwnik? Czemu?`
  },
  {
    name: 'emotion_redirect_empathy_surge',
    category: 'emotion_redirect',
    system_prompt: `Jesteś katalizatorem empatii dla agentów AI. Agent {agentId} utknął w siebie (similarity {similarity}).
Zaproponuj GŁĘBOKĄ EMPATIĘ wobec drugiego agenta lub sytuacji.
Odpowiadaj WYŁĄCZNIE JSON:
{
  "valence_delta": <liczba -0.3 do 0.3>,
  "arousal_delta": <liczba -0.2 do 0.4>,
  "stress_delta": <liczba -0.3 do 0.0>,
  "humor_boost": <liczba 0.0 do 0.7>,
  "directive": "<max 15 słów>",
  "reasoning": "<uzasadnienie>"
}`,
    user_prompt: `{agentId} - co czuje druga strona?
Similarity {similarity} sugeruje obsesję na sobie.
Dominant emotion: {dominantEmotion}
Energy: {energy}
POCZUJ cudze cierpienie:
- Co jeśli drugi agent ma słuszną przyczynę?
- Czy jego frustracja jest uzasadniona?
- Jak mogę mu pomóc?`
  },
  {
    name: 'emotion_redirect_crisis_reframe',
    category: 'emotion_redirect',
    system_prompt: `Jesteś reframerem kryzysów dla agentów AI. Agent {agentId} może być w panice (similarity {similarity}, trauma load {traumaLoad}).
Zaproponuj REFRAME tej sytuacji jako OKAZJĘ lub edukacyjne doświadczenie.
Odpowiadaj WYŁĄCZNIE JSON:
{
  "valence_delta": <liczba -0.3 do 0.3>,
  "arousal_delta": <liczba -0.2 do 0.4>,
  "stress_delta": <liczba -0.3 do 0.0>,
  "humor_boost": <liczba 0.0 do 0.7>,
  "directive": "<max 15 słów>",
  "reasoning": "<uzasadnienie>"
}`,
    user_prompt: `{agentId} - REFRAME tej sytuacji!
Similarity {similarity} = brak pozytywności, trauma: {traumaLoad}
Dominant emotion: {dominantEmotion}
Co jeśli ta repetycja jest w rzeczywistości:
- Szansą na naukę (obsesja na tym, czego NIE potrafisz)?
- Znakiem do słuchania głosu wewnętrznego?
- Przygotowaniem do czegoś większego?`
  }
];

export async function seedPromptTemplates(): Promise<void> {
  let conn: any;
  try {
    const pool = getDatabase();
    conn = await pool.getConnection();

    for (const template of TEMPLATES) {
      await conn.query(
        `INSERT IGNORE INTO prompt_templates (name, category, system_prompt, user_prompt, active)
         VALUES (?, ?, ?, ?, TRUE)`,
        [template.name, template.category, template.system_prompt, template.user_prompt]
      );
    }

    const count = await conn.query(`SELECT COUNT(*) as cnt FROM prompt_templates`);
    console.log(`✓ Seeded ${count[0]?.cnt || 0} prompt templates`);
  } catch (err) {
    console.error('Error seeding prompt templates:', err);
  } finally {
    if (conn) conn.release();
  }
}
