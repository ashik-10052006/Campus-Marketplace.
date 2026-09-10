/**
 * Campus Marketplace - In-App Messaging, Real-Time Polling & AI Suggestions Controller
 */

let activeConversationId = null;
let currentConversation = null;
const renderedMessageIds = new Set();
let activeChatPollTimer = null;
let conversationsListPollTimer = null;
let isPollingChat = false;
let isPollingList = false;

const CHAT_POLL_INTERVAL = 2500; // Check for incoming messages every 2.5s
const LIST_POLL_INTERVAL = 5000; // Refresh sidebar thread list every 5s

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.Auth.requireAuth();
  if (!user) return;

  const urlParams = new URLSearchParams(window.location.search);
  const targetConvId = urlParams.get('conversationId');

  await loadConversations(targetConvId);
  setupSendForm();
  startConversationsListPolling();

  // Handle tab visibility to pause or resume polling seamlessly
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      pollActiveChat();
      pollConversationsList();
      if (activeConversationId) startActiveChatPolling();
      startConversationsListPolling();
    } else {
      stopActiveChatPolling();
      stopConversationsListPolling();
    }
  });

  window.addEventListener('beforeunload', () => {
    stopActiveChatPolling();
    stopConversationsListPolling();
  });
});

/**
 * Gentle auditory chime using Web Audio API when a new message arrives
 */
function playIncomingMessageChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.08); // A5
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.28);
  } catch (e) {
    // Browser audio policy may silence without user interaction, gracefully ignore
  }
}

async function loadConversations(autoSelectId = null, isBackgroundRefresh = false) {
  const listContainer = document.getElementById('conversations-list');
  if (!listContainer) return;

  try {
    const res = await window.API.getConversations();
    if (res.success && res.data) {
      const convs = res.data.conversations || [];

      if (convs.length === 0) {
        window.Utils.renderEmptyState(listContainer, {
          title: 'No chats yet',
          subtitle: 'Visit any listing to contact the student seller!',
          actionText: 'Browse Catalog',
          actionLink: '/products.html',
        });
        return;
      }

      const currentUser = window.Auth.getUser();
      const currentUserId = currentUser ? (currentUser._id || currentUser.id)?.toString() : '';

      listContainer.innerHTML = convs
        .map((conv) => {
          // Identify the other participant safely using string ID comparison
          const buyerId = conv.buyer ? (conv.buyer._id || conv.buyer)?.toString() : '';
          const otherUser = buyerId === currentUserId ? conv.seller : conv.buyer;
          const otherName = otherUser ? (otherUser.name || 'Student') : 'Student';
          const avatar = otherUser ? (otherUser.profileImage || '') : '';
          const productName = conv.product ? (conv.product.name || 'Marketplace Item') : 'Marketplace Item';
          const isActive = conv._id === (autoSelectId || activeConversationId);
          const unreadCount = conv.unreadCount || 0;

          return `
            <div class="conversation-item ${isActive ? 'is-active' : ''}" id="conv-item-${conv._id}" data-conv-id="${conv._id}" role="button" tabindex="0">
              ${
                avatar
                  ? `<img src="${avatar}" class="conv-avatar" alt="${window.Utils.escapeHTML(otherName)}" />`
                  : `<div class="conv-avatar-placeholder">${window.Utils.escapeHTML(otherName.charAt(0).toUpperCase())}</div>`
              }
              <div class="conv-details">
                <div class="conv-top">
                  <span class="conv-name">${window.Utils.escapeHTML(otherName)}</span>
                  <div style="display: flex; align-items: center;">
                    <span class="conv-time">${window.Utils.formatRelativeTime(conv.lastMessageAt || conv.createdAt)}</span>
                    ${unreadCount > 0 && !isActive ? `<span class="conv-unread-badge">${unreadCount}</span>` : ''}
                  </div>
                </div>
                <div class="conv-product">🏷️ ${window.Utils.escapeHTML(productName)}</div>
                <div class="conv-last-msg">${window.Utils.escapeHTML(conv.lastMessage || 'Conversation started')}</div>
              </div>
            </div>
          `;
        })
        .join('');

      // Event delegation for clicking on conversations
      listContainer.onclick = (e) => {
        const item = e.target.closest('.conversation-item');
        if (!item) return;
        const convId = item.getAttribute('data-conv-id');
        if (convId) {
          selectConversation(convId);
        }
      };

      // Keyboard accessibility (Enter / Space)
      listContainer.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const item = e.target.closest('.conversation-item');
          if (!item) return;
          e.preventDefault();
          const convId = item.getAttribute('data-conv-id');
          if (convId) {
            selectConversation(convId);
          }
        }
      };

      // Auto-select on initial non-background load
      if (!isBackgroundRefresh) {
        const isMobile = window.innerWidth <= 768;
        const sidebar = document.getElementById('conversations-sidebar');
        const chatPanel = document.getElementById('chat-panel');

        if (autoSelectId) {
          selectConversation(autoSelectId);
        } else if (!isMobile && convs.length > 0) {
          selectConversation(convs[0]._id);
        } else if (isMobile) {
          // On mobile without an explicit conversation requested, show thread list
          if (sidebar) sidebar.classList.remove('hidden-mobile');
          if (chatPanel) chatPanel.classList.add('hidden-mobile');
        }
      }
    }
  } catch (error) {
    console.error('Failed to load conversations:', error);
    if (!isBackgroundRefresh) {
      window.Utils.renderError(listContainer, 'Failed to fetch conversations.');
    }
  }
}

