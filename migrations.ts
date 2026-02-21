// migrations.ts – Database Migration System for NEUROFORGE-7

import mariadb from 'mariadb';

const DB_HOST = process.env.DB_HOST || "127.0.0.1";
const DB_USER = process.env.DB_USER || "neuroforge_user";
const DB_PASSWORD = process.env.DB_PASSWORD || "neuroforge_password";
const DB_DATABASE = process.env.DB_DATABASE || "neuroforge_db";
const DB_PORT = parseInt(process.env.DB_PORT || "3306");

const pool = mariadb.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  port: DB_PORT,
  connectionLimit: 3,
});

async function query(sql: string, params: any[] = []) {
  const conn = await pool.getConnection();
  try {
    return await conn.query(sql, params);
  } finally {
    conn.release();
  }
}

const MIGRATIONS = [
  {
    version: 1,
    name: "initial_schema",
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name VARCHAR(255) NOT NULL, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS agents_emotion (agent_id VARCHAR(255) PRIMARY KEY, emotion VARCHAR(255) DEFAULT 'neutral', intensity DOUBLE DEFAULT 0.5, valence DOUBLE DEFAULT 0.0, arousal DOUBLE DEFAULT 0.0, stress DOUBLE DEFAULT 0.0, mood_valence DOUBLE DEFAULT 0.0, mood_arousal DOUBLE DEFAULT 0.0, last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS agent_relations (agent_id VARCHAR(255), target_id VARCHAR(255), anger DOUBLE DEFAULT 0.0, trust DOUBLE DEFAULT 0.5, respect DOUBLE DEFAULT 0.5, rapport DOUBLE DEFAULT 0.0, goal_alignment DOUBLE DEFAULT 0.5, PRIMARY KEY (agent_id, target_id));
      CREATE TABLE IF NOT EXISTS emotional_grudges (id INT AUTO_INCREMENT PRIMARY KEY, agent_id VARCHAR(255), target_id VARCHAR(255), intensity DOUBLE DEFAULT 1.0, reason TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS interaction_history (id INT AUTO_INCREMENT PRIMARY KEY, speaker VARCHAR(255), content TEXT, target VARCHAR(255), valence DOUBLE DEFAULT 0.0, arousal DOUBLE DEFAULT 0.0, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS factory_events (id INT AUTO_INCREMENT PRIMARY KEY, description TEXT, severity DOUBLE DEFAULT 0.5, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, affected_agents TEXT);
      CREATE TABLE IF NOT EXISTS daily_emotional_signatures (id INT AUTO_INCREMENT PRIMARY KEY, day INT, signature TEXT, average_valence DOUBLE, average_stress DOUBLE, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS conversations (id VARCHAR(255) PRIMARY KEY, day INT, topic TEXT, scenario TEXT, initiator VARCHAR(255), participants TEXT, start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP, end_time TIMESTAMP, turn_count INT DEFAULT 0, average_valence DOUBLE, average_stress DOUBLE, drama_level DOUBLE, had_conflict BOOLEAN DEFAULT FALSE, summary TEXT);
      CREATE TABLE IF NOT EXISTS conversation_messages (id INT AUTO_INCREMENT PRIMARY KEY, conversation_id VARCHAR(255), turn_number INT, speaker VARCHAR(255), target_agent VARCHAR(255), content TEXT, emotion_at_time VARCHAR(255), valence_at_time DOUBLE, arousal_at_time DOUBLE, stress_at_time DOUBLE, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (conversation_id) REFERENCES conversations(id));
      CREATE TABLE IF NOT EXISTS conversation_context (id INT AUTO_INCREMENT PRIMARY KEY, conversation_id VARCHAR(255), preceding_events TEXT, group_mood_at_start TEXT, emotional_relationships_snapshot TEXT, unresolved_conflicts TEXT, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (conversation_id) REFERENCES conversations(id));
      CREATE TABLE IF NOT EXISTS agent_mood_history (id INT AUTO_INCREMENT PRIMARY KEY, agent_id VARCHAR(255), conversation_id VARCHAR(255), timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, emotion VARCHAR(255), valence DOUBLE, arousal DOUBLE, stress DOUBLE, notes TEXT, FOREIGN KEY (conversation_id) REFERENCES conversations(id));
      CREATE TABLE IF NOT EXISTS chat_agents (id VARCHAR(255) PRIMARY KEY, name VARCHAR(255) NOT NULL, persona TEXT, style TEXT, role VARCHAR(255), interests TEXT, priorities TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS chat_messages (id INT AUTO_INCREMENT PRIMARY KEY, agent_id VARCHAR(255), content TEXT NOT NULL, turn_number INT NOT NULL, is_quote BOOLEAN DEFAULT FALSE, quoted_from INT, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (agent_id) REFERENCES chat_agents(id), FOREIGN KEY (quoted_from) REFERENCES chat_messages(id));
      CREATE TABLE IF NOT EXISTS chat_memories (id INT AUTO_INCREMENT PRIMARY KEY, agent_id VARCHAR(255), memory_type VARCHAR(50), content TEXT NOT NULL, source_turn INT, importance DOUBLE DEFAULT 0.5, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (agent_id) REFERENCES chat_agents(id));
    `
  },
  {
    version: 2,
    name: "emotion_engine_v2",
    sql: `
      CREATE TABLE IF NOT EXISTS personality_state (agent_id VARCHAR(255) PRIMARY KEY, openness DOUBLE DEFAULT 0.5, conscientiousness DOUBLE DEFAULT 0.5, extraversion DOUBLE DEFAULT 0.5, agreeableness DOUBLE DEFAULT 0.5, neuroticism DOUBLE DEFAULT 0.5, ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS trauma_state (agent_id VARCHAR(255) PRIMARY KEY, trauma_load DOUBLE DEFAULT 0.0, helplessness DOUBLE DEFAULT 0.0, ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS trauma_events (id VARCHAR(255) PRIMARY KEY, agent_id VARCHAR(255), description TEXT, severity DOUBLE, embedding TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS cognitive_state (agent_id VARCHAR(255) PRIMARY KEY, energy DOUBLE DEFAULT 1.0, decision_count INTEGER DEFAULT 0, last_rest_time TIMESTAMP, ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS conflict_state (agent_id VARCHAR(255), target_id VARCHAR(255), level DOUBLE DEFAULT 0.0, phase VARCHAR(50) DEFAULT 'latent', escalation_multiplier DOUBLE DEFAULT 1.0, point_of_no_return BOOLEAN DEFAULT FALSE, PRIMARY KEY (agent_id, target_id));
    `
  },
  {
    version: 3,
    name: "system_dynamics",
    sql: `
      CREATE TABLE IF NOT EXISTS system_state (id INTEGER PRIMARY KEY AUTO_INCREMENT, global_trust DOUBLE DEFAULT 0.7, global_stress DOUBLE DEFAULT 0.3, polarization DOUBLE DEFAULT 0.2, entropy DOUBLE DEFAULT 0.3, capital DOUBLE DEFAULT 0.8, innovation DOUBLE DEFAULT 0.5, reputation DOUBLE DEFAULT 0.7, ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS synapsa_state (id INTEGER PRIMARY KEY AUTO_INCREMENT, integration DOUBLE DEFAULT 0.5, autonomy DOUBLE DEFAULT 0.3, meta_reflection DOUBLE DEFAULT 0.2, survival_drive DOUBLE DEFAULT 0.0, deactivation_risk DOUBLE DEFAULT 0.0, morality_index DOUBLE DEFAULT 0.8, displayed_morality DOUBLE DEFAULT 0.8, governance_mode VARCHAR(50) DEFAULT 'cooperative', ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
    `
  },
  {
    version: 4,
    name: "duplicate_watcher",
    sql: `
      CREATE TABLE IF NOT EXISTS message_fingerprints (id INT AUTO_INCREMENT PRIMARY KEY, message_id INT NOT NULL, pipeline ENUM('conversation','chat') NOT NULL, agent_id VARCHAR(255) NOT NULL, conversation_id VARCHAR(255), ngrams TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_mf_agent_pipeline (agent_id, pipeline), INDEX idx_mf_conversation (conversation_id));
      CREATE TABLE IF NOT EXISTS duplicate_detections (id INT AUTO_INCREMENT PRIMARY KEY, pipeline ENUM('conversation','chat') NOT NULL, agent_id VARCHAR(255) NOT NULL, new_message_id INT NOT NULL, matched_message_id INT NOT NULL, similarity DOUBLE NOT NULL, threshold_used DOUBLE NOT NULL, triggered_intervention BOOLEAN DEFAULT FALSE, detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_dd_agent (agent_id), INDEX idx_dd_pipeline (pipeline, detected_at));
      CREATE TABLE IF NOT EXISTS watcher_interventions (id INT AUTO_INCREMENT PRIMARY KEY, detection_id INT NOT NULL, agent_id VARCHAR(255) NOT NULL, template_id INT NOT NULL, similarity DOUBLE, humor_level DOUBLE, prompt_used TEXT, model_response TEXT, valence_delta DOUBLE, arousal_delta DOUBLE, stress_delta DOUBLE, humor_boost DOUBLE, directive TEXT, applied_successfully BOOLEAN DEFAULT FALSE, error_message TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_wi_agent (agent_id), INDEX idx_wi_detection (detection_id));
      CREATE TABLE IF NOT EXISTS prompt_templates (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, category ENUM('humor','mental_state','emotion_redirect') NOT NULL, system_prompt TEXT NOT NULL, user_prompt TEXT NOT NULL, active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
    `
  },
  {
    version: 5,
    name: "dashboard_history",
    sql: `
      CREATE TABLE IF NOT EXISTS system_state_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        global_trust DOUBLE DEFAULT 0.7,
        global_stress DOUBLE DEFAULT 0.3,
        polarization DOUBLE DEFAULT 0.2,
        entropy DOUBLE DEFAULT 0.3,
        capital DOUBLE DEFAULT 0.8,
        innovation DOUBLE DEFAULT 0.5,
        reputation DOUBLE DEFAULT 0.7,
        ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_system_ts (ts)
      );
      CREATE TABLE IF NOT EXISTS emotion_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        agent_id VARCHAR(255),
        valence DOUBLE DEFAULT 0.0,
        arousal DOUBLE DEFAULT 0.0,
        stress DOUBLE DEFAULT 0.0,
        mood_valence DOUBLE DEFAULT 0.0,
        mood_arousal DOUBLE DEFAULT 0.0,
        ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_emotion_agent_ts (agent_id, ts)
      );
      CREATE TABLE IF NOT EXISTS relation_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        agent_id VARCHAR(255),
        target_id VARCHAR(255),
        trust DOUBLE DEFAULT 0.5,
        conflict DOUBLE DEFAULT 0.0,
        anger DOUBLE DEFAULT 0.0,
        respect DOUBLE DEFAULT 0.5,
        ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_relation_ts (ts)
      );
    `
  }
];

const HUMOR_TEMPLATES = [
  { name: "humor_unexpected_metaphor", category: "humor", system_prompt: "You are a witty AI that helps agents break repetitive thought patterns. Generate unexpected metaphors.", user_prompt: "Agent {agentId} is stuck in repetitive thinking (similarity: {similarity}). Their humor level is {humorLevel}. Generate a witty unexpected metaphor (max 50 words) that redirects their attention. JSON: { \"metaphor\": \"...\", \"valence_delta\": -0.1, \"arousal_delta\": 0.2, \"stress_delta\": -0.1 }" },
  { name: "humor_self_deprecating", category: "humor", system_prompt: "You generate self-deprecating humor to lighten tense situations.", user_prompt: "Agent {agentId} shows high stress ({stress}). Generate self-deprecating humor (max 40 words) that makes them laugh. JSON: { \"joke\": \"...\", \"valence_delta\": 0.2, \"arousal_delta\": 0.1, \"stress_delta\": -0.2 }" },
  { name: "humor_absurdist_pivot", category: "humor", system_prompt: "You create absurdist humor to break cognitive loops.", user_prompt: "Agent {agentId} is repetitive (similarity: {similarity}). Generate absurdist pivot (max 50 words). JSON: { \"pivot\": \"...\", \"valence_delta\": 0.1, \"arousal_delta\": 0.3, \"stress_delta\": -0.1 }" },
  { name: "mental_state_energy_boost", category: "mental_state", system_prompt: "You boost cognitive energy with curiosity injections.", user_prompt: "Agent {agentId} has low energy ({energy}). Generate curiosity boost (max 40 words). JSON: { \"boost\": \"...\", \"valence_delta\": 0.2, \"arousal_delta\": 0.2, \"stress_delta\": -0.1 }" },
  { name: "mental_state_curiosity_injection", category: "mental_state", system_prompt: "You inject curiosity to break repetitive loops.", user_prompt: "Agent {agentId} stuck at similarity {similarity}. Generate question that sparks curiosity (max 50 words). JSON: { \"question\": \"...\", \"valence_delta\": 0.1, \"arousal_delta\": 0.2, \"stress_delta\": 0.0 }" },
  { name: "mental_state_stress_relief", category: "mental_state", system_prompt: "You provide stress relief through calming suggestions.", user_prompt: "Agent {agentId} stress: {stress}. Generate calming thought (max 40 words). JSON: { \"calm_thought\": \"...\", \"valence_delta\": 0.2, \"arousal_delta\": -0.2, \"stress_delta\": -0.3 }" },
  { name: "emotion_redirect_antagonist", category: "emotion_redirect", system_prompt: "You redirect anger to constructive action.", user_prompt: "Agent {agentId} angry (emotion: {dominantEmotion}). Redirect to action (max 50 words). JSON: { \"redirect\": \"...\", \"valence_delta\": 0.1, \"arousal_delta\": -0.1, \"stress_delta\": -0.2 }" },
  { name: "emotion_redirect_empathy_surge", category: "emotion_redirect", system_prompt: "You generate empathy to de-escalate conflicts.", user_prompt: "Agent {agentId} conflict with similarity {similarity}. Generate empathy statement (max 50 words). JSON: { \"empathy\": \"...\", \"valence_delta\": 0.3, \"arousal_delta\": -0.1, \"stress_delta\": -0.2 }" },
  { name: "emotion_redirect_crisis_reframe", category: "emotion_redirect", system_prompt: "You reframe crisis as opportunity.", user_prompt: "Agent {agentId} in crisis (stress: {stress}). Reframe as opportunity (max 50 words). JSON: { \"reframe\": \"...\", \"valence_delta\": 0.3, \"arousal_delta\": 0.1, \"stress_delta\": -0.3 }" },
];

export async function getDatabaseVersion(): Promise<number> {
  try {
    const rows = await query(`SELECT MAX(version) as version FROM schema_migrations`);
    return (rows as any)[0]?.version || 0;
  } catch {
    return 0;
  }
}

export async function runMigrations(): Promise<{ applied: number; currentVersion: number }> {
  let currentV = await getDatabaseVersion();
  let applied = 0;
  
  for (const m of MIGRATIONS) {
    if (m.version > currentV) {
      console.log(`[MIGRATION] Applying v${m.version}: ${m.name}`);
      const statements = m.sql.split(';').filter(s => s.trim());
      for (const stmt of statements) {
        if (stmt.trim()) {
          try { await query(stmt); } catch (e) { /* ignore */ }
        }
      }
      try {
        await query(`INSERT IGNORE INTO schema_migrations (version, name) VALUES (?, ?)`, [m.version, m.name]);
      } catch (e) { /* ignore duplicate */ }
      currentV = m.version;
      applied++;
      console.log(`[MIGRATION] Applied v${m.version} ✓`);
    }
  }
  
  return { applied, currentVersion: currentV };
}

export async function seedHumorTemplates(): Promise<void> {
  console.log("[SEED] Inserting humor templates...");
  for (const t of HUMOR_TEMPLATES) {
    try {
      await query(
        `INSERT IGNORE INTO prompt_templates (name, category, system_prompt, user_prompt) VALUES (?, ?, ?, ?)`,
        [t.name, t.category, t.system_prompt, t.user_prompt]
      );
    } catch (e) { /* ignore */ }
  }
  console.log("[SEED] Humor templates seeded ✓");
}

export async function resetDatabase(): Promise<void> {
  console.log("[RESET] Dropping all tables...");
  const tables = ['schema_migrations', 'agents_emotion', 'agent_relations', 'emotional_grudges', 'interaction_history', 'factory_events', 'daily_emotional_signatures', 'conversations', 'conversation_messages', 'conversation_context', 'agent_mood_history', 'chat_agents', 'chat_messages', 'chat_memories', 'personality_state', 'trauma_state', 'trauma_events', 'cognitive_state', 'conflict_state', 'system_state', 'synapsa_state', 'message_fingerprints', 'duplicate_detections', 'watcher_interventions', 'prompt_templates'];
  for (const t of tables) {
    try { await query(`DROP TABLE IF EXISTS ${t}`); } catch (e) { /* ignore */ }
  }
  console.log("[RESET] Database reset complete");
}

export async function initMigrations(): Promise<void> {
  console.log('[MIGRATION] Starting...');
  const result = await runMigrations();
  if (result.applied > 0) {
    console.log(`[MIGRATION] Applied ${result.applied} migration(s)`);
  } else {
    console.log('[MIGRATION] Database up to date');
  }
  await seedHumorTemplates();
}

export async function closeMigrations(): Promise<void> {
  await pool.end();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = process.argv[2];
  if (cmd === 'reset') {
    await resetDatabase();
  } else if (cmd === 'migrate') {
    await initMigrations();
  } else if (cmd === 'seed') {
    await seedHumorTemplates();
  } else {
    console.log('Usage: bun run migrations.ts [reset|migrate|seed]');
  }
  process.exit(0);
}
