/**
 * Enhanced Preload Script with improved security and functionality
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Group creation
  createGroup: (data) => ipcRenderer.invoke('create-group', data),

  // Configuration management
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (path, value) => ipcRenderer.invoke('update-config', { path, value }),

  // File operations
  openCSVFile: () => ipcRenderer.invoke('open-csv-file'),
  exportResults: (data) => ipcRenderer.invoke('export-results', data),

  // Event listeners
  onStatus: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('status', subscription);
    
    // Return unsubscribe function
    return () => ipcRenderer.removeListener('status', subscription);
  },

  onError: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('error', subscription);
    return () => ipcRenderer.removeListener('error', subscription);
  },

  onConfigUpdated: (callback) => {
    const subscription = (event, config) => callback(config);
    ipcRenderer.on('config-updated', subscription);
    return () => ipcRenderer.removeListener('config-updated', subscription);
  },

  onCSVLoaded: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('csv-loaded', subscription);
    return () => ipcRenderer.removeListener('csv-loaded', subscription);
  },

  onShowPreferences: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('show-preferences', subscription);
    return () => ipcRenderer.removeListener('show-preferences', subscription);
  },

  onExportResults: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('export-results', subscription);
    return () => ipcRenderer.removeListener('export-results', subscription);
  },

  // Utility functions
  removeAllListeners: () => ipcRenderer.removeAllListeners()
});
