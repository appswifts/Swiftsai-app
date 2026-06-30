import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { OpenAIAdapter, AnthropicAdapter, GoogleGenerativeAIAdapter, GroqAdapter } from '@copilotkit/runtime';
import { createOpenAI } from '@ai-sdk/openai';
import { ChatOpenAI } from '@langchain/openai';

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'groq';

export const AI_PROVIDER_PRESETS: Record<AIProvider, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'o3', 'o3-mini', 'o4-mini'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest', 'claude-3-opus-latest'],
  google: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it', 'deepseek-r1-distill-llama-70b'],
};

export interface AIProviderConfig {
  provider: AIProvider;
  model: string;
}

@Injectable()
export class AIProviderService {
  private readonly logger = new Logger(AIProviderService.name);

  constructor(private _prisma: PrismaService) {}

  async getConfig(): Promise<AIProviderConfig> {
    const record = await this._prisma.platformSettings.findUnique({
      where: { id: 'singleton' },
    });
    const settings = (record?.settings as any) || {};
    const provider: AIProvider = settings.aiProvider || process.env.AI_PROVIDER || 'openai';
    const model = settings.aiModel || process.env.AI_MODEL || process.env.LLM_MODEL || 'gpt-4o';
    return { provider, model };
  }

  getApiKey(provider: AIProvider): string {
    switch (provider) {
      case 'openai': return process.env.OPENAI_API_KEY || '';
      case 'anthropic': return process.env.ANTHROPIC_API_KEY || '';
      case 'google': return process.env.GOOGLE_API_KEY || '';
      case 'groq': return process.env.GROQ_API_KEY || '';
    }
  }

  isApiKeySet(provider: AIProvider): boolean {
    return !!this.getApiKey(provider);
  }

  async validateConfig(): Promise<{ valid: boolean; error?: string }> {
    const { provider, model } = await this.getConfig();
    if (!this.isApiKeySet(provider)) {
      return { valid: false, error: `API key not configured for ${provider}. Set ${provider.toUpperCase()}_API_KEY environment variable.` };
    }
    if (!model) {
      return { valid: false, error: 'No AI model configured. Select a model in admin settings.' };
    }
    return { valid: true };
  }

  getCopilotKitAdapter(provider: AIProvider, model: string) {
    switch (provider) {
      case 'groq': {
        const OpenAI = require('openai');
        const originalClient = new OpenAI({ apiKey: this.getApiKey(provider), baseURL: 'https://api.groq.com/openai/v1' });
        
        // Wrap the client to sanitize messages for Groq compatibility
        const sanitizedClient = {
          ...originalClient,
          chat: {
            ...originalClient.chat,
            completions: {
              ...originalClient.chat.completions,
              create: async (params: any) => {
                // Sanitize messages: ensure content is always a string or supported array
                const sanitizedMessages = params.messages?.map((msg: any) => {
                  if (typeof msg.content === 'string') return msg;
                  if (Array.isArray(msg.content)) {
                    // Filter to only text content (Groq doesn't support complex content arrays well)
                    const textParts = msg.content.filter((part: any) => part.type === 'text');
                    if (textParts.length > 0) {
                      return { ...msg, content: textParts.map((p: any) => p.text).join('\n') };
                    }
                    return { ...msg, content: '' };
                  }
                  if (msg.content && typeof msg.content === 'object') {
                    // Convert object content to string
                    return { ...msg, content: JSON.stringify(msg.content) };
                  }
                  return { ...msg, content: '' };
                });
                
                return originalClient.chat.completions.create({
                  ...params,
                  messages: sanitizedMessages,
                });
              },
            },
          },
        };
        
        return new OpenAIAdapter({ openai: sanitizedClient as any, model });
      }
      case 'anthropic':
        return new AnthropicAdapter({ model });
      case 'google':
        return new GoogleGenerativeAIAdapter({ model, apiKey: this.getApiKey(provider) });
      default:
        return new OpenAIAdapter({ model });
    }
  }

  getAISDKProvider(provider: AIProvider, model: string): any {
    const apiKey = this.getApiKey(provider);
    if (provider === 'groq') {
      return createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey })(model);
    }
    return createOpenAI({ apiKey })(model);
  }

  getLangChainModel(provider: AIProvider, model: string, temperature = 0.7) {
    const apiKey = this.getApiKey(provider);
    switch (provider) {
      case 'anthropic': {
        const { ChatAnthropic } = require('@langchain/anthropic');
        return new ChatAnthropic({ apiKey, model, temperature });
      }
      case 'google': {
        const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
        return new ChatGoogleGenerativeAI({ apiKey, model, temperature });
      }
      case 'groq': {
        const { ChatGroq } = require('@langchain/groq');
        return new ChatGroq({ apiKey, model, temperature });
      }
      default:
        return new ChatOpenAI({ apiKey, model, temperature });
    }
  }
}
