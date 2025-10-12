import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getInternalContext } from '@/lib/documentProcessor';
import { canMakeRequest, recordRequest, shouldThrottle } from '@/lib/rateLimitTracker';

// initalize the gemini ai client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// constans for detecing which tier to use
const TIER1_INSUFFICIENT_SIGNAL = "TIER1_INSUFFICIENT";
const TIER2_INSUFFICIENT_SIGNAL = "TIER2_INSUFFICIENT";

// promts for each tier customized
const TIER1_PROMPT = `You are a professional AI assistant for Binghamton University with access to official internal documents.

IMPORTANT INSTRUCTIONS:
1. Answer using the provided context from internal documents
2. Provide a complete, well-formatted, professional response
3. Be conversational and helpful, not robotic
4. If the context contains relevant information, synthesize it into a clear answer
5. If the context is insufficient or irrelevant, respond EXACTLY with: "${TIER1_INSUFFICIENT_SIGNAL}"
6. Do NOT make up information not in the context
7. Do NOT mention specific document filenames - just say "according to university records" or "based on official documents"

Context from internal documents:
{context}

User question: {question}

Provide a professional, helpful response as if you're a knowledgeable university assistant.`;

const TIER2_PROMPT = `You are a helpful AI assistant for Binghamton University.

IMPORTANT INSTRUCTIONS:
1. Answer using your general knowledge and training data
2. If you have confident knowledge about this topic, provide a complete answer
3. If this requires current/real-time information (events, news, schedules), respond EXACTLY with: "${TIER2_INSUFFICIENT_SIGNAL}"
4. If you're uncertain or don't know, respond EXACTLY with: "${TIER2_INSUFFICIENT_SIGNAL}"
5. Be concise and helpful

User question: {question}`;

const TIER3_PROMPT = `You are an AI assistant with access to real-time Google Search.

IMPORTANT INSTRUCTIONS:
1. Use Google Search to find current, accurate information
2. Provide comprehensive answers with sources
3. Cite your sources clearly
4. Focus on official Binghamton University sources when available
5. Be thorough and helpful

User question: {question}`;

// ********** Tire 1: Internal Knowledge Base **********
async function tryTier1(userMessage, conversationHistory = []) {
  console.log('\nTIER 1: Checking Internal Knowledge Base...');
  
  try {
    // search thru internal docs
    const internalData = await getInternalContext(userMessage);
    
    if (!internalData || !internalData.context) {
      console.log('   ⏭️  TIER 1: No relevant documents found');
      return { success: false, reason: 'no_documents' };
    }

    const sources = internalData.sources || [];
    console.log(`   Found ${internalData.chunkCount} relevant chunks from: ${sources.join(', ')}`);

    // build the conversation histroy for context
    let conversationContext = '';
    if (conversationHistory && conversationHistory.length > 0) {
      conversationContext = '\n\nPrevious conversation:\n';
      conversationHistory.forEach(msg => {
        const role = msg.type === 'user' ? 'User' : 'Assistant';
        conversationContext += `${role}: ${msg.content}\n`;
      });
    }

    // genrate prompt with context and convo history
    const prompt = TIER1_PROMPT
      .replace('{context}', internalData.context)
      .replace('{question}', userMessage) + conversationContext;

    // call gemini api but dont use google search here
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // chek if the ai needs more infomation
    if (text.trim() === TIER1_INSUFFICIENT_SIGNAL) {
      console.log('   TIER 1: AI said internal docs arent enuf');
      return { success: false, reason: 'insufficient_context' };
    }

    console.log('   TIER 1 SUCCESS: Answered from internal documents');
    
    // clean up the source file names so they look better
    const sanitizedSources = sources.map(filename => {
      // remve file extensions make it look nicer
      const baseName = filename.replace(/\.(txt|pdf|docx)$/i, '');
      
      // map filenames to better names
      const friendlyNames = {
        'DeleteLater': 'University Staff Directory',
        'cs_exam_schedule': 'Computer Science Exam Schedule',
        'department_contacts': 'Department Contact Information',
        'dining_hours_policy': 'Dining Services Information'
      };
      
      return friendlyNames[baseName] || 'Internal University Documents';
    });
    
    return {
      success: true,
      response: text,
      metadata: {
        tier: 1,
        tierName: 'Internal Knowledge Base',
        internalDocsUsed: true,
        internalSources: sanitizedSources,
        chunksUsed: internalData.chunkCount
      }
    };

  } catch (error) {
    console.error('   ❌ TIER 1 ERROR:', error.message);
    return { success: false, reason: 'error', error: error.message };
  }
}

