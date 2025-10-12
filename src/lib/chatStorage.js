// chat storage managment using localstorage

const STORAGE_KEY = 'bu_ai_chats';
const CURRENT_CHAT_KEY = 'bu_ai_current_chat';

/* check if localstorage is availble */
function isLocalStorageAvailable() {
  try {
    return typeof window !== 'undefined' && window.localStorage !== undefined;
  } catch (e) {
    return false;
  }
}

/* get all chats from localstorage */
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

/* save all chats to localstorage */
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

/* create a new chat */
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
  chats.unshift(newChat); // add to begining
  saveAllChats(chats);
  setCurrentChatId(newChat.id);
  
  return newChat;
}

/* get a specfic chat by id */
export function getChatById(chatId) {
  const chats = getAllChats();
  return chats.find(chat => chat.id === chatId) || null;
}

/* update a chat */
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

/* add a messge to a chat */
export function addMessageToChat(chatId, message) {
  const chats = getAllChats();
  const chatIndex = chats.findIndex(chat => chat.id === chatId);
  
  if (chatIndex !== -1) {
    chats[chatIndex].messages.push(message);
    chats[chatIndex].updatedAt = new Date().toISOString();
    
    // auto genrate title from first user messge
    if (chats[chatIndex].messages.length === 1 && message.type === 'user') {
      chats[chatIndex].title = generateTitle(message.content);
    }
    
    saveAllChats(chats);
  }
}

/* delete a chat */
export function deleteChat(chatId) {
  if (!isLocalStorageAvailable()) return;
  
  const chats = getAllChats();
  const filteredChats = chats.filter(chat => chat.id !== chatId);
  saveAllChats(filteredChats);
  
  // if deletng current chat clear current chat id
  if (getCurrentChatId() === chatId) {
    try {
      localStorage.removeItem(CURRENT_CHAT_KEY);
    } catch (error) {
      console.error('Error removing current chat ID:', error);
    }
  }
}

/* rename a chat */
export function renameChat(chatId, newTitle) {
  updateChat(chatId, { title: newTitle });
}

/* togle pin status of a chat */
export function togglePinChat(chatId) {
  const chat = getChatById(chatId);
  if (chat) {
    updateChat(chatId, { isPinned: !chat.isPinned });
  }
}

/* get current chat id */
export function getCurrentChatId() {
  if (!isLocalStorageAvailable()) return null;
  try {
    return localStorage.getItem(CURRENT_CHAT_KEY);
  } catch (error) {
    console.error('Error getting current chat ID:', error);
    return null;
  }
}

/* set current chat id */
export function setCurrentChatId(chatId) {
  if (!isLocalStorageAvailable()) return;
  try {
    localStorage.setItem(CURRENT_CHAT_KEY, chatId);
  } catch (error) {
    console.error('Error setting current chat ID:', error);
  }
}

/* genrate a title from message conent */
function generateTitle(content) {
  // tak first 50 characters and add elipsis if needed
  const title = content.slice(0, 50).trim();
  return content.length > 50 ? `${title}...` : title;
}

/* get formatted timestmp for display */
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

/* clear all chats (for testing/reset) */
export function clearAllChats() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CURRENT_CHAT_KEY);
}
