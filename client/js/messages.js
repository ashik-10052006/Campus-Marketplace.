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
      <div style="text-align: center; color: var(--text-muted); margin: auto; padding: 2rem;">
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

async function loadAiSuggestions(conv, messages) {
  const chipsContainer = document.getElementById('ai-chips-list');
  if (!chipsContainer) return;

  const lastContext =
    messages.length > 0 ? messages.slice(-2).map((m) => m.text).join(' | ') : '';

  try {
    const res = await window.API.getMessageSuggestions({
      productName: conv.product ? conv.product.name : 'Item',
      productPrice: conv.product ? conv.product.price : 0,
      conversationContext: lastContext,
    });

    if (res.success && res.data && res.data.suggestions) {
      chipsContainer.innerHTML = res.data.suggestions
        .map((s) => {
          return `<button type="button" class="ai-chip" onclick="applyAiSuggestion('${window.Utils.escapeHTML(s)}')">${window.Utils.escapeHTML(s)}</button>`;
        })
        .join('');
    }
  } catch (err) {
    console.warn('AI suggestions error:', err);
  }
}

window.applyAiSuggestion = function (text) {
  const input = document.getElementById('message-input');
  if (input) {
    input.value = text;
    input.focus();
  }
};

function setupSendForm() {
  const form = document.getElementById('message-send-form');
  const input = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-msg-btn');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input.value.trim();

      if (!text || !activeConversationId) return;

      try {
        sendBtn.disabled = true;
        input.value = '';

        const res = await window.API.sendMessage(activeConversationId, text);
        if (res.success && res.data && res.data.message) {
          const container = document.getElementById('chat-messages');

          // Append message bubble
          const bubble = document.createElement('div');
          bubble.className = 'message-bubble message-sent';
          bubble.innerHTML = `
            <div class="message-text">${window.Utils.escapeHTML(res.data.message.text)}</div>
            <div class="message-meta">just now</div>
          `;
          container.appendChild(bubble);
          container.scrollTop = container.scrollHeight;

          // Update snippet in sidebar
          const convItem = document.getElementById(`conv-item-${activeConversationId}`);
          if (convItem) {
            const lastMsgEl = convItem.querySelector('.conv-last-msg');
            if (lastMsgEl) lastMsgEl.textContent = text;
          }
        }
      } catch (err) {
        window.Utils.showToast(err.message || 'Failed to send message', 'error');
      } finally {
        sendBtn.disabled = false;
        input.focus();
      }
    });
  }
}
