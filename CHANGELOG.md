# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.3.0] - 2026-01-23

### Added
- Visual configuration editor for easy setup (PR #2 by KiLMaN)
- Color interpolation with multiple methods: RGB, HSL, LAB, Gamma (PR #2)
- `interpolate_colors` option to enable smooth color gradients between thresholds
- `color_interpolation` option to select interpolation method
- `getStubConfig` for better card picker integration
- Request caching to improve editor performance

### Fixed
- Color thresholds auto-detection now works with both Fahrenheit and Celsius
- Cache key includes view offset to prevent stale data when navigating

## [0.2.1] - 2026-01-14

### Added
- `rounded_corners` option (default: true) - set to false for flat grid appearance
- MIT license

### Fixed
- Duplicate description in README.md

## [0.2.0] - 2026-01-13

### Added
- Configurable cell sizing with individual properties:
  - `cell_height`: Cell height (10-200 pixels)
  - `cell_width`: Column width (1fr, auto, px, %)
  - `cell_padding`: Padding inside cells (0-20 pixels)
  - `cell_gap`: Gap between cells (0-20 pixels)
  - `cell_font_size`: Font size (6-24 pixels)
- `compact` mode for dense display with preset smaller values
- Responsive scaling on mobile screens (< 600px)

### Changed
- Clarified support for non-temperature numeric sensors in README

## [0.1.3] - 2026-01-12

### Fixed
- Minor bug fixes

## [0.1.2] - 2026-01-12

### Added
- Hour filtering with `start_hour` and `end_hour` options
- Support for wrap-around time ranges (e.g., 22:00 to 05:00)

### Fixed
- Color thresholds read-only error when user provides custom thresholds

## [0.1.1] - 2025-12-27

### Changed
- Default click action changed to open history dialog (more-info)

### Fixed
- Image format for HACS validation
- HACS validation workflow

## [0.1.0] - 2025-12-26

### Added
- Initial release
- Color-coded heatmap visualization of temperature history
- Three aggregation modes: average, minimum, maximum
- Auto-detection of temperature scale (Fahrenheit/Celsius)
- Configurable time periods (1-30 days) and intervals (1-24 hours)
- Customizable color thresholds with separate defaults for F and C
- Navigation between time periods (previous/next/current)
- Min/Max/Avg statistics footer
- 12-hour and 24-hour time format options
- Configurable decimal precision (0-2)
- Click actions: tooltip, more-info, none
