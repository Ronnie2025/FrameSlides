# FrameSlides - AI Presentation Generator

FrameSlides is a next-generation AI presentation tool that transforms your ideas into visual slides instantly. It leverages Nano Banana Pro and Gemini models to generate both high-quality image slides and modern HTML-based slide designs.

## ✨ Key Features

### 🎨 Dual Generation Modes
- **Image Mode**: Uses Gemini's image generation capabilities to create visually striking, artistic slides.
- **HTML Mode**(test): Uses Gemini Pro to generate clean, responsive, and editable HTML/Tailwind CSS slides. Features a distinct **Indigo** theme and simulates a 1280x720 canvas for perfect layout scaling.

### 🚀 High Performance
- **Parallel Generation**: Generate up to 5 slides simultaneously with configurable concurrency settings.
- **Smart Session Management**: Auto-renames sessions based on content and prevents duplicate empty sessions.

### 💎 Premium UI/UX
- **Modern Aesthetic**: Clean, distraction-free interface with Slate (Image Mode) and Indigo (HTML Mode) themes.
- **Interactive Chat**: Resizable chat column, message copy functionality, and smooth animations.
- **Guest Mode**: Try the app instantly without logging in.

### 🔒 Secure & Configurable
- **Environment Variables**: API keys and Client IDs are managed securely via `.env.local`.
- **Customizable Prompts**: Fine-tune the AI's behavior with separate prompts for Analysis, Image Generation, and HTML Design.

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS
- **AI**: Google Gemini API (Gemini 1.5 Pro, Gemini 1.5 Flash)
- **Auth**: Google Identity Services
- **Icons**: Lucide React

## 🚀 Getting Started

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Ronnie2025/FrameSlides.git
    cd FrameSlides
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env.local` file in the root directory:
    ```env
    GEMINI_API_KEY=your_gemini_api_key_here
    VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
    ```

4.  **Run Locally**
    ```bash
    npm run dev
    ```

## 📝 License

MIT License
