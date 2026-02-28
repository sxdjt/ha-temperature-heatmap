# Changelog

All notable changes to this project will be documented in this file.

## [0.7.0] - 2026-02-27

### Added
- `fill_gaps` option: forward-fills the last known sensor value into empty buckets within
  each column; filled cells display with a dashed border and are marked as "estimated"
  in tooltips. Note: use with caution - filled values are estimates, not real readings.

### Fixed
- Legend labels now positioned at the left edge of their corresponding color zone
  so the label value visually falls within the correct color band (e.g., 50F label
  now appears inside the green zone, not at the cyan/green boundary)

## [0.6.0] - 2026-02-26

### Added
- `show_degree_symbol` option (default: true) to toggle the degree symbol (°) across all
  temperature displays: grid cells, legend, footer statistics, and tooltip
- `show_degree_symbol` toggle added to visual editor

### Fixed
- Legend gradient color bands now positioned proportionally by actual threshold value
  instead of evenly by count - legend now accurately represents the temperature scale (PR #5 by KiLMaN)
- Legend labels now positioned proportionally by value to match the gradient
- Legend label collision detection prevents overlapping text when thresholds are
  densely spaced (e.g. default Fahrenheit thresholds at the high end)
- Visual editor unit selector now correctly stores '°C'/'°F' instead of 'C'/'F'

## [0.5.1] - 2026-02-09

### Fixed
- Cell hover effect no longer persists on Android/touch devices after tapping (Issue #4)
  - Wrapped hover styles in `@media (hover: hover)` to only apply on devices with a true pointer
  - Prevents cell from rendering on top of more-info popup due to transform stacking context
- VERSION constant now correctly reflects the current release (was stuck at 0.4.0)

## [0.5.0] - 2026-02-05

### Added
- Current time bucket now shows in-progress data with asterisk indicator (Issue #3 - thanks @KiLMaN for the idea)
- Partial buckets display with dashed border and "(in progress)" in tooltip

## [0.4.0] - 2026-01-31

### Added
- Long-term statistics support for viewing history beyond recorder purge_keep_days limit
- `data_source` option: 'auto', 'history', or 'statistics'
- `statistic_type` option: 'mean', 'min', or 'max' for statistics data

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
