#!/usr/bin/env node
// scripts/resetMessages.ts
// Narzędzie do zresetowania tabeli conversation_messages (usuwa wszystkie wiadomości i resetuje AUTO_INCREMENT)

import { initializeDatabase, getConnection } from "../db.js";

async function main() {
  try {
    await initializeDatabase();
    const conn = await getConnection();
    try {
      const countRows: any = await conn.query('SELECT COUNT(*) as cnt FROM conversation_messages');
      const existing = (countRows && countRows[0] && (countRows[0].cnt ?? countRows[0]["COUNT(*)"])) || 0;
      console.log(`Znaleziono ${existing} wiadomości w tabeli conversation_messages.`);

      // Usuń wszystkie wiadomości
      await conn.query('DELETE FROM conversation_messages');

      // Zresetuj AUTO_INCREMENT (MariaDB/MySQL)
      try {
        await conn.query('ALTER TABLE conversation_messages AUTO_INCREMENT = 1');
      } catch (err) {
        // Nie krytyczne; nie wszystkie silniki zgadzają się na to w każdej konfiguracji
        console.warn('Nie udało się zresetować AUTO_INCREMENT:', err.message || err);
      }

      console.log('Tabela conversation_messages została wyczyszczona.');
    } finally {
      try { await conn.release(); } catch (e) { /* ignore */ }
    }
  } catch (err) {
    console.error('Błąd podczas resetu wiadomości:', err);
    process.exit(1);
  }
}

main();
