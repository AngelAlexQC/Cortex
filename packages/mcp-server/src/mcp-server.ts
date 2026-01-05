import {
  ContextGuard,
  ContextRouter,
  createEmbeddingProvider,
  type Memory,
  MemoryStore,
  ProjectScanner,
} from '@ecuabyte/cortex-core';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const store = new MemoryStore();
const router = new ContextRouter(store);
const guard = new ContextGuard();

// CLI Argument Handling for `generate-config`
import { parseArgs } from 'node:util';

try {
  const args = process.argv.slice(2);
  if (args[0] === 'generate-config') {
    const { values } = parseArgs({
      args: args,
      options: {
        target: {
          type: 'string',
        },
      },
      strict: false, // allow params we don't know yet (though we should know them)
    });

    const target = values.target as string | undefined;
    const targets = ['claude', 'cursor', 'windsurf', 'goose'];

    if (!target || !targets.includes(target)) {
      console.error(`Usage: cortex-mcp generate-config --target <${targets.join('|')}>`);
      process.exit(1);
    }

    const command = 'npx';
    const cmdArgs = ['-y', '@ecuabyte/cortex-mcp-server'];
    let config: Record<string, unknown> = {};

    switch (target) {
      case 'claude':
        config = {
          mcpServers: {
            cortex: {
              command,
              args: cmdArgs,
            },
          },
        };
        break;
      case 'cursor':
      case 'windsurf':
        config = {
          cortex: {
            type: 'command',
            command,
            args: cmdArgs,
          },
        };
        break;
      case 'goose':
        console.log(`Run this command to configure Goose:`);
        console.log(`goose configure mcp add cortex "${command} ${cmdArgs.join(' ')}"`);
        process.exit(0);
    }

    console.log(JSON.stringify(config, null, 2));
    process.exit(0);
  }
} catch (e) {
  // If parsing fails or other issues, just ignore and proceed to server start
  // or print error if it was clearly a CLI attempt
  if (process.argv[2] === 'generate-config') {
    console.error('Error generating config:', e);
    process.exit(1);
  }
}

// Initialize embedding provider if available (Ollama or OpenAI)
let embeddingInitialized = false;
(async () => {
  try {
    const provider = await createEmbeddingProvider({
      openaiApiKey: process.env['OPENAI_API_KEY'],
    });
    if (provider) {
      store.setEmbeddingProvider(provider);
      router.setEmbeddingProvider(provider);
      embeddingInitialized = true;
      console.error(`[Cortex] Embedding provider initialized: ${provider.model}`);
    }
  } catch (e) {
    console.error('[Cortex] Failed to initialize embedding provider:', e);
  }
})();

