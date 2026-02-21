#!/usr/bin/env node
import mariadb from 'mariadb';

async function main() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306');
  const user = process.env.DB_USER || 'neuroforge_user';
  const password = process.env.DB_PASSWORD || 'neuroforge_password';
  const database = process.env.DB_DATABASE || 'neuroforge_db';

  const conn = await mariadb.createConnection({ host, port, user, password, database });
  try {
    const totalRows: any = await conn.query('SELECT COUNT(*) as cnt FROM conversation_messages');
    const total = totalRows && totalRows[0] && (totalRows[0].cnt ?? totalRows[0]['COUNT(*)']) || 0;
    console.log(`Total messages: ${total}`);

    const groups = await conn.query('SELECT conversation_id, COUNT(*) as cnt FROM conversation_messages GROUP BY conversation_id ORDER BY cnt DESC LIMIT 20');
    console.log('Top conversations by message count:');
    console.table(groups);

    if (groups && groups[0] && groups[0].conversation_id) {
      const convId = groups[0].conversation_id;
      console.log(`\nShowing first 20 messages for conversation: ${convId}`);
      const msgs = await conn.query('SELECT id, conversation_id, turn_number, speaker, content FROM conversation_messages WHERE conversation_id = ? ORDER BY turn_number ASC LIMIT 50', [convId]);
      msgs.forEach((m: any) => {
        console.log(`#${m.turn_number} ${m.speaker}: ${String(m.content).slice(0,200)}`);
      });
    }
  } finally {
    try { await conn.end(); } catch (e) {}
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
