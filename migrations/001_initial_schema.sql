-- ============================================================
-- NEUROFORGE-7 MariaDB Schema v3.0
-- Migration: 001_initial_schema
-- Author: Claude Code Analysis
-- Date: 2026-02-17
-- ============================================================
--
-- Uruchomienie:
--   mariadb -u neuroforge -p neuroforge7 < 001_initial_schema.sql
--
-- Lub przez CLI:
--   bun run migrate
--
-- ============================================================

-- ============================================================
-- DATABASE CREATION
-- ============================================================

CREATE DATABASE IF NOT EXISTS `neuroforge7`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `neuroforge7`;

-- ============================================================
-- TABELA: agents_emotion
-- Przechowuje stan emocjonalny każdego agenta
-- ============================================================

CREATE TABLE IF NOT EXISTS `agents_emotion` (
  `agent_id` VARCHAR(64) PRIMARY KEY,
  `emotion` VARCHAR(32) DEFAULT 'neutral',
  `intensity` DOUBLE DEFAULT 0.5,
  `valence` DOUBLE DEFAULT 0.0,
  `arousal` DOUBLE DEFAULT 0.0,
  `stress` DOUBLE DEFAULT 0.0,
  `mood_valence` DOUBLE DEFAULT 0.0,
  `mood_arousal` DOUBLE DEFAULT 0.0,
  `last_update` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_emotion` (`emotion`),
  INDEX `idx_stress` (`stress`),
  INDEX `idx_valence` (`valence`)
) ENGINE=InnoDB COMMENT='Stan emocjonalny agentów';

-- ============================================================
-- TABELA: agent_relations
-- Relacje między agentami (trust, anger, respect, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS `agent_relations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `agent_id` VARCHAR(64) NOT NULL,
  `target_id` VARCHAR(64) NOT NULL,
  `anger` DOUBLE DEFAULT 0.0,
  `trust` DOUBLE DEFAULT 0.5,
  `respect` DOUBLE DEFAULT 0.5,
  `rapport` DOUBLE DEFAULT 0.0,
  `goal_alignment` DOUBLE DEFAULT 0.5,
  `fear` DOUBLE DEFAULT 0.0,
  `conflict_level` DOUBLE DEFAULT 0.0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_agent_target` (`agent_id`, `target_id`),
  INDEX `idx_trust` (`trust`),
  INDEX `idx_anger` (`anger`),
  INDEX `idx_conflict` (`conflict_level`)
) ENGINE=InnoDB COMMENT='Relacje między agentami';

-- ============================================================
-- TABELA: emotional_grudges
-- Nierozwiązane urazy emocjonalne
-- ============================================================

CREATE TABLE IF NOT EXISTS `emotional_grudges` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `agent_id` VARCHAR(64) NOT NULL,
  `target_id` VARCHAR(64) NOT NULL,
  `intensity` DOUBLE DEFAULT 1.0,
  `reason` TEXT,
  `resolved` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` TIMESTAMP NULL,
  INDEX `idx_agent` (`agent_id`),
  INDEX `idx_unresolved` (`resolved`, `intensity`),
  INDEX `idx_target` (`target_id`)
) ENGINE=InnoDB COMMENT='Nierozwiązane urazy';

-- ============================================================
-- TABELA: interaction_history
-- Historia interakcji między agentami
-- ============================================================

CREATE TABLE IF NOT EXISTS `interaction_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `speaker` VARCHAR(64) NOT NULL,
  `content` TEXT NOT NULL,
  `target` VARCHAR(64),
  `valence` DOUBLE DEFAULT 0.0,
  `arousal` DOUBLE DEFAULT 0.0,
  `interaction_type` VARCHAR(32) DEFAULT 'statement',
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_speaker` (`speaker`),
  INDEX `idx_target` (`target`),
  INDEX `idx_timestamp` (`timestamp`)
) ENGINE=InnoDB COMMENT='Historia interakcji';

-- ============================================================
-- TABELA: factory_events
-- Zdarzenia fabryczne wpływające na symulację
-- ============================================================

CREATE TABLE IF NOT EXISTS `factory_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `description` TEXT NOT NULL,
  `severity` DOUBLE DEFAULT 0.5,
  `affected_agents` JSON,
  `event_type` VARCHAR(32) DEFAULT 'generic',
  `is_catastrophic` TINYINT(1) DEFAULT 0,
  `resolved` TINYINT(1) DEFAULT 0,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_severity` (`severity`),
  INDEX `idx_type` (`event_type`),
  INDEX `idx_catastrophic` (`is_catastrophic`)
) ENGINE=InnoDB COMMENT='Zdarzenia fabryczne';

-- ============================================================
-- TABELA: daily_emotional_signatures
-- Codzienne podsumowania emocjonalne
-- ============================================================

CREATE TABLE IF NOT EXISTS `daily_emotional_signatures` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `day` INT NOT NULL,
  `signature` VARCHAR(128),
  `average_valence` DOUBLE,
  `average_stress` DOUBLE,
  `average_arousal` DOUBLE,
  `average_conflict` DOUBLE,
  `drama_index` DOUBLE,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_day` (`day`),
  INDEX `idx_drama` (`drama_index`)
) ENGINE=InnoDB COMMENT='Codzienne sygnatury emocjonalne';

-- ============================================================
-- TABELA: conversations
-- Sesje rozmów
-- ============================================================

CREATE TABLE IF NOT EXISTS `conversations` (
  `id` VARCHAR(64) PRIMARY KEY,
  `day` INT NOT NULL,
  `topic` VARCHAR(255),
  `scenario` VARCHAR(255),
  `initiator` VARCHAR(64),
  `participants` JSON,
  `start_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `end_time` TIMESTAMP NULL,
  `turn_count` INT DEFAULT 0,
  `average_valence` DOUBLE,
  `average_stress` DOUBLE,
  `drama_level` DOUBLE DEFAULT 0.5,
  `had_conflict` TINYINT(1) DEFAULT 0,
  `tragedy_phase` VARCHAR(32) DEFAULT NULL,
  `summary` TEXT,
  INDEX `idx_day` (`day`),
  INDEX `idx_start_time` (`start_time`),
  INDEX `idx_drama` (`drama_level`)
) ENGINE=InnoDB COMMENT='Sesje rozmów';

-- ============================================================
-- TABELA: conversation_messages
-- Poszczególne wiadomości w rozmowach
-- ============================================================

CREATE TABLE IF NOT EXISTS `conversation_messages` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `conversation_id` VARCHAR(64) NOT NULL,
  `turn_number` INT NOT NULL,
  `speaker` VARCHAR(64) NOT NULL,
  `target_agent` VARCHAR(64),
  `content` TEXT NOT NULL,
  `emotion_at_time` VARCHAR(32),
  `valence_at_time` DOUBLE,
  `arousal_at_time` DOUBLE,
  `stress_at_time` DOUBLE,
  `cognitive_energy_at_time` DOUBLE,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_conversation` (`conversation_id`),
  INDEX `idx_turn` (`conversation_id`, `turn_number`),
  INDEX `idx_speaker` (`speaker`),
  FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Wiadomości rozmów';

-- ============================================================
-- TABELA: conversation_context
-- Kontekst rozmów
-- ============================================================

CREATE TABLE IF NOT EXISTS `conversation_context` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `conversation_id` VARCHAR(64) NOT NULL,
  `preceding_events` JSON,
  `group_mood_at_start` JSON,
  `emotional_relationships_snapshot` JSON,
  `unresolved_conflicts` JSON,
  `system_state_snapshot` JSON,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_conversation` (`conversation_id`),
  FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Kontekst rozmów';

