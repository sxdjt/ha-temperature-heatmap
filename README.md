# Temperature Heatmap Card

![GitHub Release](https://img.shields.io/github/v/release/sxdjt/ha-temperature-heatmap?style=for-the-badge)
[![AI Assisted](https://img.shields.io/badge/AI-Claude%20Code-AAAAAA.svg?style=for-the-badge)](https://claude.ai/code)
![GitHub License](https://img.shields.io/github/license/sxdjt/ha-temperature-heatmap?style=for-the-badge)

A custom Home Assistant Lovelace card that displays temperature data as a color-coded heatmap, showing hourly patterns across multiple days with flexible aggregation modes.

## Features

- Color-coded heatmap visualization of temperature history ( **_or any numeric sensor_** )
- Visual configuration editor for easy setup
- Three aggregation modes: average, minimum, and maximum
- Color interpolation with multiple methods (RGB, HSL, LAB, Gamma)
- Configurable card sizing: compact mode, specify cell height/width, etc.
- Auto-detection of temperature scale (Fahrenheit/Celsius)
- Configurable time periods (1-30 days) and intervals (1-24 hours)
- Hour filtering to display specific time ranges (e.g., daytime only, nighttime with wrap-around)
- Customizable color thresholds
- Navigation between time periods (previous/next/current)
- Min/Max/Avg statistics footer
- **Pairs well with the [Windspeed heatmap card](https://github.com/sxdjt/ha-windspeed-heatmap)**

![Temperature Heatmap Card Example](https://github.com/user-attachments/assets/5b6c5114-9866-4e58-801e-f738583f0f02)

## Installation

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=sxdjt&repository=ha-temperature-heatmap)

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entity` | string | **Required** | Temperature sensor entity ID |
| `aggregation_mode` | string | `"average"` | Data aggregation: "average", "min", or "max" |
| `cell_font_size` | number/string | `11` | Cell font size (6-24 pixels) |
| `cell_gap` | number/string | `2` | Gap between cells (0-20 pixels) |
| `cell_height` | number/string | `36` | Cell height (10-200 pixels) |
| `cell_padding` | number/string | `2` | Padding inside cells (0-20 pixels) |
| `cell_width` | number/string | `"1fr"` | Column width (1fr, auto, 60px, 25%, etc.) |
| `click_action` | string | `"more-info"` | Cell click action: "more-info", "tooltip", or "none" |
| `color_interpolation` | string | `"hsl"` | Interpolation method: "rgb", "gamma", "hsl", or "lab" |
| `color_thresholds` | array | See below | Color mapping for temperatures |
| `compact` | boolean | `false` | Enable compact mode (overrides cell sizing properties) |
| `compact_header` | boolean | `false` | Reduce title size, header/footer padding, and nav arrow size |
| `data_source` | string | `"auto"` | Data source: "auto", "history", or "statistics" |
| `days` | number | `7` | Number of days to display (1-30) |
| `decimals` | number | `1` | Decimal places to display: 0, 1, or 2 |
| `end_hour` | number | `23` | End hour for display filter (0-23) |
| `fill_gaps` | boolean | `false` | Propagate last known sensor reading when data is missing/unavailable **SEE NOTE** |
| `interpolate_colors` | boolean | `false` | Enable smooth color interpolation between thresholds |
| `refresh_interval` | number | `300` | Data refresh interval in seconds |
| `rounded_corners` | boolean | `true` | Enable rounded corners on cells (set to false for flat grid) |
| `show_entity_name` | boolean | `false` | Show entity friendly name in footer |
| `start_hour` | number | `0` | Start hour for display filter (0-23) |
| `statistic_type` | string | `"mean"` | Statistic to use for statistics data: "mean", "min", or "max" |
| `time_format` | string | `"24"` | Time format: "12" or "24" |
| `time_interval` | number | `2` | Hours per row: 1, 2, 3, 4, 6, 8, 12, or 24 |
| `title` | string | `"Temperature History"` | Card title |
| `unit` | string | auto-detect | Temperature unit override (e.g., "°F", "°C") |

**NOTE:** `fill_gaps` will show "data" when there is none to report.  If your sensor is unavailable, the **data displayed will be incorrect** for the time slot.

### Minimal Configuration

```yaml
type: custom:ha-temperature-heatmap-card
entity: sensor.outdoor_temperature
```

### Full Configuration Example

```yaml
type: custom:ha-temperature-heatmap-card
entity: sensor.outdoor_temperature
title: "Outdoor Temperature History"
aggregation_mode: average
click_action: tooltip
color_interpolation: hsl
color_thresholds:
  - value: 0
    color: "#1a237e"
  - value: 32
    color: "#42a5f5"
  - value: 40
    color: "#80deea"
  - value: 50
    color: "#66bb6a"
  - value: 60
    color: "#4caf50"
  - value: 70
    color: "#81c784"
  - value: 75
    color: "#ffeb3b"
  - value: 80
    color: "#ff9800"
  - value: 85
    color: "#f44336"
data_source: auto
days: 7
decimals: 1
end_hour: 23
fill_gaps: false
interpolate_colors: false
refresh_interval: 300
rounded_corners: true
show_entity_name: true
start_hour: 0
statistic_type: mean
time_format: "24"
time_interval: 2
unit: "°F"
```

## Default Color Thresholds

### Fahrenheit Scale (Default)

When the sensor uses Fahrenheit or no custom thresholds are provided:

```yaml
color_thresholds:
  - value: 0     # Deep freeze (dark blue)
    color: "#1a237e"
  - value: 32    # Freezing (light blue)
    color: "#42a5f5"
  - value: 40    # Cold (cyan)
    color: "#80deea"
  - value: 50    # Cool/comfortable (green)
    color: "#66bb6a"
  - value: 60    # Comfortable (medium green)
    color: "#4caf50"
  - value: 70    # Comfortable (light green)
    color: "#81c784"
  - value: 75    # Getting warm/caution (yellow)
    color: "#ffeb3b"
  - value: 80    # Warm (orange)
    color: "#ff9800"
  - value: 85    # Hot (red)
    color: "#f44336"
```

### Celsius Scale

When the sensor uses Celsius, the card automatically applies these defaults:

```yaml
color_thresholds:
  - value: -18   # Deep freeze (dark blue)
    color: "#1a237e"
  - value: 0     # Freezing (light blue)
    color: "#42a5f5"
  - value: 4     # Cold (cyan)
    color: "#80deea"
  - value: 10    # Cool/comfortable (green)
    color: "#66bb6a"
  - value: 16    # Comfortable (medium green)
    color: "#4caf50"
  - value: 21    # Comfortable (light green)
    color: "#81c784"
  - value: 24    # Getting warm/caution (yellow)
    color: "#ffeb3b"
  - value: 27    # Warm (orange)
    color: "#ff9800"
  - value: 29    # Hot (red)
    color: "#f44336"
```

## Color Interpolation

By default, cell colors are determined by finding the highest threshold that the temperature meets or exceeds. This creates distinct color bands.

Enable `interpolate_colors: true` to smoothly blend colors between thresholds for a gradient effect:

```yaml
type: custom:ha-temperature-heatmap-card
entity: sensor.outdoor_temperature
interpolate_colors: true
color_interpolation: hsl   # Choose interpolation method
```

### Interpolation Methods

| Method | Description |
|--------|-------------|
| `rgb` | Linear RGB interpolation - simple but can produce muddy intermediate colors |
| `gamma` | Gamma-corrected RGB - perceptually more uniform than linear RGB |
| `hsl` | HSL color space (default) - produces vibrant intermediate colors, takes shortest hue path |
| `lab` | LAB color space - perceptually uniform, best for scientific visualization |

**Recommendation:** Use `hsl` (default) for most cases. Use `lab` when perceptual uniformity is important.

## Time Intervals

The `time_interval` option determines how many hours of data are aggregated into each row:

## Hour Filtering

Use `start_hour` and `end_hour` to limit which hours are displayed. This is useful for focusing on specific time periods and reducing visual clutter.

Note: The card still fetches all 24 hours of data, but only displays and calculates statistics for the filtered hours.

**Display 08:00 to 17:00:**

```yaml
type: custom:ha-temperature-heatmap-card
entity: sensor.outdoor_temperature
time_interval: 1
start_hour: 8
end_hour: 17
```

## Rounding

The `decimals` option controls how many decimal places are shown for temperature values (0-2):

## Cell Sizing Customization

Control the visual density of the heatmap with individual sizing properties or compact mode.

### Individual Properties

Customize cell dimensions with specific size values:

```yaml
type: custom:ha-temperature-heatmap-card
entity: sensor.outdoor_temperature
cell_height: 40           # Cell height in pixels (default: 36)
cell_width: "1fr"         # Column width - 1fr (default), auto, 60px, 25%, etc.
cell_padding: 3           # Padding inside cells (default: 2)
cell_gap: 3               # Gap between cells (default: 2)
cell_font_size: 12        # Temperature font size (default: 11)
```

#### Size Value Formats

- Numbers automatically convert to pixels: `cell_height: 40` becomes "40px"
- Strings pass through as-is: `cell_width: "1fr"`, `cell_width: "25%"`
- Valid ranges:
  - `cell_height`: 10-200 pixels
  - `cell_padding`: 0-20 pixels
  - `cell_gap`: 0-20 pixels
  - `cell_font_size`: 6-24 pixels

### Compact Mode

For a denser display with smaller cells:

```yaml
type: custom:ha-temperature-heatmap-card
entity: sensor.outdoor_temperature
compact: true             # Overrides individual sizing properties
```

Compact preset values:
- Cell height: 24px (vs 36px default)
- Cell padding: 1px (vs 2px default)
- Cell gap: 1px (vs 2px default)
- Font size: 9px (vs 11px default)

### Responsive Behavior

On mobile screens (width < 600px), cell sizes automatically scale down by approximately 17%:
- Default 36px height becomes 30px
- Custom 40px height becomes 33px
- Compact 24px height becomes 20px

### Width Considerations

**Responsive (recommended):**

```yaml
cell_width: "1fr"         # Auto-sizes to fill width (default)
cell_width: "25%"         # Percentage-based responsive sizing
```

**Fixed width:**
```yaml
cell_width: 60            # Fixed 60px width per column
```

Note: Fixed widths may cause horizontal scrolling on narrow screens, especially with many days displayed.

## Using non-temperature sensor readings

The card will process and display any sensor that returns numeric data.  Here is an example showing air quality data

<img width="507" height="720" alt="Screenshot 2026-01-13 at 00 07 40" src="https://github.com/user-attachments/assets/f6de4ec3-b8a9-49ef-a108-77b73081af9b" />

## License

This project is licensed under the MIT License.

## Support

For issues, feature requests, or contributions, please visit the GitHub repository.
