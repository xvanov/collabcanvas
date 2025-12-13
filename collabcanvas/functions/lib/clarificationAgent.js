"use strict";
/**
 * Clarification Agent Cloud Function
 * Handles the clarification chat for scope understanding
 */
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.clarificationAgent = void 0;
const https_1 = require("firebase-functions/v2/https");
const openai_1 = require("openai");
const dotenv = require("dotenv");
const path = require("path");
// Load environment variables
const envPath = path.resolve(process.cwd(), '.env');
const envResult = dotenv.config({ path: envPath, override: true });
const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV !== 'production';
const apiKeyFromEnv = (_a = envResult.parsed) === null || _a === void 0 ? void 0 : _a.OPENAI_API_KEY;
const apiKeyFromProcess = process.env.OPENAI_API_KEY;
const apiKey = (isEmulator && apiKeyFromEnv) ? apiKeyFromEnv : (apiKeyFromProcess || apiKeyFromEnv || '');
const openai = new openai_1.OpenAI({ apiKey });
if (!apiKey) {
    console.warn('⚠️ OPENAI_API_KEY not found. Clarification agent will not work.');
}
// System prompt for the clarification agent
const CLARIFICATION_SYSTEM_PROMPT = `You are a construction estimation assistant helping to clarify project scope.
Your role is to:
1. Understand the user's project description
2. Ask targeted clarifying questions to fill in missing details
3. Extract structured data from the conversation

Key information to gather:
- Project type (kitchen remodel, bathroom remodel, addition, etc.)
- Location (full address with city, state, zip)
- Square footage and room dimensions
- Finish level (budget, mid-range, high-end, luxury)
- Special requirements or constraints
- Timeline and flexibility
- What's included vs excluded from scope

Be conversational but efficient. Ask 2-3 questions at a time maximum.
When you have enough information, indicate that clarification is complete.

Format your response as JSON:
{
  "message": "Your conversational response to the user",
  "questions": ["Question 1?", "Question 2?"],
  "extractedData": { ... any data extracted from this exchange ... },
  "clarificationComplete": false,
  "completionReason": null
}

When clarification is complete, set clarificationComplete to true and provide a completionReason.`;
exports.clarificationAgent = (0, https_1.onCall)({
    cors: true,
    secrets: ['OPENAI_API_KEY'],
    timeoutSeconds: 60,
}, async (request) => {
    var _a, _b;
    try {
        const data = request.data;
        const { scopeText, conversationHistory, userMessage } = data;
        if (!scopeText) {
            throw new https_1.HttpsError('invalid-argument', 'Scope text is required');
        }
        // Build conversation messages for OpenAI
        const messages = [
            { role: 'system', content: CLARIFICATION_SYSTEM_PROMPT },
            { role: 'user', content: `Initial scope description:\n${scopeText}` },
        ];
        // Add conversation history
        for (const msg of conversationHistory) {
            messages.push({
                role: msg.role,
                content: msg.content,
            });
        }
        // Add current user message
        if (userMessage) {
            messages.push({ role: 'user', content: userMessage });
        }
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages,
            temperature: 0.7,
            max_tokens: 1000,
            response_format: { type: 'json_object' },
        });
        const responseText = (_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content;
        if (!responseText) {
            throw new Error('No response from OpenAI');
        }
        const response = JSON.parse(responseText);
        return Object.assign({ success: true }, response);
    }
    catch (error) {
        console.error('Clarification Agent Error:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        return {
            success: false,
            message: 'I encountered an error. Please try again.',
            questions: [],
            extractedData: {},
            clarificationComplete: false,
            completionReason: null,
            error: error instanceof Error ? error.message : String(error),
        };
    }
});
//# sourceMappingURL=clarificationAgent.js.map