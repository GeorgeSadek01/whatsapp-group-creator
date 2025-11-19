/**
 * Egyptian Phone Number Validation Utilities
 * Supports multiple input formats and validates against Egyptian mobile operators
 */

/**
 * Egyptian mobile operators and their prefixes (without the trunk prefix 0)
 */
const EGYPTIAN_OPERATORS = {
  '10': 'Vodafone',
  '11': 'Etisalat',
  '12': 'Orange',
  '15': 'WE (Telecom Egypt)'
};

/**
 * Clean and validate Egyptian phone numbers
 * @param {string|number} rawNumber - Raw phone number input
 * @returns {string|null} - Cleaned number in format 20 + 10-digit-local or null if invalid
 */
function cleanEgyptianNumber(rawNumber) {
  if (!rawNumber) return null;
  
  // Remove all non-digit characters
  let clean = rawNumber.toString().replace(/\D/g, '');
  
  // Handle different Egyptian number formats
  if (clean.startsWith('00201')) {
    // Format: 00201xxxxxxxxx -> 201xxxxxxxxx (remove 00)
    clean = clean.substring(2);
  } else if (clean.startsWith('201') && clean.length === 12) {
    // Format: 201xxxxxxxxx (already correct)
    clean = clean;
  } else if (clean.startsWith('01') && clean.length === 11) {
    // Format: 01xxxxxxxxx -> 201xxxxxxxxx
    clean = '2' + clean;
  } else if (clean.length === 10 && clean.startsWith('1')) {
    // Format: 1xxxxxxxxx -> 201xxxxxxxxx
    clean = '20' + clean;
  } else if (clean.length === 9) {
    // Format: xxxxxxxxx -> 201xxxxxxxxx
    clean = '201' + clean;
  }
  
  // Validate Egyptian number format: 201xxxxxxxxx (12 digits total)
  // Structure: 20 (Egypt code) + 1X (operator: 10, 11, 12, 15) + 8 remaining digits
  if (clean.length === 12 && clean.startsWith('20')) {
    // Extract operator code (2 digits after country code, e.g., "10", "11", "12", "15")
    const operatorCode = clean.substring(2, 4);
    if (['10', '11', '12', '15'].includes(operatorCode)) {
      return clean;
    }
  }
  
  return null; // Invalid number
}

/**
 * Get operator information for a phone number
 * @param {string} cleanNumber - Clean number in format 201xxxxxxxxx
 * @returns {object|null} - Operator info or null if invalid
 */
function getOperatorInfo(cleanNumber) {
  if (!cleanNumber || cleanNumber.length !== 12 || !cleanNumber.startsWith('20')) {
    return null;
  }
  
  const operatorCode = cleanNumber.substring(2, 4);
  const operatorName = EGYPTIAN_OPERATORS[operatorCode];
  
  return operatorName ? {
    code: `0${operatorCode}`, // Display with trunk prefix for readability
    name: operatorName,
    displayNumber: `+${cleanNumber}`
  } : null;
}

/**
 * Validate multiple phone numbers
 * @param {Array} numbers - Array of raw phone numbers
 * @returns {object} - Validation results with valid/invalid arrays
 */
function validatePhoneNumbers(numbers) {
  const results = {
    valid: [],
    invalid: [],
    duplicates: 0,
    operatorStats: {}
  };
  
  const seen = new Set();
  
  for (const rawNumber of numbers) {
    const cleanNumber = cleanEgyptianNumber(rawNumber);
    
    if (cleanNumber) {
      if (seen.has(cleanNumber)) {
        results.duplicates++;
      } else {
        seen.add(cleanNumber);
        const operatorInfo = getOperatorInfo(cleanNumber);
        
        results.valid.push({
          original: rawNumber,
          clean: cleanNumber,
          whatsappId: `${cleanNumber}@c.us`,
          operator: operatorInfo
        });
        
        // Update operator stats
        if (operatorInfo) {
          results.operatorStats[operatorInfo.name] = (results.operatorStats[operatorInfo.name] || 0) + 1;
        }
      }
    } else {
      results.invalid.push({
        original: rawNumber,
        reason: 'Invalid Egyptian mobile number format'
      });
    }
  }
  
  return results;
}

module.exports = {
  cleanEgyptianNumber,
  getOperatorInfo,
  validatePhoneNumbers,
  EGYPTIAN_OPERATORS
};