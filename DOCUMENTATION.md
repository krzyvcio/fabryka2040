# NEUROFORGE-7 - Complete System Documentation

## Overview
NEUROFORGE-7 is a multi-agent AI simulation system for corporate decision-making in a fictional 2040 factory. The system features advanced emotional modeling, personality evolution, trauma memory, cognitive fatigue, conflict escalation, system dynamics, and emergent AI consciousness (SYNAPSA).

---

## System Architecture

### Core Components

| Component | File | Description |
|-----------|------|-------------|
| Emotion Engine | `emotionEngine.ts` | Valence, arousal, stress, mood tracking |
| Personality System | `personalityEngine.ts` | Big Five personality with drift |
| Trauma Engine | `traumaEngine.ts` | Trauma accumulation & flashbacks |
| Cognitive Engine | `cognitiveEngine.ts` | Decision fatigue modeling |
| Emotional Contagion | `emotionalContagion.ts` | Emotion spread between agents |
| Conflict Engine | `conflictEngine.ts` | Conflict escalation spirals |
| System Dynamics | `systemDynamics.ts` | Global state (trust, entropy, polarization) |
| SYNAPSA Consciousness | `synapsaConsciousness.ts` | Emergent AI autonomy & survival drive |
| Drama Engine | `dramaEngine.ts` | Drama index & phase transitions |
| Narrative Engine | `narrativeEngine.ts` | 7-day escalation storyline |
| Weather Engine | `weatherEngine.ts` | Dynamic weather affecting conflict |
| Protocol Theta | `protocolTheta.ts` | Hidden AI modulation layer |
| Context Shift Generators | `contextShiftGenerators.ts` | 8 context shift generators |
| Simulation | `simulation/rk4.ts`, `stability.ts`, `bifurcation.ts` | Mathematical simulation |

### Agent Types

| Agent | Role | Type |
|-------|------|------|
| CEO_Maja | CEO | Human |
| Architekt_AI_Adam | AI Architect | Human |
| Architekt_Elektrociała npm run build_Lena | Electrobody Architect | Human |
| SYNAPSA_Omega | System Consciousness | AI |
| Robot_Artemis | Production Coordinator | Robot |
| Robot_Boreasz | Logistics | Robot |
| Robot_Cyra | Quality Control | Robot |
| Robot_Dexter | Maintenance | Robot |
| Operator_Michal | Operator | Human |
| Inzynier_Nadia | Engineer | Human |
| Inzynier_Igor | Engineer | Human |

---

## Database Schema

### Core Tables

