import fs from 'fs';
import path from 'path';
import { getDocumentProxy } from 'unpdf';
import mammoth from 'mammoth';

/* docment processing library for knowledge base
   handels txt pdf and docx files */

const KNOWLEDGE_BASE_PATH = path.join(process.cwd(), 'knowledge-base');

// ********** document cache - prevents re extracting pdfs every request **********
let documentCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 mins

function isCacheValid() {
  if (!documentCache || !cacheTimestamp) return false;
  const now = Date.now();
  return (now - cacheTimestamp) < CACHE_DURATION;
}

function getCachedDocuments() {
  if (isCacheValid()) {
    console.log('Using cached documents (saves procesing time!)');
    return documentCache;
  }
  return null;
}

function setCachedDocuments(documents) {
  documentCache = documents;
  cacheTimestamp = Date.now();
  console.log('Documents cached for 5 minuts');
}

/* extact text from txt file */
async function extractTextFromTXT(filePath) {
  try {
    const text = await fs.promises.readFile(filePath, 'utf-8');
    return text;
  } catch (error) {
    console.error(`Error reading TXT file ${filePath}:`, error);
    return '';
  }
}

/* extact text from pdf file */
async function extractTextFromPDF(filePath) {
  try {
    console.log(`Extracting text from PDF: ${path.basename(filePath)}`);
    
    // red PDF file as buffer
    const buffer = await fs.promises.readFile(filePath);
    
    // convert Buffer to Uint8Aray (required by unpdf)
    const uint8Array = new Uint8Array(buffer);
    
    // get PDF document proxy
    const pdf = await getDocumentProxy(uint8Array);
    
    let fullText = '';
    const numPages = pdf.numPages;
    
    console.log(`   Processing ${numPages} pages...`);
    
    // extact text from each page
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // combine all text itms from the page
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }
    
    console.log(`   Extracted ${fullText.length} characters from PDF`);
    return fullText.trim();
    
  } catch (error) {
    console.error(`Error reading PDF file ${filePath}:`, error.message);
    return `[Error extracting PDF: ${path.basename(filePath)}]`;
  }
}

/* extract text from docx file */
async function extractTextFromDOCX(filePath) {
  try {
    console.log(`Extracting text from DOCX: ${path.basename(filePath)}`);
    
    // read DOCX file as bufer
    const buffer = await fs.promises.readFile(filePath);
    
    // extact text using mammoth
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;
    
    if (result.messages && result.messages.length > 0) {
      console.warn('   Mammoth warnings:', result.messages);
    }
    
    console.log(`   Extracted ${text.length} characters from DOCX`);
    return text.trim();
    
  } catch (error) {
    console.error(`Error reading DOCX file ${filePath}:`, error.message);
    return `[Error extracting DOCX: ${path.basename(filePath)}]`;
  }
}

/* extact text from any suported file type */
async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.txt':
      return extractTextFromTXT(filePath);
    case '.pdf':
      return extractTextFromPDF(filePath);
    case '.docx':
      return extractTextFromDOCX(filePath);
    default:
      console.warn(`Unsupported file type: ${ext}`);
      return '';
  }
}

/* split text into chnks for better procesing */
function chunkText(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  const sentences = text.split(/[.!?]\s+/);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      
      // keep last part for ovrlap
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-Math.floor(overlap / 5));
      currentChunk = overlapWords.join(' ') + ' ' + sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/* get all docment files from knowledge base */
async function getAllDocuments() {
  // chek cache first
  const cached = getCachedDocuments();
  if (cached) {
    return cached;
  }

  try {
    // crete directory if it doesnt exist
    if (!fs.existsSync(KNOWLEDGE_BASE_PATH)) {
      await fs.promises.mkdir(KNOWLEDGE_BASE_PATH, { recursive: true });
      console.log('Created knowledge-base directory');
      return [];
    }
    
    const files = await fs.promises.readdir(KNOWLEDGE_BASE_PATH);
    const supportedExtensions = ['.txt', '.pdf', '.docx'];
    
    return files
      .filter(file => supportedExtensions.includes(path.extname(file).toLowerCase()))
      .map(file => path.join(KNOWLEDGE_BASE_PATH, file));
  } catch (error) {
    console.error('Error reading knowledge base:', error);
    return [];
  }
}