const server = new Server(
  {
    name: 'cortex-memory',
    version: '0.3.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'cortex_search',
        description: 'Search through project memories (facts, decisions, code patterns, configs)',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to find relevant memories',
            },
            type: {
              type: 'string',
              enum: ['fact', 'decision', 'code', 'config', 'note'],
              description: 'Filter by memory type (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
              default: 10,
            },
            semantic: {
              type: 'boolean',
              description:
                'Use semantic (AI) search instead of keyword search. Requires Ollama or OpenAI.',
              default: false,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'cortex_add',
        description: 'Add a new memory to the knowledge base',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The content/description of the memory',
            },
            type: {
              type: 'string',
              enum: ['fact', 'decision', 'code', 'config', 'note'],
              description: 'Type of memory',
            },
            source: {
              type: 'string',
              description: 'Source of the memory (e.g., file path, URL, conversation)',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional tags for categorization',
            },
          },
          required: ['content', 'type', 'source'],
        },
      },
      {
        name: 'cortex_list',
        description: 'List recent memories, optionally filtered by type',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['fact', 'decision', 'code', 'config', 'note'],
              description: 'Filter by memory type (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 20)',
              default: 20,
            },
          },
        },
      },
      {
        name: 'cortex_stats',
        description: 'Get statistics about stored memories',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'cortex_context',
        description:
          'Get intelligent, task-relevant context. Uses AI-powered routing to find the most useful memories for your current task.',
        inputSchema: {
          type: 'object',
          properties: {
            task: {
              type: 'string',
              description: 'Description of what you are currently working on',
            },
            currentFile: {
              type: 'string',
              description: 'Current file path for additional context relevance (optional)',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by specific tags (optional)',
            },
            type: {
              type: 'string',
              enum: ['fact', 'decision', 'code', 'config', 'note'],
              description: 'Filter by memory type (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of context items (default: 5)',
              default: 5,
            },
          },
          required: ['task'],
        },
      },
      {
        name: 'cortex_guard',
        description:
          'Check content for sensitive data (API keys, secrets, PII) before sharing. Returns filtered content or warnings.',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'Content to check/filter for sensitive data',
            },
            filters: {
              type: 'array',
              items: {
                type: 'string',
                enum: [
                  'api_keys',
                  'secrets',
                  'emails',
                  'urls_auth',
                  'credit_cards',
                  'phone_numbers',
                  'ip_addresses',
                  'pii',
                ],
              },
              description: 'Types of sensitive data to filter (default: all)',
            },
            mode: {
              type: 'string',
              enum: ['redact', 'block', 'warn'],
              description:
                'How to handle sensitive data: redact (replace with [REDACTED]), block (return empty if found), warn (flag but keep)',
              default: 'redact',
            },
          },
          required: ['content'],
        },
      },
      {
        name: 'cortex_scan',
        description:
          'Scan a project directory to extract and store context automatically. Finds TODOs, README info, configs, architecture decisions. Returns extracted data for AI analysis.',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Project directory path to scan (defaults to current working directory)',
            },
            save: {
              type: 'boolean',
              description: 'Whether to save extracted memories to Cortex (default: true)',
              default: true,
            },
          },
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'cortex_search': {
        if (!args) throw new Error('Missing arguments');
        const query = args['query'] as string;
        const type = args['type'] as string | undefined;
        const limit = (args['limit'] as number) || 10;
        const semantic = (args['semantic'] as boolean) || false;

        let results: Memory[];
        let searchMode = 'keyword';

        if (semantic && embeddingInitialized) {
          // Use semantic search
          const semanticResults = await store.searchSemantic(query, {
            type: type as Memory['type'],
            limit,
            minScore: 0.3,
          });
          results = semanticResults.map((r) => r.memory);
          searchMode = 'semantic';
        } else {
          // Use keyword search
          results = await store.search(query, { type, limit });
        }

        return {
          content: [
            {
              type: 'text',
              text:
                results.length > 0
                  ? `Found ${results.length} memories (${searchMode} search):\n\n` +
                    results
                      .map(
                        (m: Memory, i: number) =>
                          `${i + 1}. [${m.type}] ${m.content}\n   Source: ${m.source}\n   Created: ${m.createdAt}`
                      )
                      .join('\n\n')
                  : `No memories found matching your query (${searchMode} search).`,
            },
          ],
        };
      }

      case 'cortex_add': {
        if (!args) throw new Error('Missing arguments');
        const content = args['content'] as string;
        const type = args['type'] as Memory['type'];
        const source = args['source'] as string;
        const tags = args['tags'] as string[] | undefined;

        const id = await store.add({ content, type, source, tags });

        return {
          content: [
            {
              type: 'text',
              text: `✓ Memory added successfully (ID: ${id})`,
            },
          ],
        };
      }

      case 'cortex_list': {
        const type = args?.['type'] as string | undefined;
        const limit = (args?.['limit'] as number) || 20;

        const memories = await store.list({ type, limit });

        return {
          content: [
            {
              type: 'text',
              text:
                memories.length > 0
                  ? `${memories.length} memories:\n\n` +
                    memories
                      .map(
                        (m: Memory, i: number) =>
                          `${i + 1}. [${m.type}] ${m.content}\n   Source: ${m.source}`
                      )
                      .join('\n\n')
                  : 'No memories stored yet.',
            },
          ],
        };
      }

      case 'cortex_stats': {
        const stats = await store.stats();
        const typeBreakdown = Object.entries(stats.byType)
          .map(([type, count]) => `  ${type}: ${count}`)
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `📊 Cortex Memory Statistics\n\nTotal memories: ${stats.total}\n\nBy type:\n${
                typeBreakdown || '  (none yet)'
              }`,
            },
          ],
        };
      }

      case 'cortex_context': {
        if (!args) throw new Error('Missing arguments');
        const task = args['task'] as string;
        const currentFile = args['currentFile'] as string | undefined;
        const tags = args['tags'] as string[] | undefined;
        const type = args['type'] as Memory['type'] | undefined;
        const limit = (args['limit'] as number) || 5;

        const results = await router.routeWithScores({ task, currentFile, tags, type, limit });

        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No relevant context found for your task. Try adding some memories first with cortex_add.',
              },
            ],
          };
        }

        const contextText = results
          .map(
            (r, i) =>
              `${i + 1}. [${r.memory.type}] ${r.memory.content}\n   Relevance: ${Math.round(r.score * 100)}% | ${r.reason}`
          )
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `🧠 Found ${results.length} relevant context items for "${task}":\n\n${contextText}`,
            },
          ],
        };
      }

      case 'cortex_guard': {
        if (!args) throw new Error('Missing arguments');
        const content = args['content'] as string;
        const defaultFilters = [
          'api_keys',
          'secrets',
          'emails',
          'urls_auth',
          'credit_cards',
          'phone_numbers',
          'ip_addresses',
          'pii',
        ] as const;
        type FilterType = (typeof defaultFilters)[number];
        const filters = (args['filters'] as FilterType[]) || [...defaultFilters];
        const mode = (args['mode'] as 'redact' | 'block' | 'warn') || 'redact';

        const result = guard.guard(content, { filters, mode });

        if (!result.wasFiltered) {
          return {
            content: [
              {
                type: 'text',
                text: '✅ No sensitive data detected. Content is safe to share.',
              },
            ],
          };
        }

        const detailsText = result.filterDetails
          ?.map((d) => `  - ${d.type}: ${d.count} found`)
          .join('\n');

        if (mode === 'block') {
          return {
            content: [
              {
                type: 'text',
                text: `⛔ Sensitive data detected! Content blocked.\n\nDetected:\n${detailsText}`,
              },
            ],
          };
        }

        if (mode === 'warn') {
          return {
            content: [
              {
                type: 'text',
                text: `⚠️ Sensitive data detected but preserved:\n\nDetected:\n${detailsText}\n\nOriginal content:\n${result.content}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `🔒 Sensitive data redacted:\n\nFiltered:\n${detailsText}\n\nSafe content:\n${result.content}`,
            },
          ],
        };
      }

      case 'cortex_scan': {
        const scanPath = (args?.['path'] as string) || process.cwd();
        const shouldSave = args?.['save'] !== false;

        const scanner = new ProjectScanner();
        const result = await scanner.scan({ path: scanPath });

        // Save extracted memories if requested
        if (shouldSave && result.memories.length > 0) {
          let savedCount = 0;
          for (const memory of result.memories) {
            try {
              await store.add(memory);
              savedCount++;
            } catch {
              // Skip duplicates or errors
            }
          }
          result.summary.memoriesFound = savedCount;
        }

        // Format for LLM analysis
        const byTypeStr = Object.entries(result.summary.byType)
          .filter(([, count]) => count > 0)
          .map(([type, count]) => `${type}: ${count}`)
          .join(', ');

        const memorySummary = result.memories
          .slice(0, 20)
          .map(
            (m, i) =>
              `${i + 1}. [${m.type}] ${m.content.slice(0, 100)}${m.content.length > 100 ? '...' : ''}`
          )
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text:
                `📊 Project Scan Complete\n\n` +
                `Path: ${scanPath}\n` +
                `Files scanned: ${result.summary.filesScanned}\n` +
                `Memories ${shouldSave ? 'saved' : 'found'}: ${result.summary.memoriesFound}\n` +
                `By type: ${byTypeStr}\n` +
                `Sources: ${result.summary.sources.slice(0, 5).join(', ')}${result.summary.sources.length > 5 ? '...' : ''}\n\n` +
                `Extracted context:\n${memorySummary}\n\n` +
                `💡 You can now use these memories for context. Ask me to analyze patterns or summarize the project architecture.`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Cortex MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