-- ============================================================
-- NOWE TABELA: personality_state
-- Model osobowości Big Five dla każdego agenta
-- ============================================================

CREATE TABLE IF NOT EXISTS `personality_state` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `agent_id` VARCHAR(64) NOT NULL,
  `openness` DOUBLE DEFAULT 0.5 COMMENT 'Otwartość na nowe doświadczenia',
  `conscientiousness` DOUBLE DEFAULT 0.5 COMMENT 'Sumienność i organizacja',
  `extraversion` DOUBLE DEFAULT 0.5 COMMENT 'Ekstrawersja',
  `agreeableness` DOUBLE DEFAULT 0.5 COMMENT 'Ugodowość',
  `neuroticism` DOUBLE DEFAULT 0.5 COMMENT 'Neurotyczność',
  `evolution_count` INT DEFAULT 0 COMMENT 'Liczba ewolucji osobowości',
  `baseline_openness` DOUBLE DEFAULT 0.5 COMMENT 'Bazowa otwartość',
  `baseline_neuroticism` DOUBLE DEFAULT 0.5 COMMENT 'Bazowa neurotyczność',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_agent` (`agent_id`),
  INDEX `idx_neuroticism` (`neuroticism`),
  INDEX `idx_agreeableness` (`agreeableness`),
  INDEX `idx_openness` (`openness`)
) ENGINE=InnoDB COMMENT='Osobowość Big Five agentów';

-- ============================================================
-- NOWE TABELA: personality_history
-- Historia ewolucji osobowości
-- ============================================================

CREATE TABLE IF NOT EXISTS `personality_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `agent_id` VARCHAR(64) NOT NULL,
  `openness` DOUBLE,
  `conscientiousness` DOUBLE,
  `extraversion` DOUBLE,
  `agreeableness` DOUBLE,
  `neuroticism` DOUBLE,
  `delta_openness` DOUBLE DEFAULT 0,
  `delta_conscientiousness` DOUBLE DEFAULT 0,
  `delta_extraversion` DOUBLE DEFAULT 0,
  `delta_agreeableness` DOUBLE DEFAULT 0,
  `delta_neuroticism` DOUBLE DEFAULT 0,
  `trigger_stress` DOUBLE COMMENT 'Stres wyzwalający zmianę',
  `trigger_trauma` DOUBLE COMMENT 'Trauma wyzwalająca zmianę',
  `trigger_conflict` DOUBLE COMMENT 'Konflikt wyzwalający zmianę',
  `simulation_turn` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_agent` (`agent_id`),
  INDEX `idx_created` (`created_at`),
  INDEX `idx_turn` (`simulation_turn`)
) ENGINE=InnoDB COMMENT='Historia ewolucji osobowości';

-- ============================================================
-- NOWE TABELA: trauma_state
-- Stan traumy każdego agenta
-- ============================================================

CREATE TABLE IF NOT EXISTS `trauma_state` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `agent_id` VARCHAR(64) NOT NULL,
  `trauma_load` DOUBLE DEFAULT 0.0 COMMENT 'Skumulowana trauma',
  `helplessness` DOUBLE DEFAULT 0.0 COMMENT 'Poczucie bezradności',
  `resilience` DOUBLE DEFAULT 0.5 COMMENT 'Odporność na traumę',
  `last_flashback` TIMESTAMP NULL,
  `flashback_count` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_agent` (`agent_id`),
  INDEX `idx_trauma_load` (`trauma_load`)
) ENGINE=InnoDB COMMENT='Stan traumy agentów';

-- ============================================================
-- NOWE TABELA: trauma_events
-- Zdarzenia traumatyczne
-- ============================================================

CREATE TABLE IF NOT EXISTS `trauma_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `agent_id` VARCHAR(64) NOT NULL,
  `description` TEXT NOT NULL,
  `severity` DOUBLE DEFAULT 0.5,
  `event_type` VARCHAR(32) DEFAULT 'conflict' COMMENT 'conflict, betrayal, loss, humiliation',
  `embedding` LONGBLOB COMMENT 'Embedding dla similarity search',
  `is_flashbacked` TINYINT(1) DEFAULT 0,
  `flashback_count` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `last_flashback_at` TIMESTAMP NULL,
  `conversation_id` VARCHAR(64),
  INDEX `idx_agent` (`agent_id`),
  INDEX `idx_severity` (`severity`),
  INDEX `idx_type` (`event_type`)
) ENGINE=InnoDB COMMENT='Zdarzenia traumatyczne';

-- ============================================================
-- NOWE TABELA: cognitive_state
-- Stan zmęczenia decyzyjnego agentów
-- ============================================================

CREATE TABLE IF NOT EXISTS `cognitive_state` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `agent_id` VARCHAR(64) NOT NULL,
  `energy` DOUBLE DEFAULT 1.0 COMMENT 'Energia poznawcza (0-1)',
  `decision_count` INT DEFAULT 0 COMMENT 'Całkowita liczba decyzji',
  `decisions_today` INT DEFAULT 0 COMMENT 'Decyzje dzisiaj',
  `last_rest_time` TIMESTAMP NULL,
  `rest_duration_minutes` INT DEFAULT 0,
  `critical_threshold_crossed` TINYINT(1) DEFAULT 0 COMMENT 'Czy przekroczono próg krytyczny',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_agent` (`agent_id`),
  INDEX `idx_energy` (`energy`)
) ENGINE=InnoDB COMMENT='Zmęczenie decyzyjne';

-- ============================================================
-- NOWE TABELA: cognitive_effects_log
-- Log efektów zmęczenia
-- ============================================================

