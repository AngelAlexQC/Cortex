import { spawn } from 'node:child_process';
import path from 'node:path';

async function runDemo() {
  console.log('🤖 \x1b[36mAI Agent (Simulated)\x1b[0m: Connecting to Cortex Memory Layer...');

  // Start the MCP Server
  const serverPath = path.resolve(__dirname, '../src/mcp-server.ts');
  const server = spawn('bun', ['run', serverPath], {
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  // Helper to send JSON-RPC
  let msgId = 1;
  // biome-ignore lint/suspicious/noExplicitAny: demo script
  const send = (method: string, params: any) => {
    const req = { jsonrpc: '2.0', id: msgId++, method, params };
    server.stdin.write(`${JSON.stringify(req)}\n`);
    return req.id;
  };

  // Listen for responses
  server.stdout.on('data', (data) => {
    const lines = data
      .toString()
      .split('\n')
      .filter((l: string) => l.trim());
    for (const line of lines) {
      if (!line.includes('jsonrpc')) continue;
      try {
        const res = JSON.parse(line);
        handleResponse(res);
      } catch (_e) {
        // ignore partial chunks
      }
    }
  });

  // Demo Sequence
  let step = 0;

  // biome-ignore lint/suspicious/noExplicitAny: demo script
  function handleResponse(res: any) {
    if (res.result?.serverInfo) {
      console.log(
        `✅ \x1b[32mCortex\x1b[0m: Connection Established (v${res.result.serverInfo.version})`
      );
      nextStep();
    } else if (res.error) {
      console.error('❌ Error:', res.error);
    } else {
      // Tool execution result
      const content = res.result?.content?.[0]?.text || '';
      console.log(
        `\n📦 \x1b[33mCortex Tool Output\x1b[0m:\n${content
          .split('\n')
          .map((l: string) => `  ${l}`)
          .join('\n')}`
      );
      nextStep();
    }
  }

  function nextStep() {
    step++;
    setTimeout(() => {
      switch (step) {
        case 1:
          console.log(
            "\n🤖 \x1b[36mAI Agent\x1b[0m: 'I need to scan this project to understand its structure.'"
          );
          console.log('   → Calling tool: \x1b[1mcortex_scan\x1b[0m');
          send('tools/call', {
            name: 'cortex_scan',
            arguments: { path: process.cwd(), save: false },
          });
          break;
        case 2:
          console.log(
            "\n🤖 \x1b[36mAI Agent\x1b[0m: 'I see. I'll save a memory about the Universal Setup.'"
          );
          console.log('   → Calling tool: \x1b[1mcortex_add\x1b[0m');
          send('tools/call', {
            name: 'cortex_add',
            arguments: {
              content:
                'The user has implemented Universal MCP support including OpenVSX publishing and a config generator script.',
              type: 'fact',
              source: 'Agent Conversation',
            },
          });
          break;
        case 3:
          console.log("\n🤖 \x1b[36mAI Agent\x1b[0m: 'Now I'll verify I can recall it.'");
          console.log('   → Calling tool: \x1b[1mcortex_search\x1b[0m');
          send('tools/call', { name: 'cortex_search', arguments: { query: 'Universal MCP' } });
          break;
        case 4:
          console.log(
            "\n🤖 \x1b[36mAI Agent\x1b[0m: 'Great! The memory is persistent across sessions.'"
          );
          console.log('👋 Disconnecting...');
          server.kill();
          process.exit(0);
      }
    }, 1000);
  }

  // Initialize
  send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'demo-agent', version: '1.0.0' },
  });
}

runDemo();
