# MCP Deepgram Debugger

A Model Context Protocol (MCP) server for debugging and testing Deepgram API issues. This server provides tools to test connections, transcriptions, and monitor API usage.

## Features

- **Connection Testing**: Verify your Deepgram API credentials
- **Transcription Testing**: Test audio transcription with various models and options
- **Debug Logging**: Track all API interactions with detailed logs
- **Usage Monitoring**: Check API usage statistics
- **Balance Checking**: Monitor account balances

## Installation

1. Install dependencies:
```bash
cd mcp-deepgram-debugger
npm install
```

2. Build the TypeScript code:
```bash
npm run build
```

3. The server automatically uses the Deepgram API key from the parent project's `.env.local` file

## Configuration for Claude Desktop

Add the following to your Claude Desktop configuration file:

**Windows** (`%APPDATA%\Claude\claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "deepgram-debugger": {
      "command": "node",
      "args": ["C:\\Users\\mattl\\Desktop\\zeroscript\\mcp-deepgram-debugger\\build\\index.js"]
    }
  }
}
```

**macOS** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "deepgram-debugger": {
      "command": "node",
      "args": ["/path/to/zeroscript/mcp-deepgram-debugger/build/index.js"]
    }
  }
}
```

Note: The server automatically loads the DEEPGRAM_API_KEY from the parent project's `.env.local` file.

## Available Tools

### test_connection
Test the connection to Deepgram API and verify credentials.

### test_transcription
Test audio transcription with options:
- `audioUrl`: URL of audio file (defaults to sample)
- `model`: Deepgram model (nova-2, nova, enhanced, base)
- `language`: Language code (e.g., en, es, fr)
- `smart_format`: Enable smart formatting
- `punctuate`: Add punctuation
- `diarize`: Enable speaker diarization

### get_debug_logs
Get recent debug logs from API interactions:
- `limit`: Number of recent logs to retrieve

### clear_debug_logs
Clear all debug logs.

### get_usage
Get Deepgram API usage statistics:
- `projectId`: Project ID (optional)

### get_balances
Get Deepgram account balances:
- `projectId`: Project ID (optional)

### set_api_key
Set or update the Deepgram API key:
- `apiKey`: Deepgram API key (required)

## Development

Run TypeScript in watch mode:
```bash
npm run dev
```

## Testing

After configuring Claude Desktop, restart Claude and look for "deepgram-debugger" in the available MCP servers. You can then use commands like:

- "Test my Deepgram connection"
- "Test transcription with the nova-2 model"
- "Show me the debug logs"
- "Check my Deepgram usage"