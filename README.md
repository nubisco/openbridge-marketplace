# Openbridge Marketplace

Public plugin directory for [homebridge-\*](https://www.npmjs.com/search?q=homebridge-) and [openbridge-\*](https://www.npmjs.com/search?q=openbridge-) npm packages. Similar in concept to the VS Code Marketplace — browse, search, and rate plugins. Deployed at **marketplace.openbridge.nubisco.io**.

Running openbridge instances can also fetch the plugin list from the JSON API instead of querying npm directly, getting community ratings alongside install metadata.

## What it does

- **Plugin directory** — browse all homebridge-\* and openbridge-\* packages from npm, with download stats, version info, and descriptions
- **Search and sort** — full-text search, sort by most downloaded / top rated / recently updated
- **Ratings and reviews** — authenticated users can leave a star rating and written review; others can mark reviews as helpful
- **Email OTP auth** — passwordless sign-in; only needed to submit reviews (browsing is public)
- **JSON API** — running openbridge instances can query `GET /api/plugins` to get the plugin catalogue with ratings baked in
- **Automated crawler** — scheduled job crawls the npm registry every 6 hours and upserts plugin data into the database

## Architecture

```
openbridge-marketplace/
├── server/
│   ├── index.ts      — Hono HTTP server (API + SPA fallback)
│   ├── db.ts         — PostgreSQL connection + schema
│   └── crawler.ts    — npm registry crawler (homebridge-*, openbridge-*)
├── shared/
│   └── types.ts      — shared TypeScript types (Plugin, Review, npm API shapes)
└── src/              — Vue 3 frontend (served as SPA)
    ├── main.ts
    ├── router/
    ├── layouts/DefaultLayout.vue
    ├── views/
    │   ├── HomeView.vue    — plugin grid, search, sort, pagination
    │   └── PluginView.vue  — plugin detail, reviews, star rating form
    └── styles/
```

**Stack:**

- Runtime: [Bun](https://bun.sh)
- HTTP server: [Hono](https://hono.dev)
- Database: PostgreSQL (via `pg`)
- Frontend: Vue 3 + @nubisco/ui + Vite
- Deployment: Docker → NAS (arm64 + amd64)

## API

### Public endpoints (no auth required)

| Method | Path                 | Description                                                                           |
| ------ | -------------------- | ------------------------------------------------------------------------------------- |
| `GET`  | `/api/plugins`       | List plugins. Params: `q`, `sort` (`downloads`\|`rating`\|`updated`), `page`, `limit` |
| `GET`  | `/api/plugins/:name` | Plugin detail + reviews                                                               |
| `GET`  | `/api/stats`         | `{ plugin_count, review_count }`                                                      |

### Auth

| Method | Path                   | Description                                              |
| ------ | ---------------------- | -------------------------------------------------------- |
| `POST` | `/api/auth/otp/send`   | Send OTP to email. Body: `{ email }`                     |
| `POST` | `/api/auth/otp/verify` | Verify code, set session cookie. Body: `{ email, code }` |
| `POST` | `/api/auth/logout`     | Clear session                                            |

### Reviews (auth required)

| Method | Path                         | Description                              |
| ------ | ---------------------------- | ---------------------------------------- |
| `POST` | `/api/plugins/:name/reviews` | Submit review. Body: `{ rating, body? }` |
| `POST` | `/api/reviews/:id/helpful`   | Mark review as helpful                   |

### Admin (auth required, admin role)

| Method | Path              | Description                |
| ------ | ----------------- | -------------------------- |
| `POST` | `/api/admin/sync` | Trigger manual crawler run |

## Local development

```bash
# 1. Copy env file
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET

# 2. Start PostgreSQL (or use docker compose for just the DB)
docker compose up db -d

# 3. Install dependencies
bun install

# 4. Run the crawler to populate the database
bun run dev:crawler

# 5. Start Vite dev server (frontend)
bun run dev

# 6. In a separate terminal, start the API server
bun run dev:server
```

Vite proxies `/api/*` to the Hono server (configured in `vite.config.ts`).

## Deployment

The CI → Release → Deploy chain runs automatically on every merge to `master`:

1. **CI** — lint, format check, typecheck, build
2. **Release** — semantic-release bumps `package.json` version, generates CHANGELOG, creates GitHub release
3. **Deploy** — builds multi-arch Docker image (`linux/amd64`, `linux/arm64`), pushes to `ghcr.io/nubisco/openbridge-marketplace:{version,latest}`, then SSHes to the NAS and runs `docker compose pull && docker compose up -d`

### First-time NAS setup

```bash
# On the NAS
mkdir -p /volume1/docker/openbridge-marketplace
cd /volume1/docker/openbridge-marketplace
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, POSTGRES_PASSWORD
docker compose up -d
```

**Required GitHub Actions secrets:**

| Secret        | Description                |
| ------------- | -------------------------- |
| `NAS_HOST`    | NAS hostname or IP         |
| `NAS_USER`    | SSH username               |
| `NAS_SSH_KEY` | Private key for SSH access |

## openbridge integration

Running openbridge instances can replace their npm registry calls with:

```
GET https://marketplace.openbridge.nubisco.io/api/plugins?sort=downloads&limit=250
```

The response includes `rating_avg` and `rating_count` per plugin, giving users community signal directly in the openbridge UI.
