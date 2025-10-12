"use client"

import { useState, useEffect } from "react"
import SimpleSidebar from "@/components/SimpleSidebar"
import ChatArea from "@/components/ChatArea"
import { EmptyState } from "@/components/EmptyState"
import { cn } from "@/lib/utils"
import { callChatAPI } from "@/lib/apiRouter"
import {
  getAllChats,
  getChatById,
  createNewChat,
  addMessageToChat,
  getCurrentChatId,
  setCurrentChatId,
  deleteChat
} from "@/lib/chatStorage"

export default function ChatGPTInterface() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [currentChatId, setCurrentChatIdState] = useState(null)
  const [chats, setChats] = useState([])
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [isMounted, setIsMounted] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState("")
  const [abortController, setAbortController] = useState(null)

  // Ensure we're on client side before accessing localStorage
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Load chats on mount - Always start with fresh "New Chat" state
  useEffect(() => {
    if (isMounted) {
      loadChats()
      // Always start fresh - clear current chat to show empty state
      startNewChat()
    }
  }, [isMounted])

  const loadChats = () => {
    if (typeof window === 'undefined') return
    
    try {
      const loadedChats = getAllChats()
      setChats(loadedChats || [])
      
      // Don't load any saved chat - always start fresh
      // User can select from sidebar if they want to continue a chat
    } catch (error) {
      console.error('Error loading chats:', error)
      setChats([])
    }
  }

  const startNewChat = () => {
    // Clear current chat state to show empty state
    setCurrentChatIdState(null)
    setMessages([])
    localStorage.removeItem('bu_ai_current_chat')
  }

  // Responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true)
      } else {
        setIsSidebarOpen(false)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleNewChat = () => {
    startNewChat()
    loadChats()
  }

  const handleChatSelect = (chat) => {
    if (!chat || !chat.id) {
      console.error('Invalid chat selected')
      return
    }
    
    try {
      setCurrentChatIdState(chat.id)
      setMessages(chat.messages || [])
      setCurrentChatId(chat.id)
    } catch (error) {
      console.error('Error selecting chat:', error)
    }
  }

  const handleDeleteChat = (chatId) => {
    deleteChat(chatId)
    
    // If deleting current chat, go to new chat
    if (chatId === currentChatId) {
      startNewChat()
    }
    
    loadChats()
  }

  const handleSendMessage = async (content) => {
    let chatId = currentChatId

    // Cancel any ongoing request
    if (abortController) {
      abortController.abort()
    }

    // Create new chat if none exists
    if (!chatId) {
      const newChat = createNewChat(content)
      chatId = newChat.id
      setCurrentChatIdState(chatId)
      loadChats()
    }

    const userMessage = {
      id: Date.now().toString(),
      type: "user",
      content: content,
      timestamp: new Date().toISOString()
    }

    // Add user message
    addMessageToChat(chatId, userMessage)
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setStreamingMessage("")

    // Create new abort controller for this request
    const controller = new AbortController()
    setAbortController(controller)

    try {
      // Call smart API router (tries RAG, falls back to old API if needed)
      const startTime = Date.now()
      const data = await callChatAPI(content, messages, controller.signal)
      
      const responseTime = Date.now() - startTime

      // Simulate streaming by revealing response word by word
      const fullResponse = data.message || "I'm here to help! However, I encountered an issue processing your request."
      const words = fullResponse.split(' ')
      
      // Show response word by word for better UX
      for (let i = 0; i < words.length; i++) {
        const partial = words.slice(0, i + 1).join(' ')
        setStreamingMessage(partial)
        await new Promise(resolve => setTimeout(resolve, 30)) // 30ms per word
      }
      
      // DON'T clear streaming message yet - let it transition smoothly
      // setStreamingMessage("")
      
      const botMessage = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: fullResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          ...data.metadata,
          responseTime
        },
        skipAnimation: true // Flag to skip fade-in animation
      }

      // Add bot message
      addMessageToChat(chatId, botMessage)
      setMessages(prev => [...prev, botMessage])
      
      // Now clear streaming message (it will be replaced by the message in array)
      setStreamingMessage("")
      
      loadChats() // Refresh to update timestamps
      
    } catch (error) {
      // Handle abort gracefully
      if (error.name === 'AbortError') {
        console.log('Request was cancelled')
        setStreamingMessage("")
        return
      }
      
      console.error('Error sending message:', error)
      
      setStreamingMessage("")
      
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date().toISOString()
      }

      addMessageToChat(chatId, errorMessage)
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setStreamingMessage("")
      setAbortController(null)  // Clear abort controller
    }
  }

  const handleSuggestionClick = (query) => {
    handleSendMessage(query)
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const currentChat = currentChatId ? getChatById(currentChatId) : null

  return (
    <div className="h-screen flex overflow-hidden relative">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed lg:relative inset-y-0 left-0 z-40 lg:z-0",
        "transition-transform duration-300 ease-in-out",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <SimpleSidebar
          currentChat={currentChat}
          chats={chats}
          onNewChat={handleNewChat}
          onChatSelect={handleChatSelect}
          onDeleteChat={handleDeleteChat}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Main area - Fixed height container */}
      <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
        {messages.length === 0 ? (
          // Empty state with centered input box for mobile
          <EmptyState 
            onSuggestionClick={handleSuggestionClick}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            onSendMessage={handleSendMessage}
            inputValue={inputValue}
            setInputValue={setInputValue}
            isLoading={isLoading}
          />
        ) : (
          // Chat mode with input at bottom
          <>
            <ChatArea
              currentChat={currentChat}
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              onDeleteChat={handleDeleteChat}
              streamingMessage={streamingMessage}
            />

            {/* Fixed input at bottom (only visible during chat) */}
            <div className="flex-shrink-0 border-t border-gray-200 p-4 sm:p-6 bg-white animate-in slide-in-from-bottom-4 duration-500">
              <form onSubmit={(e) => {
                e.preventDefault()
                if (!inputValue.trim() || isLoading) return
                handleSendMessage(inputValue.trim())
                setInputValue("")
              }} className="max-w-3xl mx-auto">
                <div className="relative group">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        if (!inputValue.trim() || isLoading) return
                        handleSendMessage(inputValue.trim())
                        setInputValue("")
                      }
                    }}
                    placeholder="Ask anything..."
                    disabled={isLoading}
                    className="w-full min-h-[56px] max-h-[200px] px-5 py-3.5 pr-14 bg-gray-50 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base text-gray-900 placeholder:text-gray-500 font-normal leading-relaxed transition-all duration-300 hover:shadow-md focus:shadow-lg"
                    rows={1}
                    style={{ lineHeight: '1.5' }}
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading}
                    className="absolute right-3 bottom-3 w-10 h-10 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 disabled:scale-100 hover:shadow-lg"
                  >
                    <svg className="w-5 h-5 text-white transition-transform duration-300 group-hover:translate-y-[-2px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}