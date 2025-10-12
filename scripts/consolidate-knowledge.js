const fs = require('fs');
const path = require('path');

const KNOWLEDGE_BASE_PATH = path.join(__dirname, '../knowledge-base');
const OUTPUT_PATH = path.join(KNOWLEDGE_BASE_PATH, 'unified-knowledge.json');

// Extract keywords from text
function extractKeywords(text) {
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being']);
  
  return text
    .toLowerCase()
    .match(/\b[a-z]{3,}\b/g)
    ?.filter(word => !commonWords.has(word))
    .filter((word, index, arr) => arr.indexOf(word) === index)
    .slice(0, 20) || [];
}

// Split text into chunks by headers
function splitIntoChunks(content, filename, category) {
  const chunks = [];
  let chunkId = 1;
  
  // Split by markdown headers (### or ##)
  const sections = content.split(/(?=^#{2,3}\s)/m);
  
  sections.forEach(section => {
    const trimmed = section.trim();
    if (trimmed.length < 50) return; // Skip very short sections
    
    // Extract title from header
    const titleMatch = trimmed.match(/^#{2,3}\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : 'General Information';
    
    // Clean content (remove markdown formatting for better search)
    const cleanContent = trimmed
      .replace(/^#{1,6}\s+/gm, '') // Remove headers
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.+?)\*/g, '$1') // Remove italic
      .replace(/`(.+?)`/g, '$1') // Remove code
      .trim();
    
    chunks.push({
      id: `${category}-${chunkId++}`,
      title,
      category,
      content: cleanContent,
      metadata: {
        source: filename,
        length: cleanContent.length,
        created: new Date().toISOString()
      },
      keywords: extractKeywords(cleanContent)
    });
  });
  
  return chunks;
}

// Process course JSON files (Banner API format)
function processCourseJSON(data, filename, category) {
  const chunks = [];
  
  if (!data.data || !Array.isArray(data.data)) return chunks;
  
  // Group courses by course number
  const courseGroups = {};
  
  data.data.forEach(section => {
    const courseNum = section.courseNumber;
    if (!courseGroups[courseNum]) {
      courseGroups[courseNum] = {
        title: section.courseTitle,
        credits: section.creditHourLow || section.creditHours,
        sections: []
      };
    }
    courseGroups[courseNum].sections.push(section);
  });
  
  // Create chunks for each course
  let chunkId = 1;
  Object.entries(courseGroups).forEach(([courseNum, courseData]) => {
    let content = `CS ${courseNum} - ${courseData.title}\n`;
    content += `Credits: ${courseData.credits}\n`;
    content += `Term: ${data.data[0]?.termDesc || 'Fall 2025'}\n`;
    content += `Total Sections: ${courseData.sections.length}\n\n`;
    
    // Add first 3 sections (to keep chunk size reasonable)
    const sectionsToShow = courseData.sections.slice(0, 3);
    sectionsToShow.forEach(section => {
      content += `Section ${section.sequenceNumber}:\n`;
      content += `CRN: ${section.courseReferenceNumber}\n`;
      content += `Type: ${section.scheduleTypeDescription}\n`;
      
      // Get instructor from faculty array
      if (section.faculty && section.faculty.length > 0) {
        const instructor = section.faculty[0].displayName || 'Staff';
        content += `Instructor: ${instructor}\n`;
      } else {
        content += `Instructor: Staff\n`;
      }
      
      // Get meeting times
      if (section.meetingsFaculty && section.meetingsFaculty.length > 0) {
        const meeting = section.meetingsFaculty[0].meetingTime;
        if (meeting.meetingScheduleType !== 'TBA') {
          const days = [
            meeting.monday && 'M',
            meeting.tuesday && 'T', 
            meeting.wednesday && 'W',
            meeting.thursday && 'R',
            meeting.friday && 'F'
          ].filter(Boolean).join('');
          
          if (days) {
            content += `Schedule: ${days} ${meeting.beginTime || ''} - ${meeting.endTime || ''}\n`;
            content += `Location: ${meeting.building || ''} ${meeting.room || ''}\n`;
          }
        }
      }
      
      content += `Seats: ${section.seatsAvailable}/${section.maximumEnrollment}\n`;
      content += `Wait List: ${section.waitAvailable}/${section.waitCapacity}\n\n`;
    });
    
    if (courseData.sections.length > 3) {
      content += `... and ${courseData.sections.length - 3} more sections available\n`;
    }
    
    // Get primary instructor (from first section)
    const primaryInstructor = courseData.sections[0]?.faculty?.[0]?.displayName || 'Staff';
    
    chunks.push({
      id: `${category}-${chunkId++}`,
      title: `CS ${courseNum} - ${courseData.title}`,
      category,
      content: content.trim(),
      metadata: {
        source: filename,
        course_number: courseNum,
        level: category.includes('graduate') ? 'Graduate' : 'Undergraduate',
        instructor: primaryInstructor,
        total_sections: courseData.sections.length,
        credits: courseData.credits,
        term: data.data[0]?.termDesc || 'Fall 2025',
        created: new Date().toISOString()
      },
      keywords: extractKeywords(content)
    });
  });
  
  return chunks;
}

// Process dining hours JSON
function processDiningHoursJSON(data, filename) {
  const chunks = [];
  const category = 'dining hours';
  
  if (!data.locations || !Array.isArray(data.locations)) return chunks;
  
  const week = data.week || 'Current Week';
  let chunkId = 1;
  
  // Create a chunk for each dining location
  data.locations.forEach(location => {
    let content = `${location.name}\n`;
    content += `Week: ${week}\n\n`;
    
    if (location.regular_hours) {
      content += `Regular Hours:\n`;
      Object.entries(location.regular_hours).forEach(([day, hours]) => {
        const formattedDay = day.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        content += `${formattedDay}: ${hours}\n`;
      });
    }
    
    if (location.special_hours) {
      content += `\nSpecial Hours:\n`;
      Object.entries(location.special_hours).forEach(([day, hours]) => {
        const formattedDay = day.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        content += `${formattedDay}: ${hours}\n`;
      });
    }
    
    chunks.push({
      id: `dining-${chunkId++}`,
      title: location.name,
      category,
      content: content.trim(),
      metadata: {
        source: filename,
        location: location.name,
        week: week,
        type: 'dining_location',
        created: new Date().toISOString()
      },
      keywords: extractKeywords(content)
    });
  });
  
  return chunks;
}

// Main consolidation function
async function consolidateKnowledge() {
  console.log('🚀 Starting knowledge base consolidation...\n');
  
  try {
    // Read all .txt files in knowledge-base directory
    const txtFiles = fs.readdirSync(KNOWLEDGE_BASE_PATH)
      .filter(file => file.endsWith('.txt'));
    
    // Read all course JSON files
    const jsonFiles = fs.readdirSync(KNOWLEDGE_BASE_PATH)
      .filter(file => file.endsWith('.json') && !file.includes('unified'));
    
    console.log(`📁 Found ${txtFiles.length} text files and ${jsonFiles.length} JSON files:`);
    txtFiles.forEach(file => console.log(`   - ${file}`));
    jsonFiles.forEach(file => console.log(`   - ${file}`));
    console.log('');
    
    const allChunks = [];
    const categories = new Set();
    
    // Process text files
    for (const filename of txtFiles) {
      const filepath = path.join(KNOWLEDGE_BASE_PATH, filename);
      const content = fs.readFileSync(filepath, 'utf-8');
      
      // Determine category from filename
      const category = filename
        .replace('.txt', '')
        .replace(/_/g, ' ')
        .toLowerCase();
      
      categories.add(category);
      
      // Split into chunks
      const chunks = splitIntoChunks(content, filename, category);
      allChunks.push(...chunks);
      
      console.log(`✅ Processed ${filename}: ${chunks.length} chunks`);
    }
    
    // Process JSON course files
    for (const filename of jsonFiles) {
      const filepath = path.join(KNOWLEDGE_BASE_PATH, filename);
      const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      
      let chunks = [];
      let category;
      
      // Determine file type and process accordingly
      if (filename.includes('dining')) {
        // Dining hours file
        chunks = processDiningHoursJSON(data, filename);
        category = 'dining hours';
      } else if (filename.includes('music')) {
        // Music courses
        category = 'fall 2025 music courses';
        chunks = processCourseJSON(data, filename, category);
      } else if (filename.includes('graduate') || filename.includes('grad')) {
        // Graduate CS courses
        category = 'fall 2025 graduate cs courses';
        chunks = processCourseJSON(data, filename, category);
      } else {
        // Undergraduate CS courses
        category = 'fall 2025 undergraduate cs courses';
        chunks = processCourseJSON(data, filename, category);
      }
      
      categories.add(category);
      allChunks.push(...chunks);
      
      console.log(`✅ Processed ${filename}: ${chunks.length} chunks`);
    }
    
    // Create unified knowledge base
    const knowledgeBase = {
      version: '1.0.0',
      last_updated: new Date().toISOString(),
      total_chunks: allChunks.length,
      categories: Array.from(categories),
      chunks: allChunks
    };
    
    // Save to file
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(knowledgeBase, null, 2));
    
    console.log('\n✅ Knowledge base consolidated successfully!');
    console.log(`📊 Total chunks: ${allChunks.length}`);
    console.log(`📁 Categories: ${knowledgeBase.categories.join(', ')}`);
    console.log(`💾 Saved to: ${OUTPUT_PATH}`);
    
    return knowledgeBase;
    
  } catch (error) {
    console.error('❌ Error consolidating knowledge:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  consolidateKnowledge()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { consolidateKnowledge };
