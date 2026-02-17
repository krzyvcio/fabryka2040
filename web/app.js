// app.js – NEUROFORGE-7 Web UI Interaction Logic

const API_BASE = "/api";

let currentConversationId = null;
let allConversations = [];

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  refreshConversations();
  setupSearchFilter();

  // Auto-refresh every 5 seconds
  setInterval(refreshConversations, 5000);
});

async function refreshConversations() {
  try {
    const response = await fetch(`${API_BASE}/conversations?limit=100`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);

    allConversations = await response.json();
    renderConversationsList(allConversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    document.getElementById("conversationsList").innerHTML =
      `<div class="error">Error loading conversations: ${error.message}</div>`;
  }
}

function renderConversationsList(conversations) {
  const container = document.getElementById("conversationsList");

  if (!conversations || conversations.length === 0) {
    container.innerHTML = '<div class="empty-state">No conversations yet</div>';
    return;
  }

  container.innerHTML = conversations
    .map((conv) => {
      const date = new Date(conv.start_time);
      const timeStr = date.toLocaleString("pl-PL");
      const participants = conv.participants ? JSON.parse(conv.participants) : [];
      const emotionColor =
        conv.average_valence > 0.5
          ? "success"
          : conv.average_valence < -0.5
            ? "danger"
            : "neutral";

      return `
        <div class="conversation-item ${currentConversationId === conv.id ? "active" : ""}" 
             onclick="selectConversation('${conv.id}')">
          <div class="conversation-title">📌 Day ${conv.day}: ${conv.topic}</div>
          <div class="conversation-meta">
            ${timeStr.split(" ")[0]} • ${conv.initiator}
          </div>
          <div class="conversation-stats">
            <span class="stat-badge">🔄 Turns: ${conv.turn_count || 0}</span>
            <span class="stat-badge ${emotionColor}">💭 Valence: ${
        conv.average_valence ? conv.average_valence.toFixed(2) : "N/A"
      }</span>
            ${conv.had_conflict ? '<span class="stat-badge">⚡ Conflict</span>' : ""}
          </div>
        </div>
      `;
    })
    .join("");
}

async function selectConversation(conversationId) {
  currentConversationId = conversationId;

  // Update active state
  document.querySelectorAll(".conversation-item").forEach((el) => {
    el.classList.remove("active");
  });
  event?.target?.closest(".conversation-item")?.classList.add("active");

  // Fetch and render conversation details
  try {
    const response = await fetch(`${API_BASE}/conversations/${conversationId}`);
    if (!response.ok) throw new Error(`Failed to fetch conversation`);

    const data = await response.json();
    const { conversation, messages, context } = data;

    renderChatMessages(messages);
    renderContext(context, conversation);
  } catch (error) {
    console.error("Error loading conversation details:", error);
    document.getElementById("chatViewContainer").innerHTML =
      `<div class="error">Error loading conversation details</div>`;
  }
}

function renderChatMessages(messages) {
  const container = document.getElementById("chatViewContainer");

  if (!messages || messages.length === 0) {
    container.innerHTML = '<div class="empty-state">No messages in this conversation</div>';
    return;
  }

  const messagesHTML = messages
    .map((msg) => {
      const emotionClass = `emotion-${msg.emotion_at_time?.toLowerCase() || "neutral"}`;
      const hasConflict = msg.emotion_at_time === "angry" || msg.emotion_at_time === "frustrated";

      return `
        <div class="message-item ${hasConflict ? "conflict-message" : ""}" 
             onclick="showMessageDetails(this, ${JSON.stringify(msg).replace(/"/g, "&quot;")})">
          <div class="message-header">
            <div>
              <span class="message-speaker">${msg.speaker}</span>
              <span class="message-turn">#${msg.turn_number}</span>
            </div>
            <div class="message-target">
              ${msg.target_agent ? `→ ${msg.target_agent}` : ""}
            </div>
          </div>
          
          <div class="message-content">
            ${msg.content.substring(0, 150)}${msg.content.length > 150 ? "..." : ""}
          </div>

          <div class="message-emotion">
            <div class="emotion-stat">
              <span class="emotion-label">Emotion</span>
              <span class="emotion-indicator ${emotionClass}">
                ${msg.emotion_at_time || "neutral"}
              </span>
            </div>
            <div class="emotion-stat">
              <span class="emotion-label">Valence</span>
              <span class="emotion-value">${(msg.valence_at_time || 0).toFixed(2)}</span>
            </div>
            <div class="emotion-stat">
              <span class="emotion-label">Arousal</span>
              <span class="emotion-value">${(msg.arousal_at_time || 0).toFixed(2)}</span>
            </div>
            <div class="emotion-stat">
              <span class="emotion-label">Stress</span>
              <span class="emotion-value">${(msg.stress_at_time || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  container.innerHTML = `<div class="messages-list">${messagesHTML}</div>`;
}

function renderContext(context, conversation) {
  const container = document.getElementById("contextContent");

  if (!context) {
    container.innerHTML = `
      <div class="context-section">
        <h4>Conversation Summary</h4>
        <div class="context-text">
          ${conversation.summary || "No summary available"}
        </div>
      </div>
      <div class="context-section">
        <h4>Statistics</h4>
        <div class="context-text">
          <strong>Turns:</strong> ${conversation.turn_count}<br>
          <strong>Average Valence:</strong> ${(conversation.average_valence || 0).toFixed(2)}<br>
          <strong>Average Stress:</strong> ${(conversation.average_stress || 0).toFixed(2)}<br>
          <strong>Had Conflict:</strong> ${conversation.had_conflict ? "Yes ⚠️" : "No ✓"}
        </div>
      </div>
    `;
    return;
  }

  const precedingEvents = context.preceding_events
    ? JSON.parse(context.preceding_events)
    : [];
  const groupMood = context.group_mood_at_start || {};
  const unresolvedConflicts = context.unresolved_conflicts
    ? JSON.parse(context.unresolved_conflicts)
    : [];

  let html = "";

  if (precedingEvents.length > 0) {
    html += `
      <div class="context-section">
        <h4>📋 Preceding Events</h4>
        <div class="context-text">
          ${precedingEvents.map((e) => `• ${e}`).join("<br>")}
        </div>
      </div>
    `;
  }

  html += `
    <div class="context-section">
      <h4>💭 Group Mood at Start</h4>
      <div class="context-text">
        Average Valence: ${(groupMood.avg_valence || 0).toFixed(2)}<br>
        Average Stress: ${(groupMood.avg_stress || 0).toFixed(2)}<br>
        Group Arousal: ${(groupMood.avg_arousal || 0).toFixed(2)}
      </div>
    </div>
  `;

  if (unresolvedConflicts.length > 0) {
    html += `
      <div class="context-section">
        <h4>⚡ Unresolved Conflicts</h4>
        <div class="context-text">
          ${unresolvedConflicts.map((c) => `• ${c.agent}: "${c.reason}"`).join("<br>")}
        </div>
      </div>
    `;
  }

  html += `
    <div class="context-section">
      <h4>📊 Conversation Stats</h4>
      <div class="context-text">
        <strong>Turns:</strong> ${conversation.turn_count}<br>
        <strong>Avg Valence:</strong> ${(conversation.average_valence || 0).toFixed(2)}<br>
        <strong>Avg Stress:</strong> ${(conversation.average_stress || 0).toFixed(2)}<br>
        <strong>Conflict:</strong> ${conversation.had_conflict ? "Yes ⚠️" : "No ✓"}
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function showMessageDetails(element, message) {
  const modal = document.getElementById("messageModal");
  const modalTitle = document.getElementById("messageModalTitle");
  const modalBody = document.getElementById("messageModalBody");

  const timestamp = new Date(message.timestamp).toLocaleString("pl-PL");

  modalTitle.textContent = `${message.speaker} → ${message.target_agent || "Group"}`;

  modalBody.innerHTML = `
    <p><strong>Turn:</strong> ${message.turn_number}</p>
    <p><strong>Time:</strong> ${timestamp}</p>
    <p><strong>Speaker:</strong> ${message.speaker}</p>
    <p><strong>Target:</strong> ${message.target_agent || "Group discussion"}</p>
    
    <hr style="border-color: rgba(255,255,255,0.1); margin: 15px 0;">
    
    <p><strong>Full Message:</strong></p>
    <p style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px; line-height: 1.6;">
      ${message.content}
    </p>
    
    <hr style="border-color: rgba(255,255,255,0.1); margin: 15px 0;">
    
    <p><strong>Emotional State at Time:</strong></p>
    <ul style="margin-left: 20px; margin-top: 8px;">
      <li>Emotion: <span style="color: #00d4ff;">${message.emotion_at_time}</span></li>
      <li>Valence: <span style="color: #ff006e;">${(message.valence_at_time || 0).toFixed(3)}</span></li>
      <li>Arousal: <span style="color: #8338ec;">${(message.arousal_at_time || 0).toFixed(3)}</span></li>
      <li>Stress: <span style="color: #ffa500;">${(message.stress_at_time || 0).toFixed(3)}</span></li>
    </ul>
  `;

  modal.classList.add("show");
}

function closeMessageModal() {
  document.getElementById("messageModal").classList.remove("show");
}

// Close modal when clicking outside
document.addEventListener("click", (e) => {
  const modal = document.getElementById("messageModal");
  if (e.target === modal) {
    closeMessageModal();
  }
});

function setupSearchFilter() {
  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = allConversations.filter((conv) => {
      return (
        conv.topic.toLowerCase().includes(query) ||
        conv.scenario?.toLowerCase().includes(query) ||
        conv.initiator.toLowerCase().includes(query)
      );
    });
    renderConversationsList(filtered);
  });
}
