import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// load knowledge base from file sytem
const knowledgeBasePath = path.join(process.cwd(), "knowledge-base", "unified-knowledge-embedded.json");
const knowledgeBase = JSON.parse(fs.readFileSync(knowledgeBasePath, "utf-8"));

/* genrate embedding for a querry */
export async function generateQueryEmbedding(query) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await model.embedContent(query);
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/* calculate cosine similarity between two vectrs */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  
  return dotProduct / (magnitudeA * magnitudeB);
}

/* find most relevent chunks for query using vector similrity */
export async function findRelevantChunks(query, options = {}) {
  const {
    topK = 5,
    minScore = 0.3,
    category = null
  } = options;
  
  try {
    // genrate query embedding
    const queryEmbedding = await generateQueryEmbedding(query);
    
    // calulate similarity for all chunks
    let chunks = knowledgeBase.chunks
      .filter(chunk => chunk.embedding) // only chunks with embedings
      .filter(chunk => !category || chunk.category === category)
      .map(chunk => ({
        ...chunk,
        similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
      }))
      .filter(chunk => chunk.similarity >= minScore);
    
    // sort by similarity (higest first)
    chunks.sort((a, b) => b.similarity - a.similarity);
    
    // return top k results
    return chunks.slice(0, topK);
    
  } catch (error) {
    console.error('Vector search error:', error);
    throw error;
  }
}

/* keyword based fallbak search (if vector serch fails) */
export function keywordSearch(query, topK = 5) {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  const chunks = knowledgeBase.chunks.map(chunk => {
    const contentLower = chunk.content.toLowerCase();
    const titleLower = chunk.title.toLowerCase();
    
    const contentMatches = queryWords.filter(word => contentLower.includes(word)).length;
    const titleMatches = queryWords.filter(word => titleLower.includes(word)).length;
    const keywordMatches = queryWords.filter(word => chunk.keywords?.includes(word)).length;
    
    const matchScore = (contentMatches + titleMatches * 2 + keywordMatches * 1.5) / queryWords.length;
    
    return {
      ...chunk,
      matchScore,
      matches: queryWords.filter(word => 
        contentLower.includes(word) || 
        titleLower.includes(word) || 
        chunk.keywords?.includes(word)
      )
    };
  })
  .filter(chunk => chunk.matchScore > 0)
  .sort((a, b) => b.matchScore - a.matchScore);
  
  return chunks.slice(0, topK);
}

/* get knowledge base statistcs */
export function getKnowledgeStats() {
  return {
    totalChunks: knowledgeBase.total_chunks,
    categories: knowledgeBase.categories,
    lastUpdated: knowledgeBase.last_updated,
    version: knowledgeBase.version
  };
}
