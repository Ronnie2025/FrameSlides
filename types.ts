
export enum SlideType {
  COVER = 'COVER',
  CONTENT = 'CONTENT',
  ENDING = 'ENDING',
}

export interface SlideContent {
  id: string;
  type: SlideType;
  title: string;
  subtitle?: string; // For cover
  points?: string[]; // For content
  visualDescription: string; // Specific details for this slide
  globalStyle?: string; // SHARED design system for the whole deck
  imageUrl?: string; // The generated base64 image
  isGenerating: boolean;
  isRegenerating?: boolean;
  error?: string; // For tracking generation errors
  htmlContent?: string; // For HTML mode
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Session {
  id: string;
  title: string;
  lastModified: number;
  messages: ChatMessage[];
  slides: SlideContent[];
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING', // Breaking down content
  GENERATING = 'GENERATING', // Creating images
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
}

export interface Settings {
  apiKey?: string;
  googleClientId?: string;
  analysisPrompt?: string;
  imagePrompt?: string;
  htmlPrompt?: string;
  concurrencyLimit?: number;
  generationMode?: 'image' | 'html';
}

export interface User {
  name: string;
  email: string;
  picture: string;
}
