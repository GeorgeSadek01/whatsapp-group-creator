/**
 * CSV Processing Utilities
 */

const csvParser = require('csv-parser');
const { Readable } = require('stream');

/**
 * Parse CSV content and extract data from specified columns
 * @param {string} csvContent - Raw CSV content
 * @param {Array<string>} columns - Column names to extract
 * @returns {Promise<Array>} - Extracted data
 */
function parseCSV(csvContent, columns) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from([csvContent]);

    stream
      .pipe(csvParser())
      .on('data', (row) => {
        columns.forEach((col) => {
          if (row[col]) {
            results.push(row[col]);
          }
        });
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

/**
 * Get CSV headers from content
 * @param {string} csvContent - Raw CSV content
 * @returns {Array<string>} - Header names
 */
function getCSVHeaders(csvContent) {
  if (!csvContent) return [];
  
  const firstLine = csvContent.split('\n')[0].trim();
  return firstLine.split(',').map(h => h.trim());
}

/**
 * Validate CSV format
 * @param {string} csvContent - Raw CSV content
 * @returns {object} - Validation result
 */
function validateCSV(csvContent) {
  const result = {
    isValid: false,
    headers: [],
    rowCount: 0,
    errors: []
  };

  try {
    if (!csvContent || csvContent.trim().length === 0) {
      result.errors.push('CSV content is empty');
      return result;
    }

    const lines = csvContent.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length < 2) {
      result.errors.push('CSV must have at least header and one data row');
      return result;
    }

    result.headers = getCSVHeaders(csvContent);
    result.rowCount = lines.length - 1; // Exclude header
    
    if (result.headers.length === 0) {
      result.errors.push('No valid headers found');
      return result;
    }

    result.isValid = true;
    return result;
  } catch (err) {
    result.errors.push(`CSV parsing error: ${err.message}`);
    return result;
  }
}

module.exports = {
  parseCSV,
  getCSVHeaders,
  validateCSV
};