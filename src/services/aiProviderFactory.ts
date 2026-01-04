import { GoogleGenerativeAI } from "@google/generative-ai";

export type AIProvider = 'gemini' | 'openrouter';

const PROVIDER_STORAGE_KEY = 'korelang_ai_provider';
const SETTINGS_STORAGE_KEY = 'conlang_studio_settings';
const API_KEYS: Record<AIProvider, string> = {
  gemini: 'user_gemini_api_key',
  openrouter: 'user_openrouter_api_key',
};

export interface GenerativeModelResponse {
  response: {
    text(): string;
  };
}

export interface GenerativeModel {
  generateContent(prompt: string): Promise<GenerativeModelResponse>;
}

export interface AIProviderClient {
  getGenerativeModel(options: { model: string }): GenerativeModel;
}

export const getCurrentProvider = (): AIProvider => {
  const stored = localStorage.getItem(PROVIDER_STORAGE_KEY);
  if (stored === 'gemini' || stored === 'openrouter') return stored;

  try {
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      if (parsed?.aiProvider === 'openrouter' || parsed?.aiProvider === 'gemini') {
        return parsed.aiProvider;
      }
    }
  } catch (e) {
    console.warn('Failed to parse settings for provider preference', e);
  }

  return 'gemini';
};

export const setCurrentProvider = (provider: AIProvider) => {
  localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
};

export const getApiKey = (provider: AIProvider = getCurrentProvider()) => {
  const envKey = provider === 'gemini'
    ? (import.meta.env.VITE_GEMINI_API_KEY as string)
    : (import.meta.env.VITE_OPENROUTER_API_KEY as string);
  const key = localStorage.getItem(API_KEYS[provider]) || envKey || "";
  return key.trim().replace(/^["']|["']$/g, '');
};

export const setApiKey = (key: string, provider: AIProvider = getCurrentProvider()) => {
  localStorage.setItem(API_KEYS[provider], key);
};

export const isApiKeySet = (provider: AIProvider = getCurrentProvider()) => !!getApiKey(provider);

class GeminiProvider implements AIProviderClient {
  constructor(private apiKey: string) { }

  getGenerativeModel(options: { model: string }): GenerativeModel {
    return new GoogleGenerativeAI(this.apiKey.trim())
      .getGenerativeModel({ model: options.model }) as unknown as GenerativeModel;
  }
}

class OpenRouterModel implements GenerativeModel {
  constructor(
    private apiKey: string,
    private model: string,
    private endpoint?: string,
  ) { }

  async generateContent(prompt: string): Promise<GenerativeModelResponse> {
    const targetEndpoint = this.endpoint || (import.meta.env.VITE_OPENROUTER_ENDPOINT as string) || 'https://openrouter.ai/api/v1/chat/completions';
    const referer = (import.meta.env.VITE_APP_URL as string) || window.location.origin;
    const title = (import.meta.env.VITE_APP_NAME as string) || 'KoreLang';

    const response = await fetch(targetEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': referer,
        'X-Title': title,
      },
      body: JSON.stringify({
        model: this.model || (import.meta.env.VITE_OPENROUTER_MODEL as string),
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(`OpenRouter request failed: ${errorMessage || response.statusText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "";

    return {
      response: {
        text: () => content,
      },
    };
  }
}

class OpenRouterProvider implements AIProviderClient {
  constructor(private apiKey: string) { }

  getGenerativeModel(options: { model: string }): GenerativeModel {
    const defaultModel = options.model || (import.meta.env.VITE_OPENROUTER_MODEL as string) || 'google/gemma-2-9b-it';
    return new OpenRouterModel(this.apiKey, defaultModel, import.meta.env.VITE_OPENROUTER_ENDPOINT as string);
  }
}

export const getAIClient = (provider?: AIProvider): AIProviderClient => {
  const selectedProvider = provider || getCurrentProvider();
  const key = getApiKey(selectedProvider);

  if (!key) {
    const providerName = selectedProvider === 'openrouter' ? 'OpenRouter' : 'Gemini';
    throw new Error(`${providerName} API Key not configured. Please set it in Settings.`);
  }

  if (selectedProvider === 'openrouter') {
    return new OpenRouterProvider(key);
  }

  return new GeminiProvider(key);
};
