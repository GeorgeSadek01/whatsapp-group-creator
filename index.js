/**
 * WhatsApp Group Creator - Enhanced Main Process (Bridge to new structure)
 * This file maintains compatibility while using the new modular architecture
 */

const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

// Import custom modules from new structure
const WhatsAppService = require('./src/services/whatsappService');
const { validatePhoneNumbers } = require('./src/utils/phoneValidator');
const { parseCSV, validateCSV } = require('./src/utils/csvProcessor');
const ConfigManager = require('./src/utils/configManager');

// Global variables
let mainWindow;
let whatsappClient;
let whatsappService;
let configManager;

// Initialize configuration
configManager = new ConfigManager();
const config = configManager.loadConfig();

/**
 * Enhanced error handling
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Promise Rejection:', reason);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('error', {
      type: 'unhandled-rejection',
      message: reason.message || reason,
      timestamp: new Date().toISOString()
    });
  }
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('error', {
      type: 'uncaught-exception',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Create the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: config.app.windowWidth,
    height: config.app.windowHeight,
    minWidth: 600,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false // Don't show until ready
  });

  mainWindow.loadFile('index.html');

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Send initial config to renderer
    mainWindow.webContents.send('config-updated', config);
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Initialize WhatsApp client
 */
function initializeWhatsApp() {
  whatsappClient = new Client({
    authStrategy: new LocalAuth({
      clientId: 'whatsapp-group-creator',
      dataPath: config.whatsapp.sessionPath
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    }
  });

  whatsappService = new WhatsAppService(whatsappClient);
  whatsappService.setRateLimitDelay(config.whatsapp.rateLimitDelay);

  // WhatsApp event handlers
  whatsappClient.on('qr', async (qr) => {
    try {
      const qrDataUrl = await qrcode.toDataURL(qr, { width: 256 });
      sendStatus('qr-code', '📱 Scan the QR Code in WhatsApp!', { qrDataUrl });
    } catch (err) {
      sendStatus('error', '❌ Failed to generate QR code', { error: err.message });
    }
  });

  whatsappClient.on('ready', () => {
    sendStatus('ready', '✅ WhatsApp is ready!');
  });

  whatsappClient.on('authenticated', () => {
    sendStatus('authenticated', '🔐 WhatsApp authenticated successfully!');
  });

  whatsappClient.on('auth_failure', (message) => {
    sendStatus('auth-failure', `❌ Authentication failed: ${message}`);
  });

  whatsappClient.on('disconnected', (reason) => {
    sendStatus('disconnected', `🔌 WhatsApp disconnected: ${reason}`);
  });

  whatsappClient.initialize();
}

/**
 * Send status message to renderer process
 */
function sendStatus(type, message, data = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('status', {
      type,
      message,
      timestamp: new Date().toISOString(),
      ...data
    });
  }
}

/**
 * Handle group creation request
 */
ipcMain.handle('create-group', async (event, { csvContent, groupName, columns }) => {
  try {
    if (!whatsappClient || !whatsappService) {
      throw new Error('WhatsApp not initialized');
    }

    sendStatus('processing', '🔄 Starting group creation process...');

    // Validate CSV
    const csvValidation = validateCSV(csvContent);
    if (!csvValidation.isValid) {
      throw new Error(`CSV validation failed: ${csvValidation.errors.join(', ')}`);
    }

    // Parse CSV data
    sendStatus('processing', '📄 Parsing CSV data...');
    const rawContacts = await parseCSV(csvContent, columns);
    
    if (rawContacts.length === 0) {
      throw new Error('No contact data found in selected columns');
    }

    sendStatus('processing', `📊 Found ${rawContacts.length} raw contacts`);

    // Validate phone numbers
    sendStatus('processing', '� Validating phone numbers...');
    const validation = validatePhoneNumbers(rawContacts);
    
    sendStatus('validation-complete', 'Phone number validation complete', {
      validCount: validation.valid.length,
      invalidCount: validation.invalid.length,
      duplicates: validation.duplicates,
      operatorStats: validation.operatorStats
    });

    if (validation.valid.length === 0) {
      throw new Error('No valid Egyptian phone numbers found');
    }

    // Verify numbers with WhatsApp
    sendStatus('processing', '� Verifying numbers with WhatsApp...');
    
    const verificationResults = await whatsappService.verifyNumbers(
      validation.valid.map(v => v.clean),
      (progress) => {
        sendStatus('verification-progress', `Verifying ${progress.current}/${progress.total}`, progress);
      }
    );

    const verifiedWhatsAppIds = verificationResults.verified.map(num => `${num}@c.us`);
    
    sendStatus('verification-complete', 'WhatsApp verification complete', {
      verifiedCount: verificationResults.verified.length,
      unregisteredCount: verificationResults.unregistered.length,
      errorCount: verificationResults.errors.length
    });

    if (verifiedWhatsAppIds.length === 0) {
      throw new Error('No verified WhatsApp numbers found');
    }

    // Create group and add participants
    sendStatus('processing', '🎉 Creating WhatsApp group...');
    
    const groupResults = await whatsappService.createGroupWithParticipants(
      groupName,
      verifiedWhatsAppIds,
      (progress) => {
        if (progress.status === 'group-created') {
          sendStatus('group-created', `🎉 Group "${groupName}" created successfully!`, progress);
        } else if (progress.status === 'adding' || progress.status === 'added' || progress.status === 'failed') {
          sendStatus('participant-progress', 'Adding participants...', progress);
        }
      }
    );

    // Send final results
    const finalResults = {
      groupInfo: groupResults.groupInfo,
      summary: groupResults.summary,
      validation,
      verification: verificationResults,
      timestamp: new Date().toISOString()
    };

    sendStatus('complete', '🏁 Group creation completed!', finalResults);
    
    return { success: true, results: finalResults };

  } catch (error) {
    const errorMessage = `❌ ${error.message}`;
    sendStatus('error', errorMessage, { error: error.message });
    return { success: false, error: error.message };
  }
});

/**
 * Handle configuration updates
 */
ipcMain.handle('update-config', async (event, { path, value }) => {
  try {
    const newConfig = configManager.updateConfig(path, value);
    
    // Apply certain config changes immediately
    if (path.startsWith('whatsapp.') && whatsappService) {
      if (path === 'whatsapp.rateLimitDelay') {
        whatsappService.setRateLimitDelay(value);
      }
    }
    
    mainWindow.webContents.send('config-updated', newConfig);
    return { success: true, config: newConfig };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Get current configuration
 */
ipcMain.handle('get-config', async () => {
  return configManager.loadConfig();
});

// App event handlers
app.whenReady().then(() => {
  createWindow();
  initializeWhatsApp();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (whatsappClient) {
    whatsappClient.destroy();
  }
});

module.exports = { app };
