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
