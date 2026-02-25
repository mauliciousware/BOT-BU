// Chat storage using AsyncStorage (replaces localStorage from web app)
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'bu_ai_chats';
const CURRENT_CHAT_KEY = 'bu_ai_current_chat';

// In-memory cache for faster synchronous-like access
let cachedChats = null;
let cachedCurrentChatId = null;
let isInitialized = false;

/* Initialize cache from AsyncStorage */
export async function initStorage() {
  if (isInitialized) return;
  try {
    const chatsJson = await AsyncStorage.getItem(STORAGE_KEY);
    cachedChats = chatsJson ? JSON.parse(chatsJson) : [];
    cachedCurrentChatId = await AsyncStorage.getItem(CURRENT_CHAT_KEY);
    isInitialized = true;
  } catch (error) {
    console.error('Error initializing storage:', error);
    cachedChats = [];
    cachedCurrentChatId = null;
    isInitialized = true;
  }
}

/* Persist cache to AsyncStorage (fire & forget) */
async function persistChats() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cachedChats || []));
  } catch (error) {
    console.error('Error persisting chats:', error);
  }
}

/* Get all chats */
export function getAllChats() {
  return cachedChats || [];
}

/* Save all chats */
export function saveAllChats(chats) {
  if (!Array.isArray(chats)) {
    console.error('Invalid chats data');
    return;
  }
  cachedChats = chats;
  persistChats();
}

/* Create a new chat */
export function createNewChat(firstMessage = '') {
  const newChat = {
    id: Date.now().toString(),
    title: firstMessage ? generateTitle(firstMessage) : 'New Chat',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPinned: false,
  };

  const chats = getAllChats();
  chats.unshift(newChat);
  saveAllChats(chats);
  setCurrentChatId(newChat.id);

  return newChat;
}

/* Get a specific chat by id */
export function getChatById(chatId) {
  const chats = getAllChats();
  return chats.find((chat) => chat.id === chatId) || null;
}

/* Update a chat */
export function updateChat(chatId, updates) {
  const chats = getAllChats();
  const chatIndex = chats.findIndex((chat) => chat.id === chatId);

  if (chatIndex !== -1) {
    chats[chatIndex] = {
      ...chats[chatIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveAllChats(chats);
  }
}

/* Add a message to a chat */
export function addMessageToChat(chatId, message) {
  const chats = getAllChats();
  const chatIndex = chats.findIndex((chat) => chat.id === chatId);

  if (chatIndex !== -1) {
    chats[chatIndex].messages.push(message);
    chats[chatIndex].updatedAt = new Date().toISOString();

    // Auto generate title from first user message
    if (chats[chatIndex].messages.length === 1 && message.type === 'user') {
      chats[chatIndex].title = generateTitle(message.content);
    }

    saveAllChats(chats);
  }
}

/* Delete a chat */
export function deleteChat(chatId) {
  const chats = getAllChats();
  const filteredChats = chats.filter((chat) => chat.id !== chatId);
  saveAllChats(filteredChats);

  if (getCurrentChatId() === chatId) {
    cachedCurrentChatId = null;
    AsyncStorage.removeItem(CURRENT_CHAT_KEY).catch(() => {});
  }
}

/* Get current chat id */
export function getCurrentChatId() {
  return cachedCurrentChatId;
}

/* Set current chat id */
export function setCurrentChatId(chatId) {
  cachedCurrentChatId = chatId;
  if (chatId) {
    AsyncStorage.setItem(CURRENT_CHAT_KEY, chatId).catch(() => {});
  } else {
    AsyncStorage.removeItem(CURRENT_CHAT_KEY).catch(() => {});
  }
}

/* Generate a title from message content */
function generateTitle(content) {
  const title = content.slice(0, 50).trim();
  return content.length > 50 ? `${title}...` : title;
}

/* Get formatted timestamp for display */
export function getTimestamp(isoString) {
  if (!isoString) return 'Just now';
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

/* Clear all chats */
export async function clearAllChats() {
  cachedChats = [];
  cachedCurrentChatId = null;
  await AsyncStorage.multiRemove([STORAGE_KEY, CURRENT_CHAT_KEY]);
}
