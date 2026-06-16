# GitHub Copilot Instructions — AI Image Generator

## Project Summary
An AI image generation web application supporting text-to-image and image-to-image workflows across multiple providers (DashScope, Gemini, Volcengine Jimeng).

## Tech Stack
- **Runtime**: Node.js >= 18
- **Framework**: Express.js (no TypeScript, no build step)
- **Frontend**: Bootstrap 5 + vanilla JavaScript
- **Module System**: CommonJS (`require` / `module.exports`)

## File Layout
- `server.js` — App entry point
- `src/routes/` — Express route handlers
- `src/providers/` — AI provider integrations
- `src/middleware/` — Express middleware
- `src/utils/` — Config, logging, crypto, file helpers
- `public/` — Static frontend files

## Coding Guidelines

### General
- Plain JavaScript, no TypeScript
- CommonJS modules, not ES modules
- Use `const`/`let`, avoid `var`
- Prefer async/await over raw promises
- Handle errors with try/catch, return appropriate HTTP status codes

### Backend Patterns
- Route validation at the top of handlers, return 400 for bad input
- Use `src/utils/logger.js` `log()` for debug output (gated by `DEBUG` env var)
- Provider functions return `string[]` of image URLs
- Errors shaped as `{ error: "message" }`

### Frontend Patterns
- Vanilla JS only — no frameworks, no modules, no build
- Bootstrap 5 for layout and components
- Fetch API for HTTP requests
- All logic in `public/app.js`

### Volcengine Specifics
- Credentials: `AK:SK` or `AK:SK:SessionToken`
- Image URLs must be public HTTP(S), no `data:` URLs
- HMAC-SHA256 signing via `src/utils/crypto.js`
- Async pattern: submit task → poll for result

## Environment Variables
Key variables are documented in `.env.example`. Loaded via `dotenv` at startup in `src/utils/config.js`.

## Documentation
- `README.md` — English docs
- `README.zh.md` — Chinese docs
- `AGENTS.md` — Architecture guide for AI agents
- `llms.txt` — LLM-friendly project summary
- `llms-full.txt` — Full documentation for LLMs
