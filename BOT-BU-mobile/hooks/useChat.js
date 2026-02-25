import { useState, useCallback, useEffect, useRef } from 'react';
import {
  getAllChats,
  getChatById,
  createNewChat,
  addMessageToChat,
  setCurrentChatId,
  deleteChat as deleteChatStorage,
  initStorage,
} from '../lib/chatStorage';
import { callChatAPI } from '../lib/apiRouter';

/**
 * Main chat state hook — mirrors ChatGPTInterface.jsx logic
 */
export function useChat() {
  const [currentChatId, setCurrentChatIdState] = useState(null);
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isReady, setIsReady] = useState(false);
  const abortControllerRef = useRef(null);

  // Initialize storage on mount
  useEffect(() => {
    (async () => {
      await initStorage();
      loadChats();
      setIsReady(true);
    })();
  }, []);

  const loadChats = useCallback(() => {
    try {
      const loadedChats = getAllChats();
      setChats(loadedChats || []);
    } catch (error) {
      console.error('Error loading chats:', error);
      setChats([]);
    }
  }, []);

  const startNewChat = useCallback(() => {
    setCurrentChatIdState(null);
    setMessages([]);
    setCurrentChatId(null);
  }, []);

  const selectChat = useCallback((chat) => {
    if (!chat || !chat.id) return;
    try {
      setCurrentChatIdState(chat.id);
      setMessages(chat.messages || []);
      setCurrentChatId(chat.id);
    } catch (error) {
      console.error('Error selecting chat:', error);
    }
  }, []);

  const handleDeleteChat = useCallback(
    (chatId) => {
      deleteChatStorage(chatId);
      if (chatId === currentChatId) {
        startNewChat();
      }
      loadChats();
    },
    [currentChatId, startNewChat, loadChats]
  );

  const sendMessage = useCallback(
    async (content) => {
      let chatId = currentChatId;

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new chat if none exists
      if (!chatId) {
        const newChat = createNewChat(content);
        chatId = newChat.id;
        setCurrentChatIdState(chatId);
        loadChats();
      }

      const userMessage = {
        id: Date.now().toString(),
        type: 'user',
        content,
        timestamp: new Date().toISOString(),
      };

      addMessageToChat(chatId, userMessage);
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setStreamingMessage('');

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const data = await callChatAPI(content, messages, controller.signal);
        const fullResponse =
          data.message || "I'm here to help! However, I encountered an issue processing your request.";
        const words = fullResponse.split(' ');

        // Simulate streaming word-by-word
        for (let i = 0; i < words.length; i++) {
          if (controller.signal.aborted) return;
          const partial = words.slice(0, i + 1).join(' ');
          setStreamingMessage(partial);
          await new Promise((resolve) => setTimeout(resolve, 30));
        }

        const botMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: fullResponse,
          timestamp: new Date().toISOString(),
          metadata: data.metadata,
          skipAnimation: true,
        };

        addMessageToChat(chatId, botMessage);
        setMessages((prev) => [...prev, botMessage]);
        setStreamingMessage('');
        loadChats();
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Request was cancelled');
          setStreamingMessage('');
          return;
        }

        console.error('Error sending message:', error);
        setStreamingMessage('');

        const errorMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString(),
        };

        addMessageToChat(chatId, errorMessage);
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
        setStreamingMessage('');
        abortControllerRef.current = null;
      }
    },
    [currentChatId, messages, loadChats]
  );

  const currentChat = currentChatId ? getChatById(currentChatId) : null;

  return {
    currentChatId,
    currentChat,
    chats,
    messages,
    isLoading,
    inputValue,
    setInputValue,
    streamingMessage,
    isReady,
    startNewChat,
    selectChat,
    handleDeleteChat,
    sendMessage,
    loadChats,
  };
}
