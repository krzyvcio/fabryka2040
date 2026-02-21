// app.js – NEUROFORGE-7 Web UI Interaction Logic

const API_BASE = "/api";

let currentConversationId = null;
let allConversations = [];
let debateStartTime = null;
let isConversationListLocked = false;
let debateInProgress = false;

document.addEventListener("DOMContentLoaded", () => {
  debateStartTime = Date.now();
  isConversationListLocked = false; // Odblokowane od początku

  // Załaduj aktywną debatę od razu
  refreshConversations().then(() => {
    const activeDebate = allConversations[0]; // Najnowsza debata
    if (activeDebate) {
      loadActiveDebateImmediate(activeDebate.id);
    }
  });

  refreshChatMessages();
  setupSearchFilter();
  setupStartAgentsButton();
  updateTime();

  // Timer wyłączony - archiwum zawsze odblokowane
  // startLockdownTimer(15 * 60);

  setInterval(updateTime, 1000);
  setInterval(refreshConversations, 5000);
  setInterval(refreshChatMessages, 3000);
  setInterval(updateSystemDashboard, 5000);
  initEffects();
  initSystemDashboard();
});

// Chat pagination state
let chatMessages = [];
let chatOffset = 0;
let chatHasMore = true;
let chatLoading = false;

async function refreshChatMessages() {
  try {
    const statusRes = await fetch(`${API_BASE}/chat/status`);
    if (!statusRes.ok) return;
    
    const status = await statusRes.json();
    const totalCount = status.count;
    
    // Check if new messages exist
    const messagesRes = await fetch(`${API_BASE}/chat/messages?limit=30&offset=0`);
    if (!messagesRes.ok) return;
    
    const messages = await messagesRes.json();
    
    // Only update if there are new messages
    if (messages.length !== chatMessages.length) {
      chatMessages = messages;
      chatOffset = messages.length;
      chatHasMore = messages.length >= 30 && messages.length < totalCount;
      renderChatMessages(messages, totalCount);
    }
  } catch (e) {
    // Silently fail
  }
}

async function loadMoreChatMessages() {
  if (chatLoading || !chatHasMore) return;
  
  chatLoading = true;
  try {
    const statusRes = await fetch(`${API_BASE}/chat/status`);
    const status = await statusRes.json();
    const totalCount = status.count;
    
    const messagesRes = await fetch(`${API_BASE}/chat/messages?limit=30&offset=${chatOffset}`);
    const messages = await messagesRes.json();
    
    if (messages.length > 0) {
      chatMessages = [...messages.reverse(), ...chatMessages];
      chatOffset += messages.length;
      chatHasMore = chatOffset < totalCount;
      renderChatMessages(chatMessages, totalCount, true);
    }
  } catch (e) {
    console.error("Error loading more messages:", e);
  } finally {
    chatLoading = false;
  }
}

