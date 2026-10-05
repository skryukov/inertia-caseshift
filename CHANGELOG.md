# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-10-05

### Added

- Export `toCamelCase`, `toSnakeCase`, and `toCamelCasePath` for converting data outside Inertia requests, such as websocket messages. ([#10](https://github.com/skryukov/inertia-caseshift/pull/10) by [@skryukov])
- Convert `rescuedProps` keys. ([#6](https://github.com/skryukov/inertia-caseshift/pull/6) by [@zokioki])
- Convert field names in the `Precognition-Validate-Only` header. ([#11](https://github.com/skryukov/inertia-caseshift/pull/11) by [@skryukov])

### Fixed

- Respect `skipKeys` and `rawKeys` in page metadata like `deferredProps` and `mergeProps`. ([#7](https://github.com/skryukov/inertia-caseshift/pull/7) by [@skryukov])
- Convert `useHttp` JSON request bodies to snake_case. ([#8](https://github.com/skryukov/inertia-caseshift/pull/8) by [@skryukov])
- Keep `BigInt` values from Inertia's `preserveBigIntegers` after navigation. ([#9](https://github.com/skryukov/inertia-caseshift/pull/9) by [@skryukov])

## [0.1.2] - 2026-05-26

### Fixed

- Scope the Vite transform hook so library bundles no longer trigger the `createInertiaApp` warning. ([#4](https://github.com/skryukov/inertia-caseshift/pull/4) by [@mattwigham])

## [0.1.1] - 2026-04-02

### Fixed

- Fix `useHttp` wrapping. ([#2](https://github.com/skryukov/inertia-caseshift/pull/2) by [@skryukov])

## [0.1.0] - 2026-03-31

- Initial release.

[Unreleased]: https://github.com/skryukov/inertia-caseshift/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/skryukov/inertia-caseshift/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/skryukov/inertia-caseshift/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/skryukov/inertia-caseshift/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/skryukov/inertia-caseshift/releases/tag/v0.1.0

[@mattwigham]: https://github.com/mattwigham
[@skryukov]: https://github.com/skryukov
[@zokioki]: https://github.com/zokioki
