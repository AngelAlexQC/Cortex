/**
 * Multi-Provider AI Model Adapters
 * Supports: Google Gemini, OpenAI, Anthropic
 *
 * These adapters provide a unified interface for AI model access
 * across different providers, enabling the AI Scanner to work
 * with any configured provider in any editor.
 *
 * Editors supported:
 * - VS Code (vscode.lm API + BYOK)
 * - Antigravity (same as VS Code, native Gemini 3)
 * - Cursor (BYOK via settings)
 * - Windsurf (SWE-1 + VS Code extensions)
 * - Zed (Agent Panel + settings.json)
 */

import * as vscode from 'vscode';

/**
 * Unified interface for AI model interactions
 */
export interface ModelAdapter {
  readonly name: string;
  readonly provider: 'vscode' | 'gemini' | 'openai' | 'anthropic';
  sendRequest(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    token: vscode.CancellationToken
  ): AsyncIterable<string>;
}

/**
 * All available providers with their recommended models
 */
export const PROVIDERS = {
  gemini: {
    name: 'Google Gemini',
    defaultModel: 'gemini-2.5-pro',
    topModel: 'gemini-3-pro-preview',
    freeApiUrl: 'https://aistudio.google.com/apikey',
  },
  openai: {
    name: 'OpenAI',
    defaultModel: 'gpt-5-mini',
    topModel: 'gpt-5',
    freeApiUrl: 'https://platform.openai.com/api-keys',
  },
  anthropic: {
    name: 'Anthropic',
    defaultModel: 'claude-sonnet-4-5',
    topModel: 'claude-opus-4-5',
    freeApiUrl: 'https://console.anthropic.com/settings/keys',
  },
} as const;

export type ProviderName = keyof typeof PROVIDERS;

/**
 * Model priority for automatic selection (most powerful first)
 */
export const MODEL_PRIORITY = [
  // Best reasoning/coding
  { id: 'claude-opus-4-5', provider: 'anthropic' as const },
  { id: 'gpt-5', provider: 'openai' as const },
  { id: 'gemini-3-pro-preview', provider: 'gemini' as const },
  // Fast but powerful
  { id: 'claude-sonnet-4-5', provider: 'anthropic' as const },
  { id: 'gpt-5-mini', provider: 'openai' as const },
  { id: 'gemini-2.5-pro', provider: 'gemini' as const },
  // Fast
  { id: 'claude-haiku-4-5', provider: 'anthropic' as const },
  { id: 'gpt-5-nano', provider: 'openai' as const },
  { id: 'gemini-2.5-flash', provider: 'gemini' as const },
];

/**
 * Adapter for native VS Code Language Model API
 * Works with GitHub Copilot, Gemini Code Assist, or any registered provider
 */
export class VSCodeModelAdapter implements ModelAdapter {
  readonly provider = 'vscode' as const;
  readonly name: string;

  constructor(private model: vscode.LanguageModelChat) {
    this.name = model.name || model.id || 'VS Code Model';
  }

  async *sendRequest(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    token: vscode.CancellationToken
  ): AsyncIterable<string> {
    const vsMessages = messages.map((m) =>
      m.role === 'user'
        ? vscode.LanguageModelChatMessage.User(m.content)
        : vscode.LanguageModelChatMessage.Assistant(m.content)
    );

    const response = await this.model.sendRequest(vsMessages, {}, token);

    for await (const chunk of response.text) {
      yield chunk;
    }
  }
}

export { ANTHROPIC_MODELS, AnthropicModelAdapter, type AnthropicModelId } from './anthropic';
// Export all provider adapters
export { GEMINI_MODELS, GeminiModelAdapter, type GeminiModelId } from './gemini';
export { OPENAI_MODELS, OpenAIModelAdapter, type OpenAIModelId } from './openai';
