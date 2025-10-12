import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// ============================================================================
// GLOBAL RATE LIMIT TRACKER - VERCEL-COMPATIBLE VERSION
// ============================================================================
// This tracks API usage GLOBALLY for ALL users of Bot Bu
// Uses /tmp directory on Vercel (writable), falls back to in-memory if fails

// Detect if running on Vercel
const isVercel = process.env.VERCEL === '1';

// File path for persistent storage
const DATA_DIR = isVercel ? '/tmp/.usage-data' : join(process.cwd(), '.usage-data');
const STATE_FILE = join(DATA_DIR, 'usage-state.json');

// In-memory fallback if file system fails
let inMemoryState = null;

// Ensure data directory exists
try {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (error) {
  console.log('⚠️  Cannot create data directory, using in-memory storage:', error.message);
  inMemoryState = createDefaultState();
}

// Create default state
function createDefaultState() {
  return {
    requestsToday: 0,
    requestsThisMinute: 0,
    currentDay: new Date().toDateString(),
    currentMinute: Math.floor(Date.now() / 60000),
    lastRequestTime: 0,
    requestTimestamps: [],
    totalRequests: 0, // Lifetime total
    firstRequestDate: new Date().toISOString() // When tracking started
  };
}

// Load state from file or create new
function loadState() {
  // If using in-memory fallback
  if (inMemoryState !== null) {
    return inMemoryState;
  }
  
  try {
    if (existsSync(STATE_FILE)) {
      const data = readFileSync(STATE_FILE, 'utf-8');
      const loadedState = JSON.parse(data);
      console.log('📊 Loaded persistent usage data:', loadedState);
      return loadedState;
    }
  } catch (error) {
    console.error('⚠️  Error loading usage state, using in-memory:', error.message);
    inMemoryState = createDefaultState();
    return inMemoryState;
  }
  
  // Default state
  return createDefaultState();
}

// Save state to file
function saveState(state) {
  // If using in-memory fallback, just update it
  if (inMemoryState !== null) {
    inMemoryState = { ...state };
    return;
  }
  
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('⚠️  Error saving usage state, switching to in-memory:', error.message);
    inMemoryState = { ...state };
  }
}

// In-memory state (loaded from file)
let state = loadState();

// Rate limits from Gemini API
const LIMITS = {
  RPM: 1000,  // Requests per minute (shared across all users)
  RPD: 10000, // Requests per day (shared across all users)
  MIN_REQUEST_INTERVAL: 1000 // 1 second minimum between requests
};

// ============================================================================
// Check if a request can be made (RPM and RPD limits)
// ============================================================================
export function canMakeRequest() {
  const now = Date.now();
  const currentMinute = Math.floor(now / 60000);
  const today = new Date().toDateString();

  // Reset daily counter if it's a new day
  if (state.currentDay !== today) {
    state.requestsToday = 0;
    state.currentDay = today;
    saveState(state); // Persist the reset
  }

  // Reset minute counter if it's a new minute
  if (state.currentMinute !== currentMinute) {
    state.requestsThisMinute = 0;
    state.currentMinute = currentMinute;
    state.requestTimestamps = [];
    saveState(state); // Persist the reset
  }

  // Clean up old timestamps (older than 1 minute)
  const oneMinuteAgo = now - 60000;
  state.requestTimestamps = state.requestTimestamps.filter(ts => ts > oneMinuteAgo);
  state.requestsThisMinute = state.requestTimestamps.length;

  // Check daily limit
  if (state.requestsToday >= LIMITS.RPD) {
    return {
      allowed: false,
      reason: 'daily_limit_exceeded',
      message: 'Daily request limit reached for Bot Bu (10,000 requests/day)',
      retryAfter: 'tomorrow'
    };
  }

  // Check minute limit
  if (state.requestsThisMinute >= LIMITS.RPM) {
    const secondsUntilNextMinute = 60 - (Math.floor((now % 60000) / 1000));
    return {
      allowed: false,
      reason: 'minute_limit_exceeded',
      message: 'Too many requests per minute for Bot Bu (1,000 requests/min)',
      retryAfter: secondsUntilNextMinute
    };
  }

  return {
    allowed: true,
    remaining: {
      daily: LIMITS.RPD - state.requestsToday,
      minute: LIMITS.RPM - state.requestsThisMinute
    }
  };
}

// ============================================================================
// Record a request (call this after making an API call)
// ============================================================================
export function recordRequest(tokens = 0) {
  const now = Date.now();
  
  state.requestsToday++;
  state.requestsThisMinute++;
  state.totalRequests++; // Increment lifetime total
  state.lastRequestTime = now;
  state.requestTimestamps.push(now);

  // Persist to file after each request
  saveState(state);

  console.log(`📊 Global Usage: ${state.requestsToday}/${LIMITS.RPD} today, ${state.requestsThisMinute}/${LIMITS.RPM} this minute (${state.totalRequests} total)`);
}

// ============================================================================
// Check if requests are being made too quickly (throttling)
// ============================================================================
export function shouldThrottle() {
  const now = Date.now();
  const timeSinceLastRequest = now - state.lastRequestTime;

  if (timeSinceLastRequest < LIMITS.MIN_REQUEST_INTERVAL) {
    const waitTime = Math.ceil((LIMITS.MIN_REQUEST_INTERVAL - timeSinceLastRequest) / 1000);
    return {
      throttled: true,
      waitTime: waitTime,
      message: `Please wait ${waitTime} second${waitTime !== 1 ? 's' : ''} before sending another message`
    };
  }

  return {
    throttled: false
  };
}

// ============================================================================
// Get current usage statistics (for UI display)
// ============================================================================
export function getUsageStats() {
  const now = Date.now();
  const currentMinute = Math.floor(now / 60000);
  const today = new Date().toDateString();

  // Clean up if needed
  if (state.currentDay !== today) {
    state.requestsToday = 0;
    state.currentDay = today;
  }

  if (state.currentMinute !== currentMinute) {
    state.requestsThisMinute = 0;
    state.currentMinute = currentMinute;
    state.requestTimestamps = [];
  }

  // Clean up old timestamps
  const oneMinuteAgo = now - 60000;
  state.requestTimestamps = state.requestTimestamps.filter(ts => ts > oneMinuteAgo);
  state.requestsThisMinute = state.requestTimestamps.length;

  return {
    requestsToday: state.requestsToday,
    requestsThisMinute: state.requestsThisMinute,
    totalRequests: state.totalRequests, // Lifetime total
    firstRequestDate: state.firstRequestDate, // When tracking started
    limits: {
      daily: LIMITS.RPD,
      minute: LIMITS.RPM
    },
    percentages: {
      daily: (state.requestsToday / LIMITS.RPD) * 100,
      minute: (state.requestsThisMinute / LIMITS.RPM) * 100
    },
    remaining: {
      daily: LIMITS.RPD - state.requestsToday,
      minute: LIMITS.RPM - state.requestsThisMinute
    },
    status: getUsageStatus()
  };
}

// Helper function to get usage status
function getUsageStatus() {
  const dailyPercent = (state.requestsToday / LIMITS.RPD) * 100;
  
  if (dailyPercent >= 95) return 'critical';
  if (dailyPercent >= 80) return 'warning';
  return 'healthy';
}
