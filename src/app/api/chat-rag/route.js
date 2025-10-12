import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { findRelevantChunks, keywordSearch } from "@/lib/vectorStore";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 3600000; // 1 hour

function getCacheKey(message) {
  return message.toLowerCase().trim();
}

// Retry helper with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const isLastRetry = i === maxRetries - 1;
      const isRetryable = error.message?.includes('503') || 
                         error.message?.includes('overloaded') ||
                         error.message?.includes('429');
      
      if (isLastRetry || !isRetryable) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, i) * 1000;
      console.log(`⏳ Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export async function POST(req) {
  const startTime = Date.now();
  
  try {
    const { message, conversationHistory = [] } = await req.json();
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json({
        success: false,
        error: "Invalid message format"
      }, { status: 400 });
    }

    // Check cache first
    const cacheKey = getCacheKey(message);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('📦 Cache hit:', message);
      return NextResponse.json({
        message: cached.data.response,
        metadata: {
          ...cached.data.metadata,
          cached: true,
          processingTime: Date.now() - startTime
        }
      });
    }

    console.log('\n🔍 Processing query:', message);

    // Step 1: Detect if this is a dining-related query and add current time context
    const diningKeywords = ['dining', 'eat', 'food', 'restaurant', 'cafe', 'cafeteria', 'meal', 'lunch', 'dinner', 'breakfast', 'open', 'hours', 'starbucks', 'tully', 'hinman', 'sushi', 'mart'];
    const isDiningQuery = diningKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    
    let timeContext = '';
    if (isDiningQuery) {
      const now = new Date();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[now.getDay()];
      const timeString = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
      const dateString = now.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric'
      });
      
      timeContext = `\n\nCURRENT DATE & TIME:\nDate: ${dateString}\nDay: ${dayName}\nTime: ${timeString}`;
      console.log('🍽️ Dining query detected, adding time context:', timeContext);
    }

    // Step 2: Expand query with conversation context for better search
    let searchQuery = message;
    
    // ALWAYS extract course numbers from current message
    const currentCourses = message.match(/CS\s*(\d{3}[A-Z]?)/gi) || [];
    
    // Check what type of contextual reference this is
    const singularWords = ['that', 'it', 'this']; // Refers to ONE thing
    const pluralWords = ['all', 'others', 'them', 'these', 'those']; // Refers to MULTIPLE things
    
    const isSingular = singularWords.some(word => 
      message.toLowerCase().split(/\s+/).includes(word)
    );
    const isPlural = pluralWords.some(word => 
      message.toLowerCase().split(/\s+/).includes(word)
    );
    
    if ((isSingular || isPlural) && conversationHistory.length > 0) {
      // Extract course numbers from recent conversation
      const lookbackMessages = isSingular ? 2 : 4; // Singular: last 2, Plural: last 4
      const recentMessages = conversationHistory.slice(-lookbackMessages);
      const courseNumbers = [...currentCourses]; // Start with courses from current message
      
      recentMessages.forEach(msg => {
        // Look for CS XXX pattern
        const matches = msg.content.match(/CS\s*(\d{3}[A-Z]?)/gi);
        if (matches) {
          courseNumbers.push(...matches);
        }
      });
      
      // If we found course numbers, add them to the search query
      if (courseNumbers.length > 0) {
        const uniqueCourses = [...new Set(courseNumbers)];
        
        // For singular references, only use the LAST course mentioned
        const coursesToUse = isSingular ? [uniqueCourses[uniqueCourses.length - 1]] : uniqueCourses;
        
        searchQuery = `${coursesToUse.join(' ')} ${message}`;
        console.log(`🔄 Expanded query with ${isSingular ? 'singular' : 'plural'} context: "${searchQuery}"`);
      }
    } else if (currentCourses.length > 0) {
      // Even without contextual words, if we have course numbers, enhance the query
      searchQuery = `${currentCourses.join(' ')} schedule timing location ${message}`;
      console.log(`🔄 Enhanced query with course numbers: "${searchQuery}"`);
    }

    // Step 2: Find relevant knowledge chunks using vector search
    let relevantChunks = [];
    try {
      relevantChunks = await findRelevantChunks(searchQuery, {
        topK: 10, // Increased to get more results for multi-item queries
        minScore: 0.25 // Slightly lower threshold for better recall
      });
      console.log(`✅ Found ${relevantChunks.length} relevant chunks via vector search`);
    } catch (vectorError) {
      console.warn('⚠️ Vector search failed, falling back to keyword search:', vectorError.message);
      relevantChunks = keywordSearch(searchQuery, 10);
      console.log(`✅ Found ${relevantChunks.length} relevant chunks via keyword search`);
    }

    // Step 2: Build context from relevant chunks (without source labels)
    const context = relevantChunks.length > 0
      ? relevantChunks
          .map(chunk => chunk.content)
          .join('\n\n---\n\n')
      : "No specific information found in the knowledge base.";

    // Step 3: Build conversation context
    const conversationContext = conversationHistory
      .slice(-6) // Last 3 exchanges
      .map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    // Step 4: Create enhanced prompt for RAG
    const systemPrompt = `You are an intelligent assistant for Binghamton University. You have access to the university's knowledge base and conversation history.

KNOWLEDGE BASE CONTEXT:
${context}

CONVERSATION HISTORY:
${conversationContext || 'No previous conversation'}${timeContext}

INSTRUCTIONS:
1. FIRST, check the conversation history for context about what the user is asking
2. If the user refers to something mentioned earlier (like "that subject", "the professor", "it", "all 3"), use the conversation history to understand what they mean
3. Then use the knowledge base context to answer their question
4. If the user asks about multiple items (e.g., "timing of all 3"), make sure to provide information for ALL items mentioned in the conversation
5. If the user asks about schedule conflicts or overlaps:
   - Extract the schedule times from the knowledge base for ALL mentioned courses
   - Compare the day and time patterns (e.g., MW, TR, MWF with start/end times)
   - Determine if there are any time conflicts
   - Provide a clear yes/no answer about whether courses overlap
6. If this is a dining/food query and current date/time is provided:
   - Use the current day and time to determine which locations are CURRENTLY OPEN
   - Compare the current time against the hours listed for today
   - Clearly state which places are open NOW and which are closed
   - If asking about "now" or "currently", only mention locations open at this exact moment
7. If the answer is in the knowledge base, provide a detailed, accurate response with ALL relevant details
8. If the information is NOT in the knowledge base, say: "I don't have that specific information in my knowledge base."
9. Always be helpful, friendly, and professional
10. Do NOT mention sources, documents, or reference numbers in your response
11. Just provide the answer naturally as if you know the information
12. Keep answers concise but complete

USER QUESTION: ${message}

YOUR ANSWER:`;

    // Step 5: Generate response with Gemini (with retry logic)
    let response;
    let usedFallback = false;
    
    try {
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      });

      const result = await retryWithBackoff(() => model.generateContent(systemPrompt));
      response = result.response.text();
      
      // Step 5.5: If no knowledge base info, try Google Search
      if (relevantChunks.length === 0 || response.includes("I don't have that specific information")) {
        console.log('🌐 No KB info found, trying Google Search...');
        
        try {
          const searchModel = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 1024,
            },
            tools: [{
              googleSearch: {}
            }]
          });

          // Build conversation context for search
          let conversationContext = '';
          if (conversationHistory.length > 0) {
            conversationContext = conversationHistory
              .slice(-4) // Last 2 exchanges (4 messages)
              .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
              .join('\n');
          }

          const searchPrompt = `You are a helpful assistant for Binghamton University.

${conversationContext ? `Recent conversation:\n${conversationContext}\n\n` : ''}The user asked: "${message}"

This question is not in our knowledge base. Please search for current, accurate information and provide a helpful answer.

IMPORTANT: If the user's question references something from the conversation (like "that subject", "the TA", "it", "that"), use the conversation context above to understand what they're referring to.

If it's a general question (like math, facts, etc.), answer it directly.
If it's about Binghamton University, search for specific information.

Be helpful and accurate.`;

          const searchResult = await retryWithBackoff(() => searchModel.generateContent(searchPrompt));
          response = searchResult.response.text();
          console.log('✅ Google Search provided answer');
        } catch (searchError) {
          console.warn('⚠️ Google Search failed:', searchError.message);
          // Keep the "I don't have that information" response if search fails
        }
      }
      
    } catch (geminiError) {
      console.error('❌ Gemini failed after retries:', geminiError.message);
      
      // Fallback 1: Use context directly if we have it
      if (relevantChunks.length > 0) {
        console.log('🔄 Using direct context fallback');
        response = `Based on our knowledge base:\n\n${relevantChunks[0].content}\n\n(Note: AI processing temporarily unavailable, showing raw information)`;
        usedFallback = true;
      } else {
        // Fallback 2: Return helpful error
        return NextResponse.json({
          message: "I'm having trouble processing your request right now. The AI service is temporarily overloaded. Please try again in a moment.",
          metadata: {
            error: "Gemini overloaded",
            processingTime: Date.now() - startTime,
            usedFallback: true
          }
        });
      }
    }

    // Step 6: Prepare response data
    const responseData = {
      response,
      sources: relevantChunks.map(chunk => ({
        title: chunk.title,
        category: chunk.category,
        similarity: chunk.similarity?.toFixed(3) || chunk.matchScore?.toFixed(3) || 'N/A'
      })),
      metadata: {
        chunksFound: relevantChunks.length,
        searchMethod: relevantChunks[0]?.similarity ? 'vector' : 'keyword',
        processingTime: Date.now() - startTime,
        cached: false,
        usedFallback
      }
    };

    // Step 7: Cache the response
    cache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });

    console.log(`✅ Response generated in ${responseData.metadata.processingTime}ms${usedFallback ? ' (fallback)' : ''}`);
    
    return NextResponse.json({
      message: response,
      metadata: responseData.metadata
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json({
      message: "Sorry, I encountered an error processing your request.",
      metadata: {
        error: error.message,
        processingTime: Date.now() - startTime
      }
    }, { status: 500 });
  }
}
