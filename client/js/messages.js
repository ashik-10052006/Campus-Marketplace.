/**
 * Campus Marketplace - In-App Messaging & AI Suggestions Controller
 */

let activeConversationId = null;
let currentConversation = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.Auth.requireAuth();
  if (!user) return;

  const urlParams = new URLSearchParams(window.location.search);
  const targetConvId = urlParams.get('conversationId');

  await loadConversations(targetConvId);
  setupSendForm();
});

async function loadConversations(autoSelectId = null) {
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

      listContainer.innerHTML = convs
        .map((conv) => {
          // Identify the other participant
          const otherUser =
            conv.buyer && conv.buyer._id === currentUser._id ? conv.seller : conv.buyer;
          const otherName = otherUser ? otherUser.name : 'Student';
          const avatar = otherUser ? otherUser.profileImage : '';
          const productName = conv.product ? conv.product.name : 'Marketplace Item';
          const isActive = conv._id === autoSelectId;

          return `
            <div class="conversation-item ${isActive ? 'is-active' : ''}" id="conv-item-${conv._id}" onclick="selectConversation('${conv._id}')">
              ${
                avatar
                  ? `<img src="${avatar}" class="conv-avatar" alt="${window.Utils.escapeHTML(otherName)}" />`
                  : `<div class="conv-avatar-placeholder">${window.Utils.escapeHTML(otherName.charAt(0).toUpperCase())}</div>`
              }
              <div class="conv-details">
                <div class="conv-top">
                  <span class="conv-name">${window.Utils.escapeHTML(otherName)}</span>
                  <span class="conv-time">${window.Utils.formatRelativeTime(conv.lastMessageAt || conv.createdAt)}</span>
                </div>
                <div class="conv-product">🏷️ ${window.Utils.escapeHTML(productName)}</div>
                <div class="conv-last-msg">${window.Utils.escapeHTML(conv.lastMessage || 'Conversation started')}</div>
              </div>
            </div>
          `;
        })
        .join('');

      // Auto-select if requested or pick the first
      const idToSelect = autoSelectId || (convs.length > 0 ? convs[0]._id : null);
      if (idToSelect) {
        selectConversation(idToSelect);
      }
    }
  } catch (error) {
    console.error('Failed to load conversations:', error);
    window.Utils.renderError(listContainer, 'Failed to fetch conversations.');
  }
}

window.selectConversation = async function (conversationId) {
  activeConversationId = conversationId;

  // Highlight active item in sidebar
  document.querySelectorAll('.conversation-item').forEach((el) => el.classList.remove('is-active'));
  const activeItem = document.getElementById(`conv-item-${conversationId}`);
  if (activeItem) activeItem.classList.add('is-active');

  const emptyView = document.getElementById('chat-empty-view');
  const activeView = document.getElementById('chat-active-view');
  const messagesBox = document.getElementById('chat-messages');

  if (emptyView) emptyView.style.display = 'none';
  if (activeView) activeView.style.display = 'flex';

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
        if (sidebar) sidebar.classList.remove('hidden-mobile');
        if (chatPanel) chatPanel.classList.add('hidden-mobile');
        backBtn.style.display = 'none';
      };
    }
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
    }
  } catch (error) {
    console.error('Failed to load chat:', error);
    if (messagesBox) {
      window.Utils.renderError(messagesBox, error.message || 'Could not load chat messages');
    }
  }
};

function renderChatHeader(conv) {
  const productImg = document.getElementById('chat-product-img');
  const productLink = document.getElementById('chat-product-link');
  const productPrice = document.getElementById('chat-product-price');
  const participantInfo = document.getElementById('chat-participant-info');

  const currentUser = window.Auth.getUser();
  const otherUser = conv.buyer && conv.buyer._id === currentUser._id ? conv.seller : conv.buyer;

  if (conv.product) {
    if (productImg) productImg.src = conv.product.imageUrl;
    if (productLink) {
      productLink.textContent = conv.product.name;
      productLink.href = `/product-details.html?id=${conv.product._id}`;
    }
    if (productPrice) productPrice.textContent = window.Utils.formatCurrency(conv.product.price);
  }

  if (participantInfo && otherUser) {
    participantInfo.innerHTML = `Chatting with: <strong>${window.Utils.escapeHTML(otherUser.name)}</strong>`;
  }
}

function renderMessages(messages) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const currentUser = window.Auth.getUser();

  if (messages.length === 0) {
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
      const isSentByMe = msg.sender && msg.sender._id === currentUser._id;
      return `
        <div class="message-bubble ${isSentByMe ? 'message-sent' : 'message-received'}">
          <div class="message-text">${window.Utils.escapeHTML(msg.text)}</div>
          <div class="message-meta">${window.Utils.formatRelativeTime(msg.createdAt)}</div>
        </div>
      `;
    })
    .join('');

  // Scroll to bottom
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
    sendBtn.innerHTML = '&#10148;'; // ➤ arrow

    // Clicking text or chip body inserts into input, focuses, and highlights
    label.addEventListener('click', (e) => {
      e.stopPropagation();
      applyAiSuggestion(text, false);
    });

    // Clicking the chip container
    chip.addEventListener('click', () => {
      const input = document.getElementById('message-input');
      // If user clicks the chip while it is already populated in the input, send it
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
    // Trigger reflow to restart CSS animation
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
      if (container) {
        // Remove empty placeholder notice if it exists
        const emptyNotice = container.querySelector('.empty-chat-notice');
        if (emptyNotice) emptyNotice.remove();

        // Append sent message bubble
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble message-sent';
        bubble.innerHTML = `
          <div class="message-text">${window.Utils.escapeHTML(res.data.message.text)}</div>
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
