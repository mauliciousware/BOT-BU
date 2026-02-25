// API configuration for Bot Bu mobile
// Change this to your deployed Next.js backend URL
// For local dev, use your Mac's local IP (not localhost/127.0.0.1)

// To find your local IP: run `ifconfig | grep inet` in terminal
// Example: http://192.168.1.51:3000

const DEV_API_URL = 'http://192.168.1.87:3000';
const PROD_API_URL = 'https://bu-chat-test.vercel.app';

// Toggle this when deploying
const IS_PRODUCTION = false;

export const API_BASE_URL = IS_PRODUCTION ? PROD_API_URL : DEV_API_URL;

export const ENDPOINTS = {
  CHAT: `${API_BASE_URL}/api/chat`,
  CHAT_RAG: `${API_BASE_URL}/api/chat-rag`,
  USAGE: `${API_BASE_URL}/api/usage`,
};
