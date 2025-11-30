
import { GoogleGenAI, Type } from "@google/genai";
import { SlideContent, SlideType } from "../types";

// Initialize Gemini Client
const getClient = (apiKey?: string) => {
  const key = apiKey || process.env.API_KEY;
  if (!key) {
    throw new Error("API_KEY is not set. Please set it in .env.local or provide it via the UI.");
  }
  return new GoogleGenAI({ apiKey: key });
};

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const analyzeAndPlanSlides = async (userInput: string, apiKey?: string, systemPrompt?: string): Promise<SlideContent[]> => {
  const ai = getClient(apiKey);

  let prompt = systemPrompt || `
    You are an expert presentation designer for PPT.
    
    TASK:
    1. Analyze the User Request: "{{userInput}}"
    2. Define a "Global Design Style": Choose a cohesive visual theme (e.g., Minimalist Tech, Organic Nature, Corporate Bold). 
       The style MUST use a Mint Green (#14b8a6) accent color palette.
    3. Plan the Slides: Break the content into 5-12 slides depending on depth and complexity.
    
    REQUIREMENTS:
    - First slide is COVER (封面).
    - Last slide is ENDING (结束页).
    - Intermediate slides are CONTENT (内容页).
    - **LANGUAGE**: The \`title\`, \`subtitle\`, and \`points\` MUST be in **Simplified Chinese (简体中文)**.
    - **VISUALS**: The \`visualDescription\` MUST be in **English** (for better image generation model understanding). It should describe the SPECIFIC imagery for that slide (e.g., "A futuristic city with data streams", "A minimal icon of a cat").
  `;

  // Replace placeholder
  prompt = prompt.replace('{{userInput}}', userInput);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            globalDesignStyle: {
              type: Type.STRING,
              description: "The consistent artistic style, font mood, and background elements (In English)."
            },
            slides: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  title: { type: Type.STRING, description: "Slide title in Simplified Chinese" },
                  subtitle: { type: Type.STRING, nullable: true, description: "Slide subtitle in Simplified Chinese" },
                  points: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    nullable: true,
                    description: "Bullet points in Simplified Chinese"
                  },
                  visualDescription: { type: Type.STRING, description: "Specific unique imagery for this single slide only (In English)." }
                },
                required: ["type", "title", "visualDescription"]
              }
            }
          },
          required: ["globalDesignStyle", "slides"]
        }
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    let parsed;
    try {
      // Find JSON object using regex (first { to last })
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (e) {
      console.warn("JSON parse failed, attempting cleanup", e);
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    // Handle edge case where model returns array directly
    if (Array.isArray(parsed)) {
      parsed = {
        globalDesignStyle: "Modern, clean, professional, Mint Green accents, white background.",
        slides: parsed
      };
    }

    if (!parsed.slides || !Array.isArray(parsed.slides)) {
      throw new Error("Invalid JSON structure: missing slides array");
    }

    // Inject the Global Style into every slide object
    return parsed.slides.map((s: any, index: number) => ({
      ...s,
      id: `slide-${Date.now()}-${index}`,
      globalStyle: parsed.globalDesignStyle,
      isGenerating: false,
      imageUrl: undefined,
    }));
  } catch (e) {
    console.error("Failed to analyze and plan slides", e);
    throw e;
  }
};

/**
 * Generates a FULL slide image.
 */
