/**
 * Simplified Renderer Process for debugging
 */

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded');
  
  // Check if electronAPI is available
  if (typeof electronAPI === 'undefined') {
    console.error('electronAPI is not available');
    return;
  }
  
  console.log('electronAPI is available');
  
  // Get form elements
  const groupNameInput = document.getElementById('groupName');
  const csvFileInput = document.getElementById('csvFile');
  const columnSelect = document.getElementById('columnSelect');
  const createGroupButton = document.getElementById('createGroupButton');
  const logEntries = document.getElementById('logEntries');
  const qrCode = document.getElementById('qrCode');
  
  // Log function
  function addLog(message, type = 'info') {
    console.log(`[${type}] ${message}`);
    if (logEntries) {
      const entry = document.createElement('div');
      entry.className = `log-entry ${type}`;
      entry.innerHTML = `<span class="timestamp">[${new Date().toLocaleTimeString()}]</span>${message}`;
      logEntries.appendChild(entry);
      entry.scrollIntoView({ behavior: 'smooth' });
    }
  }
  
  // Status listener
  electronAPI.onStatus((data) => {
    console.log('Status update:', data);
    addLog(data.message, data.type);
    
    // Handle QR code
    if (data.type === 'qr-code' && data.qrDataUrl) {
      if (qrCode) {
        qrCode.innerHTML = `<img src="${data.qrDataUrl}" alt="WhatsApp QR Code" style="max-width: 256px;">`;
        document.getElementById('qrSection').style.display = 'block';
      }
    }
    
    // Enable form when ready
    if (data.type === 'ready' || data.type === 'authenticated') {
      if (document.getElementById('qrSection')) {
        document.getElementById('qrSection').style.display = 'none';
      }
      validateForm();
    }
  });
  
  // Error listener
  electronAPI.onError((error) => {
    console.error('Error:', error);
    addLog(`Error: ${error.message}`, 'error');
  });
  
  // Config listener
  electronAPI.onConfigUpdated((config) => {
    console.log('Config updated:', config);
  });
  
  // CSV file change handler
  csvFileInput.addEventListener('change', async () => {
    console.log('CSV file selected');
    const file = csvFileInput.files[0];
    if (!file) return;
    
    try {
      const content = await readFileAsText(file);
      const firstLine = content.split('\n')[0].trim();
      const headers = firstLine.split(',').map(h => h.trim());
      
      // Clear and populate column select
      columnSelect.innerHTML = '';
      headers.forEach(header => {
        const option = document.createElement('option');
        option.value = header;
        option.textContent = header;
        columnSelect.appendChild(option);
      });
      
      document.getElementById('columnSelectGroup').style.display = 'block';
      addLog(`CSV loaded with ${headers.length} columns: ${headers.join(', ')}`);
      validateForm();
    } catch (error) {
      console.error('Error reading CSV:', error);
      addLog(`Failed to read CSV: ${error.message}`, 'error');
    }
  });
  
  // Form validation
  function validateForm() {
    const isValid = groupNameInput.value.trim().length >= 3 &&
                   csvFileInput.files.length > 0 &&
                   columnSelect.selectedOptions.length > 0;
    
    createGroupButton.disabled = !isValid;
    console.log('Form validation:', isValid);
  }
  
  // Input event listeners
  groupNameInput.addEventListener('input', validateForm);
  columnSelect.addEventListener('change', validateForm);
  
  // Create group button click
  createGroupButton.addEventListener('click', async () => {
    console.log('Create group button clicked');
    addLog('Create group button clicked');
    
    const file = csvFileInput.files[0];
    if (!file) {
      addLog('No CSV file selected', 'error');
      return;
    }
    
    try {
      const csvContent = await readFileAsText(file);
      const groupName = groupNameInput.value.trim();
      const columns = Array.from(columnSelect.selectedOptions).map(o => o.value);
      
      console.log('Calling electronAPI.createGroup with:', { groupName, columns: columns.length });
      addLog(`Creating group "${groupName}" with columns: ${columns.join(', ')}`);
      
      const result = await electronAPI.createGroup({
        csvContent,
        groupName,
        columns
      });
      
      console.log('Result:', result);
      
      if (result.success) {
        addLog('Group creation completed successfully!', 'success');
      } else {
        addLog(`Group creation failed: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      addLog(`Failed to create group: ${error.message}`, 'error');
    }
  });
  
  // Utility function to read file as text
  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
  
  // Initial setup
  addLog('WhatsApp Group Creator initialized');
  validateForm();
  
  // Load initial config
  electronAPI.getConfig().then(config => {
    console.log('Initial config loaded:', config);
  }).catch(error => {
    console.error('Failed to load config:', error);
  });
});