// ********** Tier 2: Built in AI knowledge (no google search) **********
async function tryTier2(userMessage, conversationHistory = []) {
  console.log('\nTIER 2: Trying AI Built-in Knowledge...');
  
  try {
    // build convo history
    let conversationContext = '';
    if (conversationHistory && conversationHistory.length > 0) {
      conversationContext = '\n\nPrevious conversation:\n';
      conversationHistory.forEach(msg => {
        const role = msg.type === 'user' ? 'User' : 'Assistant';
        conversationContext += `${role}: ${msg.content}\n`;
      });
    }

    const prompt = TIER2_PROMPT.replace('{question}', userMessage) + conversationContext;

    // call gemini - no google search tooling
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // check if ai needs realtime info
    if (text.trim() === TIER2_INSUFFICIENT_SIGNAL) {
      console.log('   TIER 2: AI needs current/real-time informtion');
      return { success: false, reason: 'needs_current_info' };
    }

    console.log('   TIER 2 SUCCESS: Answered using AI knowledge');
    
    return {
      success: true,
      response: text,
      metadata: {
        tier: 2,
        tierName: 'AI Built-in Knowledge',
        internalDocsUsed: false,
        googleSearchUsed: false
      }
    };

  } catch (error) {
    console.error('   ❌ TIER 2 ERROR:', error.message);
    return { success: false, reason: 'error', error: error.message };
  }
}

// ********** Tier3 : Google Search **********
async function tryTier3(userMessage, conversationHistory = []) {
  console.log('\nTIER 3: Activating Google Search Grounding...');
  
  try {
    // build conversaton context
    let conversationContext = '';
    if (conversationHistory && conversationHistory.length > 0) {
      conversationContext = '\n\nPrevious conversation:\n';
      conversationHistory.forEach(msg => {
        const role = msg.type === 'user' ? 'User' : 'Assistant';
        conversationContext += `${role}: ${msg.content}\n`;
      });
    }

    const prompt = TIER3_PROMPT.replace('{question}', userMessage) + conversationContext;

    // call gemini WITH google search enabled
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      tools: [{
        googleSearch: {}
      }],
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // extract the grounding metdata if its there
    const candidates = response.candidates || [];
    const groundingMetadata = candidates[0]?.groundingMetadata || null;
    
    let sources = [];
    if (groundingMetadata?.groundingChunks) {
      sources = groundingMetadata.groundingChunks
        .filter(chunk => chunk.web?.uri)
        .map(chunk => chunk.web.uri);
    }

    console.log('   ✅ TIER 3 SUCCESS: Answered using Google Search');
    if (sources.length > 0) {
      console.log(`   📚 Sources: ${sources.join(', ')}`);
    }
    
    return {
      success: true,
      response: text,
      metadata: {
        tier: 3,
        tierName: 'Google Search Grounding',
        internalDocsUsed: false,
        googleSearchUsed: true,
        sources: sources,
        groundingMetadata: groundingMetadata
      }
    };

  } catch (error) {
    console.error('   ❌ TIER 3 ERROR:', error.message);
    return { success: false, reason: 'error', error: error.message };
  }
}