async function selectConversation(conversationId) {
  if (!conversationId) return;

  // Stop any active polling during switch
  stopActiveChatPolling();
  activeConversationId = conversationId;
  renderedMessageIds.clear();

  // Highlight active item in sidebar & clear unread badge
  document.querySelectorAll('.conversation-item').forEach((el) => el.classList.remove('is-active'));
  const activeItem =
    document.getElementById(`conv-item-${conversationId}`) ||
    document.querySelector(`[data-conv-id="${conversationId}"]`);
  if (activeItem) {
    activeItem.classList.add('is-active');
    const badge = activeItem.querySelector('.conv-unread-badge');
    if (badge) badge.remove();
  }

  const emptyView = document.getElementById('chat-empty-view');
  const activeView = document.getElementById('chat-active-view');
  const messagesBox = document.getElementById('chat-messages');

  if (emptyView) emptyView.style.display = 'none';
  if (activeView) activeView.style.display = 'flex';

  // Seamlessly update browser URL so refreshing keeps the current conversation
  try {
    const url = new URL(window.location);
    url.searchParams.set('conversationId', conversationId);
    window.history.replaceState({}, '', url);
  } catch (e) {
    // Ignore in non-standard environments
  }

  // Handle mobile view toggling
  const sidebar = document.getElementById('conversations-sidebar');
  const chatPanel = document.getElementById('chat-panel');
  const backBtn = document.getElementById('back-to-convs-btn');

  if (window.innerWidth <= 768) {
    if (sidebar) sidebar.classList.add('hidden-mobile');
    if (chatPanel) chatPanel.classList.remove('hidden-mobile');
    if (backBtn) {
      backBtn.style.display = 'inline-flex';
      backBtn.onclick = () => {
        stopActiveChatPolling();
        activeConversationId = null;
        if (sidebar) sidebar.classList.remove('hidden-mobile');
        if (chatPanel) chatPanel.classList.add('hidden-mobile');
        backBtn.style.display = 'none';
        try {
          const url = new URL(window.location);
          url.searchParams.delete('conversationId');
          window.history.replaceState({}, '', url);
        } catch (e) {}
      };
    }
  } else {
    if (backBtn) backBtn.style.display = 'none';
    if (sidebar) sidebar.classList.remove('hidden-mobile');
    if (chatPanel) chatPanel.classList.remove('hidden-mobile');
  }

  if (messagesBox) {
    messagesBox.innerHTML = `
      <div class="spinner-wrapper" style="margin: auto;">
        <div class="spinner"></div>
        <span class="spinner-text">Loading chat messages...</span>
      </div>
    `;
  }

  try {
    const res = await window.API.getConversation(conversationId);
    if (res.success && res.data) {
      currentConversation = res.data.conversation;
      const messages = res.data.messages || [];

      renderChatHeader(currentConversation);
      renderMessages(messages);
      loadAiSuggestions(currentConversation, messages);

      // Start automatic polling for incoming messages in this chat
      startActiveChatPolling();
    }
  } catch (error) {
    console.error('Failed to load chat:', error);
    if (messagesBox) {
      window.Utils.renderError(messagesBox, error.message || 'Could not load chat messages');
    }
  }
}

window.selectConversation = selectConversation;

/**
 * Background poller to automatically fetch incoming messages without reloading
 */
