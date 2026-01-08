/**
 * Google Gemini API Adapter
 * Direct integration with Gemini API for BYOK support
 * Models: Gemini 3 Pro, Gemini 3 Flash, Gemini 2.5 series
 */

import { type GenerativeModel, GoogleGenerativeAI } from '@google/generative-ai';
import * as vscode from 'vscode';
import type { ModelAdapter } from './index';

// Available Gemini models (January 2026)
export const GEMINI_MODELS = {
  // Gemini 3 Series (Latest - GA December 2025)
  'gemini-3-pro-preview': { name: 'Gemini 3 Pro', maxTokens: 1000000 },
  'gemini-3-flash-preview': { name: 'Gemini 3 Flash', maxTokens: 1000000 },
  // Gemini 2.5 Series (Stable - retire June 2026)
  'gemini-2.5-pro': { name: 'Gemini 2.5 Pro', maxTokens: 1000000 },
  'gemini-2.5-flash': { name: 'Gemini 2.5 Flash', maxTokens: 1000000 },
  'gemini-2.5-flash-lite': { name: 'Gemini 2.5 Flash Lite', maxTokens: 1000000 },
} as const;

export type GeminiModelId = keyof typeof GEMINI_MODELS;

// Default to the most powerful stable model
export const DEFAULT_GEMINI_MODEL: GeminiModelId = 'gemini-2.5-pro';

const SECRET_KEY = 'cortex.geminiApiKey';

/**
 * Adapter for direct Gemini API access
 */
export class GeminiModelAdapter implements ModelAdapter {
  readonly provider = 'gemini' as const;
  readonly name: string;
  private model: GenerativeModel;

  constructor(
    private genAI: GoogleGenerativeAI,
    private modelId: GeminiModelId = DEFAULT_GEMINI_MODEL
  ) {
    this.name = GEMINI_MODELS[modelId]?.name || modelId;
    this.model = genAI.getGenerativeModel({ model: modelId });
  }

  async *sendRequest(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    token: vscode.CancellationToken
  ): AsyncIterable<string> {
    // Convert messages to Gemini format
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];

    const chat = this.model.startChat({ history });

    const result = await chat.sendMessageStream(lastMessage.content);

    for await (const chunk of result.stream) {
      if (token.isCancellationRequested) break;
      const text = chunk.text();
      if (text) yield text;
    }
  }

  /**
   * Create a Gemini adapter from stored API key
   */
  static async fromSecrets(
    secrets: vscode.SecretStorage,
    modelId: GeminiModelId = DEFAULT_GEMINI_MODEL
  ): Promise<GeminiModelAdapter | null> {
    const apiKey = await secrets.get(SECRET_KEY);
    if (!apiKey) return null;

    const genAI = new GoogleGenerativeAI(apiKey);
    return new GeminiModelAdapter(genAI, modelId);
  }

  /**
   * Prompt user for API key and store it
   */
  static async promptForApiKey(secrets: vscode.SecretStorage): Promise<string | undefined> {
    const apiKey = await vscode.window.showInputBox({
      title: 'Gemini API Key',
      prompt: 'Enter your Gemini API key (get one FREE at aistudio.google.com/apikey)',
      password: true,
      placeHolder: 'AIza...',
      ignoreFocusOut: true,
    });

    if (apiKey) {
      await secrets.store(SECRET_KEY, apiKey);
      vscode.window.showInformationMessage('✅ Gemini API key saved');
    }

    return apiKey;
  }

  /**
   * Validate API key by making a simple request
   */
  static async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      await model.generateContent('Hello');
      return true;
    } catch {
      return false;
    }
  }
}