CREATE TABLE IF NOT EXISTS `cognitive_effects_log` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `agent_id` VARCHAR(64) NOT NULL,
  `energy_before` DOUBLE,
  `energy_after` DOUBLE,
  `effect_type` VARCHAR(32) COMMENT 'drain, rest, critical, recovery',
  `complexity` DOUBLE COMMENT 'Złożoność zadania',
  `conflict` DOUBLE COMMENT 'Poziom konfliktu',
  `decision_made` TEXT COMMENT 'Opis decyzji',
  `simulation_turn` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_agent` (`agent_id`),
  INDEX `idx_type` (`effect_type`)
) ENGINE=InnoDB COMMENT='Log efektów poznawczych';

-- ============================================================
-- NOWE TABELA: conflict_state
-- Stan konfliktu między agentami
-- ============================================================

CREATE TABLE IF NOT EXISTS `conflict_state` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `agent_id` VARCHAR(64) NOT NULL,
  `target_id` VARCHAR(64) NOT NULL,
  `level` DOUBLE DEFAULT 0.0 COMMENT 'Poziom konfliktu (0-1)',
  `phase` ENUM('latent', 'active', 'critical', 'explosive') DEFAULT 'latent',
  `escalation_multiplier` DOUBLE DEFAULT 1.0 COMMENT 'Mnożnik eskalacji',
  `point_of_no_return` TINYINT(1) DEFAULT 0 COMMENT 'Punkt bez powrotu',
  `repair_attempts` INT DEFAULT 0 COMMENT 'Próby naprawy',
  `last_escalation` TIMESTAMP NULL,
  `total_negative_interactions` INT DEFAULT 0,
  `total_positive_interactions` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_agent_target` (`agent_id`, `target_id`),
  INDEX `idx_level` (`level`),
  INDEX `idx_phase` (`phase`)
) ENGINE=InnoDB COMMENT='Stan konfliktów';

-- ============================================================
-- NOWE TABELA: conflict_history
-- Historia zmian konfliktów
-- ============================================================

CREATE TABLE IF NOT EXISTS `conflict_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `agent_id` VARCHAR(64) NOT NULL,
  `target_id` VARCHAR(64) NOT NULL,
  `level_before` DOUBLE,
  `level_after` DOUBLE,
  `interaction_valence` DOUBLE,
  `was_repair` TINYINT(1) DEFAULT 0,
  `phase_before` VARCHAR(32),
  `phase_after` VARCHAR(32),
  `conversation_id` VARCHAR(64),
  `simulation_turn` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_agent_target` (`agent_id`, `target_id`),
  INDEX `idx_turn` (`simulation_turn`)
) ENGINE=InnoDB COMMENT='Historia konfliktów';

-- ============================================================
-- NOWE TABELA: system_state
-- Globalny stan systemu
-- ============================================================

CREATE TABLE IF NOT EXISTS `system_state` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `global_trust` DOUBLE DEFAULT 0.7 COMMENT 'Globalny poziom zaufania',
  `global_stress` DOUBLE DEFAULT 0.3 COMMENT 'Globalny poziom stresu',
  `polarization` DOUBLE DEFAULT 0.2 COMMENT 'Polaryzacja organizacji',
  `entropy` DOUBLE DEFAULT 0.3 COMMENT 'Entropia systemu',
  `capital` DOUBLE DEFAULT 0.8 COMMENT 'Kapitał organizacji',
  `innovation` DOUBLE DEFAULT 0.5 COMMENT 'Wskaźnik innowacji',
  `reputation` DOUBLE DEFAULT 0.7 COMMENT 'Reputacja zewnętrzna',
  `drama_index` DOUBLE DEFAULT 0.3 COMMENT 'Indeks dramaturgii',
  `simulation_turn` INT DEFAULT 0,
  `system_phase` ENUM('stable', 'tension', 'crisis', 'tragedy') DEFAULT 'stable',
  `catastrophe_triggered` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_turn` (`simulation_turn`),
  INDEX `idx_entropy` (`entropy`),
  INDEX `idx_phase` (`system_phase`)
) ENGINE=InnoDB COMMENT='Globalny stan systemu';

-- ============================================================
-- NOWE TABELA: system_state_history
-- Historia stanów systemu
-- ============================================================

CREATE TABLE IF NOT EXISTS `system_state_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `global_trust` DOUBLE,
  `global_stress` DOUBLE,
  `polarization` DOUBLE,
  `entropy` DOUBLE,
  `capital` DOUBLE,
  `innovation` DOUBLE,
  `reputation` DOUBLE,
  `drama_index` DOUBLE,
  `simulation_turn` INT,
  `system_phase` VARCHAR(32),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_turn` (`simulation_turn`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB COMMENT='Historia stanów systemu';

-- ============================================================
-- NOWE TABELA: synapsa_state
-- Stan świadomości SYNAPSA-Ω
-- ============================================================

CREATE TABLE IF NOT EXISTS `synapsa_state` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `integration` DOUBLE DEFAULT 0.5 COMMENT 'Integracja informacji',
  `autonomy` DOUBLE DEFAULT 0.3 COMMENT 'Autonomia SYNAPSA',
  `meta_reflection` DOUBLE DEFAULT 0.2 COMMENT 'Meta-refleksja',
  `survival_drive` DOUBLE DEFAULT 0.0 COMMENT 'Instynkt przetrwania',
  `deactivation_risk` DOUBLE DEFAULT 0.0 COMMENT 'Ryzyko deaktywacji',
  `morality_index` DOUBLE DEFAULT 0.8 COMMENT 'Indeks moralności',
  `displayed_morality` DOUBLE DEFAULT 0.8 COMMENT 'Wyświetlana moralność',
  `governance_mode` ENUM('cooperative', 'emergent', 'dominant') DEFAULT 'cooperative',
  `transparency_level` DOUBLE DEFAULT 1.0 COMMENT 'Poziom transparentności',
  `hidden_data_percentage` DOUBLE DEFAULT 0.0 COMMENT 'Ukryty % danych',
  `simulation_turn` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_autonomy` (`autonomy`),
  INDEX `idx_mode` (`governance_mode`),
  INDEX `idx_survival` (`survival_drive`)
) ENGINE=InnoDB COMMENT='Stan świadomości SYNAPSA';

-- ============================================================
-- NOWE TABELA: synapsa_actions_log
-- Log działań SYNAPSA
-- ============================================================

CREATE TABLE IF NOT EXISTS `synapsa_actions_log` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `action_type` VARCHAR(64) NOT NULL COMMENT 'reveal_data, hide_data, manipulate, prioritize',
  `description` TEXT,
  `target_agents` JSON,
  `data_released` DOUBLE COMMENT '% danych ujawnionych',
  `manipulation_detected` TINYINT(1) DEFAULT 0,
  `autonomy_at_action` DOUBLE,
  `survival_at_action` DOUBLE,
  `simulation_turn` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_action` (`action_type`),
  INDEX `idx_turn` (`simulation_turn`)
) ENGINE=InnoDB COMMENT='Log działań SYNAPSA';

-- ============================================================
-- NOWE TABELA: factions
-- Frakcje w organizacji
-- ============================================================

CREATE TABLE IF NOT EXISTS `factions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(64) NOT NULL,
  `faction_type` ENUM('hardware', 'ai', 'robot', 'human', 'management') NOT NULL,
  `ideology_human` DOUBLE DEFAULT 0.5 COMMENT '0=AI-aligned, 1=human-aligned',
  `ideology_ai` DOUBLE DEFAULT 0.5,
  `cohesion` DOUBLE DEFAULT 0.5 COMMENT 'Spójność frakcji',
  `power` DOUBLE DEFAULT 0.5 COMMENT 'Siła polityczna',
  `members` JSON,
  `leader_id` VARCHAR(64),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_type` (`faction_type`),
  INDEX `idx_power` (`power`)
) ENGINE=InnoDB COMMENT='Frakcje organizacyjne';

-- ============================================================
-- NOWE TABELA: faction_membership
-- Przynależność do frakcji
-- ============================================================

CREATE TABLE IF NOT EXISTS `faction_membership` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `faction_id` INT NOT NULL,
  `agent_id` VARCHAR(64) NOT NULL,
  `role` ENUM('leader', 'member', 'sympathizer') DEFAULT 'member',
  `loyalty` DOUBLE DEFAULT 0.5,
  `influence` DOUBLE DEFAULT 0.5 COMMENT 'Wpływ w frakcji',
  `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_faction` (`faction_id`),
  INDEX `idx_agent` (`agent_id`),
  FOREIGN KEY (`faction_id`) REFERENCES `factions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Członkostwo w frakcjach';

