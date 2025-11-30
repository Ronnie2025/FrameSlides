import { get, set } from 'idb-keyval';
import { Settings } from '../types';

const SETTINGS_KEY = 'mintgen_settings';

export const defaultSettings: Settings = {
    apiKey: '',
    analysisPrompt: `You are an expert presentation designer for PPT.
    
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
    - **VISUALS**: The \`visualDescription\` MUST be in **English** (for better image generation model understanding). It should describe the SPECIFIC imagery for that slide (e.g., "A futuristic city with data streams", "A minimal icon of a cat").`,
    imagePrompt: `Create a 16:9 Presentation Slide Image.
    
    === VISUAL STYLE (Background & Layout) ===
    Global Style: {{globalStyle}}
    Specific Scene: {{visualDescription}}
    
    === TEXT RENDERING INSTRUCTIONS ===
    1. Render the text provided in the [TEXT CONTENT] block.
    2. Language: **Simplified Chinese**.
    3. Font: Modern, Bold, Sans-serif (supports Chinese characters).
    4. Layout: Ensure high contrast between text and background.
    5. Do NOT render label words like "TITLE", "HEADER", "BULLET POINTS", "TEXT CONTENT". Only render the values.
    
    {{textContentBlock}}
    
    {{modificationContext}}
    
    === NEGATIVE PROMPT ===
    Do not render complex code blocks, JSON syntax, or system instructions on the slide.
    Do not render blurry text.
    Do not render English placeholders if Chinese text is provided.`,
    htmlPrompt: `
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
    `,
    concurrencyLimit: 3,
    generationMode: 'image'
};

export const saveSettings = async (settings: Settings): Promise<void> => {
    try {
        await set(SETTINGS_KEY, settings);
    } catch (error) {
        console.error('Failed to save settings:', error);
    }
};

export const loadSettings = async (): Promise<Settings> => {
    try {
        const settings = await get<Settings>(SETTINGS_KEY);
        // Use env var as default for googleClientId if not set in local storage
        const envClientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;

        // Merge defaults, then loaded settings, then force env var if loaded setting is empty
        const merged = { ...defaultSettings, ...settings };
        if (!merged.googleClientId && envClientId) {
            merged.googleClientId = envClientId;
        }
        return merged;
    } catch (error) {
        console.error('Failed to load settings:', error);
        return defaultSettings;
    }
};