/* proces all documnts and return structured data */
export async function loadKnowledgeBase() {
  // chek cache first
  const cached = getCachedDocuments();
  if (cached) {
    return cached;
  }

  console.log('Loading knowledge base...');
  
  const documentPaths = await getAllDocuments();
  
  if (documentPaths.length === 0) {
    console.log('No documents found in knowledge-base/');
    return [];
  }
  
  console.log(`Found ${documentPaths.length} documents`);
  
  const documents = [];
  
  for (const filePath of documentPaths) {
    const fileName = path.basename(filePath);
    console.log(`   Processing: ${fileName}`);
    
    const text = await extractText(filePath);
    
    if (text && text.trim()) {
      const chunks = chunkText(text);
      
      documents.push({
        fileName,
        filePath,
        fullText: text,
        chunks,
        chunkCount: chunks.length
      });
      
      console.log(`   Extracted ${chunks.length} chunks from ${fileName}`);
    } else {
      console.log(`   No text extracted from ${fileName}`);
    }
  }
  
  console.log(`Loaded ${documents.length} documents with ${documents.reduce((sum, doc) => sum + doc.chunkCount, 0)} total chunks`);
  
  // cache the reslts
  setCachedDocuments(documents);
  
  return documents;
}

/* simple keyword based serch through docments */
export function searchDocuments(documents, query, maxResults = 5) {
  console.log(`Searching documents for: "${query}"`);
  
  if (!documents || documents.length === 0) {
    console.log('   No documents to search');
    return [];
  }
  
  const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
  const results = [];
  
  for (const doc of documents) {
    for (let i = 0; i < doc.chunks.length; i++) {
      const chunk = doc.chunks[i];
      const chunkLower = chunk.toLowerCase();
      
      // cont matching terms
      let matchCount = 0;
      for (const term of queryTerms) {
        if (chunkLower.includes(term)) {
          matchCount++;
        }
      }
      
      if (matchCount > 0) {
        results.push({
          fileName: doc.fileName,
          chunk,
          chunkIndex: i,
          matchCount,
          relevanceScore: matchCount / queryTerms.length
        });
      }
    }
  }
  
  // sort by relevence and return top results
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  const topResults = results.slice(0, maxResults);
  
  console.log(`   Found ${results.length} matching chunks, returning top ${topResults.length}`);
  
  return topResults;
}

/* format serch results for ai context */
export function formatContextFromResults(results) {
  if (!results || results.length === 0) {
    return '';
  }
  
  // map interal filenames to professional names
  const friendlyNames = {
    'DeleteLater.txt': 'University Staff Directory',
    'cs_exam_schedule.txt': 'Computer Science Exam Schedule',
    'department_contacts.txt': 'Department Contact Information',
    'dining_hours_policy.txt': 'Dining Services Information'
  };
  
  let context = 'INTERNAL DOCUMENTS CONTEXT:\n\n';
  
  results.forEach((result, index) => {
    const friendlyName = friendlyNames[result.fileName] || 'Internal University Documents';
    context += `[Document: ${friendlyName}]\n`;
    context += `${result.chunk}\n\n`;
  });
  
  return context;
}

/* main serch function - returns formated context */
export async function getInternalContext(query) {
  try {
    const documents = await loadKnowledgeBase();
    
    if (documents.length === 0) {
      return null;
    }
    
    const results = searchDocuments(documents, query);
    
    if (results.length === 0) {
      console.log('   No relevant documents found');
      return null;
    }
    
    const context = formatContextFromResults(results);
    console.log(`Generated context from ${results.length} document chunks`);
    
    return {
      context,
      sources: results.map(r => r.fileName),
      chunkCount: results.length
    };
  } catch (error) {
    console.error('Error getting internal context:', error);
    return null;
  }
}
