#!/usr/bin/env node
// check-server.js - Sprawdza status serwera i LM Studio

const SERVER_URL = process.env.SERVER_URL || "http://127.0.0.1:3000";
const LM_STUDIO_URL = process.env.LM_STUDIO_URL || "http://localhost:1234/v1";

async function checkLMStudio() {
  try {
    const res = await fetch(`${LM_STUDIO_URL}/models`, {
      method: "GET",
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };

    const data = await res.json();
    const models = data.data || [];

    if (models.length === 0) return { ok: false, error: "Brak modeli" };

    return {
      ok: true,
      models: models.map(m => m.id),
      defaultModel: models[0]?.id
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function checkServer() {
  try {
    const res = await fetch(`${SERVER_URL}/api/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };

    const data = await res.json();
    return { ok: true, ...data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function checkChatStatus() {
  try {
    const res = await fetch(`${SERVER_URL}/api/chat/status`);
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: true, ...data };
  } catch {
    return { ok: false };
  }
}

async function main() {
  console.log("🔍 Sprawdzanie systemu...\n");

  const [lmResult, serverResult] = await Promise.all([
    checkLMStudio(),
    checkServer()
  ]);

  console.log("📡 LM Studio:");
  if (lmResult.ok) {
    console.log("   ✅ OK - model:", lmResult.defaultModel);
    console.log("   📦 Dostępne:", lmResult.models.join(", "));
  } else {
    console.log("   ❌ Błąd:", lmResult.error);
  }

  console.log("\n🌐 Serwer:");
  if (serverResult.ok) {
    console.log("   ✅ OK - działa");
    console.log("   🕐", serverResult.timestamp);
  } else {
    console.log("   ❌ Błąd:", serverResult.error);
  }

  const chatStatus = await checkChatStatus();
  console.log("\n💬 Chat:");
  if (chatStatus.ok) {
    console.log("   ✅ OK -", chatStatus.count, "wiadomości");
    console.log("   👥 Agenci:", chatStatus.agents.map(a => a.name).join(", "));
  } else {
    console.log("   ⚠️  Chat API niedostępny");
  }

  const allOk = lmResult.ok && serverResult.ok;
  console.log("\n" + "=".repeat(40));
  console.log(allOk ? "✅ SYSTEM GOTOWY" : "⚠️  WYMAGA POPRAWEK");
  console.log("=".repeat(40));

  process.exit(allOk ? 0 : 1);
}

main();
