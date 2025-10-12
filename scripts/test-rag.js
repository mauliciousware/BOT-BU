const { findRelevantChunks, keywordSearch, getKnowledgeStats } = require('../src/lib/vectorStore.js');

const testQueries = [
  "Which dining halls are open now?",
  "Hinman dining hall hours",
  "Where can I eat on campus?",
];

async function test() {
  console.log('🧪 Testing RAG System\n');
  console.log('📊 Stats:', getKnowledgeStats(), '\n');

  for (const query of testQueries) {
    console.log(`\n🔍 Query: "${query}"`);
    console.log('─'.repeat(60));
    
    try {
      const chunks = await findRelevantChunks(query, { topK: 3 });
      
      if (chunks.length > 0) {
        console.log(`✅ Found ${chunks.length} chunks:`);
        chunks.forEach((chunk, i) => {
          console.log(`\n  ${i + 1}. ${chunk.title}`);
          console.log(`     Score: ${(chunk.similarity * 100).toFixed(1)}%`);
          console.log(`     Category: ${chunk.category}`);
          console.log(`     Preview: ${chunk.content.substring(0, 80)}...`);
        });
      } else {
        console.log('❌ No chunks found');
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
  
  console.log('\n✅ Test complete!\n');
}

test();