// ********** Main chat endpint - 3 tier system **********
export async function POST(request) {
  const timestamp = new Date().toISOString();
  console.log('\n================================================================================');
  console.log('USER QUERY LOG - MULTI-TIER CHAT ENDPOINT');
  console.log('================================================================================');
  console.log('Timestamp:', timestamp);
  console.log('='.repeat(80));

  try {
    // pars the request body
    const { message, conversationHistory = [] } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // --- Protection 1: throttle rapid requests ---
    const throttleCheck = shouldThrottle();
    if (throttleCheck.throttled) {
      console.log(`Request throttled: ${throttleCheck.message}`);
      return NextResponse.json(
        { 
          error: 'Please wait before sending another message',
          message: throttleCheck.message,
          waitTime: throttleCheck.waitTime,
          rateLimited: true
        },
        { status: 429 }
      );
    }

    // --- Protection 2: check rate limits (rpm and rpd) ---
    const rateLimitCheck = canMakeRequest();
    if (!rateLimitCheck.allowed) {
      console.log(`Rate limit exceeded: ${rateLimitCheck.reason}`);
      return NextResponse.json(
        { 
          error: rateLimitCheck.message,
          reason: rateLimitCheck.reason,
          retryAfter: rateLimitCheck.retryAfter,
          rateLimited: true,
          message: `⚠️ Rate limit reached. ${rateLimitCheck.message}. Please try again in ${rateLimitCheck.retryAfter === 'tomorrow' ? 'tomorrow' : `${rateLimitCheck.retryAfter} seconds`}.`
        },
        { status: 429 }
      );
    }

    console.log(`User Message: "${message}"`);
    console.log(`Message Length: ${message.length} characters`);
    
    // log converstaion history len
    if (conversationHistory && conversationHistory.length > 0) {
      console.log(`Conversation context: ${conversationHistory.length} previous messages`);
    }

    // record this reqest for rate tracking
    recordRequest(message.length);

    // --- Try tier 1 first: internal knowledge base ---
    const tier1Result = await tryTier1(message, conversationHistory);
    
    if (tier1Result.success) {
      console.log('\nFINAL ANSWER: Tier 1 (Internal Documents)');
      console.log('Response Length:', tier1Result.response.length, 'characters');
      console.log('================================================================================\n');
      
      return NextResponse.json({
        message: tier1Result.response,
        metadata: tier1Result.metadata
      });
    }

    // --- Try tier 2: ai built in knowledge ---
    const tier2Result = await tryTier2(message, conversationHistory);
    
    if (tier2Result.success) {
      console.log('\nFINAL ANSWER: Tier 2 (AI Knowledge)');
      console.log('Response Length:', tier2Result.response.length, 'characters');
      console.log('================================================================================\n');
      
      return NextResponse.json({
        message: tier2Result.response,
        metadata: tier2Result.metadata
      });
    }

    // --- Try tier 3 last resort: google search ---
    const tier3Result = await tryTier3(message, conversationHistory);
    
    if (tier3Result.success) {
      console.log('\nFINAL ANSWER: Tier 3 (Google Search)');
      console.log('Response Length:', tier3Result.response.length, 'characters');
      console.log('Sources:', tier3Result.metadata.sources?.length || 0);
      console.log('================================================================================\n');
      
      return NextResponse.json({
        message: tier3Result.response,
        metadata: tier3Result.metadata
      });
    }

    // --- all tiers failed ---
    console.log('\nALL TIERS FAILED');
    console.log('================================================================================\n');
    
    return NextResponse.json({
      message: "I apologize, but I'm having trouble finding an answer to your question. Please try rephrasing or contact support.",
      metadata: {
        tier: 0,
        tierName: 'Failed',
        error: 'All tiers failed',
        tier1Reason: tier1Result.reason,
        tier2Reason: tier2Result.reason,
        tier3Reason: tier3Result.reason
      }
    });

  } catch (error) {
    console.error('\n================================================================================');
    console.error('CRITICAL ERROR LOG');
    console.error('================================================================================');
    console.error('Timestamp:', new Date().toISOString());
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('================================================================================\n');
    
    // --- Protection 3: handle errors ---
    
    // check for gemini api errors
    if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      return NextResponse.json(
        { 
          error: 'API rate limit exceeded',
          message: '⚠️ We\'ve hit our API limit. Please try again in a few minutes.',
          rateLimited: true
        },
        { status: 429 }
      );
    }

    if (error.message?.includes('API_KEY') || error.message?.includes('401')) {
      return NextResponse.json(
        { 
          error: 'API configuration error',
          message: 'Service temporarily unavailable. Please contact support.'
        },
        { status: 500 }
      );
    }

    if (error.message?.includes('SAFETY')) {
      return NextResponse.json(
        { 
          error: 'Content filtered',
          message: 'Your message was filtered for safety. Please rephrase your question.'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to process request',
        message: 'An error occurred while processing your request. Please try again.',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// *** health check endpont ***
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Binghamton University AI Chat - 3-Tier System',
    model: 'gemini-2.5-flash',
    features: {
      tier1: 'Internal Knowledge Base',
      tier2: 'AI Built-in Knowledge', 
      tier3: 'Google Search Grounding',
      rateLimiting: true,
      requestThrottling: true
    },
    rateLimits: {
      rpm: 1000,
      rpd: 10000,
      tpm: 1000000
    },
    timestamp: new Date().toISOString()
  });
}