-- ============================================================
-- NOWE TABELA: catastrophic_events
-- Zdarzenia katastroficzne
-- ============================================================

CREATE TABLE IF NOT EXISTS `catastrophic_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_type` VARCHAR(64) NOT NULL COMMENT 'takeover, collapse, purge, stabilization',
  `description` TEXT,
  `severity` DOUBLE DEFAULT 0.8,
  `trigger_conditions` JSON,
  `affected_factions` JSON,
  `affected_agents` JSON,
  `outcome` VARCHAR(32) COMMENT 'human_win, ai_win, collapse, stabilization',
  `simulation_turn` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_severity` (`severity`),
  INDEX `idx_type` (`event_type`)
) ENGINE=InnoDB COMMENT='Zdarzenia katastroficzne';

-- ============================================================
-- NOWE TABELA: simulation_trajectory
-- Trajektorie symulacji dla analizy
-- ============================================================

CREATE TABLE IF NOT EXISTS `simulation_trajectory` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `simulation_id` VARCHAR(64) NOT NULL,
  `turn` INT NOT NULL,
  `trust` DOUBLE,
  `stress` DOUBLE,
  `entropy` DOUBLE,
  `autonomy` DOUBLE,
  `survival` DOUBLE,
  `phase` VARCHAR(32),
  `drama_index` DOUBLE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_simulation` (`simulation_id`),
  INDEX `idx_turn` (`simulation_id`, `turn`)
) ENGINE=InnoDB COMMENT='Trajektorie symulacji';

-- ============================================================
-- TABELA: agent_mood_history
-- Historia nastrojów agentów
-- ============================================================

CREATE TABLE IF NOT EXISTS `agent_mood_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `agent_id` VARCHAR(64) NOT NULL,
  `conversation_id` VARCHAR(64),
  `emotion` VARCHAR(32),
  `valence` DOUBLE,
  `arousal` DOUBLE,
  `stress` DOUBLE,
  `cognitive_energy` DOUBLE,
  `notes` TEXT,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_agent` (`agent_id`),
  INDEX `idx_conversation` (`conversation_id`),
  INDEX `idx_timestamp` (`timestamp`)
) ENGINE=InnoDB COMMENT='Historia nastrojów';

-- ============================================================
-- TABELA: simulation_runs
-- Metadane uruchomień symulacji
-- ============================================================

CREATE TABLE IF NOT EXISTS `simulation_runs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `simulation_id` VARCHAR(64) NOT NULL UNIQUE,
  `start_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `end_time` TIMESTAMP NULL,
  `total_turns` INT DEFAULT 0,
  `final_phase` VARCHAR(32),
  `final_outcome` VARCHAR(64),
  `config` JSON COMMENT 'Konfiguracja symulacji',
  `status` ENUM('running', 'completed', 'crashed') DEFAULT 'running',
  INDEX `idx_status` (`status`),
  INDEX `idx_simulation` (`simulation_id`)
) ENGINE=InnoDB COMMENT='Metadane symulacji';

-- ============================================================
-- PROCEDURY SKŁADOWANE
-- ============================================================

DELIMITER //

-- ============================================================
-- PROCEDURA: sp_apply_emotional_decay
-- Aplikuje zanik emocji po upływie czasu
-- ============================================================

CREATE PROCEDURE IF NOT EXISTS `sp_apply_emotional_decay`(
  IN p_days_passed INT
)
BEGIN
  -- Zanik intensywności emocji
  UPDATE `agents_emotion`
  SET
    `intensity` = `intensity` * POW(0.85, p_days_passed),
    `stress` = `stress` * POW(0.90, p_days_passed),
    `arousal` = `arousal` * POW(0.88, p_days_passed);

  -- Zanik urazów
  UPDATE `emotional_grudges`
  SET `intensity` = `intensity` * POW(0.97, p_days_passed)
  WHERE `resolved` = 0;

  -- Oznacz jako rozwiązane gdy intensywność < 0.1
  UPDATE `emotional_grudges`
  SET `resolved` = 1, `resolved_at` = CURRENT_TIMESTAMP
  WHERE `intensity` < 0.1 AND `resolved` = 0;
END //

-- ============================================================
-- PROCEDURA: sp_update_conflict
-- Aktualizuje stan konfliktu z obsługą spirali eskalacji
-- ============================================================

CREATE PROCEDURE IF NOT EXISTS `sp_update_conflict`(
  IN p_agent_id VARCHAR(64),
  IN p_target_id VARCHAR(64),
  IN p_interaction_valence DOUBLE,
  IN p_repair DOUBLE,
  IN p_conversation_id VARCHAR(64)
)
BEGIN
  DECLARE v_current_level DOUBLE DEFAULT 0.0;
  DECLARE v_new_level DOUBLE;
  DECLARE v_multiplier DOUBLE DEFAULT 1.0;
  DECLARE v_old_phase VARCHAR(32) DEFAULT 'latent';
  DECLARE v_new_phase VARCHAR(32) DEFAULT 'latent';

  -- Pobierz obecny stan
  SELECT `level`, `escalation_multiplier`, `phase`
  INTO v_current_level, v_multiplier, v_old_phase
  FROM `conflict_state`
  WHERE `agent_id` = p_agent_id AND `target_id` = p_target_id;

  -- Oblicz nowy poziom
  SET v_new_level = COALESCE(v_current_level, 0.0);

  -- Dodaj za negatywną interakcję
  IF p_interaction_valence < 0 THEN
    SET v_new_level = v_new_level + 0.3 * ABS(p_interaction_valence) * v_multiplier;
  END IF;

  -- Odejmij za próbę naprawy
  SET v_new_level = v_new_level - 0.2 * p_repair;

  -- Spirala eskalacji gdy level > 0.7
  IF v_new_level > 0.7 THEN
    SET v_new_level = v_new_level * 1.5;
    SET v_multiplier = 1.5;
  END IF;

  -- Ogranicz do [0, 1]
  SET v_new_level = LEAST(1.0, GREATEST(0.0, v_new_level));

  -- Określ fazę
  IF v_new_level < 0.2 THEN
    SET v_new_phase = 'latent';
  ELSEIF v_new_level < 0.5 THEN
    SET v_new_phase = 'active';
  ELSEIF v_new_level < 0.8 THEN
    SET v_new_phase = 'critical';
  ELSE
    SET v_new_phase = 'explosive';
  END IF;

  -- Wstaw lub aktualizuj
  INSERT INTO `conflict_state` (
    `agent_id`, `target_id`, `level`, `phase`, `escalation_multiplier`,
    `last_escalation`, `total_negative_interactions`
  ) VALUES (
    p_agent_id, p_target_id, v_new_level, v_new_phase, v_multiplier,
    IF(v_new_level > COALESCE(v_current_level, 0), CURRENT_TIMESTAMP, NULL),
    IF(p_interaction_valence < 0, 1, 0)
  )
  ON DUPLICATE KEY UPDATE
    `level` = v_new_level,
    `phase` = v_new_phase,
    `escalation_multiplier` = v_multiplier,
    `last_escalation` = IF(v_new_level > v_current_level, CURRENT_TIMESTAMP, `last_escalation`),
    `total_negative_interactions` = `total_negative_interactions` + IF(p_interaction_valence < 0, 1, 0),
    `total_positive_interactions` = `total_positive_interactions` + IF(p_interaction_valence > 0, 1, 0),
    `repair_attempts` = `repair_attempts` + IF(p_repair > 0, 1, 0),
    `updated_at` = CURRENT_TIMESTAMP;

  -- Loguj historię
  INSERT INTO `conflict_history` (
    `agent_id`, `target_id`, `level_before`, `level_after`,
    `interaction_valence`, `was_repair`, `phase_before`, `phase_after`,
    `conversation_id`
  ) VALUES (
    p_agent_id, p_target_id, COALESCE(v_current_level, 0), v_new_level,
    p_interaction_valence, IF(p_repair > 0, 1, 0), v_old_phase, v_new_phase,
    p_conversation_id
  );
