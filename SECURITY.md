# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| Latest on `main` | ✅ |
| Older commits | ❌ |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email the maintainer or use GitHub's private vulnerability reporting
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

You can expect an initial response within 72 hours.

## Security Considerations

### API Key Handling
- API keys can be provided via the frontend UI or server-side `.env`
- Frontend-provided keys are sent in request bodies and are **never stored server-side**
- `.env` file is gitignored and should never be committed
- Volcengine credentials use `AK:SK` format; session tokens are optional

### Frontend Access Control
When `FRONTEND_ACCESS_CONTROL_ENABLED=true`:
- Visitors must enter `FRONTEND_ACCESS_KEY` before accessing the app
- Auth is cookie-based (HttpOnly, SameSite=Lax, 7-day expiry)
- Brute-force protection: IP is locked after `ACCESS_AUTH_MAX_ATTEMPTS` failures within `ACCESS_AUTH_WINDOW_MS`
- Lock duration: `ACCESS_AUTH_LOCK_MS` (default 15 minutes)
- Cookie is signed with `ACCESS_COOKIE_SECRET` (auto-generated if unset; set a fixed value for persistence across restarts)

### Network Security
- CORS is configurable via `CORS_ORIGIN` (comma-separated allowlist)
- API rate limiting is enabled by default (30 requests per 60 seconds per IP)
- Volcengine requires `PUBLIC_BASE_URL` for image URLs — ensure this points to your actual public domain

### Upload Security
- File uploads are limited to 10MB (client-side compression applied)
- Only image files are accepted
- Uploaded files are stored in `public/uploads/` and auto-cleaned after 5 minutes
- Multer handles file type validation

### Production Recommendations
- Always set `ACCESS_COOKIE_SECRET` to a fixed random value
- Use HTTPS (via reverse proxy like Nginx)
- Set `CORS_ORIGIN` to your actual domain(s)
- Set `PUBLIC_BASE_URL` to your public-facing URL
- Do not expose the server directly — use a reverse proxy
- Monitor rate limit logs for abuse

## Disclosure Policy

We follow coordinated disclosure. Please allow time for a fix before public disclosure.
