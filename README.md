# WhatsApp Group Creator 🚀

A powerful, modern Electron application for creating WhatsApp groups with bulk contact management, specifically designed with Egyptian phone number validation.

![WhatsApp Group Creator](https://img.shields.io/badge/Version-2.0.0-green.svg)
![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Electron](https://img.shields.io/badge/Electron-38.1.2-blue.svg)

## ✨ Features

### 📱 **Smart Phone Number Processing**
- **Egyptian Number Validation**: Handles all Egyptian mobile formats (010, 011, 012, 015)
- **Multiple Input Formats**: Supports various formats (+20, 0020, local format)
- **Operator Detection**: Identifies mobile operators (Vodafone, Etisalat, Orange, WE)
- **Duplicate Removal**: Automatically removes duplicate numbers

### 🔍 **WhatsApp Integration**
- **Real-time Verification**: Checks if numbers are registered on WhatsApp
- **Bulk Group Creation**: Creates groups with verified contacts
- **Rate Limiting**: Prevents API abuse with configurable delays
- **Progress Tracking**: Real-time feedback during operations

### 💻 **Modern User Interface**
- **Responsive Design**: Works on all screen sizes
- **Dark/Light Theme**: Automatic theme detection
- **Real-time Logs**: Activity console with filtering
- **Statistics Dashboard**: Detailed operation reports

### 🛠️ **Advanced Configuration**
- **Configurable Settings**: Rate limits, delays, UI preferences
- **Export Functionality**: Export results to CSV/JSON
- **Error Handling**: Comprehensive error tracking and reporting

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 8+
- Windows/macOS/Linux

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/whatsapp-group-creator.git
   cd whatsapp-group-creator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   npm start
   ```

### Development

```bash
# Development mode with hot reload
npm run dev

# Lint code
npm run lint

# Format code
npm run format

# Run tests
npm test
```

### Building for Production

```bash
# Build for current platform
npm run build

# Build for Windows
npm run build:win

# Build for macOS
npm run build:mac

# Build for Linux
npm run build:linux
```

## 📖 Usage Guide

### 1. **Setup WhatsApp Connection**
   - Launch the application
   - Scan the QR code with your WhatsApp mobile app
   - Wait for "Connected" status

### 2. **Prepare CSV File**
   Create a CSV file with phone numbers:
   ```csv
   name,phone
   Ahmed,01234567890
   Fatima,+201234567890
   Mohamed,00201234567890
   ```

### 3. **Create Group**
   - Enter group name (3-25 characters)
   - Select CSV file
   - Choose phone number columns
   - Click "Create WhatsApp Group"

### 4. **Monitor Progress**
   - Watch real-time validation
   - See WhatsApp verification status
   - Track group creation progress
   - Review final statistics

## 📁 Project Structure

```
whatsapp-group-creator/
├── src/
│   ├── services/
│   │   └── whatsappService.js     # WhatsApp API operations
│   ├── utils/
│   │   ├── phoneValidator.js      # Phone number validation
│   │   ├── csvProcessor.js        # CSV parsing utilities
│   │   └── configManager.js       # Configuration management
│   ├── main.js                    # Enhanced main process (unused)
│   ├── renderer.js                # Modern renderer logic
│   ├── preload.js                 # Enhanced preload script
│   └── index.html                 # Modern UI
├── assets/
│   └── styles.css                 # Modern styling
├── index.js                       # Main entry point
├── index.html                     # Main HTML (updated)
├── preload.js                     # Preload script
├── package.json                   # Project configuration
└── README.md                      # This file
```

## 🔧 Configuration

The app uses `config.json` for settings:

```json
{
  "whatsapp": {
    "rateLimitDelay": 1000,
    "addParticipantDelay": 2000,
    "maxVerificationRetries": 3
  },
  "validation": {
    "supportedCountries": ["EG"],
    "maxGroupSize": 256
  },
  "ui": {
    "theme": "light",
    "showOperatorStats": true,
    "maxLogLines": 1000
  }
}
```

## 🇪🇬 Egyptian Phone Number Support

### Supported Formats
- `201234567890` ✅ (Standard format)
- `01234567890` ✅ (Local format)
- `+201234567890` ✅ (International)
- `00201234567890` ✅ (International alt)
- `(+20) 123-456-7890` ✅ (Formatted)

### Operators Supported
- **010**: Vodafone Egypt
- **011**: Etisalat Egypt  
- **012**: Orange Egypt
- **015**: WE (Telecom Egypt)

## 🛡️ Security Features

- **Sandboxed Renderer**: No direct Node.js access
- **Context Isolation**: Secure IPC communication
- **Input Validation**: Comprehensive data validation
- **Rate Limiting**: Prevents API abuse
- **Error Boundaries**: Graceful error handling

## 🐛 Troubleshooting

### Common Issues

**Q: QR code not appearing**
- Restart the application
- Check internet connection
- Clear WhatsApp Web.js cache in `.wwebjs_auth`

**Q: Numbers not being added to group**
- Verify numbers are registered on WhatsApp
- Check rate limiting settings
- Ensure proper Egyptian number format

**Q: CSV file not loading**
- Check file encoding (UTF-8 recommended)
- Verify CSV format with headers
- Ensure file is not corrupted

### Debug Mode

```bash
# Enable debug logging
npm run dev -- --debug
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow ESLint configuration
- Use Prettier for code formatting
- Add tests for new features
- Update documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [WhatsApp Web.js](https://github.com/pedroslopez/whatsapp-web.js) - WhatsApp API
- [Electron](https://electronjs.org/) - Cross-platform desktop apps
- [CSV Parser](https://github.com/mafintosh/csv-parser) - CSV processing

## 📞 Support

- 🐛 [Issues](https://github.com/your-username/whatsapp-group-creator/issues)
- 💬 [Discussions](https://github.com/your-username/whatsapp-group-creator/discussions)
- 📧 Email: your-email@example.com

## 🗺️ Roadmap

- [ ] **Multi-language Support** - Arabic, English, French
- [ ] **Advanced Scheduling** - Schedule group creation
- [ ] **Template Messages** - Welcome message templates  
- [ ] **Multiple Country Support** - Beyond Egypt
- [ ] **Contact Management** - Built-in contact database
- [ ] **API Integration** - REST API for automation
- [ ] **Cloud Sync** - Sync settings across devices

---

**Made with ❤️ in Egypt**