const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Read .env.local file manually
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const apiKeyMatch = envContent.match(/GOOGLE_AI_API_KEY=(.+)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;

if (!apiKey) {
  console.error('❌ GOOGLE_AI_API_KEY not found in .env.local');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

const KNOWLEDGE_PATH = path.join(__dirname, '../knowledge-base/unified-knowledge.json');
const OUTPUT_PATH = path.join(__dirname, '../knowledge-base/unified-knowledge-embedded.json');

async function generateEmbeddings() {
  console.log('🚀 Starting embedding generation...\n');
  
  try {
    // Load unified knowledge base
    const knowledgeBase = JSON.parse(fs.readFileSync(KNOWLEDGE_PATH, 'utf-8'));
    console.log(`📊 Loaded ${knowledgeBase.total_chunks} chunks\n`);
    
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    
    let processed = 0;
    let failed = 0;
    const total = knowledgeBase.chunks.length;
    
    // Generate embeddings for each chunk
    for (const chunk of knowledgeBase.chunks) {
      try {
        // Combine title + content for better embeddings
        const textToEmbed = `${chunk.title}\n\n${chunk.content}`;
        
        const result = await model.embedContent(textToEmbed);
        chunk.embedding = result.embedding.values;
        
        processed++;
        
        // Progress indicator (every 5 chunks)
        if (processed % 5 === 0 || processed === total) {
          console.log(`✅ Progress: ${processed}/${total} (${Math.round(processed/total*100)}%)`);
        }
        
        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        failed++;
        console.error(`❌ Error on chunk ${chunk.id}:`, error.message);
      }
    }
    
    // Save updated knowledge base with embeddings
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(knowledgeBase, null, 2));
    
    console.log('\n🎉 Embeddings generated successfully!');
    console.log(`✅ Processed: ${processed}/${total}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`💾 Saved to: ${OUTPUT_PATH}`);
    
    // Calculate file sizes
    const originalSize = (fs.statSync(KNOWLEDGE_PATH).size / 1024).toFixed(2);
    const embeddedSize = (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(2);
    console.log(`📊 Size: ${originalSize}KB → ${embeddedSize}KB`);
    
    return knowledgeBase;
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  generateEmbeddings()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { generateEmbeddings };
