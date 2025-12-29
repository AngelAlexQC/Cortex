import { homedir } from 'node:os';
import { join } from 'node:path';
import { type Memory, MemoryStore } from '@cortex/core';
import { Command } from 'commander';

const program = new Command();
const store = new MemoryStore();

program
  .name('cortex')
  .description('🧠 Universal memory layer for AI coding tools')
  .version('0.3.0');

// Add memory
program
  .command('add')
  .description('Add a new memory')
  .requiredOption('-c, --content <text>', 'Memory content')
  .requiredOption('-t, --type <type>', 'Memory type (fact|decision|code|config|note)')
  .requiredOption('-s, --source <source>', 'Source (file, url, conversation, etc)')
  .option('--tags <tags>', 'Comma-separated tags')
  .action(async (options) => {
    try {
      const id = await store.add({
        content: options.content,
        type: options.type,
        source: options.source,
        tags: options.tags ? options.tags.split(',').map((t: string) => t.trim()) : undefined,
      });
      console.log(`✓ Memory added (ID: ${id})`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Search memories
program
  .command('search <query>')
  .description('Search memories by content')
  .option('-t, --type <type>', 'Filter by type')
  .option('-l, --limit <number>', 'Max results', '10')
  .action(async (query, options) => {
    const results = await store.search(query, {
      type: options.type,
      limit: parseInt(options.limit, 10),
    });

    if (results.length === 0) {
      console.log('No memories found.');
      return;
    }

    console.log(`\nFound ${results.length} memories:\n`);
    results.forEach((memory: Memory, i: number) => {
      console.log(`${i + 1}. [${memory.type}] ${memory.content}`);
      console.log(`   Source: ${memory.source}`);
      console.log(`   Created: ${memory.createdAt}`);
      if (memory.tags && memory.tags.length > 0) {
        console.log(`   Tags: ${memory.tags.join(', ')}`);
      }
      console.log('');
    });
  });

// List memories
program
  .command('list')
  .description('List recent memories')
  .option('-t, --type <type>', 'Filter by type')
  .option('-l, --limit <number>', 'Max results', '20')
  .action(async (options) => {
    const memories = await store.list({
      type: options.type,
      limit: parseInt(options.limit, 10),
    });

    if (memories.length === 0) {
      console.log('No memories stored yet.');
      return;
    }

    console.log(`\n${memories.length} memories:\n`);
    memories.forEach((memory: Memory, i: number) => {
      console.log(`${i + 1}. [${memory.type}] ${memory.content}`);
      console.log(`   Source: ${memory.source}`);
      console.log('');
    });
  });

// Show statistics
program
  .command('stats')
  .description('Show memory statistics')
  .action(async () => {
    const stats = await store.stats();
    console.log('\n📊 Cortex Memory Statistics\n');
    console.log(`Total memories: ${stats.total}`);
    console.log('\nBy type:');

    if (Object.keys(stats.byType).length === 0) {
      console.log('  (none yet)');
    } else {
      Object.entries(stats.byType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
    }
    console.log('');
  });

// Get memory details
program
  .command('get <id>')
  .description('Get details of a specific memory')
  .action(async (id) => {
    try {
      const memory = await store.get(parseInt(id, 10));
      if (!memory) {
        console.log(`Memory ${id} not found`);
        process.exit(1);
      }

      console.log(`\n📝 Memory #${memory.id}\n`);
      console.log(`Type: ${memory.type}`);
      console.log(`Content: ${memory.content}`);
      console.log(`Source: ${memory.source}`);
      if (memory.tags && memory.tags.length > 0) {
        console.log(`Tags: ${memory.tags.join(', ')}`);
      }
      if (memory.metadata) {
        console.log(`Metadata: ${JSON.stringify(memory.metadata, null, 2)}`);
      }
      console.log(`Created: ${memory.createdAt}`);
      console.log(`Updated: ${memory.updatedAt}`);
      console.log('');
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Edit memory
program
  .command('edit <id>')
  .description('Edit an existing memory')
  .option('-c, --content <text>', 'New memory content')
  .option('-t, --type <type>', 'New memory type (fact|decision|code|config|note)')
  .option('-s, --source <source>', 'New source')
  .option('--tags <tags>', 'New comma-separated tags (replaces existing)')
  .option('--add-tags <tags>', 'Add tags (comma-separated, keeps existing)')
  .option('--remove-tags <tags>', 'Remove tags (comma-separated)')
  .action(async (id, options) => {
    try {
      const memoryId = parseInt(id, 10);

      // Check if memory exists
      const existing = await store.get(memoryId);
      if (!existing) {
        console.log(`Memory ${id} not found`);
        process.exit(1);
      }

      // Build updates object
      const updates: Partial<Memory> = {};

      if (options.content) {
        updates.content = options.content;
      }

      if (options.type) {
        updates.type = options.type;
      }

      if (options.source) {
        updates.source = options.source;
      }

      // Handle tags
      if (options.tags) {
        updates.tags = options.tags.split(',').map((t: string) => t.trim());
      } else if (options.addTags || options.removeTags) {
        const currentTags = existing.tags || [];
        let newTags = [...currentTags];

        if (options.addTags) {
          const tagsToAdd = options.addTags.split(',').map((t: string) => t.trim());
          newTags = [...new Set([...newTags, ...tagsToAdd])];
        }

        if (options.removeTags) {
          const tagsToRemove = options.removeTags.split(',').map((t: string) => t.trim());
          newTags = newTags.filter((tag) => !tagsToRemove.includes(tag));
        }

        updates.tags = newTags;
      }

      // Check if any updates were provided
      if (Object.keys(updates).length === 0) {
        console.log('No updates provided. Use --help to see available options.');
        process.exit(1);
      }

      // Perform update
      const success = await store.update(memoryId, updates);

      if (success) {
        console.log(`✓ Memory ${id} updated`);

        // Show updated memory
        const updated = await store.get(memoryId);
        if (updated) {
          console.log(`\n📝 Updated Memory:\n`);
          console.log(`[${updated.type}] ${updated.content}`);
          console.log(`Source: ${updated.source}`);
          if (updated.tags && updated.tags.length > 0) {
            console.log(`Tags: ${updated.tags.join(', ')}`);
          }
        }
      } else {
        console.log(`Failed to update memory ${id}`);
        process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Delete memory
program
  .command('delete <id>')
  .description('Delete a memory by ID')
  .action(async (id) => {
    const deleted = await store.delete(parseInt(id, 10));
    if (deleted) {
      console.log(`✓ Memory ${id} deleted`);
    } else {
      console.log(`Memory ${id} not found`);
      process.exit(1);
    }
  });

// Clear all memories
program
  .command('clear')
  .description('Delete all memories (use with caution!)')
  .option('-f, --force', 'Skip confirmation')
  .action(async (options) => {
    if (!options.force) {
      console.log('This will delete ALL memories. Use --force to confirm.');
      process.exit(1);
    }

    const count = await store.clear();
    console.log(`✓ Cleared ${count} memories`);
  });

// Info command
program
  .command('info')
  .description('Show Cortex configuration and paths')
  .action(() => {
    const dbPath = join(homedir(), '.cortex', 'memories.db');
    console.log('\n🧠 Cortex Information\n');
    console.log(`Database: ${dbPath}`);
    console.log(`Version: 0.3.0`);
    console.log('\nTo use with Claude Desktop:');
    console.log('Add this to your claude_desktop_config.json:\n');
    console.log(
      JSON.stringify(
        {
          mcpServers: {
            cortex: {
              command: 'bun',
              args: ['run', join(process.cwd(), 'packages', 'mcp-server', 'dist', 'mcp-server.js')],
            },
          },
        },
        null,
        2
      )
    );
    console.log('');
  });

program.parse();
