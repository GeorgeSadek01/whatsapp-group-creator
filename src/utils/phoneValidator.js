/**
 * Egyptian Phone Number Validation Utilities
 * Supports multiple input formats and validates against Egyptian mobile operators
 */

/**
 * Egyptian mobile operators and their prefixes
 */
const EGYPTIAN_OPERATORS = {
  '010': 'Vodafone',
  '011': 'Etisalat',
  '012': 'Orange',
  '015': 'WE (Telecom Egypt)'
};

/**
 * Clean and validate Egyptian phone numbers
 * @param {string|number} rawNumber - Raw phone number input
 * @returns {string|null} - Cleaned number in format 201xxxxxxxx or null if invalid
 */
function cleanEgyptianNumber(rawNumber) {
  if (!rawNumber) return null;
  
  // Remove all non-digit characters
  let clean = rawNumber.toString().replace(/\D/g, '');
  
  // Handle different Egyptian number formats
  if (clean.startsWith('00201')) {
    // Format: 00201xxxxxxxx -> 201xxxxxxxx
    clean = clean.substring(2);
  } else if (clean.startsWith('201')) {
    // Format: 201xxxxxxxx (already correct)
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
  if (clean.length === 12 && clean.startsWith('201')) {
    // Validate the third digit (Egyptian mobile operators: 0, 1, 2, 5)
    const thirdDigit = clean.charAt(2);
    if (['0', '1', '2', '5'].includes(thirdDigit)) {
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
  if (!cleanNumber || cleanNumber.length !== 12 || !cleanNumber.startsWith('201')) {
    return null;
  }
  
  const operatorCode = cleanNumber.substring(2, 5);
  const operatorName = EGYPTIAN_OPERATORS[operatorCode];
  
  if (operatorName) {
    return {
      code: operatorCode,
      name: operatorName,
      displayNumber: `+${cleanNumber}`
    };
  }
  
  // If no specific operator found but valid Egyptian number, return generic info
  const thirdDigit = cleanNumber.charAt(2);
  if (['0', '1', '2', '5'].includes(thirdDigit)) {
    return {
      code: `01${thirdDigit}`,
      name: `Egyptian Mobile (01${thirdDigit})`,
      displayNumber: `+${cleanNumber}`
    };
  }
  
  return null;
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