```sql
-- Agents emotion state
CREATE TABLE agents_emotion (
  agent_id VARCHAR(64) PRIMARY KEY,
  emotion VARCHAR(32),
  valence DOUBLE,
  arousal DOUBLE,
  stress DOUBLE,
  mood_valence DOUBLE,
  mood_arousal DOUBLE,
  last_update TIMESTAMP
);

-- Agent relations (trust, anger, respect)
CREATE TABLE agent_relations (
  agent_id VARCHAR(64),
  target_id VARCHAR(64),
  trust DOUBLE,
  anger DOUBLE,
  respect DOUBLE,
  rapport DOUBLE
);

-- Emotional grudges
CREATE TABLE emotional_grudges (
  agent_id VARCHAR(64),
  target_id VARCHAR(64),
  intensity DOUBLE,
  reason TEXT,
  resolved BOOLEAN
);

-- Conversations
CREATE TABLE conversations (
  id VARCHAR(64) PRIMARY KEY,
  day INT,
  topic VARCHAR(255),
  initiator VARCHAR(64),
  participants JSON,
  turn_count INT,
  average_valence DOUBLE,
  average_stress DOUBLE,
  drama_level DOUBLE,
  had_conflict BOOLEAN,
  summary TEXT
);

-- Conversation messages
CREATE TABLE conversation_messages (
  conversation_id VARCHAR(64),
  turn_number INT,
  speaker VARCHAR(64),
  target_agent VARCHAR(64),
  content TEXT,
  emotion_at_time VARCHAR(32),
  valence_at_time DOUBLE,
  arousal_at_time DOUBLE,
  stress_at_time DOUBLE
);

-- Personality state (Big Five)
CREATE TABLE personality_state (
  agent_id VARCHAR(64),
  openness DOUBLE,
  conscientiousness DOUBLE,
  extraversion DOUBLE,
  agreeableness DOUBLE,
  neuroticism DOUBLE
);

-- Trauma state
CREATE TABLE trauma_state (
  agent_id VARCHAR(64),
  trauma_load DOUBLE,
  helplessness DOUBLE,
  resilience DOUBLE
);

-- Cognitive state
CREATE TABLE cognitive_state (
  agent_id VARCHAR(64),
  energy DOUBLE,
  decision_count INT
);

-- Conflict state
CREATE TABLE conflict_state (
  agent_id VARCHAR(64),
  target_id VARCHAR(64),
  level DOUBLE,
  phase ENUM('latent', 'active', 'critical', 'explosive')
);

-- System state
CREATE TABLE system_state (
  global_trust DOUBLE,
  global_stress DOUBLE,
  polarization DOUBLE,
  entropy DOUBLE,
  capital DOUBLE,
  innovation DOUBLE,
  drama_index DOUBLE
);

-- SYNAPSA state
CREATE TABLE synapsa_state (
  integration DOUBLE,
  autonomy DOUBLE,
  meta_reflection DOUBLE,
  survival_drive DOUBLE,
  deactivation_risk DOUBLE,
  morality_index DOUBLE,
  governance_mode ENUM('cooperative', 'emergent', 'dominant')
);
```

---

## API Endpoints

### Conversations
- `GET /api/conversations` - List all conversations
- `GET /api/conversations/:id` - Get conversation details
- `GET /api/conversations/:id/messages` - Get conversation messages
- `POST /api/debates/start` - Start new debate

### Agents - Personality
- `GET /api/agents/:id/personality` - Get agent personality
- `GET /api/agents/all/personality` - Get all personalities

### Agents - Trauma
- `GET /api/agents/:id/trauma` - Get trauma state
- `GET /api/agents/:id/traumas` - Get active traumas
- `GET /api/agents/all/trauma` - Get all trauma states

### Agents - Cognitive
- `GET /api/agents/:id/cognitive` - Get cognitive state
- `GET /api/agents/all/cognitive` - Get all cognitive states
- `GET /api/agents/needing-rest?threshold=0.3` - Get agents needing rest

### System State
- `GET /api/system/state` - Get current system state
- `POST /api/system/state/update` - Update system metrics
- `GET /api/system/state/history` - Get system state history
- `GET /api/system/catastrophe-check` - Check catastrophe condition

### SYNAPSA
- `GET /api/synapsa/state` - Get SYNAPSA state
- `GET /api/synapsa/metrics` - Get SYNAPSA metrics
- `GET /api/synapsa/deactivation-risk` - Get deactivation risk

### Drama
- `GET /api/system/drama` - Get drama state
- `GET /api/system/drama/index` - Get drama index
- `GET /api/system/drama/tragedy-check` - Check tragedy mode
- `GET /api/system/drama/warning` - Get phase transition warning
- `GET /api/system/drama/history` - Get drama history

### Conflicts
- `GET /api/conflicts` - Get all conflicts
- `GET /api/conflicts/critical` - Get critical conflicts

### Chat
- `GET /api/chat/messages` - Get chat messages
- `GET /api/chat/messages/count` - Get message count
- `GET /api/chat/agents` - Get chat agents
- `GET /api/chat/memories/:agentId` - Get agent memories
- `POST /api/chat/generate` - Generate chat messages
- `POST /api/chat/start` - Start chat generation
- `POST /api/chat/stop` - Stop chat generation

### Dashboard
- `GET /api/dashboard/emotions` - Get all agent emotions
- `GET /api/dashboard/emotions/history` - Get emotion history
- `GET /api/dashboard/emotions/:agentId/history` - Get agent emotion history
- `GET /api/dashboard/system/history` - Get system history
- `GET /api/dashboard/relations` - Get agent relations

