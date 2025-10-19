import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type {
  AICommandResult,
  AIStatus,
  AICommandHistory,
  AIServiceConfig
} from '../types';

export class AIService {
  private aiCommandFunction = httpsCallable(functions, 'aiCommand');
  private commandHistory: AICommandHistory[] = [];

  constructor(config: AIServiceConfig = {
    model: 'gpt-3.5-turbo',
    maxTokens: 200,
    temperature: 0.1,
    rateLimitPerMinute: 10,
    timeoutMs: 5000
  }) {
    // Store config if needed later
    console.log('AI Service initialized with config:', config);
  }

  async processCommand(commandText: string, userId?: string): Promise<AICommandResult> {
    try {
      const result = await this.aiCommandFunction({
        commandText,
        userId: userId || 'anonymous'
      });

              const data = result.data as AICommandResult;
      const command = data.executedCommands[0];
      const historyEntry: AICommandHistory = {
        commandId: command.commandId,
        command: commandText,
        result: data,
        timestamp: Date.now(),
        userId: command.userId
      };

      this.commandHistory.push(historyEntry);

      return data;
    } catch (error) {
      console.error('AI Service Error:', error);
      return {
        success: false,
        message: `Failed to process command: ${error}`,
        executedCommands: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  getCommandHistory(): AICommandHistory[] {
    return this.commandHistory;
  }

  clearHistory(): void {
    this.commandHistory = [];
  }

  getStatus(): AIStatus {
    return {
      isProcessing: false,
      commandQueue: [],
      lastCommand: this.commandHistory[this.commandHistory.length - 1]?.command,
      lastResult: this.commandHistory[this.commandHistory.length - 1]?.result
    };
  }
}