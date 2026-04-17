## [1.5.1](https://github.com/nubisco/openbridge-marketplace/compare/v1.5.0...v1.5.1) (2026-04-17)


### Bug Fixes

* **ci:** disable git hooks in release workflow ([7d8899e](https://github.com/nubisco/openbridge-marketplace/commit/7d8899e0936956d06cfa39ab6d21c5db579974a9))
* **ci:** regenerate bun.lock after dependency changes ([db36a55](https://github.com/nubisco/openbridge-marketplace/commit/db36a5544b76723cae22bb2c1efa9e1e4d9ac020))
* prevent concurrent crawls and reduce API rate limiting ([13b99f2](https://github.com/nubisco/openbridge-marketplace/commit/13b99f2fadee54cbbffcf07befe910401d13e8bb))

# [1.5.0](https://github.com/nubisco/openbridge-marketplace/compare/v1.4.3...v1.5.0) (2026-04-10)


### Bug Fixes

* auth issues in Q&A and reviews ([1cbb3c6](https://github.com/nubisco/openbridge-marketplace/commit/1cbb3c6280b545f1ae9b12ffefd474369af0d35b))
* format server/auth.ts ([a854b37](https://github.com/nubisco/openbridge-marketplace/commit/a854b371a64e865579c9b6aa0845d796177473c1))
* format server/index.ts and PluginView.vue ([e54120b](https://github.com/nubisco/openbridge-marketplace/commit/e54120b699fa435f50346da43b0f0c557983aa8c))
* search flicker, sponsor links, OTP errors, modal visibility, invalid dates, favicon ([9adf8b2](https://github.com/nubisco/openbridge-marketplace/commit/9adf8b2cf3baffb5b760977936c5a4487456ba10))


### Features

* add Nubisco Platform JWT support for reviews and Q&A ([8fc2d4d](https://github.com/nubisco/openbridge-marketplace/commit/8fc2d4d6ec1c5fdd228ec7c464bcb4c93666e165))

## [1.4.3](https://github.com/nubisco/openbridge-marketplace/compare/v1.4.2...v1.4.3) (2026-04-09)


### Bug Fixes

* resolve readme links ([0851748](https://github.com/nubisco/openbridge-marketplace/commit/0851748641eef634c2d89a9ab9038cf877061026))

## [1.4.2](https://github.com/nubisco/openbridge-marketplace/compare/v1.4.1...v1.4.2) (2026-04-09)


### Bug Fixes

* idempotent reviews migration crashing on restart ([afe1109](https://github.com/nubisco/openbridge-marketplace/commit/afe1109f17997f4bdb331b9320497480ea5af608))

## [1.4.1](https://github.com/nubisco/openbridge-marketplace/compare/v1.4.0...v1.4.1) (2026-04-09)


### Bug Fixes

* version history invalid dates, broken search, core packages excluded from results ([e1890a0](https://github.com/nubisco/openbridge-marketplace/commit/e1890a043c05466ce3a9572dd393e959416c00f9))

# [1.4.0](https://github.com/nubisco/openbridge-marketplace/compare/v1.3.0...v1.4.0) (2026-04-09)


### Bug Fixes

* replace multi-statement inline event handler with resetOtp method ([11b2351](https://github.com/nubisco/openbridge-marketplace/commit/11b2351e94caaaf4a4c8546de013a309feb47401))


### Features

* authenticated Q&A and thumbs-up/down reviews with rate limiting ([5acfb28](https://github.com/nubisco/openbridge-marketplace/commit/5acfb2828e07346e8afa277675fd5ca0365829a9))

# [1.3.0](https://github.com/nubisco/openbridge-marketplace/compare/v1.2.0...v1.3.0) (2026-04-08)


### Features

* **branding:** openbridge logo, proper header/footer, privacy & terms pages ([89cea79](https://github.com/nubisco/openbridge-marketplace/commit/89cea799967442496bc14e885186bf7069c00342))

# [1.2.0](https://github.com/nubisco/openbridge-marketplace/compare/v1.1.0...v1.2.0) (2026-04-08)


### Features

* **crawler:** fetch GitHub stars + sponsors; expose in plugins API ([806a119](https://github.com/nubisco/openbridge-marketplace/commit/806a1196445c902c6f9a514b4583bed8707521f1))

# [1.1.0](https://github.com/nubisco/openbridge-marketplace/compare/v1.0.5...v1.1.0) (2026-04-08)


### Features

* **plugin-view:** tabbed layout — Overview, Version History, Q&A, Rating & Review ([0bcdc53](https://github.com/nubisco/openbridge-marketplace/commit/0bcdc53bb9971771aa54233f779552ba9ff34acc))

## [1.0.5](https://github.com/nubisco/openbridge-marketplace/compare/v1.0.4...v1.0.5) (2026-04-08)


### Bug Fixes

* **marketplace:** icons on cards, keywords parsing, filter unrelated packages ([ffdc99a](https://github.com/nubisco/openbridge-marketplace/commit/ffdc99adc76f8e267e1e58239b33b1a499ef3733))

## [1.0.4](https://github.com/nubisco/openbridge-marketplace/compare/v1.0.3...v1.0.4) (2026-04-08)


### Bug Fixes

* **crawler:** add exponential backoff retry on npm 429 rate limit ([80f8f21](https://github.com/nubisco/openbridge-marketplace/commit/80f8f211fa9877cd3b867881129947e152223e9b))

## [1.0.3](https://github.com/nubisco/openbridge-marketplace/compare/v1.0.2...v1.0.3) (2026-04-08)


### Bug Fixes

* **server:** correct row destructuring for postgres count query ([bfd511f](https://github.com/nubisco/openbridge-marketplace/commit/bfd511f88e72540331d5fcf6d65f3ef95813543c))

## [1.0.2](https://github.com/nubisco/openbridge-marketplace/compare/v1.0.1...v1.0.2) (2026-04-08)


### Bug Fixes

* add @nubisco/ui theme CSS and run crawler on boot when DB is empty ([0815abe](https://github.com/nubisco/openbridge-marketplace/commit/0815abe05b00c6ee2d05868dfffedd709644e5cd))

## [1.0.1](https://github.com/nubisco/openbridge-marketplace/compare/v1.0.0...v1.0.1) (2026-04-08)


### Bug Fixes

* **ci:** ignore CHANGELOG.md and bun.lock in prettier ([7721912](https://github.com/nubisco/openbridge-marketplace/commit/7721912c761db85a3f72dcafec6d662b375cf338))
* **docker:** remove invalid --production=false flag from bun install ([6ff7e28](https://github.com/nubisco/openbridge-marketplace/commit/6ff7e28c229b2c3ff8ecededdc5a2906a3d63e12))

# 1.0.0 (2026-04-08)


### Bug Fixes

* **ci:** add eslint.config.mjs, .prettierrc, tsconfig.json and fix lint script ([d08e6e2](https://github.com/nubisco/openbridge-marketplace/commit/d08e6e2130cc6226b903b563b35c17ee03b21e06))
* **ci:** add missing server deps, fix typecheck and build errors ([03b65ad](https://github.com/nubisco/openbridge-marketplace/commit/03b65ad5c74bb2bc5e58de398e71bb007220c475))
* **ci:** pin Node 22 for semantic-release in release workflow ([9baa0bb](https://github.com/nubisco/openbridge-marketplace/commit/9baa0bb648be45f95205b774db0fd4ecb32a9a52))
* **ci:** remove SSH deploy step, only push image to GHCR ([e9be571](https://github.com/nubisco/openbridge-marketplace/commit/e9be571081c4fc4f9f5340495532545f12aae90e))
* **docker:** align docker-compose with analytics pattern ([689cb61](https://github.com/nubisco/openbridge-marketplace/commit/689cb61eef4123ee372ea5f71b2d57ea31e6ba34))


### Features

* **analytics:** integrate nubisco/analytics for pageview and event tracking ([3c41137](https://github.com/nubisco/openbridge-marketplace/commit/3c41137dfe9bee494b2f986245bb4ddbbb39a2f1))
* scaffold openbridge-marketplace plugin directory ([0663f17](https://github.com/nubisco/openbridge-marketplace/commit/0663f174f93b78580319672c1e8be673d0eb26f4))
