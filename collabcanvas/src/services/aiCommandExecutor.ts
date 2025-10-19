import type {
  AICommand,
  AICommandResult,
  Shape,
  AlignmentType
} from '../types';

export interface CanvasStoreActions {
  createShape: (shape: Shape) => void;
  updateShapePosition: (id: string, x: number, y: number, updatedBy: string, clientUpdatedAt: number) => void;
  updateShapeProperty: (id: string, property: keyof Shape, value: unknown, updatedBy: string, clientUpdatedAt: number) => void;
  deleteShape: (id: string) => void;
  deleteShapes: (ids: string[]) => void;
  duplicateShapes: (ids: string[], duplicatedBy: string) => void;
  alignShapes: (shapeIds: string[], alignment: AlignmentType) => void;
  createLayer: (name: string) => string;
  moveShapeToLayer: (shapeId: string, layerId: string) => void;
  exportCanvas: (format: 'PNG' | 'SVG', quality?: number) => Promise<void>;
  exportSelectedShapes: (format: 'PNG' | 'SVG', quality?: number) => Promise<void>;
}

export interface CanvasContext {
  shapes: Map<string, Shape>;
  selectedShapes: string[];
  layers: Array<{ id: string; name: string; visible: boolean }>;
  currentUser: { uid: string; displayName?: string };
}

export class AICommandExecutor {
  private storeActions: CanvasStoreActions;

  constructor(storeActions: CanvasStoreActions) {
    this.storeActions = storeActions;
  }

  async executeCommand(command: AICommand): Promise<AICommandResult> {
    try {
      switch (command.type) {
        case 'CREATE':
          return await this.executeCreateCommand(command);
        default:
          return {
            success: false,
            message: `Command type ${command.type} not implemented yet`,
            executedCommands: [command]
          };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to execute command: ${error}`,
        executedCommands: [command],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async executeCreateCommand(command: AICommand): Promise<AICommandResult> {
    const { parameters } = command;
    const shapeType = parameters.shapeType;
    const x = parameters.x || 100;
    const y = parameters.y || 100;
    const color = parameters.color || '#3B82F6';

    const shapeId = `${shapeType}_${Date.now()}`;
    let shape: Shape;

    switch (shapeType) {
      case 'circle':
        shape = {
          id: shapeId,
          type: 'circle',
          x, y,
          radius: parameters.radius || 50,
          color,
          w: 0, h: 0,
          createdBy: command.userId,
          createdAt: Date.now(),
          updatedBy: command.userId,
          updatedAt: Date.now(),
          clientUpdatedAt: Date.now()
        };
        break;
        
      case 'rect':
        shape = {
          id: shapeId,
          type: 'rect',
          x, y,
          w: parameters.w || 100,
          h: parameters.h || 100,
          color,
          createdBy: command.userId,
          createdAt: Date.now(),
          updatedBy: command.userId,
          updatedAt: Date.now(),
          clientUpdatedAt: Date.now()
        };
        break;
        
      case 'text':
        shape = {
          id: shapeId,
          type: 'text',
          x, y,
          w: parameters.w || 200,
          h: parameters.h || 50,
          text: parameters.text || 'New Text',
          fontSize: parameters.fontSize || 16,
          color,
          createdBy: command.userId,
          createdAt: Date.now(),
          updatedBy: command.userId,
          updatedAt: Date.now(),
          clientUpdatedAt: Date.now()
        };
        break;
        
      case 'line':
        shape = {
          id: shapeId,
          type: 'line',
          x, y,
          w: parameters.w || 100,
          h: parameters.h || 0,
          strokeWidth: parameters.strokeWidth || 2,
          points: parameters.points || [0, 0, 100, 0],
          color,
          createdBy: command.userId,
          createdAt: Date.now(),
          updatedBy: command.userId,
          updatedAt: Date.now(),
          clientUpdatedAt: Date.now()
        };
        break;
        
      default:
        return {
          success: false,
          message: `Shape type ${shapeType} not supported`,
          executedCommands: [command]
        };
    }

    this.storeActions.createShape(shape);

    return {
      success: true,
      message: `Created ${shapeType} at (${x}, ${y})`,
      executedCommands: [command],
      createdShapeIds: [shapeId]
    };
  }

  public identifyTargetShapes(): string[] {
    // For now, return empty array - this will be implemented later
    return [];
  }
}