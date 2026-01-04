# KoreLang

A professional Integrated Development Environment (IDE) for constructed languages.

## 🚀 Quick Start

Follow these steps to set up the project locally:

### 1. Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (v18 or higher) installed.

### 2. Installation

Clone the repository and install dependencies:

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory (or use `.env.local`) and add your preferred AI provider keys. Gemini remains the default provider, but you can switch to OpenRouter in **Settings → General**.

```env
VITE_GEMINI_API_KEY=your_gemini_key_here
# Optional OpenRouter support
VITE_OPENROUTER_API_KEY=your_openrouter_key_here
VITE_OPENROUTER_ENDPOINT=https://openrouter.ai/api/v1/chat/completions
VITE_OPENROUTER_MODEL=google/gemma-2-9b-it
# Used for the Referer/X-Title headers required by OpenRouter
VITE_APP_URL=http://localhost:3000
VITE_APP_NAME=KoreLang
```

### 4. Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### 5. Build for Production

To create an optimized production build:

```bash
npm run build
```

The output will be in the `dist/` directory.

## 🛠 Tech Stack

- **React 18** with **TypeScript**
- **Vite** (Build tool)
- **Tailwind CSS** (Styling)
- **Lucide React** (Icons)
- **Google Generative AI SDK** (@google/generative-ai)
- **Recharts** (Visualizations)

## 📁 Project Structure

- `/src`: Application source code
  - `/components`: UI components
  - `/services`: API and business logic
  - `/types.ts`: TypeScript definitions
  - `/i18n.tsx`: Internationalization logic
- `/public`: Static assets
- `index.html`: Entry point
- `vite.config.ts`: Vite configuration
- `tailwind.config.js`: Tailwind styling configuration