# HealthyMealAI

A web application that leverages artificial intelligence and user dietary preferences to automatically personalize recipes, calculate nutrition, and manage custom recipes.

## Table of Contents
1. [Tech Stack](#tech-stack)
2. [Getting Started Locally](#getting-started-locally)
3. [Available Scripts](#available-scripts)
4. [Project Scope](#project-scope)
5. [Project Status](#project-status)
6. [License](#license)

## Tech Stack
- Frontend: Next.js 15.3.1, React 19.0.0, TypeScript 5, MUI 7.0.2, Emotion
- Backend: Supabase (PostgreSQL with RLS, Auth, REST/GraphQL API)
- AI Integration: Openrouter.ai
- CI/CD & Hosting: GitHub Actions, DigitalOcean
- Node.js Version: 22.13.1 (managed via `.nvmrc`)

## Getting Started Locally
### Prerequisites
- Node.js v22.13.1 (install via nvm)
- A Supabase project (URL & ANON KEY)
- Openrouter.ai API key

### Installation
```bash
# Clone repository
git clone https://github.com/yourusername/your-repo.git
cd your-repo/frontend

# Install Node.js version and dependencies
nvm install
nvm use
npm install
```

### Configuration
Create a `.env.local` file in the `frontend` directory with the following variables:
```dotenv
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

### Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts
- `npm run dev`   : Start Next.js development server
- `npm run build` : Build the application for production
- `npm run start` : Start Next.js production server
- `npm run lint`  : Run ESLint checks

## Project Scope
### In Scope (MVP)
- Recipe input form with unlimited original text and modification instructions (limit 500 characters)
- AI-driven recipe personalization with response times ≤ 10 seconds
- Nutrition calculation (calories, macros) via external API
- Recipe management: save, view, delete, and revert to original
- User authentication (email/password) and authorization (RLS enforcement)
- User profile with free-text dietary preferences
- Error handling and user notifications

### Out of Scope (MVP)
- Importing recipes from external URLs
- Rich media support (images, videos)
- Sharing recipes with other users
- Social features (comments, likes, ratings)

## Project Status
⚙️ MVP in active development

## License
No license specified. Please add a `LICENSE` file to indicate licensing terms.
