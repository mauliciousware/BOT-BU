const { findRelevantChunks } = require('../src/lib/vectorStore.js');

async function testTimingQuery() {
  console.log('🧪 Testing timing query with course context...\n');
  
  // Simulate the expanded query
  const query = "CS 515 CS 559 CS 542 timing schedule when does it meet";
  
  console.log(`📝 Query: "${query}"\n`);
  
  try {
    const chunks = await findRelevantChunks(query, {
      topK: 5,
      minScore: 0.3
    });
    
    console.log(`✅ Found ${chunks.length} chunks:\n`);
    
    chunks.forEach((chunk, i) => {
      console.log(`${i + 1}. ${chunk.title} (Score: ${chunk.score.toFixed(3)})`);
      console.log(`   ${chunk.content.substring(0, 200)}...\n`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testTimingQuery();