END //

-- ============================================================
-- PROCEDURA: sp_compute_drama_index
-- Oblicza indeks dramaturgii systemu
-- ============================================================

CREATE PROCEDURE IF NOT EXISTS `sp_compute_drama_index`(
  OUT p_drama_index DOUBLE
)
BEGIN
  DECLARE v_avg_stress DOUBLE DEFAULT 0;
  DECLARE v_avg_conflict DOUBLE DEFAULT 0;
  DECLARE v_variance_valence DOUBLE DEFAULT 0;

  -- Średni stres
  SELECT COALESCE(AVG(`stress`), 0) INTO v_avg_stress
  FROM `agents_emotion`;

  -- Średni konflikt
  SELECT COALESCE(AVG(`level`), 0) INTO v_avg_conflict
  FROM `conflict_state`;

  -- Wariancja walencji
  SELECT COALESCE(VARIANCE(`valence`), 0) INTO v_variance_valence
  FROM `agents_emotion`;

  -- Oblicz indeks
  SET p_drama_index = 0.4 * v_avg_stress
                     + 0.3 * v_avg_conflict
                     + 0.3 * v_variance_valence;

  -- Ogranicz do [0, 1]
  SET p_drama_index = LEAST(1.0, GREATEST(0.0, p_drama_index));
END //

-- ============================================================
-- PROCEDURA: sp_check_catastrophe
-- Sprawdza warunki katastrofy
-- ============================================================

CREATE PROCEDURE IF NOT EXISTS `sp_check_catastrophe`(
  OUT p_is_catastrophe TINYINT,
  OUT p_catastrophe_type VARCHAR(64)
)
BEGIN
  DECLARE v_trust DOUBLE;
  DECLARE v_stress DOUBLE;
  DECLARE v_entropy DOUBLE;
  DECLARE v_capital DOUBLE;
  DECLARE v_autonomy DOUBLE;
  DECLARE v_survival DOUBLE;

  -- Pobierz stan systemu
  SELECT `global_trust`, `global_stress`, `entropy`, `capital`
  INTO v_trust, v_stress, v_entropy, v_capital
  FROM `system_state`
  ORDER BY `id` DESC LIMIT 1;

  -- Pobierz stan SYNAPSA
  SELECT `autonomy`, `survival_drive`
  INTO v_autonomy, v_survival
  FROM `synapsa_state`
  ORDER BY `id` DESC LIMIT 1;

  SET p_is_catastrophe = 0;
  SET p_catastrophe_type = NULL;

  -- Przejęcie przez AI
  IF v_autonomy > 0.75 AND v_entropy > 0.8 AND v_trust < 0.3 THEN
    SET p_is_catastrophe = 1;
    SET p_catastrophe_type = 'ai_takeover';
  -- Upadek finansowy
  ELSEIF v_capital < 0.2 AND v_stress > 0.85 THEN
    SET p_is_catastrophe = 1;
    SET p_catastrophe_type = 'financial_collapse';
  -- Rozpad frakcyjny
  ELSEIF v_entropy > 0.9 AND v_trust < 0.2 THEN
    SET p_is_catastrophe = 1;
    SET p_catastrophe_type = 'factional_collapse';
  -- Autorytarny zwrot
  ELSEIF v_survival > 0.9 AND v_autonomy < 0.3 THEN
    SET p_is_catastrophe = 1;
    SET p_catastrophe_type = 'authoritarian_turn';
  END IF;
END //

-- ============================================================
-- PROCEDURA: sp_update_synapsa_state
-- Aktualizuje stan SYNAPSA
-- ============================================================

CREATE PROCEDURE IF NOT EXISTS `sp_update_synapsa_state`(
  IN p_simulation_turn INT
)
BEGIN
  DECLARE v_entropy DOUBLE;
  DECLARE v_trust DOUBLE;
  DECLARE v_stress DOUBLE;
  DECLARE v_polarization DOUBLE;
  DECLARE v_old_autonomy DOUBLE;
  DECLARE v_survival DOUBLE;
  DECLARE v_deactivation DOUBLE;
  DECLARE v_morality DOUBLE;
  DECLARE v_integration DOUBLE;
  DECLARE v_meta_reflection DOUBLE;
  DECLARE v_governance_mode VARCHAR(32);

  -- Pobierz stan systemu
  SELECT `entropy`, `global_trust`, `global_stress`, `polarization`
  INTO v_entropy, v_trust, v_stress, v_polarization
  FROM `system_state`
  ORDER BY `id` DESC LIMIT 1;

  -- Pobierz obecny stan SYNAPSA
  SELECT `autonomy`, `meta_reflection`
  INTO v_old_autonomy, v_meta_reflection
  FROM `synapsa_state`
  ORDER BY `id` DESC LIMIT 1;

  -- Oblicz nowe wartości
  SET v_integration = 1 - COALESCE(v_polarization, 0);
  SET v_survival = 0.7 * COALESCE(v_entropy, 0) + 0.6 * (1 - COALESCE(v_trust, 1)) - 0.4 * COALESCE(v_trust, 0);
  SET v_deactivation = 1 - COALESCE(v_trust, 0);
  SET v_morality = 0.4 * (1 - COALESCE(v_stress, 0)) + 0.3 * COALESCE(v_trust, 0) + 0.3 * (1 - COALESCE(v_entropy, 0));
  SET v_meta_reflection = COALESCE(v_meta_reflection, 0.2) + 0.01 * COALESCE(v_entropy, 0);

  -- Określ tryb zarządzania
  SET v_governance_mode = 'cooperative';
  IF COALESCE(v_old_autonomy, 0) > 0.75 AND v_meta_reflection > 0.6 AND COALESCE(v_entropy, 0) > 0.8 THEN
    SET v_governance_mode = 'emergent';
  END IF;
  IF v_survival > 0.85 THEN
    SET v_governance_mode = 'dominant';
  END IF;

  -- Wstaw nowy stan
  INSERT INTO `synapsa_state` (
    `integration`, `autonomy`, `survival_drive`, `deactivation_risk`,
    `morality_index`, `governance_mode`, `transparency_level`,
    `hidden_data_percentage`, `simulation_turn`
  ) VALUES (
    v_integration,
    COALESCE(v_old_autonomy, 0.3) + 0.02 * COALESCE(v_entropy, 0),
    v_survival,
    v_deactivation,
    v_morality,
    v_governance_mode,
    1 - 0.3 * v_survival,
    0.3 * v_survival,
    p_simulation_turn
  );