function renderChatMessages(messages, totalCount, prepend = false) {
  const container = document.getElementById("chatViewContainer");
  if (!container) return;
  
  const chatMessagesEl = container.querySelector(".chat-messages");
  
  if (!messages || messages.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💬</div>
        <div class="empty-title">BRAK WIADOMOŚCI</div>
        <div class="empty-subtitle">Uruchom generator czatu</div>
      </div>`;
    return;
  }
  
  const chatHtml = messages.map(msg => `
    <div class="message-item" data-agent="${msg.agent_id}">
      <div class="message-header">
        <span class="message-agent">${msg.agent_name || msg.agent_id}</span>
        <span class="message-turn">#${msg.turn_number}</span>
      </div>
      <div class="message-content">${msg.content}</div>
    </div>
  `).join("");
  
  if (prepend && chatMessagesEl) {
    chatMessagesEl.innerHTML = chatHtml + chatMessagesEl.innerHTML;
  } else {
    container.innerHTML = `
      <div class="chat-messages" id="chatMessagesList">
        ${chatHtml}
        ${chatHasMore ? '<div id="loadMoreTrigger" class="load-more-trigger">⬆ Załaduj wcześniejsze wiadomości</div>' : ''}
      </div>
      <div class="chat-status">Łącznie: ${totalCount} wiadomości</div>
    `;
    
    // Setup infinite scroll
    const trigger = document.getElementById("loadMoreTrigger");
    if (trigger) {
      trigger.addEventListener("click", loadMoreChatMessages);
    }
    
    const chatList = document.getElementById("chatMessagesList");
    if (chatList) {
      chatList.addEventListener("scroll", () => {
        if (chatList.scrollTop < 50) {
          loadMoreChatMessages();
        }
      });
    }
  }
  
  const chatBadge = document.getElementById("conversationCount");
  if (chatBadge) chatBadge.textContent = totalCount;
}

/**
 * Timer blokady: Odblokuj listę rozmów po N sekund
 */
function startLockdownTimer(seconds) {
  let remaining = seconds;

  const updateLockNotice = () => {
    const lockNotice = document.querySelector('[style*="rgba(255, 45, 106"]');
    if (lockNotice && remaining > 0) {
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      lockNotice.innerHTML = `🔒 ARCHIWUM ZABLOKOWANE<br><span style="font-size: 10px;">${mins}:${secs.toString().padStart(2, '0')} do odblokowania</span>`;
    }
  };

  const timer = setInterval(() => {
    remaining--;
    updateLockNotice();

    if (remaining <= 0) {
      clearInterval(timer);
      isConversationListLocked = false;
      console.log("✅ Archiwum Dyskursów odblokowane!");

      // Odśwież listę bez blokady
      refreshConversations();

      // Pokaż powiadomienie
      showDebateNotification("✅ ARCHIWUM DYSKURSÓW ODBLOKOWANE - Możesz teraz przeglądać inne debaty", "success");
    }
  }, 1000);

  updateLockNotice(); // Inicjalna aktualizacja
}

function initSystemDashboard() {
  const dashboardTab = document.getElementById("dashboardTab");
  if (dashboardTab) {
    dashboardTab.addEventListener("click", () => toggleDashboard());
  }
  updateSystemDashboard();
}

async function updateSystemDashboard() {
  try {
    const stateRes = await fetch(`${API_BASE}/system/state`);
    const dramaRes = await fetch(`${API_BASE}/system/drama`);
    const synapsaRes = await fetch(`${API_BASE}/synapsa/metrics`);
    
    if (!stateRes.ok || !dramaRes.ok || !synapsaRes.ok) return;
    
    const systemState = await stateRes.json();
    const drama = await dramaRes.json();
    const synapsa = await synapsaRes.json();
    
    updateSystemMetricsUI(systemState);
    updateDramaUI(drama);
    updateSynapsaUI(synapsa);
  } catch (e) {
    // Silently fail - dashboard optional
  }
}

function updateSystemMetricsUI(state) {
  const trustEl = document.getElementById("sysTrust");
  const stressEl = document.getElementById("sysStress");
  const entropyEl = document.getElementById("sysEntropy");
  const polarizationEl = document.getElementById("sysPolarization");
  
  if (trustEl) trustEl.textContent = (state.global_trust * 100).toFixed(1) + "%";
  if (stressEl) stressEl.textContent = (state.global_stress * 100).toFixed(1) + "%";
  if (entropyEl) entropyEl.textContent = (state.entropy * 100).toFixed(1) + "%";
  if (polarizationEl) polarizationEl.textContent = (state.polarization * 100).toFixed(1) + "%";
}

function updateDramaUI(drama) {
  const phaseEl = document.getElementById("dramaPhase");
  const indexEl = document.getElementById("dramaIndex");
  
  const phaseColors = { stable: "#00ff88", tension: "#ffdd00", crisis: "#ff8800", tragedy: "#ff0044" };
  
  if (phaseEl) {
    phaseEl.textContent = drama.phase.toUpperCase();
    phaseEl.style.color = phaseColors[drama.phase] || "#00ff88";
  }
  if (indexEl) indexEl.textContent = (drama.index * 100).toFixed(1) + "%";
}

function updateSynapsaUI(metrics) {
  const autonomyEl = document.getElementById("synapsaAutonomy");
  const modeEl = document.getElementById("synapsaMode");
  const riskEl = document.getElementById("synapsaRisk");
  
  if (autonomyEl) autonomyEl.textContent = (metrics.state.autonomy * 100).toFixed(1) + "%";
  if (modeEl) modeEl.textContent = metrics.state.governance_mode.toUpperCase();
  if (riskEl) riskEl.textContent = (metrics.state.survival_drive * 100).toFixed(1) + "%";
}

function toggleDashboard() {
  const dashboard = document.getElementById("systemDashboard");
  if (dashboard) {
    dashboard.classList.toggle("hidden");
  }
}

function initEffects() {
  setInterval(() => {
    const glitchEl = document.querySelector('.glitch-overlay');
    if (glitchEl) {
      glitchEl.style.animation = 'none';
      setTimeout(() => {
        glitchEl.style.animation = 'glitchFlash 15s infinite';
      }, 10);
    }
  }, 15000);
}

function updateTime() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('pl-PL', { hour12: false });
  const timeEl = document.getElementById('currentTime');
  if (timeEl) {
    timeEl.textContent = timeStr;
  }
  
  const lastSyncEl = document.getElementById('lastSync');
  if (lastSyncEl) {
    const syncStr = now.toLocaleString('pl-PL');
    lastSyncEl.textContent = `OSTATNIA SYNCHRONIZACJA: ${syncStr}`;
  }
}

async function refreshConversations() {
  try {
    const response = await fetch(`${API_BASE}/conversations?limit=100`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);

    allConversations = await response.json();
    renderConversationsList(allConversations);
    
    document.getElementById("agentCount").textContent = 
      [...new Set(allConversations.flatMap(c => 
        c.participants ? JSON.parse(c.participants) : []
      ))].length || 11;
  } catch (error) {
    console.error("Error fetching conversations:", error);
    document.getElementById("conversationsList").innerHTML =
      `<div class="empty-state">
        <div class="empty-icon" style="color: var(--danger);">⚠</div>
        <div class="empty-title">BŁĄD SYSTEMU</div>
        <div class="empty-subtitle">${error.message}</div>
      </div>`;
  }
}

function renderConversationsList(conversations) {
  const container = document.getElementById("conversationsList");
  document.getElementById("conversationCount").textContent = conversations.length || 0;

  if (!conversations || conversations.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">&#9678;</div><div class="empty-title">BRAK DYSKURSÓW</div><div class="empty-subtitle">Archiwum puste</div></div>';
    return;
  }

  container.innerHTML = '';

  // Pokaż komunikat o zablokowaniu przez pierwsze 15 minut
  if (isConversationListLocked) {
    const lockNotice = document.createElement('div');
    lockNotice.style.cssText = 'padding: 12px; background: rgba(255, 45, 106, 0.1); border: 1px solid rgba(255, 45, 106, 0.3); border-radius: 4px; color: var(--text-muted); font-size: 11px; text-align: center; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;';
    lockNotice.innerHTML = '🔒 ARCHIWUM ZABLOKOWANE NA 15 MIN<br><span style="font-size: 10px;">Obserwacja bieżącej debaty...</span>';
    container.appendChild(lockNotice);
  }

  conversations.forEach((conv, index) => {
    const date = new Date(conv.start_time);
    const timeStr = date.toLocaleString("pl-PL");
    const participants = conv.participants ? JSON.parse(conv.participants) : [];
    const emotionColor =
      conv.average_valence > 0.5
        ? "success"
        : conv.average_valence < -0.5
          ? "danger"
          : "";

    const itemEl = document.createElement('div');
    itemEl.className = `conversation-item ${currentConversationId === conv.id ? "active" : ""}`;
    itemEl.style.opacity = '0';
    itemEl.style.transform = 'translateX(-20px)';

    // Blokuj klik na listę przez 15 minut
    if (isConversationListLocked) {
      itemEl.style.opacity = '0.5';
      itemEl.style.cursor = 'not-allowed';
      itemEl.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
      };
    } else {
      itemEl.onclick = () => selectConversation(conv.id);
    }
    
    itemEl.innerHTML = `
      <div class="conversation-title">Day ${conv.day}: ${conv.topic}</div>
      <div class="conversation-meta">
        ${timeStr.split(" ")[0]} • ${conv.initiator}
      </div>
      <div class="conversation-stats">
        <span class="stat-badge">🔄 Turns: ${conv.turn_count || 0}</span>
        <span class="stat-badge ${emotionColor}">💭 Valence: ${
      conv.average_valence ? conv.average_valence.toFixed(2) : "N/A"
    }</span>
        ${conv.had_conflict ? '<span class="stat-badge danger">⚡ Conflict</span>' : ""}
      </div>
    `;
    
    container.appendChild(itemEl);
    
    setTimeout(() => {
      itemEl.style.transition = 'all 0.3s ease';
      itemEl.style.opacity = '1';
      itemEl.style.transform = 'translateX(0)';
    }, index * 30);
  });
}

/**
 * Załaduj aktywną debatę natychmiast (pierwsze 15 minut)
 * Wszystkie ~5000 wiadomości w jednym czacie
 */
async function loadActiveDebateImmediate(conversationId) {
  currentConversationId = conversationId;

  const chatContainer = document.getElementById("chatViewContainer");
  const contextContainer = document.getElementById("contextContent");

  chatContainer.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <div class="loading-text">ŁADOWANIE PEŁNEJ DEBATY (Do 5000 wiadomości)...</div>
    </div>
  `;

  try {
    // Załaduj konwersację i wszystkie jej wiadomości
    const convResponse = await fetch(`${API_BASE}/conversations/${conversationId}`);
    const messagesResponse = await fetch(`${API_BASE}/conversations/${conversationId}/messages?limit=5000`);
    const contextResponse = await fetch(`${API_BASE}/conversations/${conversationId}/context`);

    if (!convResponse.ok || !messagesResponse.ok) {
      throw new Error(`API error: ${convResponse.status || messagesResponse.status}`);
    }

    const conversation = await convResponse.json();
    const messages = await messagesResponse.json();
    const context = await contextResponse.json().catch(() => null);

    console.log(`📊 Załadowano ${messages.length} wiadomości z debaty`);

    // Zmień tytuł panelu aby pokazać tryb "Aktywna Debata"
    const panelTitle = document.querySelector(".chat-panel .panel-title");
    if (panelTitle) {
      panelTitle.innerHTML = `<span class="panel-icon">⚡</span>AKTYWNA DEBATA (${messages.length} wiadomości)`;
      panelTitle.style.color = "#ff2d6a";
      panelTitle.style.textShadow = "0 0 10px rgba(255, 45, 106, 0.8)";
    }

    renderChatMessages(messages);
    renderContext(context, conversation);
  } catch (error) {
    console.error("Error loading active debate:", error);
    chatContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" style="color: var(--danger);">⚠</div>
        <div class="empty-title">BŁĄD ŁADOWANIA DEBATY</div>
        <div class="empty-subtitle">${error.message}</div>
      </div>`;
  }
}

async function selectConversation(conversationId) {
  // Blokuj zmianę debaty przez pierwsze 15 minut
  if (isConversationListLocked) {
    console.warn("⚠️ Archiwum zablokowane. Obserwacja bieżącej debaty...");
    return;
  }

  currentConversationId = conversationId;

  document.querySelectorAll(".conversation-item").forEach((el) => {
    el.classList.remove("active");
  });
  event?.target?.closest(".conversation-item")?.classList.add("active");

  const chatContainer = document.getElementById("chatViewContainer");
  const contextContainer = document.getElementById("contextContent");

  chatContainer.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <div class="loading-text">SYNCHRONIZACJA DANYCH...</div>
    </div>
  `;
  contextContainer.innerHTML = `
    <div class="empty-state-mini">
      <div class="empty-icon-mini">&#9679;</div>
      <div>Ładowanie kontekstu...</div>
    </div>
  `;

  try {
    const response = await fetch(`${API_BASE}/conversations/${conversationId}`);
    if (!response.ok) throw new Error(`Failed to fetch conversation`);

    const data = await response.json();
    const { conversation, messages, context } = data;

    renderChatMessages(messages);
    renderContext(context, conversation);
  } catch (error) {
    console.error("Error loading conversation details:", error);
    chatContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon" style="color: var(--danger);">⚠</div>
        <div class="empty-title">BŁĄD ŁADOWANIA</div>
        <div class="empty-subtitle">${error.message}</div>
      </div>
    `;
  }
}

function renderChatMessages(messages) {
  const container = document.getElementById("chatViewContainer");

  if (!messages || messages.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">&#9881;</div><div class="empty-title">BRAK DANYCH</div><div class="empty-subtitle">Strumień świadomości pusty</div></div>';
    return;
  }

  container.innerHTML = '<button class="chat-close-btn" onclick="closeConversation()" style="margin-bottom:12px;padding:6px 10px;border-radius:6px;border:none;background:transparent;color:var(--text-primary);cursor:pointer;">← WYJDŹ</button><div class="messages-list"></div>';
  const messagesList = container.querySelector('.messages-list');
  
  let index = 0;
  const batchSize = 5;
  
  function addBatch() {
    const endIndex = Math.min(index + batchSize, messages.length);
    
    for (let i = index; i < endIndex; i++) {
      const msg = messages[i];
      const emotionClass = `emotion-${msg.emotion_at_time?.toLowerCase() || "neutral"}`;
      const hasConflict = msg.emotion_at_time === "angry" || msg.emotion_at_time === "frustrated";

      const msgEl = document.createElement('div');
      msgEl.className = `message-item ${hasConflict ? "conflict-message" : ""}`;
      msgEl.style.opacity = '0';
      msgEl.style.transform = 'translateY(20px)';
      // Click handling disabled to avoid modal locking the UI
      // msgEl.onclick = function() { showMessageDetails(this, msg); };
      
      // Pełna wiadomość bez obcinania
      const tokenCount = Math.ceil(msg.content.length / 4); // Rough estimate

      msgEl.innerHTML = `
        <div class="message-header">
          <div>
            <span class="message-speaker">${msg.speaker}</span>
            <span class="message-turn">#${msg.turn_number}</span>
          </div>
          <div class="message-target">
            ${msg.target_agent ? `→ ${msg.target_agent}` : ""}
            <span class="message-token-count" style="font-size: 11px; color: var(--text-muted); margin-left: 10px;">~${tokenCount}t</span>
          </div>
        </div>

        <div class="message-content">
          ${msg.content}
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
      `;
      
      messagesList.appendChild(msgEl);
      
      setTimeout(() => {
        msgEl.style.transition = 'all 0.3s ease';
        msgEl.style.opacity = '1';
        msgEl.style.transform = 'translateY(0)';
      }, (i - index) * 50);
    }
    
    index = endIndex;
    
    if (index < messages.length) {
      setTimeout(addBatch, 100);
    }
  }
  
  addBatch();
}

function renderContext(context, conversation) {
  const container = document.getElementById("contextContent");
  const emotionPoint = document.getElementById("emotionPoint");

  const valence = conversation.average_valence || 0;
  const stress = conversation.average_stress || 0;
  const leftPos = 50 + (valence * 40);
  const topPos = 50 - (stress * 40);
  
  if (emotionPoint) {
    emotionPoint.style.left = `${leftPos}%`;
    emotionPoint.style.top = `${topPos}%`;
  }

  if (!context) {
    container.innerHTML = `
      <div class="context-section" style="animation: fadeIn 0.5s ease">
        <h4>Podsumowanie Dyskursu</h4>
        <div class="context-text">
          ${conversation.summary || "Brak danych"}
        </div>
      </div>
      <div class="context-section" style="animation: fadeIn 0.5s ease 0.1s both">
        <h4>Statystyki</h4>
        <div class="context-text">
          <strong>Tury:</strong> ${conversation.turn_count}<br>
          <strong>Średnia Walencja:</strong> ${(conversation.average_valence || 0).toFixed(2)}<br>
          <strong>Średni Stres:</strong> ${(conversation.average_stress || 0).toFixed(2)}<br>
          <strong>Konflikt:</strong> ${conversation.had_conflict ? "Tak ⚠️" : "Nie ✓"}
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
      <div class="context-section" style="animation: fadeIn 0.5s ease">
        <h4>📋 Zdarzenia Poprzedzające</h4>
        <div class="context-text">
          ${precedingEvents.map((e) => `• ${e}`).join("<br>")}
        </div>
      </div>
    `;
  }

  html += `
    <div class="context-section" style="animation: fadeIn 0.5s ease 0.1s both">
      <h4>💭 Nastrój Grupy</h4>
      <div class="context-text">
        Walencja: ${(groupMood.avg_valence || 0).toFixed(2)}<br>
        Stres: ${(groupMood.avg_stress || 0).toFixed(2)}<br>
        Arousal: ${(groupMood.avg_arousal || 0).toFixed(2)}
      </div>
    </div>
  `;

  if (unresolvedConflicts.length > 0) {
    html += `
      <div class="context-section" style="animation: fadeIn 0.5s ease 0.2s both">
        <h4>⚡ Nierozwiązane Konflikty</h4>
        <div class="context-text">
          ${unresolvedConflicts.map((c) => `• ${c.agent}: "${c.reason}"`).join("<br>")}
        </div>
      </div>
    `;
  }

  html += `
    <div class="context-section" style="animation: fadeIn 0.5s ease 0.3s both">
      <h4>📊 Statystyki Dyskursu</h4>
      <div class="context-text">
        <strong>Tury:</strong> ${conversation.turn_count}<br>
        <strong>Walencja:</strong> ${(conversation.average_valence || 0).toFixed(2)}<br>
        <strong>Stres:</strong> ${(conversation.average_stress || 0).toFixed(2)}<br>
        <strong>Konflikt:</strong> ${conversation.had_conflict ? "Tak ⚠️" : "Nie ✓"}
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

  modalTitle.textContent = `${message.speaker} → ${message.target_agent || "Grupa"}`;

  modalBody.innerHTML = `
    <p><strong>Tura:</strong> ${message.turn_number}</p>
    <p><strong>Czas:</strong> ${timestamp}</p>
    <p><strong>Mówca:</strong> <span style="color: var(--secondary); text-shadow: 0 0 10px var(--secondary);">${message.speaker}</span></p>
    <p><strong>Cel:</strong> <span style="color: var(--accent);">${message.target_agent || "Dyskusja grupowa"}</span></p>
    
    <hr style="border-color: rgba(0,240,255,0.2); margin: 20px 0;">
    
    <p><strong>Pełna Wiadomość:</strong></p>
    <div style="background: linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,240,255,0.05)); padding: 15px; border-radius: 4px; line-height: 1.8; border: 1px solid var(--border-subtle); color: var(--text-primary);">
      ${message.content}
    </div>
    
    <hr style="border-color: rgba(0,240,255,0.2); margin: 20px 0;">
    
    <p><strong>Stan Emocjonalny:</strong></p>
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px;">
      <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 4px; border-left: 2px solid var(--primary);">
        <div style="font-size: 10px; color: var(--text-muted); letter-spacing: 1px; margin-bottom: 5px;">EMOCJA</div>
        <div style="color: var(--primary); font-size: 16px; text-shadow: 0 0 10px var(--primary);">${message.emotion_at_time}</div>
      </div>
      <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 4px; border-left: 2px solid var(--secondary);">
        <div style="font-size: 10px; color: var(--text-muted); letter-spacing: 1px; margin-bottom: 5px;">WALENCJA</div>
        <div style="color: var(--secondary); font-size: 16px; text-shadow: 0 0 10px var(--secondary);">${(message.valence_at_time || 0).toFixed(3)}</div>
      </div>
      <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 4px; border-left: 2px solid var(--accent);">
        <div style="font-size: 10px; color: var(--text-muted); letter-spacing: 1px; margin-bottom: 5px;">AROUSAL</div>
        <div style="color: var(--accent); font-size: 16px; text-shadow: 0 0 10px var(--accent);">${(message.arousal_at_time || 0).toFixed(3)}</div>
      </div>
      <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 4px; border-left: 2px solid var(--warning);">
        <div style="font-size: 10px; color: var(--text-muted); letter-spacing: 1px; margin-bottom: 5px;">STRES</div>
        <div style="color: var(--warning); font-size: 16px; text-shadow: 0 0 10px var(--warning);">${(message.stress_at_time || 0).toFixed(3)}</div>
      </div>
    </div>
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

function closeConversation() {
  currentConversationId = null;
  document.querySelectorAll(".conversation-item").forEach((el) => el.classList.remove("active"));
  const chatContainer = document.getElementById("chatViewContainer");
  if (chatContainer) {
    chatContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#9881;</div>
        <div class="empty-title">WYBIERZ DYSKURS</div>
        <div class="empty-subtitle">Z archiwum po lewej stronie</div>
      </div>
    `;
  }
  const contextContainer = document.getElementById("contextContent");
  if (contextContainer) {
    contextContainer.innerHTML = '<div class="empty-state-mini"><div class="empty-icon-mini">&#9679;</div><div>Brak aktywnego dyskursu</div></div>';
  }
}

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

function setupStartAgentsButton() {
  const button = document.getElementById("startDebateBtn");
  if (!button) return;

  const textEl = button.querySelector(".btn-red-text");
  const iconEl = button.querySelector(".btn-red-icon");
  button.setAttribute("aria-pressed", "false");

  button.addEventListener("click", async () => {
    // Prevent multiple concurrent debates (no forking)
    if (debateInProgress) {
      console.warn("⚠️ Debate already in progress. Cannot start another.");
      return;
    }

    debateInProgress = true;
    button.classList.add("is-loading");
    button.setAttribute("disabled", "true");

    if (textEl) {
      textEl.textContent = "INICJALIZACJA...";
    }
    if (iconEl) {
      iconEl.textContent = "⚡";
    }

    console.log("📤 Sending debate start request to API...");

    try {
      const response = await fetch(`${API_BASE}/debates/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Debate started:", data);

      // Show empty chat with "Waiting for messages..." state
      const chatContainer = document.getElementById("chatViewContainer");
      chatContainer.innerHTML = `
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <div class="loading-text">OCZEKIWANIE NA PIERWSZĄ WIADOMOŚĆ...</div>
        </div>
      `;

      // Show success feedback
      showDebateNotification("💬 Debata rozpoczęta! Czekanie na wiadomości...", "success");

      // Restart 15-minute lockdown from button click
      debateStartTime = Date.now();
      isConversationListLocked = true;
      startLockdownTimer(15 * 60);

      // Keep button permanently disabled during debate (no reset)
      button.classList.add("is-active");
      button.setAttribute("aria-pressed", "true");
      if (textEl) {
        textEl.textContent = "DEBATA W TOKU...";
      }

      console.log("⏳ Messages will stream in as they're generated. Polling every 3 seconds.");
      // Note: refreshChatMessages() already runs every 3 seconds and will update the chat view
      // as new messages arrive
    } catch (error) {
      console.error("❌ Error starting debate:", error);
      debateInProgress = false;
      button.classList.remove("is-loading");
      button.removeAttribute("disabled");
      if (textEl) {
        textEl.textContent = "BŁĄD - SPRÓBUJ PONOWNIE";
      }
      showDebateNotification(`❌ Błąd: ${error.message}`, "error");

      // Reset button text after 3 seconds
      setTimeout(() => {
        if (textEl) {
          textEl.textContent = "ROZPOCZNIJ DEBATĘ";
        }
      }, 3000);
    }
  });

  // Chat generator button
  const chatBtn = document.getElementById("startChatBtn");
  if (chatBtn) {
    const chatTextEl = chatBtn.querySelector(".btn-green-text");
    const chatIconEl = chatBtn.querySelector(".btn-green-icon");
    
    chatBtn.addEventListener("click", async () => {
      const countInput = document.getElementById("chatCountInput");
      const count = countInput ? parseInt(countInput.value) || 10 : 10;
      
      chatBtn.classList.add("is-loading");
      chatBtn.setAttribute("disabled", "true");
      if (chatTextEl) chatTextEl.textContent = "GENEROWANIE...";
      
      try {
        const response = await fetch(`${API_BASE}/chat/generate`, { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ count })
        });
        const data = await response.json();
        
        showDebateNotification(`💬 Wygenerowano ${data.generated} wiadomości!`, "success");
        
        chatBtn.classList.add("is-active");
        if (chatTextEl) chatTextEl.textContent = `WYKONANO (${data.turn})`;
        
        setTimeout(() => {
          chatBtn.classList.remove("is-loading", "is-active");
          chatBtn.removeAttribute("disabled");
          if (chatTextEl) chatTextEl.textContent = "GENERUJ CZAT";
        }, 3000);
        
        refreshChatMessages();
      } catch (error) {
        chatBtn.classList.remove("is-loading");
        chatBtn.removeAttribute("disabled");
        if (chatTextEl) chatTextEl.textContent = "BŁĄD";
        showDebateNotification(`❌ Błąd: ${error.message}`, "error");
      }
    });
  }
}

function showDebateNotification(message, type) {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = `debate-notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    background: ${type === "success" ? "#00ff00" : "#ff0000"};
    color: #000;
    border-radius: 4px;
    font-weight: bold;
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(notification);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// Dashboard Visualization Functions

let emotionChart = null;
let relationGraphInitialized = false;

async function initDashboardVisualization() {
  await initEmotionChart();
  await updateStressHeatmap();
  await initRelationGraph();
}

async function initEmotionChart() {
  const canvas = document.getElementById('emotionChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  
  const initialData = {
    labels: [],
    datasets: [
      {
        label: 'Valence',
        borderColor: '#00f0ff',
        backgroundColor: 'rgba(0, 240, 255, 0.1)',
        data: [],
        tension: 0.4,
        fill: true
      },
      {
        label: 'Stress',
        borderColor: '#ff2d6a',
        backgroundColor: 'rgba(255, 45, 106, 0.1)',
        data: [],
        tension: 0.4,
        fill: true
      },
      {
        label: 'Arousal',
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        data: [],
        tension: 0.4,
        fill: true
      }
    ]
  };

  emotionChart = new Chart(ctx, {
    type: 'line',
    data: initialData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#a8c5d4',
            font: { family: 'Space Mono', size: 10 },
            boxWidth: 12
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#4a6274', font: { size: 9 } },
          grid: { color: 'rgba(0, 240, 255, 0.1)' }
        },
        y: {
          min: -1,
          max: 1,
          ticks: { color: '#4a6274', font: { size: 9 } },
          grid: { color: 'rgba(0, 240, 255, 0.1)' }
        }
      },
      animation: { duration: 500 }
    }
  });
}

async function updateEmotionChart() {
  try {
    const historyRes = await fetch(`${API_BASE}/dashboard/emotions/history?limit=30`);
    if (!historyRes.ok) return;
    const history = await historyRes.json();

    if (!emotionChart || history.length === 0) return;

    const agents = [...new Set(history.map(h => h.agent_id))];
    const labels = history.filter(h => h.agent_id === agents[0]).map(h => 
      new Date(h.ts).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    ).reverse();

    const datasets = agents.map((agent, idx) => {
      const agentData = history.filter(h => h.agent_id === agent).map(h => h.valence).reverse();
      const colors = ['#00f0ff', '#ff2d6a', '#a855f7', '#00ffa3', '#ffb800'];
      return {
        label: agent,
        borderColor: colors[idx % colors.length],
        backgroundColor: 'transparent',
        data: agentData,
        tension: 0.4,
        borderWidth: 2
      };
    });

    emotionChart.data.labels = labels;
    emotionChart.data.datasets = datasets;
    emotionChart.update('none');
  } catch (e) {
    console.error('Error updating emotion chart:', e);
  }
}

async function updateStressHeatmap() {
  try {
    const container = document.getElementById('stressHeatmap');
    if (!container) return;

    const historyRes = await fetch(`${API_BASE}/dashboard/emotions/history?limit=20`);
    if (!historyRes.ok) return;
    const history = await historyRes.json();

    if (history.length === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); font-size: 11px;">Brak danych</div>';
      return;
    }

    const agents = [...new Set(history.map(h => h.agent_id))];
    const timePoints = [...new Set(history.map(h => new Date(h.ts).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })))].reverse();

    let html = '';
    
    agents.forEach(agent => {
      html += `<div class="heatmap-row">`;
      html += `<span class="heatmap-label">${agent.substring(0, 12)}</span>`;
      html += `<div class="heatmap-cells">`;
      
      const agentData = history.filter(h => h.agent_id === agent).reverse();
      
      timePoints.forEach((time, idx) => {
        const dataPoint = agentData[idx];
        if (dataPoint) {
          const stress = dataPoint.stress || 0;
          const stressClass = stress < 0.3 ? 'low' : stress < 0.6 ? 'medium' : 'high';
          html += `<div class="heatmap-cell ${stressClass}" title="${agent}: ${(stress * 100).toFixed(0)}%">${(stress * 100).toFixed(0)}</div>`;
        } else {
          html += `<div class="heatmap-cell" style="background: var(--bg-surface);">--</div>`;
        }
      });
      
      html += `</div></div>`;
    });

    container.innerHTML = html;
  } catch (e) {
    console.error('Error updating heatmap:', e);
  }
}

async function initRelationGraph() {
  const container = document.getElementById('relationGraph');
  if (!container || relationGraphInitialized) return;

  relationGraphInitialized = true;
  await updateRelationGraph();
}

async function updateRelationGraph() {
  try {
    const container = document.getElementById('relationGraph');
    if (!container) return;

    const relationsRes = await fetch(`${API_BASE}/dashboard/relations`);
    if (!relationsRes.ok) return;
    const relations = await relationsRes.json();

    if (!relations || relations.length === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); font-size: 11px; text-align: center; padding: 20px;">Brak danych relacji</div>';
      return;
    }

    const nodes = [...new Set(relations.flatMap(r => [r.agent_id, r.target_id]))];
    
    const nodeData = nodes.map(id => ({
      id: id,
      group: id.includes('SYNAPSA') ? 'system' : id.includes('Robot') ? 'robot' : 'human'
    }));

    const linkData = relations.map(r => ({
      source: r.agent_id,
      target: r.target_id,
      trust: r.trust,
      conflict: r.conflict || 0,
      type: r.trust > 0 ? 'trust' : 'conflict'
    })).filter(l => l.trust !== undefined);

    container.innerHTML = '';

    const width = container.clientWidth || 600;
    const height = 280;

    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const simulation = d3.forceSimulation(nodeData)
      .force('link', d3.forceLink(linkData).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-150))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg.append('g')
      .selectAll('line')
      .data(linkData)
      .enter()
      .append('line')
      .attr('class', d => `graph-link ${d.type}`)
      .attr('stroke-width', d => Math.abs(d.trust || d.conflict) * 3 + 1);

    const node = svg.append('g')
      .selectAll('g')
      .data(nodeData)
      .enter()
      .append('g')
      .attr('class', 'graph-node')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    const colors = { human: '#00f0ff', robot: '#a855f7', system: '#00ffa3' };
    
    node.append('circle')
      .attr('r', d => d.group === 'system' ? 12 : 8)
      .attr('fill', d => colors[d.group] || '#00f0ff');

    node.append('text')
      .attr('dx', 12)
      .attr('dy', 4)
      .text(d => d.id.substring(0, 10));

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    container.innerHTML += `
      <div class="graph-legend">
        <div class="graph-legend-item">
          <div class="graph-legend-color trust"></div>
          <span>Trust</span>
        </div>
        <div class="graph-legend-item">
          <div class="graph-legend-color conflict"></div>
          <span>Conflict</span>
        </div>
      </div>
    `;
  } catch (e) {
    console.error('Error updating relation graph:', e);
  }
}

// Initialize dashboard on load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initDashboardVisualization, 2000);
});

setInterval(() => {
  const dashboard = document.getElementById('systemDashboard');
  if (dashboard && !dashboard.classList.contains('hidden')) {
    updateEmotionChart();
    updateStressHeatmap();
    updateRelationGraph();
  }
}, 10000);
