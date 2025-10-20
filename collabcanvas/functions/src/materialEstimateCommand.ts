import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

/**
 * Material Estimation AI Command
 * Uses OpenAI to parse natural language requests for construction material estimation
 */
export const materialEstimateCommand = onCall({
  cors: true, // Enable CORS for all origins
  maxInstances: 10,
  memory: '512MiB', // Increase memory for GPT-4o Vision
  secrets: ['OPENAI_API_KEY'], // Grant access to OpenAI API key secret
}, async (request) => {
  try {
    const { userMessage, context, planImageUrl } = request.data;
    
    if (!userMessage) {
      throw new HttpsError('invalid-argument', 'User message is required');
    }

    // If there's a plan image and the query is about analyzing the plan, use vision
    if (planImageUrl && isVisionQuery(userMessage)) {
      return await processVisionQuery(userMessage, planImageUrl);
    }

    // Build context for OpenAI (text-only)
    const systemPrompt = `You are a construction material estimation expert. Parse user requests into structured specifications.

Available options:
- Framing: lumber (16" or 24" spacing) OR metal (16" or 24" spacing)
- Surface: drywall (1/2" or 5/8") OR frp (0.090" or 0.120" panels)
- Insulation: none, batt (R-13/R-15/R-19), spray-foam, rigid-foam
- Wall height: 8ft (residential), 10ft (commercial), or custom
- Finish: paint (0-3 coats) or none
- Openings: number of doors and windows

Parse the user's message and return JSON with the specifications they mentioned.
If they say "remove X" or "no X", set include: false for that category.
If they mention multiple specs in one message, extract all of them.

Examples:
"metal framing with FRP panels, 10 feet" → {framing: {type: "metal", spacing: 16}, surface: {type: "frp", thickness: "0.090\\"", includeDrywall: true}, height: 10}
"remove drywall" → {surface: {includeDrywall: false}}
"add R-19 insulation" → {insulation: {type: "batt", rValue: 19}}
"12 foot walls with lumber 24 inch spacing" → {height: 12, framing: {type: "lumber", spacing: 24}}

Return ONLY the JSON object with fields they specified, nothing else.`;

    const userPrompt = context ? 
      `Current context: ${JSON.stringify(context)}\n\nUser message: "${userMessage}"` :
      `User message: "${userMessage}"`;

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const specifications = JSON.parse(responseText);
    
    console.log('🤖 OpenAI parsed specifications:', specifications);

    return {
      success: true,
      specifications,
      needsClarification: false,
      message: 'Specifications parsed successfully',
    };

  } catch (error) {
    console.error('Material Estimate AI Error:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: `Failed to parse request: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
});

/**
 * Check if query requires vision analysis
 */
function isVisionQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  const visionKeywords = [
    'how many doors', 'how many windows', 'count doors', 'count windows',
    'identify rooms', 'what rooms', 'analyze plan', 'look at plan',
    'find doors', 'find windows', 'in the plan', 'from the plan',
    'based on plan', 'based on the plan', 'see in the plan',
    'doors in', 'windows in', 'number of doors', 'number of windows'
  ];
  
  return visionKeywords.some(kw => lowerQuery.includes(kw));
}

/**
 * Process vision-based queries using GPT-4 Vision
 */
async function processVisionQuery(
  userMessage: string,
  imageUrlOrBase64: string
): Promise<{
  success: boolean; 
  visionAnalysis?: Record<string, unknown>; 
  message?: string; 
  specifications?: Record<string, unknown>; 
  error?: string
}> {
  try {
    const systemPrompt = `You are a construction plan analyzer. Analyze the floor plan image and answer the user's question.

Focus on:
- Counting doors and windows accurately
- Identifying room types
- Measuring approximate dimensions (if visible)
- Noting special features

For door/window counts, return JSON with:
{
  "doors": number,
  "windows": number,
  "rooms": ["room type", ...],
  "answer": "natural language answer to user",
  "materialImpact": {
    "doors": number (for trim calculation),
    "windows": number (for trim calculation)
  }
}

IMPORTANT: Count ALL doors including:
- Interior doors
- Exterior doors  
- Double doors (count as 2)
- Closet doors`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: systemPrompt 
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: userMessage },
            { 
              type: 'image_url', 
              image_url: { 
                url: imageUrlOrBase64,
                detail: 'high' // High detail for better door/window counting
              } 
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI Vision');
    }

    const result = JSON.parse(responseText);
    
    console.log('👁️ Vision AI analyzed plan:', result);

    return {
      success: true,
      visionAnalysis: result,
      message: result.answer || 'Analysis complete',
      specifications: result.materialImpact || {},
    };

  } catch (error) {
    console.error('Vision query error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: 'Failed to analyze plan image',
    };
  }
}