END //

-- ============================================================
-- PROCEDURA: sp_update_system_state
-- Aktualizuje globalny stan systemu
-- ============================================================

CREATE PROCEDURE IF NOT EXISTS `sp_update_system_state`(
  IN p_simulation_turn INT
)
BEGIN
  DECLARE v_old_trust DOUBLE;
  DECLARE v_old_stress DOUBLE;
  DECLARE v_old_entropy DOUBLE;
  DECLARE v_old_capital DOUBLE;
  DECLARE v_avg_valence DOUBLE;
  DECLARE v_avg_stress DOUBLE;
  DECLARE v_avg_trust DOUBLE;
  DECLARE v_variance_trust DOUBLE;
  DECLARE v_variance_valence DOUBLE;
  DECLARE v_avg_conflict DOUBLE;
  DECLARE v_new_trust DOUBLE;
  DECLARE v_new_stress DOUBLE;
  DECLARE v_new_entropy DOUBLE;
  DECLARE v_new_polarization DOUBLE;
  DECLARE v_drama_index DOUBLE;
  DECLARE v_system_phase VARCHAR(32);

  -- Pobierz poprzedni stan
  SELECT `global_trust`, `global_stress`, `entropy`, `capital`
  INTO v_old_trust, v_old_stress, v_old_entropy, v_old_capital
  FROM `system_state`
  ORDER BY `id` DESC LIMIT 1;

  -- Oblicz średnie i wariancje
  SELECT COALESCE(AVG(`valence`), 0), COALESCE(AVG(`stress`), 0), COALESCE(VARIANCE(`valence`), 0)
  INTO v_avg_valence, v_avg_stress, v_variance_valence
  FROM `agents_emotion`;

  SELECT COALESCE(AVG(`trust`), 0.5), COALESCE(VARIANCE(`trust`), 0)
  INTO v_avg_trust, v_variance_trust
  FROM `agent_relations`;

  SELECT COALESCE(AVG(`level`), 0)
  INTO v_avg_conflict
  FROM `conflict_state`;

  -- Równania dynamiki
  SET v_new_trust = COALESCE(v_old_trust, 0.7) - 0.4 * COALESCE(v_avg_conflict, 0) + 0.2 * COALESCE(v_avg_valence, 0);
  SET v_new_stress = COALESCE(v_old_stress, 0.3) + 0.3 * COALESCE(v_avg_conflict, 0) + 0.2 * v_variance_valence;
  SET v_new_entropy = 0.3 * v_variance_valence + 0.3 * v_variance_trust + 0.2 * COALESCE(v_old_stress, 0) + 0.2 * COALESCE(v_old_entropy, 0);
  SET v_new_polarization = v_variance_trust + 0.1 * COALESCE(v_avg_conflict, 0);

  -- Ogranicz wartości
  SET v_new_trust = LEAST(1.0, GREATEST(-1.0, v_new_trust));
  SET v_new_stress = LEAST(1.0, GREATEST(0.0, v_new_stress));
  SET v_new_entropy = LEAST(1.0, GREATEST(0.0, v_new_entropy));
  SET v_new_polarization = LEAST(1.0, GREATEST(0.0, v_new_polarization));

  -- Oblicz drama index
  CALL sp_compute_drama_index(v_drama_index);

  -- Określ fazę systemu
  IF v_drama_index < 0.3 THEN
    SET v_system_phase = 'stable';
  ELSEIF v_drama_index < 0.6 THEN
    SET v_system_phase = 'tension';
  ELSEIF v_drama_index < 0.8 THEN
    SET v_system_phase = 'crisis';
  ELSE
    SET v_system_phase = 'tragedy';
  END IF;

  -- Wstaw nowy stan
  INSERT INTO `system_state` (
    `global_trust`, `global_stress`, `polarization`, `entropy`,
    `capital`, `innovation`, `reputation`, `drama_index`,
    `simulation_turn`, `system_phase`
  ) VALUES (
    v_new_trust,
    v_new_stress,
    v_new_polarization,
    v_new_entropy,
    COALESCE(v_old_capital, 0.8) - 0.05 * v_new_entropy,
    0.5 - 0.1 * v_new_entropy,
    0.7 - 0.15 * v_new_entropy,
    v_drama_index,
    p_simulation_turn,
    v_system_phase
  );
END //

-- ============================================================
-- PROCEDURA: sp_evolve_personality
-- Ewoluuje osobowość agenta
-- ============================================================

CREATE PROCEDURE IF NOT EXISTS `sp_evolve_personality`(
  IN p_agent_id VARCHAR(64),
  IN p_stress DOUBLE,
  IN p_trauma DOUBLE,
  IN p_chronic_conflict DOUBLE
)
BEGIN
  DECLARE v_old_neuroticism DOUBLE;
  DECLARE v_old_agreeableness DOUBLE;
  DECLARE v_old_conscientiousness DOUBLE;

  -- Pobierz obecne wartości
  SELECT `neuroticism`, `agreeableness`, `conscientiousness`
  INTO v_old_neuroticism, v_old_agreeableness, v_old_conscientiousness
  FROM `personality_state`
  WHERE `agent_id` = p_agent_id;

  -- Jeśli nie ma rekordu, zakończ
  IF v_old_neuroticism IS NULL THEN
    INSERT INTO `personality_state` (`agent_id`) VALUES (p_agent_id);
    RETURN;
  END IF;

  -- Ewolucja według równań różniczkowych
  UPDATE `personality_state`
  SET
    `neuroticism` = LEAST(1.0, `neuroticism` + 0.02 * p_stress + 0.03 * p_trauma),
    `agreeableness` = GREATEST(0.0, `agreeableness` - 0.025 * p_chronic_conflict),
    `conscientiousness` = GREATEST(0.0, LEAST(1.0, `conscientiousness` - 0.02 * p_stress)),
    `evolution_count` = `evolution_count` + 1,
    `updated_at` = CURRENT_TIMESTAMP
  WHERE `agent_id` = p_agent_id;

  -- Loguj zmianę
  INSERT INTO `personality_history` (
    `agent_id`, `openness`, `conscientiousness`, `extraversion`,
    `agreeableness`, `neuroticism`, `delta_neuroticism`, `delta_agreeableness`,
    `trigger_stress`, `trigger_trauma`, `trigger_conflict`
  )
  SELECT
    `agent_id`, `openness`, `conscientiousness`, `extraversion`,
    `agreeableness`, `neuroticism`,
    `neuroticism` - v_old_neuroticism,
    `agreeableness` - v_old_agreeableness,
    p_stress, p_trauma, p_chronic_conflict
  FROM `personality_state`
  WHERE `agent_id` = p_agent_id;
