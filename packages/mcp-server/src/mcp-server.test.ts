import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { ChildProcess } from 'node:child_process';
import { spawn } from 'node:child_process';
import path from 'node:path';

import { SERVER_CONFIG } from '@ecuabyte/cortex-shared';

describe('MCP Server Smoke Test', () => {
  let serverProcess: ChildProcess;
  let serverPath: string;

  beforeAll(async () => {
    // Build the server first to ensure we test the artifact
    const buildProc = spawn('bun', ['run', 'build'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
    });

    await new Promise<void>((resolve, reject) => {
      buildProc.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Build failed with code ${code}`));
      });
    });

    serverPath = path.resolve(__dirname, '../dist/mcp-server.js');
  });

  it('should start and respond to JSON-RPC', async () => {
    return new Promise<void>((resolve, reject) => {
      serverProcess = spawn('bun', ['run', serverPath], {
        stdio: ['pipe', 'pipe', 'inherit'], // Pipe stdin/stdout, inherit stderr for logs
      });

      const input = `${JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'smoke-test',
            version: '1.0.0',
          },
        },
      })}\n`;

      let receivedData = '';

      serverProcess.stdout?.on('data', (data) => {
        receivedData += data.toString();

        // Check if we received a complete JSON-RPC response
        if (receivedData.includes('"jsonrpc":"2.0"')) {
          try {
            const response = JSON.parse(receivedData.trim());
            expect(response.jsonrpc).toBe('2.0');
            expect(response.id).toBe(1);
            expect(response.result).toBeDefined();
            expect(response.result.serverInfo.name).toBe(SERVER_CONFIG.NAME);
            resolve();
          } catch (e) {
            reject(e);
          }
        }
      });

      serverProcess.on('error', reject);

      // Send the request
      serverProcess.stdin?.write(input);
    });
  });

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });
});
