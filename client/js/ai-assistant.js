/**
 * Campus Marketplace - Claude AI Assistant Frontend Component
 * Floating conversational assistant helping students with pricing, safety, listings, and campus navigation.
 */

(function () {
  const STORAGE_KEY = 'campus_ai_assistant_history';
  let isWidgetOpen = false;
  let isRequestPending = false;
  let chatHistory = [];

  /**
   * Escape raw text to prevent XSS, while preserving safety for markdown conversion.
   */
  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Formats AI markdown text safely into HTML (bold, italic, links, lists, code).
   */
  function formatMarkdown(rawText) {
    let text = escapeHTML(rawText);

    // Convert links: [Text](URL) -> <a href="URL" target="_blank" rel="noopener">Text</a>
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
      // Basic sanitize URL
      const cleanUrl = url.replace(/["']/g, '');
      const isInternal = cleanUrl.startsWith('/') || cleanUrl.startsWith('#');
      return `<a href="${cleanUrl}" ${isInternal ? '' : 'target="_blank" rel="noopener"'} class="ai-chat-link">${linkText}</a>`;
    });

    // Convert bold: **text**
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Convert italic: *text*
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Convert inline code: `code`
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Convert bullet lists (lines starting with - or •)
    const lines = text.split('\n');
    let inList = false;
    let formattedLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('- ') || line.startsWith('• ')) {
        if (!inList) {
          formattedLines.push('<ul>');
          inList = true;
        }
        formattedLines.push(`<li>${line.substring(2)}</li>`);
      } else {
        if (inList) {
          formattedLines.push('</ul>');
          inList = false;
        }
        if (line.length > 0) {
          formattedLines.push(`<p>${line}</p>`);
        }
      }
    }
    if (inList) {
      formattedLines.push('</ul>');
    }

    return formattedLines.join('');
  }

  /**
   * Inject widget markup into the page DOM
   */
  function injectWidgetDOM() {
    if (document.getElementById('ai-assistant-launcher')) return;

    // 1. Floating Launcher Button
    const launcher = document.createElement('button');
    launcher.id = 'ai-assistant-launcher';
    launcher.className = 'ai-assistant-launcher';
    launcher.setAttribute('aria-label', 'Open Claude Campus AI Assistant');
    launcher.innerHTML = `
      <div class="ai-launcher-icon">✨</div>
      <span class="ai-launcher-tooltip">Ask Claude AI</span>
    `;
    document.body.appendChild(launcher);

    // 2. Chat Widget Modal Window
    const modal = document.createElement('div');
    modal.id = 'ai-assistant-modal';
    modal.className = 'ai-assistant-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'ai-modal-heading');
    modal.innerHTML = `
      <!-- Header -->
      <div class="ai-modal-header">
        <div class="ai-modal-brand">
          <div class="ai-modal-avatar">
            🎓
            <span class="ai-status-dot" title="Online & Ready"></span>
          </div>
          <div class="ai-modal-title-group">
            <h3 id="ai-modal-heading">
              Campus AI
              <span class="ai-badge-model">Claude Opus</span>
            </h3>
            <p>Student Marketplace Guide</p>
          </div>
        </div>
        <div class="ai-modal-actions">
          <button id="ai-clear-btn" class="ai-modal-btn" title="Clear Conversation" aria-label="Clear chat history">
            🗑️
          </button>
          <button id="ai-close-btn" class="ai-modal-btn" title="Close Assistant" aria-label="Close assistant">
            ✕
          </button>
        </div>
      </div>

      <!-- Messages Body -->
      <div class="ai-modal-body" id="ai-modal-messages">
        <!-- Dynamic conversation messages & starter cards will render here -->
      </div>

      <!-- Footer & Input -->
      <div class="ai-modal-footer">
        <form class="ai-input-form" id="ai-chat-form">
          <input
            type="text"
            id="ai-user-input"
            class="ai-input-field"
            placeholder="Ask about prices, safety, or listing tips..."
            autocomplete="off"
            maxlength="600"
          />
          <button type="submit" id="ai-send-btn" class="ai-send-btn" aria-label="Send message">
            ➤
          </button>
        </form>
        <p class="ai-disclaimer">
          ⚡ Powered by Claude 3 Opus · Safe Campus Trading
        </p>
      </div>
    `;
    document.body.appendChild(modal);

    // Setup DOM Listeners
    setupEventListeners();
  }

  /**
   * Bind event listeners for launcher, modal actions, and chat submission
   */
  function setupEventListeners() {
    const launcher = document.getElementById('ai-assistant-launcher');
    const closeBtn = document.getElementById('ai-close-btn');
    const clearBtn = document.getElementById('ai-clear-btn');
    const chatForm = document.getElementById('ai-chat-form');
    const inputField = document.getElementById('ai-user-input');

    if (launcher) {
      launcher.addEventListener('click', toggleWidget);
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', closeWidget);
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', clearHistory);
    }

    if (chatForm) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = inputField.value.trim();
        if (text && !isRequestPending) {
          sendMessage(text);
          inputField.value = '';
        }
      });
    }

    // Auto-focus input on open
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isWidgetOpen) {
        closeWidget();
      }
    });
  }

  /**
   * Load history from sessionStorage
   */
  function loadHistory() {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        chatHistory = JSON.parse(stored);
      } else {
        chatHistory = [];
      }
    } catch (err) {
      chatHistory = [];
    }
  }

  /**
   * Save history to sessionStorage
   */
  function saveHistory() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory.slice(-12)));
    } catch (err) {
      console.warn('Could not save AI assistant history:', err.message);
    }
  }

  /**
   * Render messages stream
   */
  function renderMessages() {
    const container = document.getElementById('ai-modal-messages');
    if (!container) return;

    container.innerHTML = '';

    // Always render welcome card if history is empty
    if (chatHistory.length === 0) {
      const user = window.currentUser || (window.Auth ? window.Auth.getUser() : null);
      const studentName = user ? window.Utils.escapeHTML(user.name.split(' ')[0]) : 'Student';

      const welcomeCard = document.createElement('div');
      welcomeCard.className = 'ai-welcome-card';
      welcomeCard.innerHTML = `
        <h4>👋 Welcome, ${studentName}!</h4>
        <p>I'm your <strong>Campus AI Assistant</strong>, powered by Claude. How can I help you on Campus Marketplace today?</p>
        <div class="ai-quick-prompts">
          <button class="ai-prompt-chip" data-prompt="Where are the safest meetup spots on campus to trade?">
            <span class="chip-icon">🛡️</span> Safe campus meetup spots?
          </button>
          <button class="ai-prompt-chip" data-prompt="How should I price my used college textbooks?">
            <span class="chip-icon">📚</span> How to price my textbooks?
          </button>
          <button class="ai-prompt-chip" data-prompt="What are the best tips to sell my items quickly?">
            <span class="chip-icon">⚡</span> Quick selling tips for students
          </button>
          <button class="ai-prompt-chip" data-prompt="What categories of items can I browse or list on Campus Marketplace?">
            <span class="chip-icon">🎒</span> What can I buy or sell here?
          </button>
        </div>
      `;

      // Attach click handlers to starter prompt chips
      welcomeCard.querySelectorAll('.ai-prompt-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          const prompt = chip.getAttribute('data-prompt');
          if (prompt && !isRequestPending) {
            sendMessage(prompt);
          }
        });
      });

      container.appendChild(welcomeCard);
      return;
    }

    // Render stored chat items
    chatHistory.forEach((msg) => {
      appendMessageBubble(msg.role, msg.content, false);
    });

    scrollToBottom();
  }

  /**
   * Append a single message bubble to the messages stream
   */
  function appendMessageBubble(role, content, shouldScroll = true) {
    const container = document.getElementById('ai-modal-messages');
    if (!container) return;

    const row = document.createElement('div');
    row.className = `ai-message-row ${role}`;

    const formattedContent = role === 'assistant' ? formatMarkdown(content) : escapeHTML(content);

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (role === 'assistant') {
      row.innerHTML = `
        <div class="ai-msg-avatar">🎓</div>
        <div class="ai-message-bubble">
          ${formattedContent}
          <div class="ai-message-time">${timeStr}</div>
        </div>
      `;
    } else {
      row.innerHTML = `
        <div class="ai-message-bubble">
          ${formattedContent}
          <div class="ai-message-time">${timeStr}</div>
        </div>
      `;
    }

    container.appendChild(row);

    if (shouldScroll) {
      scrollToBottom();
    }
  }

  /**
   * Display or remove the pulsing 3-dot typing indicator
   */
  function setTypingIndicator(visible) {
    const container = document.getElementById('ai-modal-messages');
    if (!container) return;

    const existing = document.getElementById('ai-typing-indicator-row');
    if (visible) {
      if (existing) return;
      const row = document.createElement('div');
      row.id = 'ai-typing-indicator-row';
      row.className = 'ai-message-row assistant';
      row.innerHTML = `
        <div class="ai-msg-avatar">🎓</div>
        <div class="ai-typing-indicator">
          <span class="ai-typing-dot"></span>
          <span class="ai-typing-dot"></span>
          <span class="ai-typing-dot"></span>
        </div>
      `;
      container.appendChild(row);
      scrollToBottom();
    } else {
      if (existing) {
        existing.remove();
      }
    }
  }

  /**
   * Scroll chat messages container smoothly to the bottom
   */
  function scrollToBottom() {
    const container = document.getElementById('ai-modal-messages');
    if (container) {
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 50);
    }
  }

  /**
   * Send user message to Claude AI Assistant
   */
  async function sendMessage(userText) {
    if (!userText || isRequestPending) return;

    isRequestPending = true;
    const sendBtn = document.getElementById('ai-send-btn');
    const inputField = document.getElementById('ai-user-input');
    if (sendBtn) sendBtn.disabled = true;
    if (inputField) inputField.disabled = true;

    // 1. Append user message
    chatHistory.push({ role: 'user', content: userText });
    appendMessageBubble('user', userText, true);

    // 2. Show typing indicator
    setTypingIndicator(true);

    try {
      // 3. Call backend API
      const historyContext = chatHistory.slice(-8);
      const response = await window.API.askAiAssistant({
        message: userText,
        history: historyContext,
      });

      setTypingIndicator(false);

      if (response && response.success && response.data && response.data.reply) {
        const reply = response.data.reply;
        chatHistory.push({ role: 'assistant', content: reply });
        appendMessageBubble('assistant', reply, true);
        saveHistory();
      } else {
        const errorMsg = "I'm having a brief issue processing that request. Please feel free to ask again or check our [Marketplace catalog](/products.html)!";
        chatHistory.push({ role: 'assistant', content: errorMsg });
        appendMessageBubble('assistant', errorMsg, true);
      }
    } catch (err) {
      setTypingIndicator(false);
      console.error('Claude AI Assistant client error:', err);
      const fallbackMsg = `⚠️ **Connection notice**: ${err.message || 'Unable to connect to Claude AI right now.'}\n\nYou can still browse active listings on the [Marketplace](/products.html) or post an item at [+ Sell Item](/create-product.html).`;
      chatHistory.push({ role: 'assistant', content: fallbackMsg });
      appendMessageBubble('assistant', fallbackMsg, true);
    } finally {
      isRequestPending = false;
      if (sendBtn) sendBtn.disabled = false;
      if (inputField) {
        inputField.disabled = false;
        inputField.focus();
      }
    }
  }

  /**
   * Clear chat history
   */
  function clearHistory() {
    if (confirm('Clear your conversation with Campus AI?')) {
      chatHistory = [];
      sessionStorage.removeItem(STORAGE_KEY);
      renderMessages();
    }
  }

  /**
   * Widget open/close controls
   */
  function openWidget() {
    injectWidgetDOM();
    const modal = document.getElementById('ai-assistant-modal');
    const launcher = document.getElementById('ai-assistant-launcher');
    if (modal) modal.classList.add('is-open');
    if (launcher) launcher.classList.add('is-open');
    isWidgetOpen = true;

    const inputField = document.getElementById('ai-user-input');
    if (inputField) {
      setTimeout(() => inputField.focus(), 300);
    }
    scrollToBottom();
  }

  function closeWidget() {
    const modal = document.getElementById('ai-assistant-modal');
    const launcher = document.getElementById('ai-assistant-launcher');
    if (modal) modal.classList.remove('is-open');
    if (launcher) launcher.classList.remove('is-open');
    isWidgetOpen = false;
  }

  function toggleWidget() {
    if (isWidgetOpen) {
      closeWidget();
    } else {
      openWidget();
    }
  }

  /**
   * Initialize on DOM Ready
   */
  function init() {
    injectWidgetDOM();
    loadHistory();
    renderMessages();
  }

  // Self-init on ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export to global window object
  window.AiAssistant = {
    init,
    open: openWidget,
    close: closeWidget,
    toggle: toggleWidget,
    sendMessage,
    clearHistory,
  };
})();
