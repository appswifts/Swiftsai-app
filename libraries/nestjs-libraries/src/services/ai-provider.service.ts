import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { OpenAIAdapter, AnthropicAdapter, GoogleGenerativeAIAdapter, GroqAdapter } from '@copilotkit/runtime';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatGroq } from '@langchain/groq';

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

  getCopilotKitAdapter(provider: AIProvider, model: string) {
    switch (provider) {
      case 'anthropic':
        return new AnthropicAdapter({ model });
      case 'google':
        return new GoogleGenerativeAIAdapter({ model, apiKey: this.getApiKey(provider) });
      case 'groq':
        return new GroqAdapter({ model });
      default:
        return new OpenAIAdapter({ model });
    }
  }

  getAISDKProvider(provider: AIProvider, model: string) {
    switch (provider) {
      case 'anthropic': return anthropic(model);
      case 'google': return google(model);
      case 'groq': return groq(model);
      default: return openai(model);
    }
  }

  getLangChainModel(provider: AIProvider, model: string, temperature = 0.7) {
    const apiKey = this.getApiKey(provider);
    switch (provider) {
      case 'anthropic':
        return new ChatAnthropic({ apiKey, model, temperature });
      case 'google':
        return new ChatGoogleGenerativeAI({ apiKey, model, temperature });
      case 'groq':
        return new ChatGroq({ apiKey, model, temperature });
      default:
        return new ChatOpenAI({ apiKey, model, temperature });
    }
  }
}
