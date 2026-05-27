let currentConversationId = null
let statusTransitionTimer = null
let currentVendorId = null

// Toast notification utility
function showToast(message, type = 'info', options = {}) {
  const container = document.getElementById('toast-container') || (() => {
    const el = document.createElement('div');
    el.id = 'toast-container';
    el.style.position = 'fixed';
    el.style.top = '20px';
    el.style.right = '20px';
    el.style.zIndex = '9999';
    document.body.appendChild(el);
    return el;
  })();

  const timeout = options.timeout ?? 3500;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.style.padding = '12px 16px';
  toast.style.marginBottom = '8px';
  toast.style.borderRadius = '4px';
  toast.style.backgroundColor = type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#2196f3';
  toast.style.color = 'white';
  toast.style.fontSize = '14px';
  toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';

  const text = document.createElement('div');
  text.textContent = message;
  toast.appendChild(text);

  let removed = false;
  function dismiss() {
    if (removed) return;
    removed = true;
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }

  container.appendChild(toast);
  if (timeout > 0) {
    setTimeout(dismiss, timeout);
  }
  return { dismiss };
}

document.addEventListener("DOMContentLoaded", async () => {
  const currentUser = JSON.parse(localStorage.getItem("userData"))
  if(!currentUser){
    window.location.href = "login.html";
    return
  }

  try {
    self.ws = new WebSocket(`wss://upstartpy.onrender.com/ws/chat?token=${currentUser.access}`)
    
    ws.onopen = async function() {
      console.log('✅ WebSocket connected successfully');
      await hideLoadingModal();
    };
    
    ws.onmessage = function(e) {
      try {
        const data = JSON.parse(e.data);
        
        if (data.type === 'conversation_list') {
            console.log('💬 Conversations loaded:', data.conversations);
            loadConversations(data.conversations);
        }else if (data.type === "my_messages"){
          console.log('📨 Messages loaded:', data.messages?.length || 0);
          loadMessages(data.messages)
        }else if (data.type === "new_message"){
          console.log('📬 New message received');
          const isSent = data.sender === currentUser.user.id
          addMessage(isSent, data.message, data.timestamp, data.conversation_id)
        }else if (data.type === "mark_chat"){
          const isSent = data.sender === currentUser.user.id
          markAsRead(data.conversation_id, isSent)
        }else {
          console.warn('Unknown message type:', data.type);
        }
      } catch(parseError) {
        console.error('Error parsing WebSocket message:', parseError, e.data);
      }
    };

    ws.onclose = function(e) {
      console.warn('⚠️ WebSocket closed with code:', e.code, 'reason:', e.reason);
      if (e.code !== 1000) {
        showToast('Connection lost. Please refresh the page.', 'error');
      }
    };
      
    ws.onerror = async function(error) {
      console.error('❌ WebSocket error:', error);
      showToast('Failed to connect to chat. Check your connection.', 'error');

      // Ensure the conversations container itself won't be removed by the
      // skeleton cleanup: remove the skeleton-list class first, then hide
      // skeletons, then insert the persistent message.
      try {
        const list = document.getElementById('conversationsList')
        if (list) {
          // Remove any skeleton marker so hideLoadingModal doesn't remove the element
          list.classList.remove('skeleton-list')
        }
      } catch (domErr) {
        console.warn('Could not remove skeleton-list class before hiding skeletons', domErr)
      }

      try {
        await hideLoadingModal();
      } catch (hideErr) {
        // If hiding skeletons fails, continue and try to set the message anyway
        console.warn('hideLoadingModal failed during ws.onerror', hideErr)
      }

      try {
        const list = document.getElementById('conversationsList')
        if (list) {
          list.innerHTML = '<div class="no-conversations" style="padding: 20px; text-align: center; color: var(--text-secondary); font-size: 14px;">No conversations found</div>'
        }
      } catch (domErr) {
        console.warn('Could not update conversations sidebar after WS error', domErr)
      }
    };
  } catch(error) {
    console.error('Error initializing WebSocket:', error);
    showToast('Failed to initialize chat. Please try again.', 'error');
    await hideLoadingModal();
  }

  // Reset scroll positions to default on page load.
  try {
    setTimeout(() => {
      const messagesList = document.getElementById('messagesList')
      const conversationsList = document.getElementById('conversationsList')
      if (messagesList) {
        messagesList.scrollTop = 0
        if (messagesList.style && messagesList.style.height) messagesList.style.height = ''
      }
      if (conversationsList) conversationsList.scrollTop = 0
      window.scrollTo(0, 0)
    }, 50)
  } catch (e) {
    console.warn('Could not reset scroll positions on load', e)
  }
})



