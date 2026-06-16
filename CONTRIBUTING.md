# Contributing to AI Image Generator

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Getting Started

### Prerequisites
- Node.js >= 18
- A DashScope, Gemini, or Volcengine API key

### Development Setup

```bash
# Clone the repository
git clone https://github.com/wenyinos/ai-image-generator.git
cd ai-image-generator

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your API keys

# Start the development server
npm run dev
```

The server starts at `http://localhost:3000`.

## Project Structure

```
ai-image-generator/
├── server.js                  # Express entry point
├── src/
│   ├── routes/                # API route handlers
│   │   ├── index.js           # Route aggregation
│   │   ├── generate.routes.js # Text-to-image endpoint
│   │   ├── imageToImage.routes.js # Image-to-image endpoint
│   │   ├── access.routes.js   # Access control endpoints
│   │   └── auth.throttle.js   # Brute-force protection
│   ├── providers/             # AI provider implementations
│   │   ├── index.js           # Provider factory
│   │   ├── dashscope.js       # Alibaba Cloud DashScope
│   │   ├── gemini.js          # Google Gemini
│   │   └── volcengine.js      # Volcengine Jimeng
│   ├── middleware/             # Express middleware
│   │   ├── auth.js            # Access control middleware
│   │   ├── cors.js            # CORS configuration
│   │   ├── errorHandler.js    # Error handling
│   │   ├── rateLimiter.js     # API rate limiting
│   │   └── upload.js          # File upload (multer)
│   └── utils/                 # Shared utilities
│       ├── config.js          # Environment config & model definitions
│       ├── logger.js          # Debug logging
│       ├── crypto.js          # Volcengine HMAC signing
│       ├── file.js            # File upload helpers
│       └── url.js             # URL construction
├── public/
│   ├── index.html             # Single-page UI
│   ├── app.js                 # Frontend logic (vanilla JS)
│   └── favicon/
├── jimeng-md/                 # Volcengine API reference docs (Chinese)
├── .env.example
├── README.md
├── README.zh.md
├── AGENTS.md
└── LICENSE
```

## How to Contribute

### Reporting Bugs
1. Check existing issues to avoid duplicates
2. Open a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment info (Node.js version, OS, provider)

### Suggesting Features
1. Open an issue with the `enhancement` label
2. Describe the use case and proposed solution
3. Wait for discussion before implementing

### Submitting Changes

1. **Fork** the repository
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** following the code style below
4. **Test manually** — there are no automated tests, so verify your changes work end-to-end
5. **Commit** with a clear message:
   ```bash
   git commit -m "feat: add support for new model X"
   ```
6. **Push** and open a **Pull Request**

### Commit Message Convention

Use conventional commits:
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation changes
- `refactor:` — Code refactoring (no behavior change)
- `style:` — Formatting, missing semicolons, etc.
- `chore:` — Maintenance tasks

## Code Style

### Backend (Node.js)
- Use `const` by default, `let` when reassignment is needed
- No semicolons (existing codebase doesn't use them consistently)
- Use JSDoc comments for exported functions
- Keep route handlers focused; extract validation to helper functions
- Follow existing error handling patterns (try/catch with appropriate HTTP status codes)

### Frontend (Vanilla JS)
- No frameworks — keep it vanilla JavaScript
- Follow existing patterns in `public/app.js`
- Use Bootstrap 5 classes for styling

### Adding a New Provider

1. Create `src/providers/yourprovider.js` with:
   - `generateTextToImage(opts)` — returns `string[]` (image URLs)
   - `generateImageToImage(opts)` — returns `string[]` (image URLs)
   - `normalizeModel(model)` — returns normalized model ID
2. Register in `src/providers/index.js` (add to `normalizeProvider` and `createProvider`)
3. Add model config to `MODEL_CONFIG` and `ALLOWED_SIZES_BY_MODEL` in `src/utils/config.js`
4. Update `README.md` and `README.zh.md`
5. Add environment variables to `.env.example`

### Adding a New Model

1. Add model entry to `MODEL_CONFIG` in `src/utils/config.js`
2. Add size constraints to `ALLOWED_SIZES_BY_MODEL` if applicable
3. Update the provider implementation if the model has special requirements
4. Update documentation

## Questions?

Open an issue for any questions about contributing.
