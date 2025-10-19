<!-- 79ee2201-f298-464c-a141-101be203dfdd 7f9bbf1b-1b25-46fe-a28f-212462901ef1 -->
# OpenAI NLP Integration for AI Canvas Agent

## Overview

Replace the current hardcoded "create a circle" parser with full OpenAI GPT-3.5-turbo NLP parsing, using LangChain to structure and validate the AI responses into our command schema.

## Implementation Steps

### 1. Update Firebase Cloud Function (`collabcanvas/functions/src/aiCommand.ts`)

**Current State**: Lines 17-40 use simple string matching `parseCreateCircleCommand()`

**Changes Needed**:

- Remove hardcoded `parseCreateCircleCommand()` function
- Implement OpenAI chat completion with structured prompt
- Use LangChain's `StructuredOutputParser` with Zod schema to validate responses
- Parse natural language into `AICommand` objects

**Key Implementation**:

```typescript
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { z } from 'zod';

// Define command schema using Zod
const CommandSchema = z.object({
  type: z.enum(['CREATE', 'MOVE', 'RESIZE', 'ROTATE', 'DELETE', 'ALIGN', 'EXPORT', 'LAYER', 'COLOR', 'DUPLICATE']),
  action: z.string(),
  parameters: z.object({
    shapeType: z.enum(['rect', 'circle', 'text', 'line']).optional(),
    color: z.string().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    radius: z.number().optional(),
    w: z.number().optional(),
    h: z.number().optional(),
    text: z.string().optional(),
    // ... other parameters
  }),
  confidence: z.number().min(0).max(1)
});

// Initialize LangChain parser
const parser = StructuredOutputParser.fromZodSchema(CommandSchema);

// Create OpenAI chat model
const model = new ChatOpenAI({
  modelName: 'gpt-3.5-turbo',
  temperature: 0.1, // Low temperature for consistent parsing
  maxTokens: 200,
  openAIApiKey: process.env.OPENAI_API_KEY
});

async function parseCommandWithOpenAI(commandText: string) {
  const formatInstructions = parser.getFormatInstructions();
  
  const prompt = `You are a canvas command parser. Parse the following natural language command into a structured canvas operation.

Available command types:
- CREATE: Create new shapes (circle, rectangle, text, line)
- MOVE: Move shapes to new positions
- RESIZE: Change shape dimensions
- ROTATE: Rotate shapes
- DELETE: Remove shapes
- ALIGN: Align multiple shapes
- EXPORT: Export canvas or shapes
- LAYER: Layer operations
- COLOR: Change colors
- DUPLICATE: Duplicate shapes

Command: "${commandText}"

${formatInstructions}`;

  const response = await model.call([{ role: 'user', content: prompt }]);
  const parsed = await parser.parse(response.content);
  
  return {
    ...parsed,
    timestamp: Date.now(),
    commandId: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
}
```

### 2. Update aiCommand Function

Replace lines 42-67 in `collabcanvas/functions/src/aiCommand.ts`:

```typescript
export const aiCommand = onCall(async (request) => {
  try {
    const { commandText, userId } = request.data;
    
    if (!commandText || !userId) {
      throw new HttpsError('invalid-argument', 'Command text and userId are required');
    }

    // Use OpenAI + LangChain for parsing
    const command = await parseCommandWithOpenAI(commandText);
    command.userId = userId;

    return {
      success: true,
      message: `Successfully parsed command: ${commandText}`,
      executedCommands: [command],
      createdShapeIds: [],
      modifiedShapeIds: [],
      deletedShapeIds: []
    };

  } catch (error) {
    console.error('AI Command Function Error:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    // Handle parsing errors gracefully
    return {
      success: false,
      message: `Could not understand command: ${error.message}`,
      executedCommands: [],
      error: error.message
    };
  }
});
```

### 3. Update Command Executor (`collabcanvas/src/services/aiCommandExecutor.ts`)

**Current State**: Lines 66-99 only handle `shapeType: 'circle'`

**Changes Needed**:

- Expand `executeCreateCommand` to handle all shape types (rect, text, line)
- Use parameters from OpenAI (color, position, size, text content)
- Add proper default values for missing parameters

**Example Enhancement**:

```typescript
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
      
    // ... handle 'line' case
      
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
```

### 4. Build and Test

```bash
cd collabcanvas/functions
npm run build
cd ../..
firebase emulators:start
```

Test commands:

- "create a red circle"
- "create a blue rectangle at 200, 300"
- "add text saying Hello World"
- "make a green circle with radius 75"

## Success Criteria

- OpenAI API is called for every command
- LangChain validates responses match our schema
- Commands with colors, positions, sizes are parsed correctly
- Invalid commands return helpful error messages
- Response time remains <2 seconds
- All existing "create a circle" functionality still works

## Files to Modify

1. `collabcanvas/functions/src/aiCommand.ts` - Replace simple parser with OpenAI + LangChain
2. `collabcanvas/src/services/aiCommandExecutor.ts` - Expand shape creation to handle all types
3. `collabcanvas/functions/package.json` - Verify langchain dependencies (already present)

## Estimated Rubric Impact

After this implementation:

- **Command Breadth**: Will support 4+ creation command types (circle, rect, text, line with variations)
- **AI Performance**: OpenAI parsing with <2s response time
- **Natural Language**: True NLP instead of string matching

### To-dos

- [ ] Set up Firebase Cloud Functions with OpenAI and LangChain dependencies
- [ ] Create AI command Cloud Function with GPT-3.5-turbo and rate limiting
- [ ] Add AI command types to types.ts (8+ distinct command types)
- [ ] Create AI service client that calls Firebase Cloud Function
- [ ] Create command executor with shape identification and templates
- [ ] Define templates for login form, nav bar, card layout, flowchart
- [ ] Extend canvas store with AI state and command queue system
- [ ] Integrate AI commands with existing undo/redo system
- [ ] Create AI command input component with history and error handling
- [ ] Add AI assistant button and status to toolbar
- [ ] Create clarification dialog for ambiguous commands
- [ ] Create comprehensive test suite with mocked responses (20+ commands)
- [ ] Add integration tests for multi-user, queue, and undo/redo
- [ ] Validate <2s response times and multi-user performance
- [ ] Update README and architecture.md with AI features