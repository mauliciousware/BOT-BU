/* Smart API router — chooses best API based on context
 * Ported from web app, adapted for React Native.
 * Calls the Next.js backend instead of relative URLs.
 */

import { ENDPOINTS } from '../constants/Api';

const RAG_API = ENDPOINTS.CHAT_RAG;
const FALLBACK_API = ENDPOINTS.CHAT;

// Track RAG API failures
let ragFailures = 0;
let lastRagFailure = null;
const MAX_FAILURES = 3;
const COOLDOWN_PERIOD = 60000; // 1 minute

/* Call API with automatic fallback */
export async function callChatAPI(message, conversationHistory = [], signal = null) {
  const startTime = Date.now();

  const now = Date.now();
  const inCooldown =
    ragFailures >= MAX_FAILURES &&
    lastRagFailure &&
    now - lastRagFailure < COOLDOWN_PERIOD;

  if (inCooldown) {
    console.log('RAG in cooldown, using fallback API');
    return await fetchAPI(FALLBACK_API, message, conversationHistory, signal);
  }

  // Try RAG first
  try {
    console.log('Using RAG API...');
    const response = await fetchAPI(RAG_API, message, conversationHistory, signal);

    ragFailures = 0;
    lastRagFailure = null;

    return {
      ...response,
      apiUsed: 'RAG',
      processingTime: Date.now() - startTime,
    };
  } catch (ragError) {
    console.warn('RAG API failed:', ragError.message);

    ragFailures++;
    lastRagFailure = Date.now();

    try {
      console.log('Falling back to standard API...');
      const response = await fetchAPI(FALLBACK_API, message, conversationHistory, signal);

      return {
        ...response,
        apiUsed: 'Fallback',
        usedFallback: true,
        processingTime: Date.now() - startTime,
      };
    } catch (fallbackError) {
      console.error('Both APIs failed!');
      throw fallbackError;
    }
  }
}

/* Fetch from specific API endpoint */
async function fetchAPI(endpoint, message, conversationHistory, signal) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      conversationHistory,
    }),
    signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.message || error.error || `API returned ${response.status}`);
  }

  return await response.json();
}

/* Reset failure tracking */
export function resetAPIFailures() {
  ragFailures = 0;
  lastRagFailure = null;
}

/* Get current API status */
export function getAPIStatus() {
  const now = Date.now();
  const inCooldown =
    ragFailures >= MAX_FAILURES &&
    lastRagFailure &&
    now - lastRagFailure < COOLDOWN_PERIOD;

  return {
    ragFailures,
    inCooldown,
    cooldownRemaining: inCooldown ? COOLDOWN_PERIOD - (now - lastRagFailure) : 0,
    recommendedAPI: inCooldown ? 'Fallback' : 'RAG',
  };
}