async function pollActiveChat() {
  if (!activeConversationId || isPollingChat) return;

  isPollingChat = true;

  try {
    const res = await window.API.getConversation(activeConversationId);
    if (res.success && res.data && res.data.conversation) {
      // Ensure the user hasn't switched conversation while request was pending
      if (res.data.conversation._id !== activeConversationId) return;

      currentConversation = res.data.conversation;
      const messages = res.data.messages || [];
      const container = document.getElementById('chat-messages');

      if (!container) return;

      const currentUser = window.Auth.getUser();
      const currentUserId = currentUser ? (currentUser._id || currentUser.id)?.toString() : '';

      // Identify newly received messages that haven't been rendered yet
      const newMessages = messages.filter((m) => {
        const id = (m._id || m.id)?.toString();
        return id && !renderedMessageIds.has(id);
      });

      if (newMessages.length > 0) {
        // Remove empty placeholder notice if it exists
        const emptyNotice = container.querySelector('.empty-chat-notice');
        if (emptyNotice) emptyNotice.remove();

        // Check if user is currently near the bottom of the message stream
        const isNearBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight < 160;

        let hasIncomingFromOther = false;
        let lastMsg = null;

        newMessages.forEach((msg) => {
          const id = (msg._id || msg.id)?.toString();
          if (id) renderedMessageIds.add(id);

          const senderId = msg.sender ? (msg.sender._id || msg.sender)?.toString() : '';
          const isSentByMe = senderId && senderId === currentUserId;

          if (!isSentByMe) {
            hasIncomingFromOther = true;
          }

          const bubble = document.createElement('div');
          bubble.className = `message-bubble ${isSentByMe ? 'message-sent' : 'message-received'}`;
          bubble.innerHTML = `
            <div class="message-text">${window.Utils.escapeHTML(msg.text)}</div>
            <div class="message-meta">${window.Utils.formatRelativeTime(msg.createdAt)}</div>
          `;
          container.appendChild(bubble);
          lastMsg = msg;
        });

        // If an incoming message from the peer arrived, play gentle chime and refresh AI smart replies
        if (hasIncomingFromOther) {
          playIncomingMessageChime();
          loadAiSuggestions(currentConversation, messages);
        }

        // Smooth scroll to bottom if user is reading recent messages
        if (isNearBottom || !hasIncomingFromOther) {
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }

        // Update sidebar thread preview immediately
        if (lastMsg) {
          const convItem = document.getElementById(`conv-item-${activeConversationId}`);
          if (convItem) {
            const lastMsgEl = convItem.querySelector('.conv-last-msg');
            if (lastMsgEl) lastMsgEl.textContent = lastMsg.text;
            const timeEl = convItem.querySelector('.conv-time');
            if (timeEl) timeEl.textContent = window.Utils.formatRelativeTime(lastMsg.createdAt);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Background chat poll warning:', err);
  } finally {
    isPollingChat = false;
  }
}

function startActiveChatPolling() {
  stopActiveChatPolling();
  activeChatPollTimer = setInterval(pollActiveChat, CHAT_POLL_INTERVAL);
}

function stopActiveChatPolling() {
  if (activeChatPollTimer) {
    clearInterval(activeChatPollTimer);
    activeChatPollTimer = null;
  }
}

/**
 * Background poller to refresh the thread list in the sidebar (snippets, time, unread counts)
 */
async function pollConversationsList() {
  if (isPollingList) return;
  isPollingList = true;

  try {
    const res = await window.API.getConversations();
    if (res.success && res.data && res.data.conversations) {
      const convs = res.data.conversations;
      const listContainer = document.getElementById('conversations-list');
      if (!listContainer) return;

      const currentItems = listContainer.querySelectorAll('.conversation-item');

      // If the number of conversations changed or empty notice is present, re-render list
      if (currentItems.length !== convs.length || listContainer.querySelector('.empty-state')) {
        await loadConversations(activeConversationId, true);
        return;
      }

      // In-place update to preserve DOM focus and scroll position
      convs.forEach((conv) => {
        const item = document.getElementById(`conv-item-${conv._id}`);
        if (item) {
          const lastMsgEl = item.querySelector('.conv-last-msg');
          if (lastMsgEl && conv.lastMessage) {
            lastMsgEl.textContent = conv.lastMessage;
          }
          const timeEl = item.querySelector('.conv-time');
          if (timeEl && (conv.lastMessageAt || conv.createdAt)) {
            timeEl.textContent = window.Utils.formatRelativeTime(conv.lastMessageAt || conv.createdAt);
          }

          // Update unread count badge
          let badgeEl = item.querySelector('.conv-unread-badge');
          if (conv.unreadCount > 0 && conv._id !== activeConversationId) {
            if (!badgeEl) {
              badgeEl = document.createElement('span');
              badgeEl.className = 'conv-unread-badge';
              const topEl = item.querySelector('.conv-top');
              if (topEl) topEl.appendChild(badgeEl);
            }
            badgeEl.textContent = conv.unreadCount;
          } else if (badgeEl) {
            badgeEl.remove();
          }
        }
      });
    }
  } catch (err) {
    console.warn('Background conversations list poll warning:', err);
  } finally {
    isPollingList = false;
  }
}

function startConversationsListPolling() {
  stopConversationsListPolling();
  conversationsListPollTimer = setInterval(pollConversationsList, LIST_POLL_INTERVAL);
}

function stopConversationsListPolling() {
  if (conversationsListPollTimer) {
    clearInterval(conversationsListPollTimer);
    conversationsListPollTimer = null;
  }
}

function renderChatHeader(conv) {
  if (!conv) return;

  const productImg = document.getElementById('chat-product-img');
  const productLink = document.getElementById('chat-product-link');
  const productPrice = document.getElementById('chat-product-price');
  const participantInfo = document.getElementById('chat-participant-info');

  const currentUser = window.Auth.getUser();
  const currentUserId = currentUser ? (currentUser._id || currentUser.id)?.toString() : '';
  const buyerId = conv.buyer ? (conv.buyer._id || conv.buyer)?.toString() : '';
  const otherUser = buyerId === currentUserId ? conv.seller : conv.buyer;
  const otherName = otherUser ? (otherUser.name || 'Student') : 'Student';

  if (conv.product) {
    if (productImg) {
      productImg.src = conv.product.imageUrl || 'https://via.placeholder.com/80';
      productImg.style.display = 'block';
    }
    if (productLink) {
      productLink.textContent = conv.product.name || 'Marketplace Item';
      productLink.href = `/product-details.html?id=${conv.product._id || ''}`;
    }
    if (productPrice) {
      productPrice.textContent = conv.product.price != null
        ? window.Utils.formatCurrency(conv.product.price)
        : '';
    }
  } else {
    if (productImg) productImg.style.display = 'none';
    if (productLink) {
      productLink.textContent = 'Marketplace Item';
      productLink.removeAttribute('href');
    }
    if (productPrice) productPrice.textContent = '';
  }

  if (participantInfo) {
    participantInfo.innerHTML = `Chatting with: <strong>${window.Utils.escapeHTML(otherName)}</strong>`;
  }
}

function renderMessages(messages) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const currentUser = window.Auth.getUser();
  const currentUserId = currentUser ? (currentUser._id || currentUser.id)?.toString() : '';

  renderedMessageIds.clear();

  if (!messages || messages.length === 0) {
    container.innerHTML = `
      <div class="empty-chat-notice" style="text-align: center; color: var(--text-muted); margin: auto; padding: 2rem;">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">👋</div>
        <p>No messages yet. Send a message or click an AI suggestion below to break the ice!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = messages
    .map((msg) => {
      const id = (msg._id || msg.id)?.toString();
      if (id) renderedMessageIds.add(id);

      const senderId = msg.sender ? (msg.sender._id || msg.sender)?.toString() : '';
      const isSentByMe = senderId && senderId === currentUserId;
      return `
        <div class="message-bubble ${isSentByMe ? 'message-sent' : 'message-received'}">
          <div class="message-text">${window.Utils.escapeHTML(msg.text)}</div>
          <div class="message-meta">${window.Utils.formatRelativeTime(msg.createdAt)}</div>
        </div>
      `;
    })
    .join('');

  // Scroll to bottom initially
  container.scrollTop = container.scrollHeight;
}

const DEFAULT_AI_SUGGESTIONS = [
  'Is this item still available?',
  'Can I see the item before buying?',
  'Is the price negotiable?',
  'Where can we meet on campus for pickup?',
];

function renderAiChips(suggestions) {
  const chipsContainer = document.getElementById('ai-chips-list');
  if (!chipsContainer) return;

  chipsContainer.innerHTML = '';
  const list = Array.isArray(suggestions) && suggestions.length > 0 ? suggestions : DEFAULT_AI_SUGGESTIONS;

  list.forEach((text) => {
    const chip = document.createElement('div');
    chip.className = 'ai-chip';
    chip.setAttribute('role', 'button');
    chip.setAttribute('tabindex', '0');
    chip.title = 'Click to use this reply, or click ➤ to send immediately';

    const label = document.createElement('span');
    label.className = 'ai-chip-text';
    label.textContent = text;

    const sendBtn = document.createElement('button');
    sendBtn.type = 'button';
    sendBtn.className = 'ai-chip-send-btn';
    sendBtn.title = 'Send immediately';
    sendBtn.setAttribute('aria-label', 'Send reply immediately');
    sendBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="display:block; transform: translate(0.5px, -0.5px);"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';

    // Clicking text inserts into input, focuses, and highlights
    label.addEventListener('click', (e) => {
      e.stopPropagation();
      applyAiSuggestion(text, false);
    });

    // Clicking the chip container
    chip.addEventListener('click', () => {
      const input = document.getElementById('message-input');
      if (input && input.value.trim() === text.trim()) {
        applyAiSuggestion(text, true);
      } else {
        applyAiSuggestion(text, false);
      }
    });

    // Enter / Space key accessibility
    chip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        applyAiSuggestion(text, false);
      }
    });

    // Clicking the send icon immediately sends
    sendBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      applyAiSuggestion(text, true);
    });

    chip.appendChild(label);
    chip.appendChild(sendBtn);
    chipsContainer.appendChild(chip);
  });
}

async function loadAiSuggestions(conv, messages) {
  const chipsContainer = document.getElementById('ai-chips-list');
  if (!chipsContainer) return;

  // Render defaults immediately so suggestions are never missing or blank
  renderAiChips(DEFAULT_AI_SUGGESTIONS);

  const lastContext =
    messages && messages.length > 0 ? messages.slice(-2).map((m) => m.text).join(' | ') : '';

  try {
    const res = await window.API.getMessageSuggestions({
      productName: conv && conv.product ? conv.product.name : 'Item',
      productPrice: conv && conv.product ? conv.product.price : 0,
      conversationContext: lastContext,
    });

    if (res.success && res.data && res.data.suggestions && res.data.suggestions.length > 0) {
      renderAiChips(res.data.suggestions);
    }
  } catch (err) {
    console.warn('AI suggestions error, using defaults:', err);
    renderAiChips(DEFAULT_AI_SUGGESTIONS);
  }
}

window.applyAiSuggestion = function (text, autoSend = false) {
  if (autoSend) {
    sendChatMessage(text);
    return;
  }

  const input = document.getElementById('message-input');
  if (input) {
    input.value = text;
    input.focus();
    input.classList.remove('input-highlight');
    void input.offsetWidth;
    input.classList.add('input-highlight');
    input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
};

async function sendChatMessage(rawText) {
  const text = (rawText || '').trim();
  if (!text || !activeConversationId) return;

  const input = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-msg-btn');
  const container = document.getElementById('chat-messages');

  try {
    if (sendBtn) sendBtn.disabled = true;
    if (input) input.value = '';

    const res = await window.API.sendMessage(activeConversationId, text);
    if (res.success && res.data && res.data.message) {
      const msg = res.data.message;
      const msgId = (msg._id || msg.id)?.toString();
      if (msgId) {
        renderedMessageIds.add(msgId);
      }

      if (container) {
        // Remove empty placeholder notice if it exists
        const emptyNotice = container.querySelector('.empty-chat-notice');
        if (emptyNotice) emptyNotice.remove();

        // Append sent message bubble
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble message-sent';
        bubble.innerHTML = `
          <div class="message-text">${window.Utils.escapeHTML(msg.text)}</div>
          <div class="message-meta">just now</div>
        `;
        container.appendChild(bubble);
        container.scrollTop = container.scrollHeight;
      }

      // Update snippet in sidebar
      const convItem = document.getElementById(`conv-item-${activeConversationId}`);
      if (convItem) {
        const lastMsgEl = convItem.querySelector('.conv-last-msg');
        if (lastMsgEl) lastMsgEl.textContent = text;
        const timeEl = convItem.querySelector('.conv-time');
        if (timeEl) timeEl.textContent = 'just now';
      }

      // Refresh AI suggestions based on the updated conversation context
      if (currentConversation) {
        loadAiSuggestions(currentConversation, [
          { text, sender: { _id: window.Auth.getUser()._id } },
        ]);
      }
    }
  } catch (err) {
    window.Utils.showToast(err.message || 'Failed to send message', 'error');
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    if (input) input.focus();
  }
}

function setupSendForm() {
  const form = document.getElementById('message-send-form');
  const input = document.getElementById('message-input');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input ? input.value : '';
      await sendChatMessage(text);
    });
  }
}
