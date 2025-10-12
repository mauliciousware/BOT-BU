// Chat Storage Management using localStorage

const STORAGE_KEY = 'bu_ai_chats';
const CURRENT_CHAT_KEY = 'bu_ai_current_chat';

/**
 * Check if localStorage is available
 * @returns {boolean}
 */
function isLocalStorageAvailable() {
  try {
    return typeof window !== 'undefined' && window.localStorage !== undefined;
  } catch (e) {
    return false;
  }
}

/**
 * Get all chats from localStorage
 * @returns {Array} Array of chat objects
 */
export function getAllChats() {
  if (!isLocalStorageAvailable()) return [];
  
  try {
    const chatsJson = localStorage.getItem(STORAGE_KEY);
    if (!chatsJson) return [];
    const chats = JSON.parse(chatsJson);
    return Array.isArray(chats) ? chats : [];
  } catch (error) {
    console.error('Error loading chats:', error);
    return [];
  }
}

/**
 * Save all chats to localStorage
 * @param {Array} chats - Array of chat objects
 */
export function saveAllChats(chats) {
  if (!isLocalStorageAvailable()) return;
  
  try {
    if (!Array.isArray(chats)) {
      console.error('Invalid chats data');
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  } catch (error) {
    console.error('Error saving chats:', error);
  }
}

/**
 * Create a new chat
 * @param {string} firstMessage - The first message content (optional)
 * @returns {Object} New chat object
 */
export function createNewChat(firstMessage = '') {
  const newChat = {
    id: Date.now().toString(),
    title: firstMessage ? generateTitle(firstMessage) : 'New Chat',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPinned: false
  };
  
  const chats = getAllChats();
  chats.unshift(newChat); // Add to beginning
  saveAllChats(chats);
  setCurrentChatId(newChat.id);
  
  return newChat;
}

/**
 * Get a specific chat by ID
 * @param {string} chatId - Chat ID
 * @returns {Object|null} Chat object or null
 */
export function getChatById(chatId) {
  const chats = getAllChats();
  return chats.find(chat => chat.id === chatId) || null;
}

/**
 * Update a chat
 * @param {string} chatId - Chat ID
 * @param {Object} updates - Updates to apply
 */
export function updateChat(chatId, updates) {
  const chats = getAllChats();
  const chatIndex = chats.findIndex(chat => chat.id === chatId);
  
  if (chatIndex !== -1) {
    chats[chatIndex] = {
      ...chats[chatIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    saveAllChats(chats);
  }
}

/**
 * Add a message to a chat
 * @param {string} chatId - Chat ID
 * @param {Object} message - Message object
 */
export function addMessageToChat(chatId, message) {
  const chats = getAllChats();
  const chatIndex = chats.findIndex(chat => chat.id === chatId);
  
  if (chatIndex !== -1) {
    chats[chatIndex].messages.push(message);
    chats[chatIndex].updatedAt = new Date().toISOString();
    
    // Auto-generate title from first user message
    if (chats[chatIndex].messages.length === 1 && message.type === 'user') {
      chats[chatIndex].title = generateTitle(message.content);
    }
    
    saveAllChats(chats);
  }
}

/**
 * Delete a chat
 * @param {string} chatId - Chat ID
 */
export function deleteChat(chatId) {
  if (!isLocalStorageAvailable()) return;
  
  const chats = getAllChats();
  const filteredChats = chats.filter(chat => chat.id !== chatId);
  saveAllChats(filteredChats);
  
  // If deleting current chat, clear current chat ID
  if (getCurrentChatId() === chatId) {
    try {
      localStorage.removeItem(CURRENT_CHAT_KEY);
    } catch (error) {
      console.error('Error removing current chat ID:', error);
    }
  }
}

/**
 * Rename a chat
 * @param {string} chatId - Chat ID
 * @param {string} newTitle - New title
 */
export function renameChat(chatId, newTitle) {
  updateChat(chatId, { title: newTitle });
}

/**
 * Toggle pin status of a chat
 * @param {string} chatId - Chat ID
 */
export function togglePinChat(chatId) {
  const chat = getChatById(chatId);
  if (chat) {
    updateChat(chatId, { isPinned: !chat.isPinned });
  }
}

/**
 * Get current chat ID
 * @returns {string|null} Current chat ID or null
 */
export function getCurrentChatId() {
  if (!isLocalStorageAvailable()) return null;
  try {
    return localStorage.getItem(CURRENT_CHAT_KEY);
  } catch (error) {
    console.error('Error getting current chat ID:', error);
    return null;
  }
}

/**
 * Set current chat ID
 * @param {string} chatId - Chat ID
 */
export function setCurrentChatId(chatId) {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.setItem(CURRENT_CHAT_KEY, chatId);
  } catch (error) {
    console.error('Error setting current chat ID:', error);
  }
}

/**
 * Generate a title from message content
 * @param {string} content - Message content
 * @returns {string} Generated title
 */
function generateTitle(content) {
  // Take first 50 characters and add ellipsis if needed
  const title = content.slice(0, 50).trim();
  return content.length > 50 ? `${title}...` : title;
}

/**
 * Get formatted timestamp for display
 * @param {string} isoString - ISO date string
 * @returns {string} Formatted timestamp
 */
export function getTimestamp(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
}

/**
 * Clear all chats (for testing/reset)
 */
export function clearAllChats() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CURRENT_CHAT_KEY);
}
