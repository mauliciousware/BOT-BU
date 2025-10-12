"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { 
  Plus, 
  Search, 
  MessageSquare,
  X
} from "lucide-react"

export default function SimpleSidebar({ 
  currentChat, 
  chats = [], 
  onNewChat, 
  onChatSelect, 
  onDeleteChat,
  onClose,
  className 
}) {
  const [searchQuery, setSearchQuery] = useState("")

  // Format timestamp for display
  const formatTimestamp = (isoString) => {
    if (!isoString) return 'Just now'
    
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  // Use the chats prop instead of dummy data
  const filteredChats = chats
    .filter(chat => chat.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      // Sort by updated time (most recent first)
      return new Date(b.updatedAt) - new Date(a.updatedAt)
    })

  return (
    <aside 
      className={cn(
        "w-80 h-full border-r border-emerald-800 bg-emerald-950 text-emerald-100 flex flex-col",
        "transition-all duration-300",
        className
      )}
      role="navigation"
      aria-label="Chat history sidebar"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-1">
            <img 
              src="/Logo.png" 
              alt="Binghamton University" 
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-semibold text-lg text-emerald-50">
            Bot Bu
          </span>
        </div>
        
        {/* Close button - Mobile only */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-emerald-200 hover:bg-emerald-800"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* New Chat Button */}
      <div className="px-4 pt-4 pb-2">
        <Button 
          onClick={() => {
            onNewChat()
            // Close sidebar on mobile when new chat is created
            if (onClose && window.innerWidth < 1024) {
              onClose()
            }
          }}
          className="w-full justify-start bg-emerald-600 hover:bg-emerald-500 text-white border-0 rounded-2xl h-11 shadow-soft transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-lg"
          aria-label="Create new chat"
        >
          <Plus className="h-5 w-5 mr-2 transition-transform duration-300 group-hover:rotate-90" />
          New chat
        </Button>
      </div>

      {/* Search */}
      <div className="px-4 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-400 transition-transform duration-300" 
            aria-hidden="true" 
          />
          <input
            type="search"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-emerald-900/50 border border-emerald-700/50 text-emerald-50 placeholder-emerald-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 hover:bg-emerald-900/70"
            aria-label="Search chats"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-hidden px-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-emerald-400 px-2">
          Recent Chats
        </h3>
        <ScrollArea className="h-full">
          <div className="space-y-1 pb-4" role="list">
            {filteredChats.length > 0 ? (
              filteredChats.map((chat, index) => (
                <div
                  key={chat.id}
                  className={cn(
                    "relative flex items-center space-x-3 px-3 py-3 rounded-xl group transition-all duration-300 animate-in fade-in slide-in-from-left-4",
                    currentChat?.id === chat.id 
                      ? 'bg-emerald-700 text-emerald-50 shadow-soft scale-[1.02]' 
                      : 'hover:bg-emerald-800/50 text-emerald-200 hover:scale-[1.02]'
                  )}
                  style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'backwards' }}
                  role="listitem"
                >
                  <div 
                    className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      onChatSelect(chat)
                      // Close sidebar on mobile when chat is selected
                      if (onClose && window.innerWidth < 1024) {
                        onClose()
                      }
                    }}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onChatSelect(chat)
                        if (onClose && window.innerWidth < 1024) {
                          onClose()
                        }
                      }
                    }}
                    aria-label={`Chat: ${chat.title}`}
                    aria-current={currentChat?.id === chat.id ? 'page' : undefined}
                  >
                    <MessageSquare className="h-4 w-4 flex-shrink-0 text-emerald-400 transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate transition-colors duration-200">{chat.title}</p>
                      <p className="text-xs text-emerald-500 mt-0.5 transition-colors duration-200">
                        {formatTimestamp(chat.updatedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 px-4">
                <p className="text-sm text-emerald-400">No chats found</p>
                <p className="text-xs text-emerald-500 mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="border-t border-emerald-800 px-4 py-3">
        {/* Chat Count */}
        <div className="flex items-center justify-center text-xs text-emerald-400 transition-all duration-300">
          <span>{filteredChats.length} chat{filteredChats.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </aside>
  )
}