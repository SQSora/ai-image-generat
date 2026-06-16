# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - 2026-04-28

### Added
- Text-to-image generation with multi-provider support (DashScope, Gemini, Volcengine)
- Image-to-image transformation with drag-and-drop upload
- Volcengine Jimeng integration with HMAC-SHA256 signing
  - Text-to-image models: jimeng-3.0, jimeng-3.1, jimeng-4.0, jimeng-4.6
  - Image-to-image models: jimeng-3.0-i2i, jimeng-upscale, jimeng-inpainting, jimeng-material-product, jimeng-material-pod
- DashScope model support (16 models including wan2.7-image-pro, qwen-image-2.0-pro, etc.)
- Gemini image generation (gemini-2.5-flash-image)
- Client-side image compression for uploads (max 10MB)
- Upload progress indicator
- Reference strength slider for image-to-image
- Optional frontend access control with brute-force protection
- API rate limiting (per-IP, in-memory)
- CORS allowlist support
- Configurable timeouts per provider
- Nginx reverse proxy documentation
- Bilingual documentation (English + Chinese)
- AI agent documentation (AGENTS.md)
- LLM discovery files (llms.txt, llms-full.txt)
