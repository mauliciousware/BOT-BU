/* smart API router - chooses best API based on contxt */

const RAG_API = '/api/chat-rag';
const FALLBACK_API = '/api/chat';

// trak rag api failures
let ragFailures = 0;
let lastRagFailure = null;
const MAX_FAILURES = 3;
const COOLDOWN_PERIOD = 60000; // 1 minut

/* call api with automatic fallbak */
export async function callChatAPI(message, conversationHistory = [], signal = null) {
  const startTime = Date.now();
  
  // chek if rag is in cooldown due to repeated failres
  const now = Date.now();
  const inCooldown = ragFailures >= MAX_FAILURES && 
                     lastRagFailure && 
                     (now - lastRagFailure) < COOLDOWN_PERIOD;
  
  if (inCooldown) {
    console.log('RAG in cooldown using fallback API');
    return await fetchAPI(FALLBACK_API, message, conversationHistory, signal);
  }
  
  // try rag first
  try {
    console.log('Using RAG API...');
    const response = await fetchAPI(RAG_API, message, conversationHistory, signal);
    
    // sucess! reset failure counter
    ragFailures = 0;
    lastRagFailure = null;
    
    return {
      ...response,
      apiUsed: 'RAG',
      processingTime: Date.now() - startTime
    };
    
  } catch (ragError) {
    console.warn('RAG API faild:', ragError.message);
    
    // trak failure
    ragFailures++;
    lastRagFailure = Date.now();
    
    // try fallbak
    try {
      console.log('Falling back to standard API...');
      const response = await fetchAPI(FALLBACK_API, message, conversationHistory, signal);
      
      return {
        ...response,
        apiUsed: 'Fallback',
        usedFallback: true,
        processingTime: Date.now() - startTime
      };
      
    } catch (fallbackError) {
      console.error('Both APIs faildd!');
      throw fallbackError;
    }
  }
}

/* fetch from specfic api */
async function fetchAPI(endpoint, message, conversationHistory, signal) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      message, 
      conversationHistory 
    }),
    signal
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.message || error.error || `API returned ${response.status}`);
  }
  
  return await response.json();
}

/* reset failre tracking (useful for manual retry) */
export function resetAPIFailures() {
  ragFailures = 0;
  lastRagFailure = null;
  console.log('API failure tracking reset');
}

/* get current api staus */
export function getAPIStatus() {
  const now = Date.now();
  const inCooldown = ragFailures >= MAX_FAILURES && 
                     lastRagFailure && 
                     (now - lastRagFailure) < COOLDOWN_PERIOD;
  
  return {
    ragFailures,
    inCooldown,
    cooldownRemaining: inCooldown ? COOLDOWN_PERIOD - (now - lastRagFailure) : 0,
    recommendedAPI: inCooldown ? 'Fallback' : 'RAG'
  };
}