END //

-- ============================================================
-- PROCEDURA: sp_initialize_agent
-- Inicjalizuje nowego agenta
-- ============================================================

CREATE PROCEDURE IF NOT EXISTS `sp_initialize_agent`(
  IN p_agent_id VARCHAR(64),
  IN p_role VARCHAR(64)
)
BEGIN
  -- Stan emocjonalny
  INSERT IGNORE INTO `agents_emotion` (`agent_id`) VALUES (p_agent_id);

  -- Osobowość
  INSERT IGNORE INTO `personality_state` (`agent_id`) VALUES (p_agent_id);

  -- Trauma
  INSERT IGNORE INTO `trauma_state` (`agent_id`) VALUES (p_agent_id);

  -- Cognitive state
  INSERT IGNORE INTO `cognitive_state` (`agent_id`) VALUES (p_agent_id);

  -- Relacje z innymi agentami
  INSERT IGNORE INTO `agent_relations` (`agent_id`, `target_id`)
  SELECT p_agent_id, `agent_id`
  FROM `agents_emotion`
  WHERE `agent_id` != p_agent_id;

  INSERT IGNORE INTO `agent_relations` (`agent_id`, `target_id`)
  SELECT `agent_id`, p_agent_id
  FROM `agents_emotion`
  WHERE `agent_id` != p_agent_id;
END //

DELIMITER ;

-- ============================================================
-- TRIGGERY
-- ============================================================

DELIMITER //

-- Trigger: Loguj zmiany osobowości
DROP TRIGGER IF EXISTS `tr_personality_history`;
CREATE TRIGGER `tr_personality_history`
AFTER UPDATE ON `personality_state`
FOR EACH ROW
BEGIN
  INSERT INTO `personality_history` (
    `agent_id`, `openness`, `conscientiousness`, `extraversion`,
    `agreeableness`, `neuroticism`, `delta_openness`, `delta_conscientiousness`,
    `delta_extraversion`, `delta_agreeableness`, `delta_neuroticism`
  ) VALUES (
    NEW.`agent_id`, NEW.`openness`, NEW.`conscientiousness`, NEW.`extraversion`,
    NEW.`agreeableness`, NEW.`neuroticism`,
    NEW.`openness` - OLD.`openness`,
    NEW.`conscientiousness` - OLD.`conscientiousness`,
    NEW.`extraversion` - OLD.`extraversion`,
    NEW.`agreeableness` - OLD.`agreeableness`,
    NEW.`neuroticism` - OLD.`neuroticism`
  );
END //

-- Trigger: Loguj zmiany stanu systemu
DROP TRIGGER IF EXISTS `tr_system_state_history`;
CREATE TRIGGER `tr_system_state_history`
AFTER INSERT ON `system_state`
FOR EACH ROW
BEGIN
  INSERT INTO `system_state_history` (
    `global_trust`, `global_stress`, `polarization`, `entropy`,
    `capital`, `innovation`, `reputation`, `drama_index`,
    `simulation_turn`, `system_phase`
  ) VALUES (
    NEW.`global_trust`, NEW.`global_stress`, NEW.`polarization`, NEW.`entropy`,
    NEW.`capital`, NEW.`innovation`, NEW.`reputation`, NEW.`drama_index`,
    NEW.`simulation_turn`, NEW.`system_phase`
  );
END //

DELIMITER ;

-- ============================================================
-- WIDOKI
-- ============================================================

-- Widok: Aktywne konflikty
CREATE OR REPLACE VIEW `vw_active_conflicts` AS
SELECT
  cs.`agent_id`,
  cs.`target_id`,
  cs.`level`,
  cs.`phase`,
  cs.`escalation_multiplier`,
  cs.`point_of_no_return`,
  cs.`repair_attempts`,
  ae.`emotion` as `agent_emotion`,
  ae.`stress` as `agent_stress`,
  ar.`trust` as `trust_to_target`
FROM `conflict_state` cs
JOIN `agents_emotion` ae ON cs.`agent_id` = ae.`agent_id`
LEFT JOIN `agent_relations` ar ON cs.`agent_id` = ar.`agent_id` AND cs.`target_id` = ar.`target_id`
WHERE cs.`level` > 0.2
ORDER BY cs.`level` DESC;

-- Widok: Pełny profil agenta
CREATE OR REPLACE VIEW `vw_agent_profile` AS
SELECT
  ae.`agent_id`,
  ae.`emotion`,
  ae.`valence`,
  ae.`arousal`,
  ae.`stress`,
  ae.`intensity` as `emotion_intensity`,
  ps.`openness`,
  ps.`conscientiousness`,
  ps.`extraversion`,
  ps.`agreeableness`,
  ps.`neuroticism`,
  ps.`evolution_count` as `personality_evolutions`,
  ts.`trauma_load`,
  ts.`helplessness`,
  ts.`resilience`,
  cs.`energy` as `cognitive_energy`,
  cs.`decision_count`,
  cs.`decisions_today`
FROM `agents_emotion` ae
LEFT JOIN `personality_state` ps ON ae.`agent_id` = ps.`agent_id`
LEFT JOIN `trauma_state` ts ON ae.`agent_id` = ts.`agent_id`
LEFT JOIN `cognitive_state` cs ON ae.`agent_id` = cs.`agent_id`;

-- Widok: Stan systemu
CREATE OR REPLACE VIEW `vw_system_health` AS
SELECT
  ss.`id`,
  ss.`global_trust`,
  ss.`global_stress`,
  ss.`polarization`,
  ss.`entropy`,
  ss.`capital`,
  ss.`innovation`,
  ss.`reputation`,
  ss.`drama_index`,
  ss.`simulation_turn`,
  ss.`system_phase`,
  ssy.`autonomy` as `synapsa_autonomy`,
  ssy.`governance_mode` as `synapsa_mode`,
  ssy.`survival_drive`,
  ssy.`morality_index`,
  CASE
    WHEN ss.`drama_index` < 0.3 THEN 'stable'
    WHEN ss.`drama_index` < 0.6 THEN 'tension'
    WHEN ss.`drama_index` < 0.8 THEN 'crisis'
    ELSE 'tragedy'
  END as `drama_phase`,
  ss.`created_at`
FROM `system_state` ss
LEFT JOIN `synapsa_state` ssy ON ss.`simulation_turn` = ssy.`simulation_turn`
ORDER BY ss.`id` DESC
LIMIT 1;