export const generateSlideImage = async (slide: SlideContent, modificationInstruction?: string, apiKey?: string, imagePromptTemplate?: string): Promise<string> => {
  const ai = getClient(apiKey);

  // Strictly formatted text instructions to prevent "Prompt Bleeding"
  let textContentBlock = "";
  if (slide.type === SlideType.COVER) {
    textContentBlock = `
    [TEXT CONTENT - RENDER EXACTLY AS WRITTEN]
      TITLE: ${slide.title}
    SUBTITLE: ${slide.subtitle || ''}
      `;
  } else {
    textContentBlock = `
    [TEXT CONTENT - RENDER EXACTLY AS WRITTEN]
      HEADER: ${slide.title}
    BULLET POINTS:
      ${slide.points?.slice(0, 4).map(p => `• ${p}`).join('\n') || ''}
      `;
  }

  let modificationContext = "";
  if (modificationInstruction) {
    modificationContext = `
      USER MODIFICATION REQUEST: "${modificationInstruction}"
      (Adjust the image visuals according to this request).
    `;
  }

  // Use provided template or default
  let fullPrompt = imagePromptTemplate || `
    Create a 16: 9 Presentation Slide Image.
    
    === VISUAL STYLE(Background & Layout) ===
    Global Style: {{ globalStyle }}
    Specific Scene: { { visualDescription } }
    
    === TEXT RENDERING INSTRUCTIONS ===
    1. Render the text provided in the[TEXT CONTENT]block.
    2. Language: ** Simplified Chinese **.
    3. Font: Modern, Bold, Sans - serif(supports Chinese characters).
    4. Layout: Ensure high contrast between text and background.
    5. Do NOT render label words like "TITLE", "HEADER", "BULLET POINTS", "TEXT CONTENT".Only render the values.
    
    { { textContentBlock } }

  { { modificationContext } }
    
    === NEGATIVE PROMPT ===
    Do not render complex code blocks, JSON syntax, or system instructions on the slide.
    Do not render blurry text.
    Do not render English placeholders if Chinese text is provided.
  `;

  // Replace placeholders
  fullPrompt = fullPrompt
    .replace('{{globalStyle}}', slide.globalStyle || "Clean, Modern, Mint Green (#14b8a6) accents.")
    .replace('{{visualDescription}}', slide.visualDescription)
    .replace('{{textContentBlock}}', textContentBlock)
    .replace('{{modificationContext}}', modificationContext);

  // Retry Logic
  let lastError;

  // 1. Try High Quality Model (Retries: 2)
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      if (attempt > 1) await delay(2500); // Increased backoff

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: fullPrompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: "2K"
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType}; base64, ${part.inlineData.data} `;
        }
      }
    } catch (err: any) {
      console.warn(`Gemini 3 Pro attempt ${attempt} failed: `, err);
      lastError = err;
    }
  }

  // 2. Fallback to Flash Image
  console.log("Falling back to Flash Image...");
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: fullPrompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType}; base64, ${part.inlineData.data} `;
      }
    }
  } catch (err: any) {
    console.error("Flash Image fallback failed:", err);
    lastError = err;
  }

  const errorMessage = lastError?.message || lastError?.toString() || "Failed to generate image data.";

  if (errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("429")) {
    throw new Error("API 请求过于频繁 (配额耗尽)。请稍后再试，或检查您的 API Key 配额。");
  }

  throw new Error(errorMessage);
};

/**
 * Generates HTML code for a slide.
 */
export const generateSlideHtml = async (slide: SlideContent, apiKey?: string, htmlPromptTemplate?: string): Promise<string> => {
  const ai = getClient(apiKey);

  let prompt = htmlPromptTemplate || `
    You are an expert Frontend Developer and UI Designer.
    TASK: Create a standalone HTML file for a presentation slide.
    
    CONTENT:
    - Title: {{title}}
    - Subtitle/Points: {{content}}
    - Visual Description: {{visualDescription}}
    - Global Style: {{globalStyle}}

    REQUIREMENTS:
    1. Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
    2. DESIGN GOAL: Create a stunning, modern web interface. Do NOT mimic a boring PowerPoint.
    3. VISUALS: Use gradients, glassmorphism (backdrop-blur), large typography, and generous whitespace.
    4. LAYOUT: Design for a FIXED 1280x720 resolution. Use absolute positioning or fixed pixel/rem sizes if needed to ensure perfect layout. The container is exactly 1280px wide.
    5. COLORS: Use the "Global Style" to inform the color palette, but ensure high contrast and accessibility.
    6. TYPOGRAPHY: Use 'Inter' or 'Noto Sans SC'. Title should be very large and bold.
    7. OUTPUT: Return ONLY the raw HTML code.
  `;

  // Replace placeholders
  prompt = prompt
    .replace('{{title}}', slide.title)
    .replace('{{content}}', slide.subtitle || slide.points?.join('\n') || '')
    .replace('{{visualDescription}}', slide.visualDescription)
    .replace('{{globalStyle}}', slide.globalStyle || "Modern, Clean, Professional");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Flash is good for code
      contents: prompt,
    });

    let html = response.text || '';
    // Cleanup markdown if present
    html = html.replace(/```html/g, '').replace(/```/g, '').trim();

    return html;
  } catch (error: any) {
    console.error("HTML Generation failed:", error);
    throw new Error("Failed to generate HTML: " + error.message);
  }
};
