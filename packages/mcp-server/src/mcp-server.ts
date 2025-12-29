import { ContextGuard, ContextRouter, type Memory, MemoryStore } from '@cortex/core';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const store = new MemoryStore();
const router = new ContextRouter(store);
const guard = new ContextGuard();

const server = new Server(
  {
    name: 'cortex-memory',
    version: '0.1.0',
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

        const results = await store.search(query, { type, limit });

        return {
          content: [
            {
              type: 'text',
              text:
                results.length > 0
                  ? `Found ${results.length} memories:\n\n` +
                    results
                      .map(
                        (m: Memory, i: number) =>
                          `${i + 1}. [${m.type}] ${m.content}\n   Source: ${m.source}\n   Created: ${m.createdAt}`
                      )
                      .join('\n\n')
                  : 'No memories found matching your query.',
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
