import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// ********** global rate limit tracker - vercel compatible **********
// this tracks api usage GLOBALLY for all users of bot bu
// uses /tmp directory on vercel (writable) falls back to in memory if fails

// detct if running on vercel
const isVercel = process.env.VERCEL === '1';

// file path for persistnt storage
const DATA_DIR = isVercel ? '/tmp/.usage-data' : join(process.cwd(), '.usage-data');
const STATE_FILE = join(DATA_DIR, 'usage-state.json');

// in memory fallbak if file system fails
let inMemoryState = null;

// ensure data directry exists
try {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (error) {
  console.log('Cannot create data directory using in-memory storage:', error.message);
  inMemoryState = createDefaultState();
}

// crete default state
function createDefaultState() {
  return {
    requestsToday: 0,
    requestsThisMinute: 0,
    currentDay: new Date().toDateString(),
    currentMinute: Math.floor(Date.now() / 60000),
    lastRequestTime: 0,
    requestTimestamps: [],
    totalRequests: 0, // lifetme total
    firstRequestDate: new Date().toISOString() // when trackin started
  };
}

// load state from file or crete new
function loadState() {
  // if using in memory fallbak
  if (inMemoryState !== null) {
    return inMemoryState;
  }
  
  try {
    if (existsSync(STATE_FILE)) {
      const data = readFileSync(STATE_FILE, 'utf-8');
      const loadedState = JSON.parse(data);
      console.log('Loaded persistent usage data:', loadedState);
      return loadedState;
    }
  } catch (error) {
    console.error('Error loading usage state using in-memory:', error.message);
    inMemoryState = createDefaultState();
    return inMemoryState;
  }
  
  // defalt state
  return createDefaultState();
}

// save state to fil
function saveState(state) {
  // if using in memory fallbak just update it
  if (inMemoryState !== null) {
    inMemoryState = { ...state };
    return;
  }
  
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving usage state switching to in-memory:', error.message);
    inMemoryState = { ...state };
  }
}

// in memory state (loaded from fil)
let state = loadState();

// rate limits from gemini api
const LIMITS = {
  RPM: 1000,  // requests per minute (shared across all usrs)
  RPD: 10000, // requests per day (shared across all usrs)
  MIN_REQUEST_INTERVAL: 1000 // 1 second min between requests
};

// ********** check if a request can be made (rpm and rpd limits) **********
export function canMakeRequest() {
  const now = Date.now();
  const currentMinute = Math.floor(now / 60000);
  const today = new Date().toDateString();

  // reset daily counter if its a new day
  if (state.currentDay !== today) {
    state.requestsToday = 0;
    state.currentDay = today;
    saveState(state); // persist the rset
  }

  // reset minute counter if its new minute
  if (state.currentMinute !== currentMinute) {
    state.requestsThisMinute = 0;
    state.currentMinute = currentMinute;
    state.requestTimestamps = [];
    saveState(state); // persist the rset
  }

  // clean up old timestamps (older than 1 minut)
  const oneMinuteAgo = now - 60000;
  state.requestTimestamps = state.requestTimestamps.filter(ts => ts > oneMinuteAgo);
  state.requestsThisMinute = state.requestTimestamps.length;

  // chek daily limit
  if (state.requestsToday >= LIMITS.RPD) {
    return {
      allowed: false,
      reason: 'daily_limit_exceeded',
      message: 'Daily request limit reached for Bot Bu (10,000 requests/day)',
      retryAfter: 'tomorrow'
    };
  }

  // chek minute limit
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

// ********** record a request (call after making api call) **********
export function recordRequest(tokens = 0) {
  const now = Date.now();
  
  state.requestsToday++;
  state.requestsThisMinute++;
  state.totalRequests++; // incremen lifetime total
  state.lastRequestTime = now;
  state.requestTimestamps.push(now);

  // persist to file after each requiest
  saveState(state);

  console.log(`Global Usage: ${state.requestsToday}/${LIMITS.RPD} today, ${state.requestsThisMinute}/${LIMITS.RPM} this minute (${state.totalRequests} total)`);
}

// ********** check if requests are being made to quickly (throttling) **********
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

// ********** get current usage statistcs (for ui display) **********
export function getUsageStats() {
  const now = Date.now();
  const currentMinute = Math.floor(now / 60000);
  const today = new Date().toDateString();

  // clean up if neede
  if (state.currentDay !== today) {
    state.requestsToday = 0;
    state.currentDay = today;
  }

  if (state.currentMinute !== currentMinute) {
    state.requestsThisMinute = 0;
    state.currentMinute = currentMinute;
    state.requestTimestamps = [];
  }

  // clean up old timestams
  const oneMinuteAgo = now - 60000;
  state.requestTimestamps = state.requestTimestamps.filter(ts => ts > oneMinuteAgo);
  state.requestsThisMinute = state.requestTimestamps.length;

  return {
    requestsToday: state.requestsToday,
    requestsThisMinute: state.requestsThisMinute,
    totalRequests: state.totalRequests, // lifetme total
    firstRequestDate: state.firstRequestDate, // when trackin started
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

// helper funtion to get usage status
function getUsageStatus() {
  const dailyPercent = (state.requestsToday / LIMITS.RPD) * 100;
  
  if (dailyPercent >= 95) return 'critical';
  if (dailyPercent >= 80) return 'warning';
  return 'healthy';
}
