"use client"

import { useEffect, useRef } from "react"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

export function EmptyState({ onSuggestionClick, onToggleSidebar, onSendMessage, inputValue, setInputValue, isLoading }) {
  const inputRef = useRef(null)

  // Focus input after mount to avoid hydration mismatch
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  return (
    <div className="flex-1 flex flex-col bg-white relative overflow-hidden">
      {/* Hamburger menu button - Mobile only */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="lg:hidden absolute top-4 left-4 text-gray-600 hover:bg-gray-100 z-10 transition-all duration-200 hover:scale-110"
        onClick={onToggleSidebar}
      >
        <Menu className="h-5 w-5" />
      </Button>
      
      {/* Centered content container */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-700">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="mb-6 sm:mb-8 animate-in zoom-in duration-500">
            {/* Logo without background - just the PNG */}
            <img 
              src="/Logo.png" 
              alt="Binghamton University" 
              className="w-24 h-24 sm:w-32 sm:h-32 mx-auto object-contain transition-transform duration-300 hover:scale-110"
            />
          </div>

          {/* Hero Title - ChatGPT style */}
          <h1 className="text-3xl sm:text-4xl font-semibold text-emerald-600 mb-3 sm:mb-4 tracking-tight animate-in slide-in-from-bottom-4 duration-700 delay-100">
            How can I help you?
          </h1>
          
          {/* Subtitle - Body text style */}
          <p className="text-sm sm:text-base text-gray-600 font-normal animate-in slide-in-from-bottom-4 duration-700 delay-200">
            Ask me anything about Binghamton University
          </p>
        </div>

        {/* Input box - Centered on mobile */}
        <div className="w-full max-w-3xl px-4 animate-in slide-in-from-bottom-4 duration-700 delay-300">
          <form onSubmit={(e) => {
            e.preventDefault()
            if (!inputValue.trim() || isLoading) return
            onSendMessage(inputValue.trim())
            setInputValue("")
          }}>
            <div className="relative group">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (!inputValue.trim() || isLoading) return
                    onSendMessage(inputValue.trim())
                    setInputValue("")
                  }
                }}
                placeholder="Ask anything..."
                disabled={isLoading}
                className="w-full min-h-[56px] max-h-[200px] px-5 py-3.5 pr-14 bg-gray-50 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base text-gray-900 placeholder:text-gray-500 font-normal shadow-sm leading-relaxed transition-all duration-300 hover:shadow-md focus:shadow-lg"
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
      </div>
    </div>
  )
}