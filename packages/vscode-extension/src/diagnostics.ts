import * as https from 'node:https';
import { AIProvider, CortexConfig } from './config';
import { Logger } from './logger';

export class NetworkDiagnostics {
  private logger = Logger.getInstance();

  /**
   * Run full network diagnostic suite
   */
  public async runDiagnostics(): Promise<void> {
    this.logger.show();
    this.logger.info('🚀 Starting Cortex Network Diagnostics...');
    this.logger.info(`Platform: ${process.platform} ${process.arch}`);
    this.logger.info(`Node Version: ${process.version}`);

    // 1. Check basic internet connectivity
    this.logger.info('1️⃣ Checking basic internet connectivity...');
    const googleOk = await this.checkConnectivity('https://www.google.com');
    if (googleOk) {
      this.logger.info('✅ Basic internet access confirmed (reached google.com)');
    } else {
      this.logger.error(
        '❌ Failed to reach google.com. Check your internet connection or proxy settings.'
      );
    }

    // 2. Check Provider API connectivity
    const provider = CortexConfig.provider;
    this.logger.info(`2️⃣ Checking configured provider: ${provider}`);

    if (provider === AIProvider.Gemini || provider === AIProvider.Auto) {
      await this.checkGeminiConnectivity();
    }

    if (provider === AIProvider.OpenAI || provider === AIProvider.Auto) {
      await this.checkEndpoint('https://api.openai.com/v1/models', 'OpenAI API');
    }

    if (provider === AIProvider.Anthropic || provider === AIProvider.Auto) {
      await this.checkEndpoint('https://api.anthropic.com/v1/models', 'Anthropic API'); // Auth needed usually, but check reachability
    }

    this.logger.info('🏁 Diagnostics complete. Please share this output if asking for support.');
  }

  private async checkGeminiConnectivity() {
    this.logger.info('👉 Testing Gemini API connectivity...');

    // Check discovery document (no auth needed)
    const discoveryUrl = 'https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta';
    const discoveryOk = await this.checkConnectivity(discoveryUrl);

    if (discoveryOk) {
      this.logger.info('✅ Gemini Discovery Service reachable');
    } else {
      this.logger.error('❌ Gemini Discovery Service NOT reachable. Possible firewall blockage.');
    }

    // Check model endpoint (specific known IP issues sometimes)
    const modelUrl = 'https://generativelanguage.googleapis.com/v1beta/models?key=INVALID_KEY_TEST';
    try {
      // Expecting 400 or 403, but NOT fetch error
      await this.makeRequest(modelUrl);
      this.logger.info('✅ Gemini Model Endpoint reachable (response received)');
    } catch (e: unknown) {
      const err = e as { message?: string };
      if (err.message && (err.message.includes('400') || err.message.includes('403'))) {
        this.logger.info('✅ Gemini Model Endpoint reachable (valid error response received)');
      } else {
        this.logger.error(`❌ Gemini Model Endpoint unreachable: ${err.message}`);
      }
    }
  }

  private async checkEndpoint(url: string, name: string) {
    this.logger.info(`👉 Testing ${name} connectivity...`);
    const ok = await this.checkConnectivity(url);
    if (ok) {
      this.logger.info(`✅ ${name} reachable`);
    } else {
      this.logger.warn(`⚠️ ${name} unreachable (could be auth or network)`);
    }
  }

  private async checkConnectivity(url: string): Promise<boolean> {
    try {
      await this.makeRequest(url, { method: 'HEAD' });
      return true;
    } catch (_e) {
      // Retry with GET if HEAD fails (some servers deny HEAD)
      try {
        await this.makeRequest(url, { method: 'GET' });
        return true;
      } catch (_e2) {
        return false;
      }
    }
  }

  private makeRequest(url: string, options: https.RequestOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = https.request(url, { ...options, timeout: 5000 }, (res) => {
        // We consider connected if we get ANY status code response
        // We only care about network errors here
        res.resume(); // consume text
        resolve();
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Connection timed out'));
      });

      req.end();
    });
  }
}