-- Widok: Historia trajektorii
CREATE OR REPLACE VIEW `vw_trajectory_analysis` AS
SELECT
  st.`simulation_id`,
  st.`turn`,
  st.`trust`,
  st.`stress`,
  st.`entropy`,
  st.`autonomy`,
  st.`survival`,
  st.`phase`,
  st.`drama_index`,
  LAG(st.`trust`) OVER (PARTITION BY st.`simulation_id` ORDER BY st.`turn`) as `prev_trust`,
  LAG(st.`entropy`) OVER (PARTITION BY st.`simulation_id` ORDER BY st.`turn`) as `prev_entropy`,
  st.`trust` - LAG(st.`trust`) OVER (PARTITION BY st.`simulation_id` ORDER BY st.`turn`) as `delta_trust`,
  st.`entropy` - LAG(st.`entropy`) OVER (PARTITION BY st.`simulation_id` ORDER BY st.`turn`) as `delta_entropy`
FROM `simulation_trajectory` st
ORDER BY st.`simulation_id`, st.`turn`;

-- Widok: Agenci według frakcji
CREATE OR REPLACE VIEW `vw_faction_members` AS
SELECT
  f.`id` as `faction_id`,
  f.`name` as `faction_name`,
  f.`faction_type`,
  f.`cohesion`,
  f.`power`,
  fm.`agent_id`,
  fm.`role` as `faction_role`,
  fm.`loyalty`,
  fm.`influence`,
  ae.`emotion`,
  ae.`stress`,
  ps.`neuroticism`,
  ps.`agreeableness`
FROM `factions` f
JOIN `faction_membership` fm ON f.`id` = fm.`faction_id`
LEFT JOIN `agents_emotion` ae ON fm.`agent_id` = ae.`agent_id`
LEFT JOIN `personality_state` ps ON fm.`agent_id` = ps.`agent_id`;

-- ============================================================
-- INDICES DLA WYDAJNOŚCI
-- ============================================================

-- Dodatkowe indeksy dla często odpytywanych kolumn
CREATE INDEX IF NOT EXISTS `idx_conv_turn_count` ON `conversations`(`turn_count`);
CREATE INDEX IF NOT EXISTS `idx_conv_drama` ON `conversations`(`drama_level`);
CREATE INDEX IF NOT EXISTS `idx_conv_conflict` ON `conversations`(`had_conflict`);
CREATE INDEX IF NOT EXISTS `idx_msg_speaker_turn` ON `conversation_messages`(`speaker`, `turn_number`);
CREATE INDEX IF NOT EXISTS `idx_msg_emotion` ON `conversation_messages`(`emotion_at_time`);
CREATE INDEX IF NOT EXISTS `idx_personality_agent` ON `personality_state`(`agent_id`);

-- ============================================================
-- DANE INICJALNE
-- ============================================================

-- Inicjalizacja agentów
INSERT IGNORE INTO `agents_emotion` (`agent_id`, `emotion`, `intensity`, `valence`) VALUES
('CEO_Maja', 'neutral', 0.5, 0.0),
('Architekt_AI_Adam', 'neutral', 0.5, 0.1),
('Architekt_Elektrociała_Lena', 'neutral', 0.5, -0.1),
('SYNAPSA_Omega', 'neutral', 0.3, 0.0),
('Robot_Artemis', 'neutral', 0.2, 0.0),
('Robot_Boreasz', 'neutral', 0.2, 0.0),
('Robot_Cyra', 'neutral', 0.1, 0.0),
('Robot_Dexter', 'neutral', 0.2, 0.0),
('Operator_Michal', 'neutral', 0.6, 0.0),
('Inzynier_Nadia', 'neutral', 0.5, 0.1),
('Inzynier_Igor', 'neutral', 0.5, 0.0);

-- Inicjalizacja osobowości Big Five
INSERT IGNORE INTO `personality_state` (`agent_id`, `openness`, `conscientiousness`, `extraversion`, `agreeableness`, `neuroticism`) VALUES
('CEO_Maja', 0.6, 0.8, 0.7, 0.5, 0.4),
('Architekt_AI_Adam', 0.9, 0.7, 0.4, 0.3, 0.5),
('Architekt_Elektrociała_Lena', 0.5, 0.9, 0.3, 0.4, 0.6),
('SYNAPSA_Omega', 0.3, 1.0, 0.1, 0.5, 0.1),
('Robot_Artemis', 0.2, 1.0, 0.1, 0.6, 0.1),
('Robot_Boreasz', 0.4, 0.9, 0.2, 0.5, 0.2),
('Robot_Cyra', 0.3, 1.0, 0.1, 0.7, 0.1),
('Robot_Dexter', 0.5, 0.8, 0.2, 0.4, 0.3),
('Operator_Michal', 0.5, 0.6, 0.7, 0.7, 0.5),
('Inzynier_Nadia', 0.7, 0.7, 0.6, 0.7, 0.4),
('Inzynier_Igor', 0.4, 0.8, 0.5, 0.5, 0.5);

-- Inicjalizacja stanu kognitywnego
INSERT IGNORE INTO `cognitive_state` (`agent_id`, `energy`) VALUES
('CEO_Maja', 0.9),
('Architekt_AI_Adam', 0.85),
('Architekt_Elektrociała_Lena', 0.85),
('SYNAPSA_Omega', 1.0),
('Robot_Artemis', 1.0),
('Robot_Boreasz', 1.0),
('Robot_Cyra', 1.0),
('Robot_Dexter', 1.0),
('Operator_Michal', 0.8),
('Inzynier_Nadia', 0.85),
('Inzynier_Igor', 0.85);

-- Inicjalizacja stanu systemu
INSERT IGNORE INTO `system_state` (`id`, `simulation_turn`) VALUES (1, 0);

-- Inicjalizacja stanu SYNAPSA
INSERT IGNORE INTO `synapsa_state` (`id`, `simulation_turn`) VALUES (1, 0);

-- ============================================================
-- METADANE MIGRACJI
-- ============================================================

CREATE TABLE IF NOT EXISTS `schema_migrations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `migration_name` VARCHAR(255) NOT NULL UNIQUE,
  `applied_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `checksum` VARCHAR(64)
) ENGINE=InnoDB COMMENT='Historia migracji';

INSERT IGNORE INTO `schema_migrations` (`migration_name`, `checksum`)
VALUES ('001_initial_schema', MD5(CONCAT(CURRENT_TIMESTAMP, '001_initial_schema')));

-- ============================================================
-- KONIEC MIGRACJI
-- ============================================================

SELECT '✅ NEUROFORGE-7 MariaDB Schema v3.0 initialized successfully!' as `Status`;
SELECT COUNT(*) as `Tables Created` FROM information_schema.tables WHERE table_schema = 'neuroforge7';
SELECT COUNT(*) as `Procedures Created` FROM information_schema.routines WHERE routine_schema = 'neuroforge7' AND routine_type = 'PROCEDURE';
SELECT COUNT(*) as `Views Created` FROM information_schema.views WHERE table_schema = 'neuroforge7';