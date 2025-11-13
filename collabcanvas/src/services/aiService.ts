import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type {
  AICommandResult,
  AIStatus,
  AICommandHistory,
  AIServiceConfig
} from '../types';
import { generateBOM, type BOMGenerationOptions } from './bomService';
import { generateCPM, type CPMGenerationOptions } from './cpmService';
import type { ParallelGenerationResult, BOMGenerationResult, CPMGenerationResult } from '../types/cpm';

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

  async processCommand(commandText: string, userId?: string, currentView?: 'scope' | 'time' | 'space' | 'money'): Promise<AICommandResult> {
    try {
      const result = await this.aiCommandFunction({
        commandText,
        userId: userId || 'anonymous',
        currentView: currentView || null
      });

              const data = result.data as AICommandResult;
      
      // Only add to history if there are executed commands
      if (data.executedCommands && data.executedCommands.length > 0) {
        const command = data.executedCommands[0];
        const historyEntry: AICommandHistory = {
          commandId: command.commandId,
          command: commandText,
          result: data,
          timestamp: Date.now(),
          userId: command.userId
        };

        this.commandHistory.push(historyEntry);
      }

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

  /**
   * Generate BOM and CPM in parallel
   * AC: #4 - Parallel Generation
   */
  async generateBOMAndCPM(
    bomOptions: BOMGenerationOptions,
    cpmOptions: CPMGenerationOptions,
    onProgress?: (progress: { bom?: 'generating' | 'complete' | 'error'; cpm?: 'generating' | 'complete' | 'error' }) => void
  ): Promise<ParallelGenerationResult> {
    let bomResult: BOMGenerationResult = { success: false };
    let cpmResult: CPMGenerationResult = { success: false };

    // Start both generations in parallel
    const bomPromise = generateBOM(bomOptions)
      .then(bom => {
        bomResult = { success: true, bom };
        onProgress?.({ bom: 'complete' });
        return bomResult;
      })
      .catch(error => {
        bomResult = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: `BOM generation failed: ${error instanceof Error ? error.message : String(error)}`,
        };
        onProgress?.({ bom: 'error' });
        return bomResult;
      });

    const cpmPromise = generateCPM(cpmOptions)
      .then(cpm => {
        cpmResult = { success: true, cpm };
        onProgress?.({ cpm: 'complete' });
        return cpmResult;
      })
      .catch(error => {
        cpmResult = {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: `CPM generation failed: ${error instanceof Error ? error.message : String(error)}`,
        };
        onProgress?.({ cpm: 'error' });
        return cpmResult;
      });

    // Notify progress for both starting
    onProgress?.({ bom: 'generating', cpm: 'generating' });

    // Wait for both to complete (or fail)
    await Promise.all([bomPromise, cpmPromise]);

    const bothSucceeded = bomResult.success && cpmResult.success;
    const bothFailed = !bomResult.success && !cpmResult.success;
    const partialSuccess = bomResult.success !== cpmResult.success;

    return {
      bom: bomResult,
      cpm: cpmResult,
      bothSucceeded,
      bothFailed,
      partialSuccess,
    };
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