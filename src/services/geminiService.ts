import { GoogleGenAI, Type } from "@google/genai";

function getAI() {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
  return new GoogleGenAI({ apiKey });
}

export interface Suggestion {
  label: string;
  tokens: string;
}

export interface PromptAnalysis {
  translatedPrompt: string;
  grammarIssues: string[];
  typos: { original: string; correction: string }[];
  optimizedPrompt: string;
  suggestions: Suggestion[];
  redundancies?: string[];
  troubleshooting?: string;
}

export type AnalysisMode = 'translator' | 'auditor' | 'vision' | 'troubleshooter' | 'personal';

export async function generatePromptFromImage(base64Image: string, mimeType: string, additionalIdea?: string): Promise<PromptAnalysis> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      },
      {
        text: `You are an expert Stable Diffusion prompt engineer specialized in EXACT camera angle detection.

Analyze this image deeply and create a professional Danbooru-style prompt (Rule34 tagging system).

${additionalIdea ? `ADDITIONAL USER IDEA TO INCORPORATE: "${additionalIdea}". Integrate naturally without changing existing pose or angle.` : ''}

MANDATORY CAMERA ANGLE ANALYSIS (paling penting!):
- FIRST, determine the EXACT camera viewpoint relative to the subject.
- Use these Danbooru tags ONLY if they match the visual evidence:
  • from below / low angle / worm's eye view / looking up / underboob / crotch focus (kalau kamera di bawah subjek)
  • from above / high angle / bird's eye view / overhead view (kalau kamera di atas)
  • eye level / dutch angle / extreme perspective / foreshortening
- Even if the character is upside-down or rotated, base the angle on where the CAMERA is, not the character's orientation.
- If belly, crotch, underboob, or underside is prominently visible → MUST use "from below", "low angle", "worm's eye view".
- NEVER default to "from above" unless the top of the head is the closest part to camera.

Provide a very detailed breakdown in this exact order:

1. CAMERA ANGLE & PERSPECTIVE (wajib ditulis dulu):
   → Describe the exact viewpoint + recommended Danbooru tags.

2. Subject & Anatomy: Precise body structure, anatomy, facial features, skin/fur texture, micro-expressions.

3. Pose & Action: Exact pose, finger placement, limb orientation, weight distribution.

4. Environment & Lighting: Background, atmospheric effects, volumetric lighting, rim light, etc.

5. Artistic Style & Technicals: Medium, style, rendering terms (subsurface scattering, unreal engine 5, 8k, etc.).

CRITICAL TAGGING RULES (harus ditaati 100%):
- Use high-frequency Danbooru/Rule34 tags that are semantically relevant.
- DO NOT add new fetishes or sexual themes not present.
- DO NOT change pose or angle unless explicitly requested in ADDITIONAL USER IDEA.
- Avoid redundant or conflicting tags.
- Only strengthen existing visual descriptions.

Final output must be in JSON format exactly as specified in the schema.`
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          translatedPrompt: { type: Type.STRING },
          grammarIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
          typos: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                correction: { type: Type.STRING }
              }
            }
          },
          optimizedPrompt: { type: Type.STRING },
          suggestions: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING, description: "Descriptive text of the suggestion" },
                tokens: { type: Type.STRING, description: "The actual Stable Diffusion tags/tokens for this suggestion" }
              },
              required: ["label", "tokens"]
            } 
          }
        },
        required: ["translatedPrompt", "grammarIssues", "typos", "optimizedPrompt", "suggestions"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function generatePersonalPromptFromImage(base64Image: string, mimeType: string, additionalIdea?: string): Promise<PromptAnalysis> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      },
      {
        text: `You are a specialized Stable Diffusion prompt architect. Your task is to analyze this image and reorganize the findings into a VERY SPECIFIC "Personal Structure" template with strict formatting.
       ${additionalIdea ? `ADDITIONAL CONTEXT/IDEA: "${additionalIdea}"` : ''}
       
       STRICT FORMATTING RULES:
       1. BREAK PLACEMENT: Every "BREAK" must be on its own line. Add a newline before and after every "BREAK".
       2. CHARACTER BLOCK COMMA: When multiple character parentheses blocks exist, they MUST be separated by a comma (e.g., "(block 1), (block 2)").
       3. CHARACTER BLOCK READABILITY: Each character block MUST appear on its own line.
       4. NO INLINE BREAK: Never output "BREAK" inline within a sentence.
       
       TEMPLATE LAYOUT (MUST FOLLOW EXACTLY):
       
       [QUALITY TAGS]
       masterpiece, best quality, ultra detailed, 8k, hires, vibrant colors, intricate details, semi-realistic, Niji_oil_anime style, <lora:null-ghost:0.8>
       
       BREAK
       
       [GROUP TAGS]
       Identify group descriptor (solo / duo / trio) and general tags like "anthro", "male focus", "female focus", etc.
       
       BREAK
       
       [CHARACTER BLOCKS]
       - If multiple characters (duo, 2boys, etc.), split into individual parentheses blocks.
       - Each block starts with 1boy or 1girl.
       - Each block is on its own line.
       - Separate blocks with a comma at the end of the line.
       
       BREAK
       
       [ENVIRONMENT / BACKGROUND]
       Identify background elements and lighting tags.
       
       BREAK
       
       [CAMERA / COMPOSITION]
       Identify camera angles and perspective tags. Add a dynamic description like "dynamic perspective emphasizing [key features]".
       
       RULES:
       1. Use Danbooru-style tags.
       2. The final "optimizedPrompt" MUST be the full formatted string with proper newlines and BREAK separators.
       3. "translatedPrompt" should be the raw English description of the image.
       
       Final output must be in JSON format exactly as specified in the schema.`
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          translatedPrompt: { type: Type.STRING },
          grammarIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
          typos: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                correction: { type: Type.STRING }
              }
            }
          },
          optimizedPrompt: { type: Type.STRING },
          suggestions: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                tokens: { type: Type.STRING }
              },
              required: ["label", "tokens"]
            } 
          }
        },
        required: ["translatedPrompt", "grammarIssues", "typos", "optimizedPrompt", "suggestions"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export interface RealtimeAssistance {
  recommendations: string[];
  warnings: string[];
  typos: { original: string; correction: string }[];
  correctedInput: string;
}

export async function getRealtimeAssistance(input: string): Promise<RealtimeAssistance> {
  if (!input || input.length < 5) return { recommendations: [], warnings: [], typos: [], correctedInput: '' };

  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `As a Stable Diffusion prompt assistant, analyze this partial input: "${input}"
        
        1. Provide 3-4 relevant next-word or contextual completions (e.g., "standing on the" -> "beach", "rooftop").
        2. Identify immediate redundancies or conflicting tags.
        3. Fix typos/grammar and provide a full "correctedInput" which is the user's input but with grammar and typos fixed. Keep it as close to the original intent as possible.
        
        Return JSON: { "recommendations": [], "warnings": [], "typos": [{ "original": "", "correction": "" }], "correctedInput": "" }`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
              warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
              typos: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    original: { type: Type.STRING },
                    correction: { type: Type.STRING }
                  }
                }
              },
              correctedInput: { type: Type.STRING }
            },
            required: ["recommendations", "warnings", "typos", "correctedInput"]
          }
        }
      });

      return JSON.parse(response.text || "{}");
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        console.error("Realtime assistance failed after retries:", error);
        return { recommendations: [], warnings: [], typos: [], correctedInput: input };
      }
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return { recommendations: [], warnings: [], typos: [], correctedInput: input };
}

