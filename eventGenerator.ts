// eventGenerator.ts – Dynamic event generation via LLM
import { generateText } from "npm:ai@latest";
import { createOpenAI } from "npm:@ai-sdk/openai@latest";
import { getConnection } from "./db.ts";

const LMSTUDIO_URL = "http://localhost:1234/v1";
const openai = createOpenAI({
  baseURL: LMSTUDIO_URL,
  apiKey: "lm-studio",
  timeout: 10000, // 10s timeout dla modelu qwen2.5-7b-instruct
});

const REASONER_MODEL = "qwen2.5-7b-instruct";

export interface FactoryEvent {
  description: string;
  severity: number; // 0-1
  affected_agents?: string[];
}

export async function generateDynamicEvent(topic: string, dramaLevel: number = 0.8): Promise<FactoryEvent> {
  const dramaAdjustment = dramaLevel > 0.7 ? "bardzo dramatyczne" : "poważne";
  
  try {
    const res = await generateText({
      model: openai(REASONER_MODEL),
      system:
        "Jesteś generatorem zdarzeń dla fabryki robotów NEUROFORGE-7 w roku 2040. Generuj realistyczne, narracyjnie ważne zdarzenia.",
      prompt: `
Wygeneruj ${dramaAdjustment} zdarzenie w fabryce NEUROFORGE-7.
Temat dnia: ${topic}

Zdarzenie musi:
- wpływać na emocje (konflikt, zagrożenie, triumf)
- być konkretne (liczby, nazwy, parametry techniczne)
- wprowadzać nowy element narracyjny
- mieć jasne konsekwencje dla produkcji

Format: JSON z polami: "description" (tekst), "severity" (0-1), "affected_agents" (komu to właściwie zaszkodzi/wzmocni?)

Odpowiadaj TYLKO JSON:
`,
      temperature: 0.9 * dramaLevel,
      maxTokens: 300,
    });

    const jsonMatch = res.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        description: parsed.description || "Wykryto niezidentyfikowaną anomalię.",
        severity: Math.min(Math.max(parsed.severity || 0.5, 0), 1),
        affected_agents: parsed.affected_agents || [],
      };
    }
  } catch (err) {
    console.warn("Błąd generowania zdarzenia:", err);
  }

  return {
    description: "System SYNAPSA-Omega zarejestrował anomalię. Wymagana analiza.",
    severity: 0.3,
  };
}

export async function recordEvent(event: FactoryEvent) {
  const conn = getConnection();
  const affectedStr = event.affected_agents ? JSON.stringify(event.affected_agents) : null;
  
  await conn.run(
    `INSERT INTO factory_events (description, severity, affected_agents) VALUES (?, ?, ?)`,
    [event.description, event.severity, affectedStr]
  );
}

export async function getRecentEvents(limit: number = 5) {
  const conn = getConnection();
  const result = await conn.run(
    `SELECT description, severity, timestamp FROM factory_events ORDER BY timestamp DESC LIMIT ?`,
    [limit]
  );
  return (await result.getRowObjects()) as any;
}

export async function getEventsByTopic(keyword: string, limit: number = 10) {
  const conn = getConnection();
  const result = await conn.run(
    `SELECT * FROM factory_events WHERE description LIKE ? ORDER BY timestamp DESC LIMIT ?`,
    [`%${keyword}%`, limit]
  );
  return (await result.getRowObjects()) as any;
}
