"use client"

import { useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Copy,
  Check,
  Trash2,
  Menu
} from "lucide-react"

export default function ChatArea({ currentChat, onToggleSidebar, messages, onSendMessage, isLoading, onDeleteChat, streamingMessage }) {
  const messagesEndRef = useRef(null)
  const [copiedMessageId, setCopiedMessageId] = useState(null)

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  const handleCopy = async (content, messageId) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage]) // Also scroll when streaming message updates

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden min-h-0">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            {/* Hamburger menu button - Mobile only */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden text-gray-600 hover:bg-gray-100 transition-all duration-200 hover:scale-110"
              onClick={onToggleSidebar}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <img 
              src="/Logo.png" 
              alt="Binghamton University" 
              className="w-8 h-8 object-contain transition-transform duration-300 hover:scale-110"
            />
            <div>
              <h1 className="text-lg font-semibold text-gray-900 transition-colors duration-200">
                {currentChat?.title || "Binghamton University AI"}
              </h1>
              <p className="text-sm font-normal text-gray-600 transition-colors duration-200">
                Your intelligent campus assistant
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {currentChat && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-red-500 hover:bg-red-50 transition-all duration-200 hover:scale-110 active:scale-95"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this chat?')) {
                    onDeleteChat(currentChat.id)
                  }
                }}
                aria-label="Delete chat"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Chat Messages - Scrollable Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {messages.map((message, index) => (
            <div 
              key={message.id} 
              className={message.skipAnimation ? "group" : "group animate-in fade-in slide-in-from-bottom-4 duration-500"}
              style={message.skipAnimation ? {} : { animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
            >
              {message.type === "user" ? (
                // User Message - Clean emerald with slide-in animation
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-emerald-600 text-white rounded-2xl px-4 py-3 shadow-sm transform transition-all duration-300 hover:scale-[1.02] hover:shadow-md">
                    <p className="whitespace-pre-wrap text-base font-normal leading-relaxed">{message.content}</p>
                  </div>
                </div>
              ) : (
                // Assistant Message - Clean with logo and slide-in from left
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 flex-shrink-0 mt-1 bg-emerald-50 rounded-lg p-1 transition-transform duration-300 hover:scale-110">
                    <img 
                      src="/Logo.png" 
                      alt="BU" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="bg-gray-50 rounded-2xl px-4 py-3 transform transition-all duration-300 hover:bg-gray-100">
                      <p className="text-gray-900 whitespace-pre-wrap text-base font-normal leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                    {/* Message Actions */}
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-2 text-gray-600 hover:bg-gray-100 text-sm font-medium transition-all duration-200 hover:scale-105"
                        onClick={() => handleCopy(message.content, message.id)}
                      >
                        {copiedMessageId === message.id ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* Streaming message preview */}
          {streamingMessage && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 flex-shrink-0 mt-1 bg-emerald-50 rounded-lg p-1">
                <img src="/Logo.png" alt="BU" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1">
                <div className="bg-gray-50 rounded-2xl px-4 py-3">
                  <p className="text-gray-900 whitespace-pre-wrap text-base font-normal leading-relaxed">
                    {streamingMessage}
                    <span className="inline-block w-1 h-4 bg-emerald-600 ml-1 animate-pulse"></span>
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {isLoading && !streamingMessage && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 flex-shrink-0 mt-1 bg-emerald-50 rounded-lg p-1 animate-pulse">
                <img 
                  src="/Logo.png" 
                  alt="BU" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="bg-gray-50 rounded-2xl px-4 py-3 min-w-[80px]">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: "0.1s"}}></div>
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: "0.2s"}}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  )
}