export async function analyzeAndOptimizePrompt(input: string, mode: AnalysisMode = 'translator', additionalIdea?: string): Promise<PromptAnalysis> {
  const ai = getAI();
  let systemPrompt = "";
  
  if (mode === 'translator') {
    systemPrompt = `Analyze and optimize this Stable Diffusion prompt using Danbooru-style tagging (similar to Rule34). 
       Input: "${input}"
       ${additionalIdea ? `ADDITIONAL USER IDEA TO INCORPORATE: "${additionalIdea}". You MUST integrate this idea into the prompt naturally, matching the interactions and context.` : ''}
       Tasks:
       1. If the input is in Indonesian, translate it to professional English Stable Diffusion prompt style (comma-separated tags, descriptive).
       2. Identify grammar issues in the English version.
       3. Identify typos and provide corrections.
       4. Create a highly optimized version using high-frequency Danbooru tags and common SD keywords (e.g., "masterpiece", "highly detailed", "8k").
       
       CRITICAL TAGGING RULES:
       - Use tags that are semantically relevant to the input.
       - DO NOT add new fetishes or sexual themes.
       - DO NOT add or change the pose UNLESS explicitly requested by the ADDITIONAL USER IDEA.
       - Avoid redundant or conflicting tags.
       - Only strengthen existing visual descriptions.
       
        5. Provide suggestions for improvement. Each suggestion must include a label (description) and the actual tokens/tags to achieve it.`;
  } else if (mode === 'auditor') {
    systemPrompt = `Audit this existing Stable Diffusion prompt for errors and redundancies.
       Input: "${input}"
       ${additionalIdea ? `ADDITIONAL USER IDEA TO INCORPORATE: "${additionalIdea}". You MUST integrate this idea into the prompt naturally, matching the interactions and context.` : ''}
       Tasks:
       1. Identify typos and provide corrections.
       2. Identify grammar issues or awkward phrasing.
       3. Detect redundant or conflicting tags (e.g., "lying on back" and "lying on chair" in the same prompt).
       4. Suggest a cleaned-up, non-redundant version of the prompt.
       5. Provide specific suggestions to avoid "overcooking" or confusing the AI model. Each suggestion must include a label and the actual tokens/tags.`;
  } else if (mode === 'troubleshooter') {
    systemPrompt = `You are a Stable Diffusion expert consultant. The user is asking a question or reporting an issue with their generation results.
       User Question/Issue: "${input}"
       ${additionalIdea ? `CONTEXT/PROMPT USED: "${additionalIdea}"` : ''}
       
       Tasks:
       1. Analyze why the issue might be happening (e.g., prompt weight too low, conflicting tags, model limitations, missing keywords).
       2. Provide a clear, concise explanation in Indonesian of the root cause.
       3. Suggest specific prompt modifications or technical settings (like CFG scale, steps, or negative prompts) to fix the issue.
       4. Provide an "optimizedPrompt" that specifically addresses the user's complaint (e.g., if a character is missing, strengthen the character's tags and placement keywords).
       
       Return the result in JSON format with the following structure:
       {
         "translatedPrompt": "A brief summary of the issue in English",
         "grammarIssues": [],
         "typos": [],
         "optimizedPrompt": "The corrected/improved prompt to fix the issue",
         "suggestions": [
           { "label": "Technical tip description", "tokens": "actual, tags, or, settings" }
         ],
         "troubleshooting": "Penjelasan lengkap dalam bahasa Indonesia mengenai solusi masalah tersebut"
       }`;
  } else if (mode === 'personal') {
    systemPrompt = `You are a specialized Stable Diffusion prompt architect. Your task is to reorganize the input into a VERY SPECIFIC "Personal Structure" template with strict formatting.
       Input: "${input}"
       ${additionalIdea ? `ADDITIONAL CONTEXT: "${additionalIdea}"` : ''}
       
       STRICT FORMATTING RULES:
       1. BREAK PLACEMENT: Every "BREAK" must be on its own line. Add a newline before and after every "BREAK".
       2. CHARACTER BLOCK COMMA: When multiple character parentheses blocks exist, they MUST be separated by a comma (e.g., "(block 1), (block 2)").
       3. CHARACTER BLOCK READABILITY: Each character block MUST appear on its own line.
       4. NO INLINE BREAK: Never output "BREAK" inline within a sentence.
       
       TEMPLATE LAYOUT (MUST FOLLOW EXACTLY):
       
       [QUALITY TAGS]
       masterpiece, best quality, ultra detailed, 8k, hires, vibrant colors, intricate details, semi-realistic, Niji_oil_anime style, <lora:null-ghost:0.8>
       
       BREAK
       
       [GROUP TAGS]
       Identify group descriptor (solo / duo / trio) and general tags like "anthro", "male focus", "female focus", etc.
       
       BREAK
       
       [CHARACTER BLOCKS]
       - If multiple characters (duo, 2boys, etc.), split into individual parentheses blocks.
       - Each block starts with 1boy or 1girl.
       - Each block is on its own line.
       - Separate blocks with a comma at the end of the line.
       
       BREAK
       
       [ENVIRONMENT / BACKGROUND]
       Identify background elements and lighting tags.
       
       BREAK
       
       [CAMERA / COMPOSITION]
       Identify camera angles and perspective tags. Add a dynamic description like "dynamic perspective emphasizing [key features]".
       
       RULES:
       1. If input is Indonesian, translate to English tags first.
       2. Use Danbooru-style tags.
       3. The final "optimizedPrompt" MUST be the full formatted string with proper newlines and BREAK separators.
       
       Example Output for duo:
       masterpiece, best quality, ultra detailed, 8k, hires, vibrant colors, intricate details, semi-realistic, Niji_oil_anime style, <lora:null-ghost:0.8>
       
       BREAK
       
       duo, male focus, anthro
       
       BREAK
       
       (1boy, anthro wolf, muscular, standing, smirk),
       (1boy, anthro leopard, muscular, standing, smirk)
       
       BREAK
       
       grey simple background, rim lighting, cel shading
       
       BREAK
       
       low angle from below looking up, wide shot, dynamic perspective emphasizing muscular build and interaction`;
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: systemPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          translatedPrompt: { type: Type.STRING, description: "The English translation or the original prompt if already English" },
          grammarIssues: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          typos: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                correction: { type: Type.STRING }
              }
            }
          },
          optimizedPrompt: { type: Type.STRING, description: "The cleaned up or optimized version" },
          suggestions: {
            type: Type.ARRAY,
            items: { 
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                tokens: { type: Type.STRING }
              },
              required: ["label", "tokens"]
            }
          },
          redundancies: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of redundant or conflicting tags found"
          }
        },
        required: ["translatedPrompt", "grammarIssues", "typos", "optimizedPrompt", "suggestions"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}
