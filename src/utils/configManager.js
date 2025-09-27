/**
 * Configuration Management
 */

const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor() {
    this.configPath = path.join(__dirname, '../../config.json');
    this.defaultConfig = {
      app: {
        name: 'WhatsApp Group Creator',
        version: '2.0.0',
        windowWidth: 900,
        windowHeight: 700
      },
      whatsapp: {
        rateLimitDelay: 1000,
        addParticipantDelay: 2000,
        maxVerificationRetries: 3,
        sessionPath: '.wwebjs_auth'
      },
      validation: {
        supportedCountries: ['EG'],
        maxGroupSize: 256,
        minGroupNameLength: 3,
        maxGroupNameLength: 25
      },
      ui: {
        theme: 'light',
        showOperatorStats: true,
        autoScrollLogs: true,
        maxLogLines: 1000
      }
    };
  }

  /**
   * Load configuration from file or create default
   * @returns {object} - Configuration object
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const config = JSON.parse(configData);
        return { ...this.defaultConfig, ...config };
      }
    } catch (err) {
      console.warn('Failed to load config, using defaults:', err.message);
    }
    
    this.saveConfig(this.defaultConfig);
    return this.defaultConfig;
  }

  /**
   * Save configuration to file
   * @param {object} config - Configuration to save
   */
  saveConfig(config) {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (err) {
      console.error('Failed to save config:', err.message);
    }
  }

  /**
   * Update specific configuration value
   * @param {string} path - Dot notation path (e.g., 'whatsapp.rateLimitDelay')
   * @param {*} value - Value to set
   */
  updateConfig(path, value) {
    const config = this.loadConfig();
    const keys = path.split('.');
    let current = config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    this.saveConfig(config);
    
    return config;
  }

  /**
   * Get specific configuration value
   * @param {string} path - Dot notation path
   * @param {*} defaultValue - Default value if path doesn't exist
   * @returns {*} - Configuration value
   */
  getConfig(path, defaultValue = null) {
    const config = this.loadConfig();
    const keys = path.split('.');
    let current = config;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }
    
    return current;
  }
}

module.exports = ConfigManager;