# ROR CORS Test

Angular app to test CORS behavior against the [ROR API v2](https://ror.readme.io/v2/docs/api-v2).

## Tests

- **Simple requests** — GET, HEAD, OPTIONS (no preflight)
- **Preflight with allowed headers** — Content-Type, Authorization
- **Preflight with blocked headers** — Custom headers not in server's allowlist
- **Write operations** — POST, PUT, DELETE (require authentication)

## Run locally

```bash
npm install
npm start
```

Open http://localhost:4200
