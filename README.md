# Zeroscript - Real-time Sales Coaching Chrome Extension

A Chrome extension built with React.js that provides real-time sales coaching with live transcription powered by Deepgram and backend services through Supabase.

## Features

- 🎙️ Real-time audio transcription
- 💡 Live coaching insights and feedback
- 📊 Performance analytics
- ☁️ Cloud storage with Supabase
- 🔊 Powered by Deepgram's speech-to-text API

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and add your API keys:
```bash
cp .env.example .env
```

Then edit `.env` with your credentials:
- `REACT_APP_SUPABASE_URL`: Your Supabase project URL
- `REACT_APP_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `REACT_APP_DEEPGRAM_API_KEY`: Your Deepgram API key

### 3. Build the Extension
```bash
npm run build
```

### 4. Load the Extension in Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `dist` folder from this project

## Development

### Run in Development Mode
```bash
npm run watch
```

This will watch for changes and automatically rebuild the extension.

### Project Structure
```
zeroscript/
├── public/
│   ├── manifest.json     # Chrome extension manifest
│   ├── index.html        # Popup HTML template
│   └── icons/            # Extension icons
├── src/
│   ├── components/       # React components
│   ├── utils/           # Utility functions (Supabase, Deepgram)
│   ├── App.js           # Main React app
│   ├── index.js         # React entry point
│   ├── background.js    # Background service worker
│   └── content.js       # Content script
├── webpack.config.js    # Webpack configuration
└── package.json        # Project dependencies
```

## Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm run watch` - Watch mode for development

## Technologies Used

- React.js - UI framework
- Supabase - Backend and database
- Deepgram - Real-time transcription
- Chrome Extensions API - Browser integration
- Webpack - Module bundler

## Next Steps

1. Set up Supabase database tables for transcripts and coaching data
2. Obtain API keys from Deepgram and Supabase
3. Implement authentication flow
4. Add more coaching algorithms and insights
5. Create settings page for user preferences