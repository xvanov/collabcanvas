"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiCommand = void 0;
const https_1 = require("firebase-functions/v2/https");
const openai_1 = require("openai");
const zod_1 = require("zod");
const dotenv = require("dotenv");
// Load environment variables
dotenv.config();
// Initialize OpenAI client
const openai = new openai_1.OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
});
// Fallback: Check if running locally and use local env var
if (!process.env.OPENAI_API_KEY && process.env.NODE_ENV === 'development') {
    console.warn('⚠️ OPENAI_API_KEY not found. AI assistant will not work.');
}
// Define command schema using Zod
const CommandSchema = zod_1.z.object({
    type: zod_1.z.enum(['CREATE', 'MOVE', 'RESIZE', 'ROTATE', 'DELETE', 'ALIGN', 'EXPORT', 'LAYER', 'COLOR', 'DUPLICATE']),
    action: zod_1.z.string(),
    parameters: zod_1.z.object({
        shapeType: zod_1.z.enum(['rect', 'circle', 'text', 'line']).optional(),
        color: zod_1.z.string().optional(),
        x: zod_1.z.number().optional(),
        y: zod_1.z.number().optional(),
        radius: zod_1.z.number().optional(),
        w: zod_1.z.number().optional(),
        h: zod_1.z.number().optional(),
        text: zod_1.z.string().optional(),
        fontSize: zod_1.z.number().optional(),
        strokeWidth: zod_1.z.number().optional(),
        points: zod_1.z.array(zod_1.z.number()).optional(),
        targetShapes: zod_1.z.array(zod_1.z.string()).optional(),
        alignment: zod_1.z.enum(['left', 'center', 'right', 'top', 'middle', 'bottom', 'distribute-horizontal', 'distribute-vertical']).optional(),
        exportFormat: zod_1.z.enum(['PNG', 'SVG']).optional(),
        exportQuality: zod_1.z.number().optional(),
        layerName: zod_1.z.string().optional(),
        layerId: zod_1.z.string().optional(),
        targetColor: zod_1.z.string().optional(),
        template: zod_1.z.string().optional(),
        elementCount: zod_1.z.number().optional()
    }),
    confidence: zod_1.z.number().min(0).max(1)
});
async function parseCommandWithOpenAI(commandText) {
    var _a, _b;
    // Simple caching for common commands to avoid OpenAI calls
    const commonCommands = {
        'create a circle': {
            type: 'CREATE',
            action: 'create_circle',
            parameters: { shapeType: 'circle', x: 100, y: 100, radius: 50, color: '#3B82F6' },
            confidence: 0.95
        },
        'create circle': {
            type: 'CREATE',
            action: 'create_circle',
            parameters: { shapeType: 'circle', x: 100, y: 100, radius: 50, color: '#3B82F6' },
            confidence: 0.95
        },
        'create a rectangle': {
            type: 'CREATE',
            action: 'create_rectangle',
            parameters: { shapeType: 'rect', x: 100, y: 100, w: 100, h: 100, color: '#3B82F6' },
            confidence: 0.95
        },
        'create rectangle': {
            type: 'CREATE',
            action: 'create_rectangle',
            parameters: { shapeType: 'rect', x: 100, y: 100, w: 100, h: 100, color: '#3B82F6' },
            confidence: 0.95
        },
        'add text saying hello': {
            type: 'CREATE',
            action: 'create_text',
            parameters: { shapeType: 'text', x: 100, y: 100, text: 'Hello', fontSize: 16, color: '#3B82F6' },
            confidence: 0.95
        }
    };
    const lowerCommand = commandText.toLowerCase().trim();
    // Check cache first
    if (commonCommands[lowerCommand]) {
        console.log('🚀 Using cached command for:', commandText);
        return Object.assign(Object.assign({}, commonCommands[lowerCommand]), { timestamp: Date.now(), commandId: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` });
    }
    // For more complex commands, use OpenAI with optimized prompt
    const prompt = `Parse this canvas command into JSON:

Command: "${commandText}"

Examples:
- "create a circle" → {"type":"CREATE","action":"create_circle","parameters":{"shapeType":"circle","x":100,"y":100,"radius":50,"color":"#3B82F6"},"confidence":0.9}
- "add text saying Hello" → {"type":"CREATE","action":"create_text","parameters":{"shapeType":"text","x":100,"y":100,"text":"Hello","fontSize":16,"color":"#3B82F6"},"confidence":0.9}
- "create a red rectangle" → {"type":"CREATE","action":"create_rectangle","parameters":{"shapeType":"rect","x":100,"y":100,"w":100,"h":100,"color":"#EF4444"},"confidence":0.9}

Available types: CREATE, MOVE, DELETE, ALIGN
Available shapes: circle, rect, text, line
Available colors: #3B82F6, #EF4444, #10B981, #F59E0B, #8B5CF6

Return ONLY the JSON, no other text.`;
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 100, // Reduced from 200
        });
        const responseText = (_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
        if (!responseText) {
            throw new Error('No response from OpenAI');
        }
        // Parse the JSON response
        const parsed = JSON.parse(responseText);
        // Validate against schema
        const validated = CommandSchema.parse(parsed);
        console.log('🤖 OpenAI parsed command:', commandText, '→', validated);
        return Object.assign(Object.assign({}, validated), { timestamp: Date.now(), commandId: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` });
    }
    catch (error) {
        console.error('OpenAI parsing error:', error);
        throw new Error(`Failed to parse command: ${error instanceof Error ? error.message : String(error)}`);
    }
}
exports.aiCommand = (0, https_1.onCall)({
    cors: true, // Enable CORS for all origins (Firebase Functions v2 handles this automatically)
}, async (request) => {
    try {
        const { commandText, userId } = request.data;
        if (!commandText || !userId) {
            throw new https_1.HttpsError('invalid-argument', 'Command text and userId are required');
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
    }
    catch (error) {
        console.error('AI Command Function Error:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        // Handle parsing errors gracefully
        return {
            success: false,
            message: `Could not understand command: ${error instanceof Error ? error.message : String(error)}`,
            executedCommands: [],
            error: error instanceof Error ? error.message : String(error)
        };
    }
});
//# sourceMappingURL=aiCommand.js.map