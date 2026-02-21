#!/usr/bin/env node
// scripts/wipeDatabase.ts
// Connects as root to MariaDB and drops+recreates the neuroforge_db database (irreversible)

import mariadb from 'mariadb';

async function main() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306');
  const rootPassword = process.env.MARIADB_ROOT_PASSWORD || 'my_root_password';

  console.log(`Connecting to ${host}:${port} as root`);

  const conn = await mariadb.createConnection({ host, port, user: 'root', password: rootPassword });
  try {
    console.log('Dropping database neuroforge_db if exists...');
    await conn.query('DROP DATABASE IF EXISTS neuroforge_db');
    console.log('Creating database neuroforge_db...');
    await conn.query('CREATE DATABASE neuroforge_db');
    console.log('✓ Dropped and recreated database neuroforge_db');
  } finally {
    try { await conn.end(); } catch (e) { /* ignore */ }
  }
}

main().catch((err) => {
  console.error('Error wiping database:', err);
  process.exit(1);
});
