# Temperature Heatmap Card

[![AI Assisted](https://img.shields.io/badge/AI-Claude%20Code-AAAAAA.svg)](https://claude.ai/code)

A custom Home Assistant Lovelace card that displays temperature data as a color-coded heatmap, showing hourly patterns across multiple days with flexible aggregation modes.

## Features

- Color-coded heatmap visualization of temperature history
- Three aggregation modes: average, minimum, and maximum
- Auto-detection of temperature scale (Fahrenheit/Celsius)
- Configurable time periods (1-30 days) and intervals (1-24 hours)
- Customizable color thresholds
- Navigation between time periods (previous/next/current)
- Min/Max/Avg statistics footer
- Pairs well with the [Windspeed heatmap card](https://github.com/sxdjt/ha-windspeed-heatmap)

![Temperature Heatmap Card Example](https://github.com/user-attachments/assets/5b6c5114-9866-4e58-801e-f738583f0f02)

## Installation

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=sxdjt&repository=ha-temperature-heatmap)

## Configuration

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
days: 7
time_interval: 2
time_format: "24"
aggregation_mode: average
decimals: 1
unit: "°F"
show_entity_name: true
refresh_interval: 300
click_action: tooltip
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
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entity` | string | **Required** | Temperature sensor entity ID |
| `title` | string | `"Temperature History"` | Card title |
| `days` | number | `7` | Number of days to display (1-30) |
| `time_interval` | number | `2` | Hours per row: 1, 2, 3, 4, 6, 8, 12, or 24 |
| `aggregation_mode` | string | `"average"` | Data aggregation: "average", "min", or "max" |
| `decimals` | number | `1` | Decimal places to display: 0, 1, or 2 |
| `time_format` | string | `"24"` | Time format: "12" or "24" |
| `unit` | string | auto-detect | Temperature unit override (e.g., "°F", "°C") |
| `show_entity_name` | boolean | `false` | Show entity friendly name in footer |
| `refresh_interval` | number | `300` | Data refresh interval in seconds |
| `click_action` | string | `"tooltip"` | Cell click action: "tooltip", "more-info", or "none" |
| `color_thresholds` | array | See below | Color mapping for temperatures |

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

## Time Intervals

The `time_interval` option determines how many hours of data are aggregated into each row:

- `1`: Hourly view (24 rows per day)
- `2`: Every 2 hours (12 rows per day) - **Default**
- `3`: Every 3 hours (8 rows per day)
- `4`: Every 4 hours (6 rows per day)
- `6`: Every 6 hours (4 rows per day)
- `8`: Every 8 hours (3 rows per day)
- `12`: Every 12 hours (2 rows per day)
- `24`: Daily view (1 row per day)

## Display Precision

The `decimals` option controls how many decimal places are shown for temperature values (0-2):

## License

This project is licensed under the MIT License.

## Support

For issues, feature requests, or contributions, please visit the GitHub repository.