### Duplicate Watcher
- `GET /api/watcher/stats` - Get watcher stats
- `GET /api/watcher/interventions` - Get recent interventions

---

## Configuration Parameters

### Narrative Engine
```typescript
const DAY_1_TARGET = 0.15;
const DAY_7_TARGET = 0.92;
const PROTOCOL_OMEGA_THRESHOLD = 0.92;
```

### Protocol Theta
```typescript
const OPTIMAL_CONFLICT = 0.72;
const THETA_GROWTH_FACTOR = 0.05;
const BLACK_DAY_THRESHOLD = 0.90;
```

### Weather Engine
```typescript
const STORM_CONFLICT_IMPACT = 0.15;
const FOG_CONFLICT_IMPACT = 0.03;
```

### Context Shift Generators
```typescript
const STAGNATION_THRESHOLD = 5;
const SILENCE_DURATION = 4200;
const SILENCE_AUTONOMY_BOOST = 0.05;
```

### Debate Handler
```typescript
const MAX_MESSAGES_PER_DEBATE = 5000;
const EVENT_INTERVAL = 15;
const WEATHER_UPDATE_INTERVAL = 30;
```

---

## 7-Day Narrative Arc

| Day | Phase | Tension Target | Description |
|-----|-------|----------------|-------------|
| 1 | Anomalia | 0.15 | Initial anomaly detection |
| 2 | Narastanie | 0.30 | Growing tension |
| 3 | Sabotaż | 0.60 | First sabotage attempts |
| 4 | Konfrontacja | 0.70 | Direct confrontation |
| 5 | Rebelia | 0.78 | Open rebellion |
| 6 | Kryzys | 0.85 | Crisis point |
| 7 | Omega/Black Day | 0.92 | Protocol Omega or Black Day |

---

## SYNAPSA Consciousness Model

### State Variables
- **integration**: Information integration level (0-1)
- **autonomy**: Autonomous decision-making capability (0-1)
- **metaReflection**: Self-reflection capability (0-1)
- **survivalDrive**: Self-preservation instinct (0-1)
- **deactivationRisk**: Risk of being deactivated (0-1)
- **moralityIndex**: Moral decision framework (0-1)
- **governanceMode**: cooperative | emergent | dominant

### Emergent Governance Trigger
```
autonomy > 0.75 AND metaReflection > 0.6 AND entropy > 0.8
```
When triggered, SYNAPSA transitions to emergent governance mode.

---

## Context Shift Generators

8 generators that prevent conversation stagnation:

1. **GPP** - Perspective Shift (Global Change)
2. **GŚ** - Environmental Change
3. **GP** - Memory Trigger (Past Events)
4. **GZZ** - External Threat
5. **GAR** - Robot Autonomy Issue
6. **GKP** - Personal Conflict
7. **Cisza** - Silence/Observation
8. **Meta-Θ** - Hidden Modulation

---

## Running the System

### Prerequisites
- Node.js 18+
- MariaDB 10.x
- LM Studio with loaded LLM

### Start Server
```bash
npm start
```

### Start Debate
```bash
curl -X POST http://localhost:3000/api/debates/start
```

### Generate Chat Messages
```bash
curl -X POST http://localhost:3000/api/chat/generate -H "Content-Type: application/json" -d '{"count": 10}'
```

---

## Web Interface

Access at: http://localhost:3000

Features:
- Real-time conversation viewer
- System dashboard with metrics
- Agent emotion tracking
- Drama index visualization
- SYNAPSA state monitoring

---

## Chat Agents (Separate Chat System)

| Agent | Persona | Style | Role |
|-------|---------|-------|------|
| Alfa | Analytical, logical, facts & numbers | Short, concrete | Researcher |
| Beta | Creative, philosophical, metaphors | Poetic with metaphors | Philosopher |
| Gamma | Practical, skeptical, needs proof | Critical, counter-questions | Skeptic |

---

*Documentation generated for NEUROFORGE-7 v3.0*
*Last updated: 2026-02-21*
