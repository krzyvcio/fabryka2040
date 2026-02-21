// speakerSelector.ts – Intelligent speaker selection based on emotions
import { getConnection } from "./db.js";
import { getEmotionalState, calculateGroupAffect } from "./emotionEngine.js";

const AGENTS = [
  "CEO_Maja",
  "Architekt_AI_Adam",
  "Architekt_Elektrociała_Lena",
  "SYNAPSA_Omega",
  "Robot_Artemis",
  "Robot_Boreasz",
  "Robot_Cyra",
  "Robot_Dexter",
  "Operator_Michal",
  "Inzynier_Nadia",
  "Inzynier_Igor",
  "Kierownik_Marek",
  "Inż_Helena",
  "Dr_Piotr_Materiały",
  "Pracownik_Tomek",
  "SYNAPSA_System",
];

export async function getAddressedAgent(message: string): Promise<string | null> {
  const regex = new RegExp(`^\\s*(${AGENTS.join("|")})[,:]?`, "i");
  const match = message.match(regex);
  
  if (match && match[1]) {
    for (const agentName of AGENTS) {
      if (agentName.toLowerCase() === match[1].toLowerCase()) {
        return agentName;
      }
    }
  }
  return null;
}

export async function selectNextSpeakerBasedOnEmotion(
  currentSpeaker: string,
  lastMessage: string
): Promise<string> {
  // First try to get directly addressed agent
  const addressed = await getAddressedAgent(lastMessage);
  if (addressed && addressed !== currentSpeaker) {
    return addressed;
  }

  // If no direct address, select based on emotional activation
  const groupAffect = await calculateGroupAffect();
  const candidates = AGENTS.filter((a) => a !== currentSpeaker);
  
  let selectedAgent: string = AGENTS[Math.floor(Math.random() * AGENTS.length)]!; // Default fallback
  let maxScore = -Infinity;

  for (const agent of candidates) {
    const state = await getEmotionalState(agent);
    
    // Score based on emotional activation and stress
    let score = state.arousal * 0.7 + state.stress * 0.6;
    
    // If group is very stressed, prefer higher-stress agents to escalate
    if (groupAffect.avg_stress > 0.7) {
      score += state.stress * 1.5;
    }
    
    // Prefer agents with strong opinions (high valence deviation)
    score += Math.abs(state.valence) * 0.5;
    
    // Add some randomness to prevent predictability
    score += Math.random() * 0.2;

    if (score > maxScore) {
      maxScore = score;
      selectedAgent = agent;
    }
  }

  return selectedAgent;
}

export async function shouldEndDay(turnCount: number, groupAffect: { avg_stress: number }): Promise<boolean> {
  // End if avg stress is critical
  if (groupAffect.avg_stress > 0.9) {
    console.log("⚠️ Group stress critical - ending day");
    return true;
  }

  // CEO or SYNAPSA could signal end naturally via message content
  return false;
}

export function getAgentList(): string[] {
  return AGENTS;
}
