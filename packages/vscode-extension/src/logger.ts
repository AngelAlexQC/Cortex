import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private static instance: Logger;
  private outputChannel: vscode.OutputChannel;
  private logFilePath: string | undefined;

  private constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Cortex Debug');
    this.initializeLogFile();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private initializeLogFile() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      const logsDir = path.join(workspaceFolder.uri.fsPath, '.cortex', 'logs');
      try {
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir, { recursive: true });
        }
        // Timestamped log file for each session
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.logFilePath = path.join(logsDir, `cortex-${timestamp}.log`);
        this.info(`Logger initialized. Writing logs to: ${this.logFilePath}`);
      } catch (e) {
        this.outputChannel.appendLine(`Failed to create log file: ${e}`);
      }
    }
  }

  private formatMessage(level: string, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    let formattedData = '';
    if (data) {
      try {
        formattedData =
          typeof data === 'object' ? `\n${JSON.stringify(data, null, 2)}` : ` ${data}`;
      } catch (_e) {
        formattedData = ' [Circular/Unserializable Data]';
      }
    }
    return `[${timestamp}] [${level}] ${message}${formattedData}`;
  }

  private write(level: string, message: string, data?: unknown) {
    const logMessage = this.formatMessage(level, message, data);

    // Always write to output channel
    this.outputChannel.appendLine(logMessage);

    // Write to file if available
    if (this.logFilePath) {
      try {
        fs.appendFileSync(this.logFilePath, `${logMessage}\n`);
      } catch (e) {
        // Fallback to console if file write fails
        console.error('Failed to write to log file', e);
      }
    }
  }

  public debug(message: string, data?: unknown) {
    this.write('DEBUG', message, data);
  }

  public info(message: string, data?: unknown) {
    this.write('INFO', message, data);
  }

  public warn(message: string, data?: unknown) {
    this.write('WARN', message, data);
  }

  public error(message: string, error?: unknown) {
    this.write('ERROR', message, error);
    if (error && typeof error === 'object' && 'stack' in error) {
      const err = error as { stack: unknown };
      if (typeof err.stack === 'string') {
        this.write('STACK', err.stack);
      }
    }
  }

  public show() {
    this.outputChannel.show();
  }
}
