#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient, DeepgramClient, DeepgramError } from "@deepgram/sdk";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load .env.local from parent directory (zeroscript root)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env.local');
dotenv.config({ path: envPath });

interface DebugLog {
  timestamp: string;
  type: "request" | "response" | "error";
  endpoint?: string;
  data: any;
  duration?: number;
}

class DeepgramDebugger {
  private client: DeepgramClient | null = null;
  private logs: DebugLog[] = [];
  private maxLogs = 100;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (apiKey) {
      this.client = createClient(apiKey);
    }
  }

  addLog(log: DebugLog) {
    this.logs.push(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  getLogs(limit?: number): DebugLog[] {
    if (limit) {
      return this.logs.slice(-limit);
    }
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    if (!this.client) {
      return { 
        success: false, 
        message: "Deepgram client not initialized. Please set DEEPGRAM_API_KEY environment variable." 
      };
    }

    const startTime = Date.now();
    try {
      const projects = await this.client.manage.getProjects();
      const duration = Date.now() - startTime;
      
      this.addLog({
        timestamp: new Date().toISOString(),
        type: "response",
        endpoint: "manage.getProjects",
        data: projects,
        duration
      });

      return {
        success: true,
        message: `Successfully connected to Deepgram API (${duration}ms)`,
        details: projects
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof DeepgramError ? error.message : String(error);
      
      this.addLog({
        timestamp: new Date().toISOString(),
        type: "error",
        endpoint: "manage.getProjects",
        data: { error: errorMessage },
        duration
      });

      return {
        success: false,
        message: `Failed to connect to Deepgram API: ${errorMessage}`,
        details: { error: errorMessage, duration }
      };
    }
  }

  async testTranscription(audioUrl: string, options?: any): Promise<any> {
    if (!this.client) {
      throw new Error("Deepgram client not initialized");
    }

    const startTime = Date.now();
    const transcriptionOptions = options || { model: "nova-2", smart_format: true };

    this.addLog({
      timestamp: new Date().toISOString(),
      type: "request",
      endpoint: "listen.prerecorded.transcribeUrl",
      data: { url: audioUrl, options: transcriptionOptions }
    });

    try {
      const { result, error } = await this.client.listen.prerecorded.transcribeUrl(
        { url: audioUrl },
        transcriptionOptions
      );

      const duration = Date.now() - startTime;

      if (error) {
        this.addLog({
          timestamp: new Date().toISOString(),
          type: "error",
          endpoint: "listen.prerecorded.transcribeUrl",
          data: { error },
          duration
        });
        throw error;
      }

      this.addLog({
        timestamp: new Date().toISOString(),
        type: "response",
        endpoint: "listen.prerecorded.transcribeUrl",
        data: result,
        duration
      });

      return {
        success: true,
        duration,
        result,
        metadata: {
          model: transcriptionOptions.model,
          channels: result?.results?.channels?.length || 0,
          duration_seconds: result?.metadata?.duration || 0,
          words: result?.results?.channels?.[0]?.alternatives?.[0]?.words?.length || 0
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof DeepgramError ? error.message : String(error);
      
      this.addLog({
        timestamp: new Date().toISOString(),
        type: "error",
        endpoint: "listen.prerecorded.transcribeUrl",
        data: { error: errorMessage },
        duration
      });

      throw new Error(`Transcription failed: ${errorMessage}`);
    }
  }

  async getUsage(projectId?: string): Promise<any> {
    if (!this.client) {
      throw new Error("Deepgram client not initialized");
    }

    const startTime = Date.now();
    try {
      const projectsResponse = await this.client.manage.getProjects();
      
      if ('projects' in projectsResponse) {
        const targetProjectId = projectId || (projectsResponse as any).projects[0]?.project_id;

        if (!targetProjectId) {
          throw new Error("No project ID available");
        }

        const usage = await (this.client.manage as any).getUsage(targetProjectId, {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        });

        const duration = Date.now() - startTime;

        this.addLog({
          timestamp: new Date().toISOString(),
          type: "response",
          endpoint: "manage.getUsage",
          data: usage,
          duration
        });

        return {
          success: true,
          duration,
          usage
        };
      } else {
        throw new Error("Failed to get projects");
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof DeepgramError ? error.message : String(error);
      
      this.addLog({
        timestamp: new Date().toISOString(),
        type: "error",
        endpoint: "manage.getUsage",
        data: { error: errorMessage },
        duration
      });

      throw new Error(`Failed to get usage: ${errorMessage}`);
    }
  }

  async getBalances(projectId?: string): Promise<any> {
    if (!this.client) {
      throw new Error("Deepgram client not initialized");
    }

    const startTime = Date.now();
    try {
      const projectsResponse = await this.client.manage.getProjects();
      
      if ('projects' in projectsResponse) {
        const targetProjectId = projectId || (projectsResponse as any).projects[0]?.project_id;

        if (!targetProjectId) {
          throw new Error("No project ID available");
        }

        const balances = await (this.client.manage as any).getBalances(targetProjectId);
        const duration = Date.now() - startTime;

        this.addLog({
          timestamp: new Date().toISOString(),
          type: "response",
          endpoint: "manage.getBalances",
          data: balances,
          duration
        });

        return {
          success: true,
          duration,
          balances
        };
      } else {
        throw new Error("Failed to get projects");
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof DeepgramError ? error.message : String(error);
      
      this.addLog({
        timestamp: new Date().toISOString(),
        type: "error",
        endpoint: "manage.getBalances",
        data: { error: errorMessage },
        duration
      });

      throw new Error(`Failed to get balances: ${errorMessage}`);
    }
  }
}

const deepgramDebugger = new DeepgramDebugger();

const server = new Server(
  {
    name: "mcp-deepgram-debugger",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "test_connection",
        description: "Test the connection to Deepgram API and verify credentials",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "test_transcription",
        description: "Test audio transcription with a sample audio file or URL",
        inputSchema: {
          type: "object",
          properties: {
            audioUrl: {
              type: "string",
              description: "URL of the audio file to transcribe (defaults to sample if not provided)",
            },
            model: {
              type: "string",
              description: "Deepgram model to use (nova-2, nova, enhanced, base)",
              enum: ["nova-2", "nova", "enhanced", "base"],
            },
            language: {
              type: "string",
              description: "Language code (e.g., en, es, fr)",
            },
            smart_format: {
              type: "boolean",
              description: "Enable smart formatting",
            },
            punctuate: {
              type: "boolean",
              description: "Add punctuation",
            },
            diarize: {
              type: "boolean",
              description: "Enable speaker diarization",
            },
          },
        },
      },
      {
        name: "get_debug_logs",
        description: "Get recent debug logs from Deepgram API interactions",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of recent logs to retrieve",
            },
          },
        },
      },
      {
        name: "clear_debug_logs",
        description: "Clear all debug logs",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_usage",
        description: "Get Deepgram API usage statistics",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "Project ID (optional, uses default if not provided)",
            },
          },
        },
      },
      {
        name: "get_balances",
        description: "Get Deepgram account balances",
        inputSchema: {
          type: "object",
          properties: {
            projectId: {
              type: "string",
              description: "Project ID (optional, uses default if not provided)",
            },
          },
        },
      },
      {
        name: "set_api_key",
        description: "Set or update the Deepgram API key",
        inputSchema: {
          type: "object",
          properties: {
            apiKey: {
              type: "string",
              description: "Deepgram API key",
            },
          },
          required: ["apiKey"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "test_connection":
        return await deepgramDebugger.testConnection();

      case "test_transcription": {
        const audioUrl = (args as any)?.audioUrl || "https://dpgr.am/spacewalk.wav";
        const options: any = {};
        
        if ((args as any)?.model) options.model = (args as any).model;
        if ((args as any)?.language) options.language = (args as any).language;
        if ((args as any)?.smart_format !== undefined) options.smart_format = (args as any).smart_format;
        if ((args as any)?.punctuate !== undefined) options.punctuate = (args as any).punctuate;
        if ((args as any)?.diarize !== undefined) options.diarize = (args as any).diarize;

        return await deepgramDebugger.testTranscription(audioUrl, Object.keys(options).length > 0 ? options : undefined);
      }

      case "get_debug_logs": {
        const limit = (args as any)?.limit as number | undefined;
        const logs = deepgramDebugger.getLogs(limit);
        return {
          success: true,
          count: logs.length,
          logs,
        };
      }

      case "clear_debug_logs":
        deepgramDebugger.clearLogs();
        return {
          success: true,
          message: "Debug logs cleared",
        };

      case "get_usage": {
        const projectId = (args as any)?.projectId as string | undefined;
        return await deepgramDebugger.getUsage(projectId);
      }

      case "get_balances": {
        const projectId = (args as any)?.projectId as string | undefined;
        return await deepgramDebugger.getBalances(projectId);
      }

      case "set_api_key": {
        const apiKey = (args as any)?.apiKey as string;
        if (!apiKey) {
          throw new Error("API key is required");
        }
        process.env.DEEPGRAM_API_KEY = apiKey;
        (deepgramDebugger as any).initializeClient();
        return {
          success: true,
          message: "API key updated successfully",
        };
      }

      default:
        throw new McpError(ErrorCode.InvalidRequest, `Tool not found: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("Deepgram MCP Debugger Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});