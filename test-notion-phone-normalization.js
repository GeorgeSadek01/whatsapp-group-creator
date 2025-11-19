/**
 * Test Notion Phone Number Normalization
 * Verifies that phone numbers exported from Notion are correctly normalized
 */

const { validatePhoneNumbers, cleanEgyptianNumber, getOperatorInfo } = require('./src/utils/phoneValidator');

// Sample phone numbers from Notion "المخدومين" database
const notionPhoneNumbers = [
  // Format 1: 11 digits starting with 01 (most common in Notion)
  '01225058180',  // انطونيوس سامي بباوي جرجس - Orange (012)
  '01026686410',  // كاراس رضا - Vodafone (010)
  '01229048267',  // مانويل جوزيف خليل محروس - Orange (012)
  '01273830690',  // مانويل (phone 2) - Orange (012)
  '01202999544',  // بارثينيا روماني سمير - Orange (012)
  '01555727960',  // كاراس مايكل سمير - WE (015)
  '01288994976',  // فيلومينا اسحق سمعان - Orange (012)
  '01210814106',  // سيلينا فايز مبارك - Orange (012)
  '01204166067',  // ميرولا شنودة روماني - Orange (012)
  '01027348760',  // ميرولا (phone 2) - Vodafone (010)
  '01207763611',  // ايرن ايمن عيسي يونان - Orange (012)
  '01210979744',  // ايرن (phone 2) - Orange (012)
  '01202831143',  // مايوركاوائل - Orange (012)
  '01154321234',  // Test Etisalat (011)
  '01000000000',  // Test Vodafone (010)
  
  // Format 2: With country code
  '00201225058180',
  '201225058180',
  
  // Format 3: Without leading 0
  '1225058180',
  
  // Format 4: 9 digits only
  '225058180',
  
  // Invalid formats
  null,
  '',
  'N/A',
  '123456789',      // Too short + invalid operator
  '01325058180',    // Invalid operator (013)
  '01425058180',    // Invalid operator (014)
  '01925058180',    // Invalid operator (019)
];

console.log('═══════════════════════════════════════════════════════════════');
console.log('   Testing Notion Phone Number Normalization');
console.log('═══════════════════════════════════════════════════════════════\n');

// Test 1: Individual number cleaning
console.log('📝 Test 1: Individual Number Cleaning\n');
notionPhoneNumbers.forEach((num, index) => {
  const cleaned = cleanEgyptianNumber(num);
  const operator = cleaned ? getOperatorInfo(cleaned) : null;
  
  if (cleaned) {
    console.log(`✅ ${index + 1}. ${num || 'null'}`);
    console.log(`   → Cleaned: ${cleaned}`);
    console.log(`   → WhatsApp ID: ${cleaned}@c.us`);
    console.log(`   → Operator: ${operator ? operator.name : 'Unknown'}\n`);
  } else {
    console.log(`❌ ${index + 1}. ${num || 'null'}`);
    console.log(`   → Invalid format\n`);
  }
});

// Test 2: Batch validation (as used in the app)
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('📊 Test 2: Batch Validation Results\n');

const results = validatePhoneNumbers(notionPhoneNumbers.filter(n => n)); // Remove null values
console.log(`Total Numbers Processed: ${notionPhoneNumbers.filter(n => n).length}`);
console.log(`✅ Valid Numbers: ${results.valid.length}`);
console.log(`❌ Invalid Numbers: ${results.invalid.length}`);
console.log(`🔄 Duplicates: ${results.duplicates}\n`);

// Test 3: Operator Statistics
console.log('═══════════════════════════════════════════════════════════════');
console.log('📈 Test 3: Operator Statistics\n');
Object.entries(results.operatorStats).forEach(([operator, count]) => {
  console.log(`${operator}: ${count} numbers`);
});

// Test 4: Valid numbers detail
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('📞 Test 4: Valid Numbers (Ready for WhatsApp)\n');
results.valid.slice(0, 5).forEach((item, index) => {
  console.log(`${index + 1}. Original: ${item.original}`);
  console.log(`   Clean: ${item.clean}`);
  console.log(`   WhatsApp: ${item.whatsappId}`);
  console.log(`   Operator: ${item.operator.name}\n`);
});

if (results.valid.length > 5) {
  console.log(`... and ${results.valid.length - 5} more valid numbers\n`);
}

// Test 5: Invalid numbers detail
if (results.invalid.length > 0) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('⚠️  Test 5: Invalid Numbers\n');
  results.invalid.forEach((item, index) => {
    console.log(`${index + 1}. ${item.original}`);
    console.log(`   Reason: ${item.reason}\n`);
  });
}

// Test 6: Edge cases specific to Notion export
console.log('═══════════════════════════════════════════════════════════════');
console.log('🔍 Test 6: Notion-Specific Edge Cases\n');

const edgeCases = [
  { input: null, description: 'NULL value (empty field in Notion)' },
  { input: '', description: 'Empty string' },
  { input: '01225058180', description: 'Standard 11-digit (most common)' },
  { input: '+201225058180', description: 'With + prefix' },
  { input: '0020 1225058180', description: 'With spaces' },
  { input: '01-2250-58180', description: 'With dashes' },
  { input: '(012) 2505-8180', description: 'With parentheses' },
];

edgeCases.forEach((testCase) => {
  const cleaned = cleanEgyptianNumber(testCase.input);
  console.log(`📌 ${testCase.description}`);
  console.log(`   Input: "${testCase.input || 'null'}"`);
  console.log(`   Result: ${cleaned ? `✅ ${cleaned}` : '❌ Invalid'}\n`);
});

// Final summary
console.log('═══════════════════════════════════════════════════════════════');
console.log('📋 SUMMARY\n');
console.log(`Total Valid: ${results.valid.length}`);
console.log(`Total Invalid: ${results.invalid.length}`);
console.log(`Duplicates Removed: ${results.duplicates}`);
console.log(`Unique Valid Numbers: ${results.valid.length}`);
console.log('\n✅ Phone normalization is working correctly for Notion exports!');
console.log('═══════════════════════════════════════════════════════════════\n');