async function loadConversations(conversations) {
    const currentUser = JSON.parse(localStorage.getItem('userData'))
    const list = document.getElementById("conversationsList")
    if (!list) return // Guard clause if list doesn't exist
    
    if (conversations.length === 0) {
      list.innerHTML =
      '<div style="padding: 20px; text-align: center; color: var(--text-secondary); font-size: 14px;">No conversations yet</div>'
      return
    }
    
    let html = ""
    conversations.forEach((participant) => {
        let isRead = '';
        const lastMessageText = participant.last_message?.text ?? "No messages yet"
        if(participant.last_message?.sender === currentUser?.user?.id){
          isRead = participant.last_message?.is_read ? "Seen" : "Delivered"
        }
        const unreadHTML = (participant.unread_count && participant.unread_count > 0) ? `<span class="conversation-unread-badge">${participant.unread_count}</span>` : `<span class="conversation-unread-badge" style="display: none;">${participant.unread_count}</span>`
        html += `
          <div class="conversation-item" data-conversation-id="${participant.id}" onclick="openConversation('${participant.id}', '${participant.other_user.username}', '${participant.other_user.profile_picture}', ${participant.other_user.status}, '${participant.other_user.last_seen}', '${participant.other_user.id}')">
            <img src="${participant.other_user.profile_picture}" alt="${participant.other_user.username}" class="conversation-avatar">
            <div class="conversation-info">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                <div class="conversation-name">${participant.other_user.username}</div>
                ${unreadHTML}
              </div>
              <div class="conversation-last-message">
                <span class="conversation-last-message-text" title="${lastMessageText}">${lastMessageText}</span>
                <span class="conversation-read-status">${isRead}</span>
              </div>
            </div>
          </div>
        `
        
      })
      list.innerHTML = html 
      console.log(list.innerHTML)
      
}

function openConversation(participantId, participantName, pfp, status, last_seen, vendorId) {
  currentConversationId = participantId
  currentVendorId = vendorId

  // Update UI
  document.querySelectorAll(".conversation-item").forEach((el) => el.classList.remove("active"))
  // Find the conversation item by data attribute and mark it active
  const el = document.querySelector(`.conversation-item[data-conversation-id="${participantId}"]`)
  if (el) el.classList.add("active")

  document.getElementById("chatEmpty").style.display = "none"
  document.getElementById("chatView").style.display = "flex"
  document.getElementById("chatUserName").textContent = participantName
  document.getElementById('chatUserAvatar').src = pfp
  const onlineStatus = document.getElementById('chatUserStatus')

  // Clear any existing timer
  if (statusTransitionTimer) {
    clearTimeout(statusTransitionTimer)
  }

  if (status){
    onlineStatus.innerText = "Online"
  }else{
    // Show full date initially
    onlineStatus.innerHTML = new Date(last_seen).toLocaleString([], { 
      weekday: "short",
      month: "short", 
      day: "numeric", 
      hour: "2-digit", 
      minute: "2-digit" 
    })
    
    // Transition to time-only after 3 seconds
    statusTransitionTimer = setTimeout(() => {
      if (!status && document.getElementById('chatUserStatus') === onlineStatus) {
        onlineStatus.style.transition = 'opacity 0.3s ease-in-out'
        onlineStatus.style.opacity = '0.7'
        
        setTimeout(() => {
          onlineStatus.innerHTML = new Date(last_seen).toLocaleTimeString([], { 
            hour: "2-digit", 
            minute: "2-digit" 
          })
          onlineStatus.style.opacity = '1'
        }, 300)
      }
    }, 3000)
  }

  ws.send(JSON.stringify({
    "action":"get_message",
    "conversation_id": currentConversationId
  }))

  // Close sidebar on mobile when conversation is selected
  if (window.innerWidth <= 768) {
    const sidebar = document.querySelector(".sidebar")
    const chatContainer = document.querySelector(".chat-container")
    
    if (sidebar) sidebar.classList.remove("open")
    if (chatContainer) chatContainer.classList.remove("sidebar-open")
  }
} // End of openConversation

function loadMessages(conversationMessages) {
  const currentUser = JSON.parse(localStorage.getItem("userData"))
  const list = document.getElementById("messagesList")
  
  ws.send(JSON.stringify({
    "action": "mark_as_read",
    "conversation_id": currentConversationId
  }))

  const unreadBadge = document.querySelector(
    `.conversation-item[data-conversation-id="${currentConversationId}"] .conversation-unread-badge`
  );

  if (unreadBadge) {
    unreadBadge.style.display = "none";
  }

  let html = ""
  conversationMessages.forEach((msg, index) => {
    const isSent = msg.sender === currentUser.user.id
    const isLastMessage = index === conversationMessages.length - 1
    console.log(msg.is_read)
    // Determine status for the last message if it's sent by current user
    let statusText = ""
    if (isSent && isLastMessage) {
      statusText = msg.is_read ? " • Seen" : " • Delivered"
    }
    
    html += `
      <div class="message ${isSent ? "sent" : "received"}">
        <div class="message-bubble">${msg.text}</div>
        <div class="message-time">
          ${new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}${statusText}
        </div>
      </div>
    `
  })

  list.innerHTML = html
  list.scrollTop = list.scrollHeight
}

