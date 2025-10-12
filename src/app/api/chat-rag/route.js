import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { findRelevantChunks, keywordSearch } from "@/lib/vectorStore";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// simple cache in memory
const cache = new Map();
const CACHE_TTL = 7200000;

function getCacheKey(message) {
  return message.toLowerCase().trim();
}

// retry logic with exponential backof
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
      
      // exponential backof: 1s 2s 4s etc
      const delay = Math.pow(2, i) * 1000;
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export async function POST(req) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  try {
    const { message, conversationHistory = [] } = await req.json();
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json({
        success: false,
        error: "Invalid message format"
      }, { status: 400 });
    }

    // logging for vercel production
    console.log('=================================================================');
    console.log('USER QUERY LOG - RAG ENDPOINT');
    console.log('=================================================================');
    console.log('Timestamp:', timestamp);
    console.log('User Query:', message);
    console.log('Conversation History:', conversationHistory.length, 'messages');
    
    // chek cache first
    const cacheKey = getCacheKey(message);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Cache hit:', message);
      console.log('=================================================================\n');
      return NextResponse.json({
        message: cached.data.response,
        metadata: {
          ...cached.data.metadata,
          cached: true,
          processingTime: Date.now() - startTime
        }
      });
    }

    console.log('\nProcessing query:', message);

    // step 1: detect dining query and add curent time context
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
      console.log('Dining query detectd, adding time context:', timeContext);
    }

    // step 2: expand qurey with conversation context
    let searchQuery = message;
    
    // alwyas extract course numbers from curent msg
    const currentCourses = message.match(/CS\s*(\d{3}[A-Z]?)/gi) || [];
    
    // chek what type of refference this is
    const singularWords = ['that', 'it', 'this']; // Refers to ONE thing
    const pluralWords = ['all', 'others', 'them', 'these', 'those']; // Refers to MULTIPLE things
    
    const isSingular = singularWords.some(word => 
      message.toLowerCase().split(/\s+/).includes(word)
    );
    const isPlural = pluralWords.some(word => 
      message.toLowerCase().split(/\s+/).includes(word)
    );
    
    if ((isSingular || isPlural) && conversationHistory.length > 0) {
      // extact course nubers from recent converstion
      const lookbackMessages = isSingular ? 2 : 4; // singular: last 2, plural: last 4
      const recentMessages = conversationHistory.slice(-lookbackMessages);
      const courseNumbers = [...currentCourses]; // start with courses from curent message
      
      recentMessages.forEach(msg => {
        // lok for CS XXX patern
        const matches = msg.content.match(/CS\s*(\d{3}[A-Z]?)/gi);
        if (matches) {
          courseNumbers.push(...matches);
        }
      });
      
      // if we found corse numbers add them to query
      if (courseNumbers.length > 0) {
        const uniqueCourses = [...new Set(courseNumbers)];
        
        // for singular refs only use LAST course mentioned
        const coursesToUse = isSingular ? [uniqueCourses[uniqueCourses.length - 1]] : uniqueCourses;
        
        searchQuery = `${coursesToUse.join(' ')} ${message}`;
        console.log(`Expanded query with ${isSingular ? 'singular' : 'plural'} context: "${searchQuery}"`);
      }
    } else if (currentCourses.length > 0) {
      // even withou contextual words if we have corse numbers enhance the qurey
      searchQuery = `${currentCourses.join(' ')} schedule timing location ${message}`;
      console.log(`Enhanced query with course numbers: "${searchQuery}"`);
    }

    // step 2: find relevant chunks using vector serch
    let relevantChunks = [];
    try {
      relevantChunks = await findRelevantChunks(searchQuery, {
        topK: 10, // incresed to get more results for multi item queries
        minScore: 0.25 // slighlty lower threshold for beter recall
      });
      console.log(`Found ${relevantChunks.length} relevant chunks via vector search`);
      
      // debug: log top chunks for CS corse queries
      if (searchQuery.toLowerCase().includes('cs') || searchQuery.match(/\d{3}/)) {
        console.log('Top 3 chunks found:');
        relevantChunks.slice(0, 3).forEach((chunk, i) => {
          console.log(`  ${i + 1}. ${chunk.title} (score: ${(chunk.similarity * 100).toFixed(1)}%)`);
          console.log(`     Preview: ${chunk.content.substring(0, 100)}...`);
        });
      }
    } catch (vectorError) {
      console.warn('Vector search faild, falling back to keyword search:', vectorError.message);
      relevantChunks = keywordSearch(searchQuery, 10);
      console.log(`Found ${relevantChunks.length} relevant chunks via keyword search`);
    }

    // step 2: buld context from chunks (no source labels)
    const context = relevantChunks.length > 0
      ? relevantChunks
          .map(chunk => chunk.content)
          .join('\n\n---\n\n')
      : "No specific information found in the knowledge base.";

    // step 3: buld conversation context
    const conversationContext = conversationHistory
      .slice(-6) // last 3 exchanges
      .map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    // step 4: create prompt for rag
    const systemPrompt = `You are an intelligent assistant for Binghamton University with access to an accurate knowledge base.

KNOWLEDGE BASE INFORMATION:
${context}

CONVERSATION HISTORY:
${conversationContext || 'No previous conversation'}${timeContext}

CRITICAL INSTRUCTIONS:
1. **USE THE KNOWLEDGE BASE FIRST**: The information above from the knowledge base is ACCURATE and COMPLETE. Use it to answer questions about:
   - Course schedules, instructors, locations, times, and CRNs
   - Dining hall hours and locations
   - Campus information
   
2. **For course queries** (like "Who teaches CS 559?" or "CS 559 location"):
   - Look in the knowledge base context above for the exact course number
   - Extract ALL details: instructor name, schedule (days/times), location (building & room), CRN
   - Provide complete information including: instructor, schedule, location
   - Example: "CS 559 - Science of Cyber Security is taught by Yan Guanhua. It meets on Monday and Wednesday from 9:45 AM to 11:15 AM in room S2 258."

3. **Check conversation history** for context:
   - If user says "that course", "it", "the professor", look at previous messages to understand what they mean
   - For questions about "all 3" or multiple items, refer to earlier conversation

4. **For dining queries with current time**:
   - Use the current day and time provided to determine what's open NOW
   - Compare current time against the hours listed
   - Only mention locations that are currently open

5. **If information is NOT in the knowledge base**:
   - Say: "I don't have that specific information in my knowledge base."
   - Do NOT make up information

6. **Response format**:
   - Be direct and complete
   - Include ALL relevant details (instructor, time, location for courses)
   - Don't mention "knowledge base" or "sources" in your answer
   - Answer naturally as if you know the information

USER QUESTION: ${message}

Provide a complete, accurate answer using the knowledge base information above:`;

    // step 5: genrate response with gemini (with retry)
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
      
      // step 5.5: if no KB info try google search
      if (relevantChunks.length === 0 || response.includes("I don't have that specific information")) {
        console.log('No KB info found trying Google Search...');
        
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

          // build convo context for serch
          let conversationContext = '';
          if (conversationHistory.length > 0) {
            conversationContext = conversationHistory
              .slice(-4) // last 2 exchanges (4 msgs)
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
          console.log('Google Search provided answr');
        } catch (searchError) {
          console.warn('Google Search failed:', searchError.message);
          // keep the "i dont have that info" response if serch fails
        }
      }
      
    } catch (geminiError) {
      console.error('Gemini failed after retries:', geminiError.message);
      
      // fllback 1: use context directly if we have it
      if (relevantChunks.length > 0) {
        console.log('Using direct context fallbak');
        response = `Based on our knowledge base:\n\n${relevantChunks[0].content}\n\n(Note: AI processing temporarily unavailable, showing raw information)`;
        usedFallback = true;
      } else {
        // fallback 2: return helpfu error
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

    // step 6: prepare resonse data
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

    // step 7: cache the resonse
    cache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });

    console.log(`Response generated in ${responseData.metadata.processingTime}ms${usedFallback ? ' (fallback)' : ''}`);
    console.log('Results:', {
      chunksFound: responseData.metadata.chunksFound,
      searchMethod: responseData.metadata.searchMethod,
      cached: responseData.metadata.cached,
      responseLength: response.length
    });
    console.log('=================================================================\n');
    
    return NextResponse.json({
      message: response,
      metadata: responseData.metadata
    });

  } catch (error) {
    console.error('=================================================================');
    console.error('ERROR LOG - RAG ENDPOINT');
    console.error('=================================================================');
    console.error('Timestamp:', new Date().toISOString());
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('=================================================================\n');
    
    return NextResponse.json({
      message: "Sorry, I encountered an error processing your request.",
      metadata: {
        error: error.message,
        processingTime: Date.now() - startTime
      }
    }, { status: 500 });
  }
}