function addMessage(isSent, message, timestamp, conversationId){
  const chatMessages = document.getElementById('messagesList')
  const messageElement = document.createElement('div')
  const lastMessageTime = document.querySelector('.message.sent:last-child .message-time')
  if (lastMessageTime && isSent) {
    lastMessageTime.textContent = lastMessageTime.textContent.replace('• Delivered', '')
  }

  messageElement.className = `message ${isSent ? "sent" : "received"}`
  const status = isSent ? "• Delivered" : ""
  messageElement.innerHTML = `
    <div class="message-bubble">${message}</div>
    <div class="message-time">${new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ${status}</div>
  `
  chatMessages.appendChild(messageElement)

  if(currentConversationId === conversationId){
    ws.send(JSON.stringify({
      "action": "mark_as_read",
      "conversation_id": currentConversationId
    }))
  }
}

function markAsRead(conversation_id, isSent){
  // Only update if the OTHER person is reading MY messages
  if (isSent) return;

    // Update sidebar
  const lastMessageReadEl = document.querySelector(
    `.conversation-item[data-conversation-id="${conversation_id}"] .conversation-read-status`
  )
  if (lastMessageReadEl) {
    lastMessageReadEl.textContent = lastMessageReadEl.textContent.replace('Delivered', 'Seen')
  }
  // Update chat messages
  const allSentMessages = document.querySelectorAll('.message.sent .message-time')
  const lastIndex = allSentMessages.length - 1
  
  allSentMessages.forEach((timeEl, index) => {
    if (index === lastIndex) {
      // Last message: show "Seen"
      timeEl.textContent = timeEl.textContent
        .replace(/ • (Delivered|Seen)/g, '') // Remove old status
        + ' • Seen' // Add new status
    } else {
      // All other messages: remove status completely
      timeEl.textContent = timeEl.textContent.replace(/ • (Delivered|Seen)/g, '')
    }
  })
}

document.getElementById("sendBtn").addEventListener("click", () => {
  const input = document.getElementById("messageInput")
  const text = input.value.trim()
  const chatMessages = document.getElementById('messagesList')

  if (!text || !currentConversationId) return
  ws.send(JSON.stringify({
    "action":"send_message",
    "conversation_id":currentConversationId,
    "message": text
  }))

  input.value = ""
  chatMessages.scrollTop = chatMessages.scrollHeight
})

document.getElementById("chatUserInfo").addEventListener("click", () => {
  window.location.href = `vendor-profile.html?vendorId=${currentVendorId}`
})
document.getElementById("messageInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    document.getElementById("sendBtn").click()
  }
})

// Mobile sidebar toggle functionality
const sidebarToggleBtn = document.getElementById("sidebarToggleBtn")
const sidebarToggleBtnDetail = document.getElementById("sidebarToggleBtnDetail")
const sidebar = document.querySelector(".sidebar")
const chatContainer = document.querySelector(".chat-container")

function toggleSidebar(e) {
  e.stopPropagation()
  sidebar.classList.toggle("open")
  chatContainer.classList.toggle("sidebar-open")
}

if (sidebarToggleBtn) {
  sidebarToggleBtn.addEventListener("click", toggleSidebar)
}

if (sidebarToggleBtnDetail) {
  sidebarToggleBtnDetail.addEventListener("click", toggleSidebar)
}

// Close sidebar when clicking overlay
if (chatContainer) {
  chatContainer.addEventListener("click", (e) => {
    if (chatContainer.classList.contains("sidebar-open") && 
        !sidebar.contains(e.target) && 
        !sidebarToggleBtn.contains(e.target)) {
      sidebar.classList.remove("open")
      chatContainer.classList.remove("sidebar-open")
    }
  })
}

// Close sidebar when conversation is selected on mobile
function closeSidebarOnMobile() {
  if (window.innerWidth <= 768) {
    sidebar.classList.remove("open")
    chatContainer.classList.remove("sidebar-open")
  }
}

// Helper function to hide loading modal with exit animation
function hideLoadingModal() {
  // Remove conversation skeletons items, but not the container
  // We target .conversation-skeleton (the items) and any standalone .skeleton-loader
  // We do NOT target .skeleton-list or .skeleton-grid as they are container classes
  const skeletonSelectors = [
    '.conversation-skeleton',
    '.product-card-skeleton', 
  ];

  // Simply remove the container classes from any elements that have them
  // so we don't keep loading styles on the list containers
  document.querySelectorAll('.skeleton-list').forEach(el => el.classList.remove('skeleton-list'));
  document.querySelectorAll('.skeleton-grid').forEach(el => el.classList.remove('skeleton-grid'));

  const skeletons = Array.from(document.querySelectorAll(skeletonSelectors.join(',')));
  if (!skeletons || skeletons.length === 0) return Promise.resolve();

  return new Promise((resolve) => {
    skeletons.forEach(el => el.classList.add('fade-out'));
    setTimeout(() => {
      skeletons.forEach(el => el.remove());
      resolve();
    }, 350);
  });
}
