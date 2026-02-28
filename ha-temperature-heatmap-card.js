/* Last modified: 28-Feb-2026 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Default color thresholds for temperature display

// Default color thresholds for Fahrenheit
const DEFAULT_THRESHOLDS_F = [
  { value: 0,  color: '#1a237e' },  // 0F: Deep freeze (dark blue)
  { value: 32, color: '#42a5f5' },  // 32F: Freezing (light blue)
  { value: 40, color: '#80deea' },  // 40F: Cold (cyan)
  { value: 50, color: '#66bb6a' },  // 50F: Cool/comfortable start (green)
  { value: 60, color: '#4caf50' },  // 60F: Comfortable (medium green)
  { value: 70, color: '#81c784' },  // 70F: Comfortable (light green)
  { value: 75, color: '#ffeb3b' },  // 75F: Getting warm/caution (yellow)
  { value: 80, color: '#ff9800' },  // 80F: Warm (orange)
  { value: 85, color: '#f44336' }   // 85F: Hot (red)
];

// Default color thresholds for Celsius
const DEFAULT_THRESHOLDS_C = [
  { value: -18, color: '#1a237e' },  // -18C: Deep freeze (dark blue)
  { value: 0,   color: '#42a5f5' },  // 0C: Freezing (light blue)
  { value: 4,   color: '#80deea' },  // 4C: Cold (cyan)
  { value: 10,  color: '#66bb6a' },  // 10C: Cool/comfortable start (green)
  { value: 16,  color: '#4caf50' },  // 16C: Comfortable (medium green)
  { value: 21,  color: '#81c784' },  // 21C: Comfortable (light green)
  { value: 24,  color: '#ffeb3b' },  // 24C: Getting warm/caution (yellow)
  { value: 27,  color: '#ff9800' },  // 27C: Warm (orange)
  { value: 29,  color: '#f44336' }   // 29C: Hot (red)
];

// Backward compatibility aliases
const DEFAULT_THRESHOLDS = DEFAULT_THRESHOLDS_F;
const DEFAULT_THRESHOLDS_CELSIUS = DEFAULT_THRESHOLDS_C;

/**
 * Get appropriate default thresholds based on unit of measurement.
 * @param {string} unit - The unit of measurement (F, C, etc.)
 * @returns {Array} - Array of threshold objects with value and color properties
 */
function getDefaultThresholdsForUnit(unit) {
  if (!unit) return DEFAULT_THRESHOLDS_F;
  const u = unit.toLowerCase().trim();
  if (u.includes('c') || u === '°c' || u === 'celsius') {
    return DEFAULT_THRESHOLDS_C;
  }
  return DEFAULT_THRESHOLDS_F;
}

// Card version
const VERSION = '0.7.0';

// ---------------------------------------------------------------------------
// Color utilities
// ---------------------------------------------------------------------------

// Color parsing, interpolation, and utility functions

/**
 * Parse color string to RGB object.
 * Supports hex (#RRGGBB), rgba(), and rgb() formats.
 * @param {string} color - Color string
 * @returns {Object|null} - RGB object {r, g, b} or null if parsing fails
 */
function parseColor(color) {
  // Handle hex format first (most common for temperature thresholds)
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    if (hex.length === 6) {
      return {
        r: parseInt(hex.substr(0, 2), 16),
        g: parseInt(hex.substr(2, 2), 16),
        b: parseInt(hex.substr(4, 2), 16)
      };
    }
  }
  // Handle rgba() format
  if (color.startsWith('rgba(')) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10)
      };
    }
  }
  // Handle rgb() format
  if (color.startsWith('rgb(')) {
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10)
      };
    }
  }
  return null;
}

/**
 * Convert RGB object to hex color string.
 * @param {Object} rgb - RGB color object {r, g, b}
 * @returns {string} - Hex color string (#RRGGBB)
 */
function rgbToHex(rgb) {
  const toHex = v =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Linear RGB interpolation.
 * @param {Object} rgb1 - Start RGB color
 * @param {Object} rgb2 - End RGB color
 * @param {number} t - Interpolation factor (0-1)
 * @returns {string} - Interpolated color as hex string
 */
function interpolateRGB(rgb1, rgb2, t) {
  return rgbToHex({
    r: Math.round(rgb1.r + (rgb2.r - rgb1.r) * t),
    g: Math.round(rgb1.g + (rgb2.g - rgb1.g) * t),
    b: Math.round(rgb1.b + (rgb2.b - rgb1.b) * t)
  });
}

/**
 * Gamma-corrected RGB interpolation.
 * @param {Object} rgb1 - Start RGB color
 * @param {Object} rgb2 - End RGB color
 * @param {number} t - Interpolation factor (0-1)
 * @param {number} gamma - Gamma value (default 2.2)
 * @returns {string} - Interpolated color as hex string
 */
function interpolateGamma(rgb1, rgb2, t, gamma = 2.2) {
  const interp = (x, y) =>
    Math.pow(
      Math.pow(x / 255, gamma) +
      (Math.pow(y / 255, gamma) - Math.pow(x / 255, gamma)) * t,
      1 / gamma
    ) * 255;

  return rgbToHex({
    r: interp(rgb1.r, rgb2.r),
    g: interp(rgb1.g, rgb2.g),
    b: interp(rgb1.b, rgb2.b)
  });
}

/**
 * Convert RGB to HSL color space.
 * @param {Object} rgb - RGB color object
 * @returns {Object} - HSL color object {h, s, l}
 */
function rgbToHsl(rgb) {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }

  return { h, s, l };
}

/**
 * Convert HSL to RGB color space.
 * @param {Object} hsl - HSL color object {h, s, l}
 * @returns {Object} - RGB color object {r, g, b}
 */
function hslToRgb(hsl) {
  const { h, s, l } = hsl;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return {
    r: (r + m) * 255,
    g: (g + m) * 255,
    b: (b + m) * 255
  };
}

/**
 * HSL interpolation (takes shortest path around hue wheel).
 * @param {Object} rgb1 - Start RGB color
 * @param {Object} rgb2 - End RGB color
 * @param {number} t - Interpolation factor (0-1)
 * @returns {string} - Interpolated color as hex string
 */
function interpolateHSL(rgb1, rgb2, t) {
  const hsl1 = rgbToHsl(rgb1);
  const hsl2 = rgbToHsl(rgb2);

  // Handle hue interpolation (shortest path)
  let dh = hsl2.h - hsl1.h;
  if (Math.abs(dh) > 180) dh -= Math.sign(dh) * 360;

  const h = (hsl1.h + dh * t + 360) % 360;
  const s = hsl1.s + (hsl2.s - hsl1.s) * t;
  const l = hsl1.l + (hsl2.l - hsl1.l) * t;

  return rgbToHex(hslToRgb({ h, s, l }));
}

/**
 * Convert RGB to XYZ color space.
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {Object} - XYZ color object {x, y, z}
 */
function rgbToXyz(r, g, b) {
  [r, g, b] = [r, g, b].map((v) => {
    v /= 255;
    return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92;
  });

  return {
    x: (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100,
    y: (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100,
    z: (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100,
  };
}

/**
 * Convert XYZ to RGB color space.
 * @param {number} x - X component
 * @param {number} y - Y component
 * @param {number} z - Z component
 * @returns {Object} - RGB color object {r, g, b}
 */
function xyzToRgb(x, y, z) {
  x /= 100; y /= 100; z /= 100;

  let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let b = x * 0.0557 + y * -0.2040 + z * 1.0570;

  const gamma = v =>
    v > 0.0031308
      ? 1.055 * Math.pow(v, 1 / 2.4) - 0.055
      : 12.92 * v;

  return {
    r: gamma(r) * 255,
    g: gamma(g) * 255,
    b: gamma(b) * 255
  };
}

/**
 * Convert RGB to LAB color space.
 * @param {Object} rgb - RGB color object
 * @returns {Object} - LAB color object {l, a, b}
 */
function rgbToLab(rgb) {
  const xyz = rgbToXyz(rgb.r, rgb.g, rgb.b);
  const ref = [95.047, 100.0, 108.883];

  let x = xyz.x / ref[0];
  let y = xyz.y / ref[1];
  let z = xyz.z / ref[2];

  [x, y, z] = [x, y, z].map(v =>
    v > 0.008856 ? Math.cbrt(v) : (7.787 * v) + 16 / 116
  );

  return {
    l: (116 * y) - 16,
    a: 500 * (x - y),
    b: 200 * (y - z)
  };
}

/**
 * Convert LAB to RGB color space.
 * @param {Object} lab - LAB color object {l, a, b}
 * @returns {Object} - RGB color object {r, g, b}
 */
function labToRgb(lab) {
  let y = (lab.l + 16) / 116;
  let x = lab.a / 500 + y;
  let z = y - lab.b / 200;

  [x, y, z] = [x, y, z].map(v => {
    const v3 = v ** 3;
    return v3 > 0.008856 ? v3 : (v - 16 / 116) / 7.787;
  });

  x *= 95.047;
  y *= 100.0;
  z *= 108.883;

  return xyzToRgb(x, y, z);
}

/**
 * LAB interpolation (perceptually uniform).
 * @param {Object} rgb1 - Start RGB color
 * @param {Object} rgb2 - End RGB color
 * @param {number} t - Interpolation factor (0-1)
 * @returns {string} - Interpolated color as hex string
 */
function interpolateLAB(rgb1, rgb2, t) {
  const lab1 = rgbToLab(rgb1);
  const lab2 = rgbToLab(rgb2);

  const lab = {
    l: lab1.l + (lab2.l - lab1.l) * t,
    a: lab1.a + (lab2.a - lab1.a) * t,
    b: lab1.b + (lab2.b - lab1.b) * t
  };

  return rgbToHex(labToRgb(lab));
}

/**
 * Interpolate between two colors using the specified method.
 * @param {string} color1 - Start color string
 * @param {string} color2 - End color string
 * @param {number} t - Interpolation factor (0-1)
 * @param {string} method - Interpolation method ('rgb', 'gamma', 'hsl', 'lab')
 * @returns {string} - Interpolated color as hex string
 */
function interpolateColor(color1, color2, t, method = 'hsl') {
  const rgb1 = parseColor(color1);
  const rgb2 = parseColor(color2);

  if (!rgb1 || !rgb2) return color1;

  switch (method) {
    case 'rgb':
      return interpolateRGB(rgb1, rgb2, t);
    case 'gamma':
      return interpolateGamma(rgb1, rgb2, t);
    case 'hsl':
      return interpolateHSL(rgb1, rgb2, t);
    case 'lab':
      return interpolateLAB(rgb1, rgb2, t);
    default:
      return interpolateHSL(rgb1, rgb2, t);
  }
}

/**
 * Get contrasting text color (black or white) for a background color.
 * Uses luminance calculation to determine optimal contrast.
 * @param {string} backgroundColor - Background color string
 * @returns {string} - '#000000' for light backgrounds, '#ffffff' for dark backgrounds
 */
function getContrastTextColor(backgroundColor) {
  // Handle CSS variables
  if (backgroundColor.startsWith('var(')) {
    return 'var(--primary-text-color)';
  }

  const rgb = parseColor(backgroundColor);
  if (!rgb) {
    return 'var(--primary-text-color)';
  }

  // Calculate relative luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

  // Return black for light backgrounds, white for dark backgrounds
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Get color for temperature value based on thresholds.
 * @param {number} temperature - Temperature value
 * @param {Array} thresholds - Array of threshold objects {value, color}
 * @param {boolean} interpolate - Whether to interpolate between thresholds
 * @param {string} interpolationMethod - Interpolation method if enabled
 * @returns {string} - Color string for the temperature value
 */
function getColorForTemperature(temperature, thresholds, interpolate = false, interpolationMethod = 'hsl') {
  if (temperature === null || temperature === undefined) {
    return 'var(--disabled-color, #f0f0f0)';
  }

  // If interpolation is disabled, use threshold-based coloring
  if (!interpolate) {
    let color = thresholds[0].color;
    for (let i = 0; i < thresholds.length; i++) {
      if (temperature >= thresholds[i].value) {
        color = thresholds[i].color;
      } else {
        break;
      }
    }
    return color;
  }

  // Interpolation mode: find the two thresholds to blend between
  if (temperature <= thresholds[0].value) {
    return thresholds[0].color;
  }

  if (temperature >= thresholds[thresholds.length - 1].value) {
    return thresholds[thresholds.length - 1].color;
  }

  // Find the two thresholds to interpolate between
  for (let i = 0; i < thresholds.length - 1; i++) {
    if (temperature >= thresholds[i].value && temperature < thresholds[i + 1].value) {
      const t = (temperature - thresholds[i].value) / (thresholds[i + 1].value - thresholds[i].value);
      return interpolateColor(thresholds[i].color, thresholds[i + 1].color, t, interpolationMethod);
    }
  }

  return thresholds[thresholds.length - 1].color;
}

// ---------------------------------------------------------------------------
// Formatting utilities
// ---------------------------------------------------------------------------

// Formatting and utility functions

/**
 * Escape HTML to prevent XSS via textContent/innerHTML conversion.
 * @param {string} text - Text to escape
 * @returns {string} - HTML-escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format hour as "12a", "3p", etc. (12-hour) or "00", "15", etc. (24-hour).
 * @param {number} hour - Hour (0-23)
 * @param {string} format - Time format ('12' or '24')
 * @returns {string} - Formatted hour string
 */
function formatHourLabel(hour, format = '24') {
  if (format === '24') {
    return String(hour).padStart(2, '0');
  }
  // 12-hour format
  const h = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
  const suffix = hour < 12 ? 'a' : 'p';
  return `${h}${suffix}`;
}

/**
 * Normalize size values: numbers -> "Npx", strings -> pass through.
 * @param {number|string} value - Size value
 * @param {string} defaultValue - Default value if input is empty
 * @returns {string} - Normalized size string
 */
function normalizeSize(value, defaultValue) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  if (typeof value === 'number') {
    return `${value}px`;
  }
  return String(value);
}

/**
 * Get date key in format YYYY-MM-DD using LOCAL timezone.
 * @param {Date} date - Date object
 * @returns {string} - Date key string
 */
function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Bucket hour into interval (e.g., hour 7 with 2-hour interval -> 6).
 * @param {number} hour - Hour (0-23)
 * @param {number} intervalHours - Interval in hours
 * @returns {number} - Bucketed hour
 */
function getHourBucket(hour, intervalHours) {
  return Math.floor(hour / intervalHours) * intervalHours;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

// Card CSS styles

/**
 * Create and return a <style> element with all card CSS rules.
 * @returns {HTMLStyleElement} - Style element with card CSS
 */
function createStyleElement() {
  const style = document.createElement('style');
  style.textContent = `
    /* Main container */
    ha-card {
      display: block;
      padding: 0;
      overflow: hidden;
    }

    /* Card header with title and navigation */
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid var(--divider-color);
      flex-wrap: wrap;
      gap: 8px;
    }

    .title {
      font-size: 20px;
      font-weight: 500;
      color: var(--primary-text-color);
    }

    /* Navigation controls */
    .nav-controls {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .nav-btn {
      background: var(--primary-color);
      color: var(--text-primary-color, white);
      border: none;
      border-radius: 4px;
      width: 32px;
      height: 32px;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s ease;
    }

    .nav-btn:hover:not(:disabled) {
      opacity: 0.8;
    }

    .nav-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .nav-btn:focus {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }

    .nav-btn-current {
      background: var(--primary-color);
      color: var(--text-primary-color, white);
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.2s ease;
    }

    .nav-btn-current:hover {
      opacity: 0.8;
    }

    .nav-btn-current:focus {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }

    .nav-btn-current.hidden {
      visibility: hidden;
      pointer-events: none;
    }

    .date-range {
      font-size: 14px;
      color: var(--secondary-text-color);
      min-width: 120px;
      text-align: center;
    }

    /* Heatmap grid container */
    .heatmap-grid {
      padding: 16px;
    }

    .month-header {
      text-align: center;
      font-size: 16px;
      font-weight: 500;
      color: var(--primary-text-color);
      margin-bottom: 12px;
    }

    /* Grid wrapper with time labels and data grid */
    .grid-wrapper {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 8px;
      align-items: start;
    }

    /* Time labels column */
    .time-labels {
      display: flex;
      flex-direction: column;
      gap: var(--cell-gap, 2px);
      padding-top: 28px;  /* Align with data grid (after date headers) */
    }

    .time-label {
      height: var(--cell-height, 36px);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 8px;
      font-size: var(--cell-font-size, 11px);
      color: var(--secondary-text-color);
      font-weight: 500;
    }

    /* Data grid container */
    .data-grid-container {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    /* Date headers row */
    .date-headers {
      display: grid;
      grid-template-columns: repeat(var(--days-count, 7), 1fr);
      gap: 2px;
      margin-bottom: 4px;
    }

    .date-header {
      text-align: center;
      font-weight: bold;
      font-size: 12px;
      color: var(--primary-text-color);
      padding: 4px;
    }

    /* Data cells grid */
    .data-grid {
      display: grid;
      grid-template-columns: repeat(var(--days-count, 7), var(--cell-width, 1fr));
      grid-auto-rows: var(--cell-height, 36px);
      gap: var(--cell-gap, 2px);
    }

    /* Individual cells */
    .cell {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-radius: var(--cell-border-radius, 4px);
      cursor: pointer;
      transition: transform 0.1s ease, box-shadow 0.1s ease;
      position: relative;
      font-size: var(--cell-font-size, 11px);
      padding: var(--cell-padding, 2px);
      box-sizing: border-box;
    }

    /* Only apply hover effects on devices with a true hover-capable pointer.
       On touch devices, :hover is sticky after tap and can cause the cell to
       render on top of the more-info popup due to the transform stacking context. */
    @media (hover: hover) {
      .cell:hover:not(.no-data) {
        transform: scale(1.08);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        z-index: 10;
      }

      .cell.no-data:hover {
        transform: none;
        box-shadow: none;
      }
    }

    .cell:focus {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }

    .cell.no-data {
      background-color: var(--disabled-color, #f0f0f0);
      cursor: default;
      opacity: 0.4;
    }

    .cell.partial {
      border: 2px dashed currentColor;
      opacity: 0.9;
    }

    /* Gap-filled cell: estimated value from last known reading */
    .cell.filled {
      opacity: 0.6;
      border: 1px dashed currentColor;
    }

    .temperature {
      font-weight: bold;
      line-height: 1.1;
    }

    /* Footer with statistics */
    .footer {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid var(--divider-color);
      background: var(--card-background-color);
      font-size: 13px;
      color: var(--secondary-text-color);
    }

    .footer-stats {
      display: flex;
      justify-content: space-around;
      align-items: center;
    }

    .footer-stats span {
      font-weight: 500;
    }

    .entity-name {
      text-align: center;
      font-size: 11px;
      color: var(--secondary-text-color);
      opacity: 0.8;
    }

    /* Loading state */
    .loading {
      text-align: center;
      padding: 32px;
      color: var(--secondary-text-color);
    }

    .loading-spinner {
      display: inline-block;
      width: 24px;
      height: 24px;
      border: 3px solid var(--divider-color);
      border-top-color: var(--primary-color);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Error message */
    .error-message {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      margin: 16px;
      background: rgba(244, 67, 54, 0.1);
      color: var(--error-color, #f44336);
      border-radius: 4px;
      border-left: 4px solid var(--error-color, #f44336);
    }

    .error-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .error-text {
      flex: 1;
    }

    .error-details {
      font-size: 11px;
      margin-top: 4px;
      opacity: 0.8;
    }

    /* Tooltip */
    .tooltip {
      position: absolute;
      z-index: 1000;
      background: var(--card-background-color, white);
      border: 1px solid var(--divider-color);
      border-radius: 4px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
      padding: 8px 12px;
      font-size: 12px;
      pointer-events: none;
      max-width: 250px;
      line-height: 1.4;
    }

    .tooltip div {
      margin: 2px 0;
    }

    .tooltip strong {
      color: var(--primary-text-color);
    }

    /* Legend bar */
    .legend {
      padding: 8px 16px 12px;
      border-top: 1px solid var(--divider-color);
    }

    .legend-bar {
      height: 12px;
      border-radius: 3px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
    }

    .legend-labels {
      position: relative;
      height: 14px;
      margin-top: 4px;
      font-size: 9px;
      color: var(--secondary-text-color);
    }

    .legend-labels span {
      white-space: nowrap;
    }

    /* Compact header: reduces padding, title size, and nav arrow size */
    .compact-header .card-header {
      padding: 4px 8px;
      gap: 4px;
    }

    .compact-header .title {
      font-size: 14px;
    }

    .compact-header .nav-btn {
      width: 20px;
      height: 20px;
      font-size: 12px;
    }

    .compact-header .nav-btn-current {
      padding: 2px 6px;
      font-size: 11px;
    }

    .compact-header .month-header {
      font-size: 13px;
      margin-bottom: 4px;
      padding: 2px 0;
    }

    .compact-header .footer {
      padding: 6px 8px;
      gap: 4px;
      font-size: 11px;
    }

    /* Responsive adjustments */
    @media (max-width: 600px) {
      .data-grid {
        grid-auto-rows: calc(var(--cell-height, 36px) * 0.83);
      }

      .time-label {
        height: calc(var(--cell-height, 36px) * 0.83);
        font-size: calc(var(--cell-font-size, 11px) * 0.91);
      }

      .cell {
        font-size: calc(var(--cell-font-size, 11px) * 0.91);
      }

      .date-header {
        font-size: 11px;
      }
    }

    @media (max-width: 400px) {
      .card-header {
        flex-direction: column;
        align-items: stretch;
      }

      .nav-controls {
        justify-content: center;
      }
    }

    /* Accessibility: High contrast mode support */
    @media (prefers-contrast: high) {
      .cell:not(.no-data) {
        border: 1px solid currentColor;
      }
    }

    /* Accessibility: Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .cell,
      .nav-btn,
      .loading-spinner {
        transition: none;
        animation: none;
      }
    }
  `;
  return style;
}

// ---------------------------------------------------------------------------
// Main card component
// ---------------------------------------------------------------------------

// Temperature Heatmap Card - Main card component

/**
 * Temperature Heatmap Card - Main card component.
 * Displays temperature history as a color-coded heatmap.
 */
class TemperatureHeatmapCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Configuration and state
    this._config = {};
    this._hass = null;

    // Data caching
    this._historyData = null;
    this._processedData = null;
    this._lastFetch = 0;

    // Navigation state
    this._viewOffset = 0;  // Days offset from current (0=today, -7=week ago)

    // UI state
    this._isLoading = false;
    this._error = null;
    this._interval = null;

    // Initialize Shadow DOM
    this.shadowRoot.appendChild(createStyleElement());
    this._content = document.createElement('ha-card');
    this.shadowRoot.appendChild(this._content);

    // Event delegation for all clicks
    this._content.addEventListener('click', this._handleClick.bind(this));
    // Store cached responses in memory
    this._responseCache = new Map(); // key -> { data, expiry }
  }

  // Home Assistant required method: set card configuration
  setConfig(config) {
    // Validate required fields
    if (!config.entity) {
      throw new Error("'entity' is required (temperature sensor)");
    }

    // Validate time_interval
    const validIntervals = [1, 2, 3, 4, 6, 8, 12, 24];
    if (config.time_interval && !validIntervals.includes(config.time_interval)) {
      throw new Error(`time_interval must be one of: ${validIntervals.join(', ')}`);
    }

    // Validate days
    if (config.days && (config.days < 1 || config.days > 30)) {
      throw new Error('days must be between 1 and 30');
    }

    // Validate aggregation_mode
    const validAggregations = ['average', 'min', 'max'];
    if (config.aggregation_mode && !validAggregations.includes(config.aggregation_mode)) {
      throw new Error(`aggregation_mode must be one of: ${validAggregations.join(', ')}`);
    }

    // Validate color_interpolation
    const validInterpolations = ['rgb', 'gamma', 'hsl', 'lab'];
    if (config.color_interpolation && !validInterpolations.includes(config.color_interpolation)) {
      throw new Error(`color_interpolation must be one of: ${validInterpolations.join(', ')}`);
    }

    // Validate data_source
    const validDataSources = ['auto', 'history', 'statistics'];
    if (config.data_source && !validDataSources.includes(config.data_source)) {
      throw new Error(`data_source must be one of: ${validDataSources.join(', ')}`);
    }

    // Validate statistic_type
    const validStatisticTypes = ['mean', 'min', 'max'];
    if (config.statistic_type && !validStatisticTypes.includes(config.statistic_type)) {
      throw new Error(`statistic_type must be one of: ${validStatisticTypes.join(', ')}`);
    }

    // Validate decimals
    if (config.decimals !== undefined && (config.decimals < 0 || config.decimals > 2)) {
      throw new Error('decimals must be between 0 and 2');
    }

    // Validate start_hour
    if (config.start_hour !== undefined && (!Number.isInteger(config.start_hour) || config.start_hour < 0 || config.start_hour > 23)) {
      throw new Error('start_hour must be an integer between 0 and 23');
    }

    // Validate end_hour
    if (config.end_hour !== undefined && (!Number.isInteger(config.end_hour) || config.end_hour < 0 || config.end_hour > 23)) {
      throw new Error('end_hour must be an integer between 0 and 23');
    }

    // Validate cell sizing options
    if (config.cell_height !== undefined) {
      const height = typeof config.cell_height === 'number' ? config.cell_height : parseFloat(config.cell_height);
      if (isNaN(height) || height < 10 || height > 200) {
        throw new Error('cell_height must be between 10 and 200 pixels');
      }
    }

    if (config.cell_padding !== undefined) {
      const padding = typeof config.cell_padding === 'number' ? config.cell_padding : parseFloat(config.cell_padding);
      if (isNaN(padding) || padding < 0 || padding > 20) {
        throw new Error('cell_padding must be between 0 and 20 pixels');
      }
    }

    if (config.cell_gap !== undefined) {
      const gap = typeof config.cell_gap === 'number' ? config.cell_gap : parseFloat(config.cell_gap);
      if (isNaN(gap) || gap < 0 || gap > 20) {
        throw new Error('cell_gap must be between 0 and 20 pixels');
      }
    }

    if (config.cell_font_size !== undefined) {
      const fontSize = typeof config.cell_font_size === 'number' ? config.cell_font_size : parseFloat(config.cell_font_size);
      if (isNaN(fontSize) || fontSize < 6 || fontSize > 24) {
        throw new Error('cell_font_size must be between 6 and 24 pixels');
      }
    }

    if (config.cell_width !== undefined && typeof config.cell_width !== 'string') {
      const width = parseFloat(config.cell_width);
      if (isNaN(width) || width < 10 || width > 500) {
        throw new Error('cell_width as number must be between 10 and 500 pixels');
      }
    }

    // Build configuration with defaults
    this._config = {
      // Required
      entity: config.entity,

      // Display options
      title: config.title || 'Temperature History',
      days: config.days || 7,
      time_interval: config.time_interval || 2,
      time_format: config.time_format || '24',  // '12' or '24'

      // Hour filtering
      start_hour: config.start_hour !== undefined ? config.start_hour : 0,  // 0-23
      end_hour: config.end_hour !== undefined ? config.end_hour : 23,  // 0-23

      // Aggregation mode
      aggregation_mode: config.aggregation_mode || 'average',  // 'average', 'min', 'max'

      // Display precision
      decimals: config.decimals !== undefined ? config.decimals : 1,  // 0, 1, or 2

      // Units
      unit: config.unit || null,

      // Color thresholds - auto-detect based on unit if not provided or empty
      color_thresholds: (config.color_thresholds && config.color_thresholds.length > 0)
        ? config.color_thresholds
        : this._getDefaultThresholds(),

      // Refresh
      refresh_interval: config.refresh_interval || 300,  // Seconds (5 min default)

      // Interaction
      click_action: config.click_action || 'more-info',  // 'none', 'more-info', 'tooltip'

      // Display options
      show_entity_name: config.show_entity_name || false,
      show_legend: config.show_legend || false,
      show_degree_symbol: config.show_degree_symbol !== false,  // Default true

      // Cell sizing options
      cell_height: config.cell_height !== undefined ? config.cell_height : 36,
      cell_width: config.cell_width !== undefined ? config.cell_width : '1fr',
      cell_padding: config.cell_padding !== undefined ? config.cell_padding : 2,
      cell_gap: config.cell_gap !== undefined ? config.cell_gap : 2,
      cell_font_size: config.cell_font_size !== undefined ? config.cell_font_size : 11,
      compact: config.compact || false,

      // Visual options
      rounded_corners: config.rounded_corners !== false,  // Default true
      interpolate_colors: config.interpolate_colors || false,
      color_interpolation: config.color_interpolation || 'hsl',  // 'gamma', 'hsl', 'lab', 'rgb'

      // Data source options
      data_source: config.data_source || 'auto',  // 'auto', 'history', 'statistics'
      statistic_type: config.statistic_type || 'mean',  // 'mean', 'min', 'max' (for statistics data)

      // Gap filling: forward-fill last known value into empty buckets (use at your own risk)
      fill_gaps: config.fill_gaps || false,

      // Compact header: reduce padding around month/year label and shrink nav arrows
      compact_header: config.compact_header || false,
    };

    // Sort thresholds by value (ascending) - create mutable copy to avoid "read-only" errors
    this._config.color_thresholds = [...this._config.color_thresholds].sort((a, b) => a.value - b.value);

    // Set up refresh interval
    if (this._hass) {
      this._clearAndSetInterval();
    }
  }

  static getConfigElement() {
    return document.createElement("ha-temperature-heatmap-card-editor");
  }

  // Returns a minimal configuration that will result in a working card
  static getStubConfig(hass) {
    // Find the first temperature sensor
    const temperatureSensors = Object.keys(hass.states)
      .filter(entityId => {
        if (!entityId.startsWith('sensor.')) return false;
        const entity = hass.states[entityId];
        return entity?.attributes?.['device_class'] === 'temperature';
      });

    // Auto-detect unit from first sensor or HA config
    let thresholds = DEFAULT_THRESHOLDS_F.slice();  // Default to Fahrenheit
    if (temperatureSensors.length > 0) {
      const unit = hass.states[temperatureSensors[0]]?.attributes?.unit_of_measurement || '';
      if (unit.toLowerCase().includes('c') || unit === '°C') {
        thresholds = DEFAULT_THRESHOLDS_C.slice();
      }
    }

    return {
      entity: temperatureSensors.length > 0 ? temperatureSensors[0] : '',
      title: 'Temperature History',
      days: 7,
      time_interval: 2,
      aggregation_mode: 'average',
      color_thresholds: thresholds
    };
  }

  // Get default thresholds based on detected unit
  _getDefaultThresholds() {
    const unit = this._getUnit().toLowerCase();
    return getDefaultThresholdsForUnit(unit);
  }

  // Home Assistant required method: receive hass object updates
  set hass(hass) {
    this._hass = hass;

    if (!this._config || !this.isConnected) return;

    // Only fetch if viewing current data and data is stale
    if (this._viewOffset === 0 && this._isDataStale()) {
      this._fetchHistoryData();
    }
  }

  // Home Assistant required method: return card height hint
  getCardSize() {
    // Calculate based on number of rows (time slots) and dynamic cell height
    const rows = this._processedData ? this._processedData.rows.length : 12;
    const sizing = this._getEffectiveSizing();
    const cellHeightPx = parseFloat(sizing.cellHeight) || 36;

    // Each row = cellHeight, plus header ~60px, plus footer ~40px, divided by 50px per card unit
    return Math.ceil((rows * cellHeightPx + 100) / 50);
  }

  // Lifecycle: component connected to DOM
  connectedCallback() {
    if (this._config && this._hass) {
      this._clearAndSetInterval();
    }
  }

  // Lifecycle: component disconnected from DOM
  disconnectedCallback() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  // Set up or refresh the data fetch interval
  _clearAndSetInterval() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }

    // Fetch immediately
    this._fetchHistoryData();

    // Set up periodic refresh (only when viewing current data)
    const intervalMs = this._config.refresh_interval * 1000;
    this._interval = setInterval(() => {
      if (this._viewOffset === 0) {
        this._fetchHistoryData();
      }
    }, intervalMs);
  }

  // Check if cached data is stale
  _isDataStale() {
    if (!this._historyData || !this._lastFetch) return true;

    const age = Date.now() - this._lastFetch;
    const maxAge = this._config.refresh_interval * 1000;

    return age > maxAge;
  }

  async fetchWithCache(url, timeoutMs = 30000, ttlMs = 5 * 60 * 1000) {
    const now = Date.now();
    // Include viewOffset in cache key to prevent stale data when navigating
    const cacheKey = `${url}_offset${this._viewOffset}`;

    // Check if the cache has a valid entry
    const cached = this._responseCache.get(cacheKey);
    if (cached && cached.expiry > now) {
      console.log('Using cached data for:', cacheKey);
      return cached.data;
    }

    // Fetch with timeout
    const fetchPromise = this._hass.callApi('GET', url);

    const data = await Promise.race([
      fetchPromise,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Request timeout after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ]);

    // Store in cache
    this._responseCache.set(cacheKey, { data, expiry: now + ttlMs });
    return data;
  }

  // Determine which data source to use based on config and availability
  _getDataSource() {
    const source = this._config.data_source;

    if (source === 'history') return 'history';
    if (source === 'statistics') return 'statistics';

    // Auto mode: prefer statistics for historical data (viewOffset < 0)
    // or when explicitly looking at older data
    // Statistics are hourly aggregates - good for longer time ranges
    if (this._viewOffset < 0) {
      return 'statistics';
    }

    // For current view, use history for more granular data
    return 'history';
  }

  // Fetch historical data from Home Assistant
  async _fetchHistoryData() {
    if (this._isLoading) {
      console.log('Temperature Heatmap: Already loading, skipping duplicate fetch');
      return;
    }

    this._isLoading = true;
    this._error = null;
    this._render();  // Show loading state

    const dataSource = this._getDataSource();
    console.log(`Temperature Heatmap: Starting data fetch using ${dataSource}...`);

    try {
      // Calculate date range in LOCAL timezone, including current partial interval
      const now = new Date();

      let endTime;

      // Calculate the current partial bucket key (only used when viewing current time)
      let partialBucketKey = null;

      if (this._viewOffset === 0) {
        // Current view: use current time to include partial bucket data
        endTime = new Date(now);

        // Calculate which bucket is currently in progress
        const intervalHours = this._config.time_interval;
        const currentDateKey = getDateKey(now);
        const currentHourBucket = getHourBucket(now.getHours(), intervalHours);
        partialBucketKey = `${currentDateKey}_${currentHourBucket}`;
      } else {
        // Historical view: use end of the target day
        endTime = new Date(now);
        endTime.setDate(endTime.getDate() + this._viewOffset);
        endTime.setHours(23, 59, 59, 999);  // End of day
      }

      // Calculate start time (N days before end time)
      const startTime = new Date(endTime);
      startTime.setDate(startTime.getDate() - this._config.days + 1);
      startTime.setHours(0, 0, 0, 0);  // Start of first day at midnight

      console.log(`Temperature Heatmap: Fetching from ${startTime.toLocaleString()} to ${endTime.toLocaleString()}`);
      if (partialBucketKey) {
        console.log(`Temperature Heatmap: Current partial bucket: ${partialBucketKey}`);
      }

      if (dataSource === 'statistics') {
        await this._fetchStatisticsData(startTime, endTime, partialBucketKey);
      } else {
        await this._fetchHistoryApiData(startTime, endTime, partialBucketKey);
      }

      this._lastFetch = Date.now();

      // Process and render data
      const startProcess = Date.now();
      this._processData();
      const processDuration = ((Date.now() - startProcess) / 1000).toFixed(2);
      console.log(`Temperature Heatmap: Processed data in ${processDuration}s`);

      // Clear loading state BEFORE final render
      this._isLoading = false;

      console.log('Temperature Heatmap: Starting render...');
      this._render();
      console.log('Temperature Heatmap: Render complete');

    } catch (error) {
      console.error('Temperature Heatmap: Fetch error:', error);
      this._isLoading = false;
      this._error = {
        message: 'Failed to fetch temperature history',
        details: error.message
      };
      this._render();
    }
  }

  // Fetch data using the history/period REST API (short-term states)
  async _fetchHistoryApiData(startTime, endTime, partialBucketKey = null) {
    const startTimeISO = startTime.toISOString();
    const endTimeISO = endTime.toISOString();

    console.log(`Temperature Heatmap: Using history API - Start: ${startTimeISO}, End: ${endTimeISO}`);

    // Build API URL
    const temperatureUrl = `history/period/${startTimeISO}?` +
      `filter_entity_id=${this._config.entity}&` +
      `end_time=${endTimeISO}&` +
      `minimal_response&no_attributes`;

    // Fetch with timeout
    const startFetch = Date.now();
    const result = await this.fetchWithCache(temperatureUrl);
    const fetchDuration = ((Date.now() - startFetch) / 1000).toFixed(1);

    console.log(`Temperature Heatmap: Received ${result?.[0]?.length || 0} temperature points in ${fetchDuration}s`);

    this._historyData = {
      temperature: result?.[0] || [],
      startTime,
      endTime,
      partialBucketKey,
      dataSource: 'history'
    };
  }

  // Fetch data using the recorder/statistics_during_period WebSocket API (long-term statistics)
  async _fetchStatisticsData(startTime, endTime, partialBucketKey = null) {
    const startTimeISO = startTime.toISOString();
    const endTimeISO = endTime.toISOString();

    console.log(`Temperature Heatmap: Using statistics API - Start: ${startTimeISO}, End: ${endTimeISO}`);

    // Fetch with timeout to prevent hanging
    const fetchWithTimeout = (promise, timeoutMs = 30000) => {
      return Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout after 30 seconds')), timeoutMs)
        )
      ]);
    };

    const startFetch = Date.now();

    // Call the WebSocket API for statistics
    // The API returns hourly aggregated data (mean, min, max) from the statistics table
    const statsResult = await fetchWithTimeout(
      this._hass.callWS({
        type: 'recorder/statistics_during_period',
        start_time: startTimeISO,
        end_time: endTimeISO,
        statistic_ids: [this._config.entity],
        period: 'hour',  // Hourly aggregates
      })
    );

    const fetchDuration = ((Date.now() - startFetch) / 1000).toFixed(1);

    // Convert statistics format to history format for processing
    // Statistics API returns: { "sensor.entity": [{ start, end, mean, min, max, sum, state }, ...] }
    const temperatureStats = statsResult[this._config.entity] || [];

    console.log(`Temperature Heatmap: Received ${temperatureStats.length} temperature stats in ${fetchDuration}s`);

    // Convert statistics to a format compatible with our processing
    // Each stat has: start (ISO string), mean, min, max
    const statisticType = this._config.statistic_type;  // 'mean', 'min', or 'max'

    const temperatureData = temperatureStats.map(stat => ({
      last_changed: stat.start,
      state: String(stat[statisticType] ?? stat.mean ?? ''),
    })).filter(point => point.state !== '' && point.state !== 'null');

    this._historyData = {
      temperature: temperatureData,
      startTime,
      endTime,
      partialBucketKey,
      dataSource: 'statistics'
    };
  }

  // Process raw history data into grid structure
  _processData() {
    if (!this._historyData) {
      this._processedData = null;
      return;
    }

    const { temperature, startTime, partialBucketKey } = this._historyData;
    const intervalHours = this._config.time_interval;
    const rowsPerDay = 24 / intervalHours;

    // Build grid with bucketed data
    // Key format: "YYYY-MM-DD_HH" -> { sum, count, min, max }
    const grid = {};

    // Process temperature data into time buckets using optimized running statistics
    temperature.forEach(point => {
      const timestamp = new Date(point.last_changed || point.last_updated);
      const dateKey = getDateKey(timestamp);
      const hourKey = getHourBucket(timestamp.getHours(), intervalHours);
      const key = `${dateKey}_${hourKey}`;

      if (!grid[key]) {
        grid[key] = { sum: 0, count: 0, min: null, max: null };
      }

      const value = parseFloat(point.state);
      if (!isNaN(value)) {
        grid[key].sum += value;
        grid[key].count += 1;
        grid[key].min = grid[key].min === null ? value : Math.min(grid[key].min, value);
        grid[key].max = grid[key].max === null ? value : Math.max(grid[key].max, value);
      }
    });

    // Calculate aggregated temperature for each bucket based on mode
    Object.keys(grid).forEach(key => {
      const bucket = grid[key];
      if (bucket.count > 0) {
        switch (this._config.aggregation_mode) {
          case 'min':
            bucket.temperature = bucket.min;
            break;
          case 'max':
            bucket.temperature = bucket.max;
            break;
          case 'average':
          default:
            bucket.temperature = bucket.sum / bucket.count;
            break;
        }
      } else {
        bucket.temperature = null;
      }
    });

    // Build row/column structure for grid
    const dates = [];
    for (let d = 0; d < this._config.days; d++) {
      const date = new Date(startTime);
      date.setDate(date.getDate() + d);
      dates.push(date);
    }

    const rows = [];
    let allTemperatures = [];

    // Create rows for each time slot
    for (let h = 0; h < rowsPerDay; h++) {
      const hour = h * intervalHours;
      const row = {
        hour,
        label: formatHourLabel(hour, this._config.time_format),
        cells: dates.map(date => {
          const dateKey = getDateKey(date);
          const key = `${dateKey}_${hour}`;
          const bucket = grid[key];

          const cell = {
            date,
            temperature: bucket?.temperature ?? null,
            hasData: bucket && bucket.temperature !== null,
            isPartial: partialBucketKey && key === partialBucketKey
          };

          if (cell.temperature !== null) {
            allTemperatures.push(cell.temperature);
          }

          return cell;
        })
      };
      rows.push(row);
    }

    // Optional gap filling: forward-fill the last known value into empty buckets.
    // Filling is done per-column (day) so gaps don't propagate across day boundaries.
    // Filled cells are marked isFilled=true for visual distinction.
    if (this._config.fill_gaps) {
      for (let colIndex = 0; colIndex < dates.length; colIndex++) {
        let lastKnownTemp = null;
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
          const cell = rows[rowIndex].cells[colIndex];
          if (cell.hasData) {
            lastKnownTemp = cell.temperature;
          } else if (lastKnownTemp !== null) {
            // Fill with last known value
            cell.temperature = lastKnownTemp;
            cell.hasData = true;
            cell.isFilled = true;
          }
        }
      }
    }

    // Filter rows based on start_hour/end_hour configuration
    // This affects both display and statistics
    const filteredRows = rows.filter(row => this._shouldDisplayRow(row.hour));

    // Collect all temperatures from filtered rows only for statistics
    allTemperatures = [];
    filteredRows.forEach(row => {
      row.cells.forEach(cell => {
        if (cell.temperature !== null) {
          allTemperatures.push(cell.temperature);
        }
      });
    });

    // Calculate statistics
    const stats = {
      min: allTemperatures.length > 0 ? Math.min(...allTemperatures) : 0,
      max: allTemperatures.length > 0 ? Math.max(...allTemperatures) : 0,
      avg: allTemperatures.length > 0
        ? allTemperatures.reduce((a, b) => a + b, 0) / allTemperatures.length
        : 0
    };

    this._processedData = { rows: filteredRows, dates, stats };
  }

  // Check if a row with given hour should be displayed based on start_hour/end_hour filter
  _shouldDisplayRow(rowHour) {
    const startHour = this._config.start_hour;
    const endHour = this._config.end_hour;

    // Normal range: start_hour <= end_hour (e.g., 8 to 17)
    if (startHour <= endHour) {
      return rowHour >= startHour && rowHour <= endHour;
    }

    // Wrap-around range: start_hour > end_hour (e.g., 22 to 5)
    // Display if hour is >= start (22, 23) OR <= end (0, 1, 2, 3, 4, 5)
    return rowHour >= startHour || rowHour <= endHour;
  }

  // Main render method
  _render() {
    if (!this._config || !this._hass) return;

    this._content.innerHTML = `
      <div class="card-header">
        <span class="title">${escapeHtml(this._config.title)}</span>
        ${this._renderNavControls()}
      </div>

      ${this._error ? this._renderError() : ''}
      ${this._isLoading ? this._renderLoading() : ''}
      ${this._processedData && !this._error ? this._renderGrid() : ''}
      ${this._processedData && !this._error && this._config.show_legend ? this._renderLegend() : ''}
      ${this._processedData && !this._error ? this._renderFooter() : ''}
    `;

    // Apply compact-header class to card element
    this._content.classList.toggle('compact-header', !!this._config.compact_header);

    // Set CSS variables for grid layout and cell sizing
    if (this._processedData) {
      this._content.style.setProperty('--days-count', this._config.days);

      const sizing = this._getEffectiveSizing();
      this._content.style.setProperty('--cell-height', sizing.cellHeight);
      this._content.style.setProperty('--cell-width', sizing.cellWidth);
      this._content.style.setProperty('--cell-padding', sizing.cellPadding);
      this._content.style.setProperty('--cell-gap', sizing.cellGap);
      this._content.style.setProperty('--cell-font-size', sizing.cellFontSize);
      this._content.style.setProperty('--cell-border-radius', this._config.rounded_corners ? '4px' : '0');
    }
  }

  // Render navigation controls
  _renderNavControls() {
    const canGoForward = this._viewOffset < 0;
    const showCurrentButton = this._viewOffset < 0;
    const dateRange = this._getDateRangeLabel();

    return `
      <div class="nav-controls">
        <button class="nav-btn" data-direction="back" aria-label="Previous period">&larr;</button>
        <span class="date-range">${dateRange}</span>
        <button class="nav-btn" data-direction="forward"
                ${canGoForward ? '' : 'disabled'}
                aria-label="Next period">&rarr;</button>
        <button class="nav-btn-current ${showCurrentButton ? '' : 'hidden'}"
                data-direction="current"
                aria-label="Jump to current"
                ${showCurrentButton ? '' : 'aria-hidden="true"'}>Current</button>
      </div>
    `;
  }

  // Get date range label for display
  _getDateRangeLabel() {
    if (!this._processedData) return '';

    const { dates } = this._processedData;
    const start = dates[0];
    const end = dates[dates.length - 1];

    const formatOpts = { month: 'short', day: 'numeric' };
    const startStr = start.toLocaleDateString(undefined, formatOpts);
    const endStr = end.toLocaleDateString(undefined, formatOpts);

    return `${startStr} - ${endStr}`;
  }

  // Render loading state
  _renderLoading() {
    return `
      <div class="loading">
        <div class="loading-spinner"></div>
        <div style="margin-top: 8px;">Loading temperature data...</div>
      </div>
    `;
  }

  // Render error state
  _renderError() {
    return `
      <div class="error-message">
        <div class="error-icon">!</div>
        <div class="error-text">
          <strong>${escapeHtml(this._error.message)}</strong>
          <div class="error-details">${escapeHtml(this._error.details)}</div>
        </div>
      </div>
    `;
  }

  // Render heatmap grid
  _renderGrid() {
    const { rows, dates } = this._processedData;

    // Month header
    const monthName = dates[0].toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric'
    });

    // Date headers
    const dateHeaders = dates.map(date => {
      const day = date.getDate();
      return `<div class="date-header">${day}</div>`;
    }).join('');

    // Time labels (separate column)
    const timeLabels = rows.map(row =>
      `<div class="time-label">${row.label}</div>`
    ).join('');

    // Data cells
    const dataCells = rows.map(row =>
      row.cells.map(cell => this._renderCell(cell)).join('')
    ).join('');

    return `
      <div class="heatmap-grid">
        <div class="month-header">${monthName}</div>
        <div class="grid-wrapper">
          <div class="time-labels">
            ${timeLabels}
          </div>
          <div class="data-grid-container">
            <div class="date-headers">
              ${dateHeaders}
            </div>
            <div class="data-grid">
              ${dataCells}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Render individual cell
  _renderCell(cell) {
    if (!cell.hasData) {
      return `<div class="cell no-data"><span class="temperature">-</span></div>`;
    }

    const thresholds = this._config.color_thresholds;
    const interpolate = this._config.interpolate_colors;
    const method = this._config.color_interpolation;
    const bgColor = getColorForTemperature(cell.temperature, thresholds, interpolate, method);
    const textColor = getContrastTextColor(bgColor);
    const decimals = this._config.decimals;

    // Add asterisk indicator for partial (in-progress) buckets
    const partialIndicator = cell.isPartial ? '*' : '';
    const partialLabel = cell.isPartial ? ' (in progress)' : '';
    const filledLabel = cell.isFilled ? ' (estimated)' : '';

    // Build CSS class list
    let cellClass = 'cell';
    if (cell.isPartial) cellClass += ' partial';
    if (cell.isFilled) cellClass += ' filled';

    return `
      <div class="${cellClass}"
           style="background-color: ${bgColor}; color: ${textColor}"
           data-temperature="${cell.temperature}"
           data-date="${cell.date.toISOString()}"
           data-partial="${cell.isPartial ? 'true' : 'false'}"
           data-filled="${cell.isFilled ? 'true' : 'false'}"
           tabindex="0"
           role="button"
           aria-label="Temperature ${cell.temperature.toFixed(decimals)}${partialLabel}${filledLabel}">
        <span class="temperature">${cell.temperature.toFixed(decimals)}${partialIndicator}</span>
      </div>
    `;
  }

  // Render legend bar
  _renderLegend() {
    const thresholds = this._config.color_thresholds;
    if (!thresholds || thresholds.length === 0) return '';

    const unit = this._getUnit();
    const interpolate = this._config.interpolate_colors;
    const method = this._config.color_interpolation;

    const minVal = thresholds[0].value;
    const maxVal = thresholds[thresholds.length - 1].value;
    const range = maxVal - minVal || 1;

    let gradientStops;

    if (interpolate && thresholds.length >= 2) {
      const stops = [];

      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const value = minVal + t * range;
        const color = getColorForTemperature(value, thresholds, true, method);
        stops.push(`${color} ${(t * 100).toFixed(1)}%`);
      }

      gradientStops = stops.join(', ');
    } else {
      const stops = [];

      for (let i = 0; i < thresholds.length; i++) {
        const current = thresholds[i];
        const pct = ((current.value - minVal) / range) * 100;

        stops.push(`${current.color} ${pct.toFixed(1)}%`);

        if (i < thresholds.length - 1) {
          const next = thresholds[i + 1];
          const nextPct = ((next.value - minVal) / range) * 100;

          stops.push(`${current.color} ${nextPct.toFixed(1)}%`);
        }
      }

      gradientStops = stops.join(', ');
    }

    // Scale-aware label positioning with collision detection.
    // Labels that would render within MIN_LABEL_SPACING% of the previous
    // visible label are skipped, preventing overlapping text on dense
    // threshold configurations (e.g. default F thresholds at high end).
    const MIN_LABEL_SPACING = 8; // percent of bar width
    let lastLabelPct = -Infinity;
    const labels = thresholds.map(t => {
      const pct = ((t.value - minVal) / range) * 100;
      if (pct - lastLabelPct < MIN_LABEL_SPACING) return '';
      lastLabelPct = pct;
      return `<span style="position:absolute; left:${pct.toFixed(1)}%;">${t.value}${unit}</span>`;
    }).join('');

    return `
    <div class="legend">
      <div class="legend-bar" style="background: linear-gradient(to right, ${gradientStops})"></div>
      <div class="legend-labels" style="position:relative;">
        ${labels}
      </div>
    </div>
  `;
  }


  // Render footer with statistics
  _renderFooter() {
    const { stats } = this._processedData;
    const unit = this._getUnit();
    const decimals = this._config.decimals;

    let entityName = '';
    if (this._config.show_entity_name) {
      const stateObj = this._hass?.states[this._config.entity];
      const friendlyName = stateObj?.attributes?.friendly_name || this._config.entity;
      entityName = `<div class="entity-name">${escapeHtml(friendlyName)}</div>`;
    }

    return `
      <div class="footer">
        <div class="footer-stats">
          <span>Min: ${stats.min.toFixed(decimals)} ${unit}</span>
          <span>Max: ${stats.max.toFixed(decimals)} ${unit}</span>
          <span>Avg: ${stats.avg.toFixed(decimals)} ${unit}</span>
        </div>
        ${entityName}
      </div>
    `;
  }

  // Get unit of measurement for temperature
  _getUnit() {
    let unit;

    // Try config first
    if (this._config.unit) {
      unit = this._config.unit;
    } else {
      // Auto-detect from entity attributes
      const stateObj = this._hass?.states[this._config.entity];
      unit = stateObj?.attributes?.unit_of_measurement || '°F';
    }

    // Strip degree symbol if show_degree_symbol is false
    if (!this._config.show_degree_symbol) {
      unit = unit.replace('°', '');
    }

    return unit;
  }

  // Handle all click events (event delegation)
  _handleClick(e) {
    // Navigation buttons (both regular nav-btn and nav-btn-current)
    const navBtn = e.target.closest('.nav-btn, .nav-btn-current');
    if (navBtn && !navBtn.disabled) {
      const direction = navBtn.dataset.direction;
      this._handleNavigation(direction);
      return;
    }

    // Cell clicks
    const cell = e.target.closest('.cell');
    if (cell && !cell.classList.contains('no-data')) {
      this._handleCellClick(cell);
    }
  }

  // Handle navigation button clicks
  _handleNavigation(direction) {
    if (direction === 'back') {
      // Go back one period
      this._viewOffset -= this._config.days;
    } else if (direction === 'forward') {
      // Go forward one period
      this._viewOffset += this._config.days;
      // Don't allow going into the future
      if (this._viewOffset > 0) {
        this._viewOffset = 0;
      }
    } else if (direction === 'current') {
      // Jump to current view
      this._viewOffset = 0;
    }

    // Fetch new data for the offset period
    this._fetchHistoryData();
  }

  // Handle cell click events
  _handleCellClick(cellElement) {
    const action = this._config.click_action;

    switch (action) {
      case 'more-info':
        this._showMoreInfo();
        break;
      case 'tooltip':
        this._showTooltip(cellElement);
        break;
      default:
        // No action
        break;
    }
  }

  // Show Home Assistant more-info dialog
  _showMoreInfo() {
    this.dispatchEvent(new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId: this._config.entity }
    }));
  }

  // Show tooltip with cell details
  _showTooltip(cellElement) {
    const temperature = parseFloat(cellElement.dataset.temperature);
    const date = new Date(cellElement.dataset.date);
    const isPartial = cellElement.dataset.partial === 'true';
    const isFilled = cellElement.dataset.filled === 'true';

    // Remove any existing tooltip
    const existing = this.shadowRoot.querySelector('.tooltip');
    if (existing) {
      existing.remove();
    }

    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';

    const dateStr = date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric'
    });

    const unit = this._getUnit();
    const decimals = this._config.decimals;
    const partialNote = isPartial ? '<div><em>(in progress)</em></div>' : '';
    const filledNote = isFilled ? '<div><em>(estimated - gap filled)</em></div>' : '';

    tooltip.innerHTML = `
      <div><strong>${dateStr}</strong></div>
      <div>Temperature: ${temperature.toFixed(decimals)} ${unit}</div>
      <div>Mode: ${this._config.aggregation_mode}</div>
      ${partialNote}
      ${filledNote}
    `;

    // Position tooltip near the cell
    const rect = cellElement.getBoundingClientRect();
    const parentRect = this._content.getBoundingClientRect();
    tooltip.style.left = `${rect.left - parentRect.left + rect.width / 2}px`;
    tooltip.style.top = `${rect.bottom - parentRect.top + 4}px`;
    tooltip.style.transform = 'translateX(-50%)';

    this._content.appendChild(tooltip);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (tooltip.parentElement) {
        tooltip.remove();
      }
    }, 3000);
  }

  // Get effective sizing configuration (handles compact mode override)
  _getEffectiveSizing() {
    // If compact mode is enabled, use preset values
    if (this._config.compact) {
      return {
        cellHeight: "24px",
        cellWidth: "1fr",
        cellPadding: "1px",
        cellGap: "1px",
        cellFontSize: "9px",
      };
    }

    // Otherwise use configured or default values
    return {
      cellHeight: normalizeSize(this._config.cell_height, "36px"),
      cellWidth: normalizeSize(this._config.cell_width, "1fr"),
      cellPadding: normalizeSize(this._config.cell_padding, "2px"),
      cellGap: normalizeSize(this._config.cell_gap, "2px"),
      cellFontSize: normalizeSize(this._config.cell_font_size, "11px"),
    };
  }
}

// ---------------------------------------------------------------------------
// Visual editor
// ---------------------------------------------------------------------------

// Visual configuration editor for the Temperature Heatmap Card

/**
 * Visual editor for the Temperature Heatmap Card.
 * Provides a UI for configuring all card options.
 */
class TemperatureHeatmapCardEditor extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (!this.content) this._buildEditor();
  }

  async setConfig(config) {
    // Clone to avoid modifying the read-only object
    this._config = { ...(config || {}) };

    // Ensure that the entity picker element is available to us before we render.
    // https://github.com/thomasloven/hass-config/wiki/PreLoading-Lovelace-Elements
    const helpers = await window.loadCardHelpers();
    if (!customElements.get('ha-entity-picker')) {
      const entitiesCard = await helpers.createCardElement({
        type: 'entities',
        entities: [],
      });
      await entitiesCard.constructor.getConfigElement();
    }

    // Default values
    const defaults = {
      entity: '',
      title: 'Temperature History',
      days: 7,
      time_interval: 2,
      time_format: '24',
      start_hour: 0,
      end_hour: 23,
      aggregation_mode: 'average',
      decimals: 1,
      unit: '',
      refresh_interval: 300,
      click_action: 'more-info',
      show_entity_name: false,
      show_legend: false,
      cell_height: 36,
      cell_width: '1fr',
      cell_padding: 2,
      cell_gap: 2,
      cell_font_size: 11,
      compact: false,
      compact_header: false,
      rounded_corners: true,
      interpolate_colors: false,
      color_interpolation: 'hsl',
      color_thresholds: [],  // Empty array - editor will populate, card auto-detects if empty
      data_source: 'auto',
      statistic_type: 'mean',
      fill_gaps: false,
    };
    this._config = { ...defaults, ...this._config };

    if (this.content) this._updateValues();
  }

  getConfig() {
    return { ...this._config };
  }

  _buildEditor() {
    this.content = document.createElement('div');
    this.content.style.display = 'grid';
    this.content.style.gridGap = '8px';
    this.content.style.padding = '8px';
    this.appendChild(this.content);

    this.container_threshold = {};
    this.fields = {};

    // Field definitions
    const fields = [
      { type: 'entity', key: 'entity', label: 'Entity', required: true },
      { type: 'text', key: 'title', label: 'Title' },
      { type: 'number', key: 'days', label: 'Days', min: 1, max: 365 },
      { type: 'number', key: 'time_interval', label: 'Time Interval (hours)', min: 1, max: 24 },
      { type: 'select', key: 'time_format', label: 'Time Format', options: { 24: '24h', 12: '12h' } },
      { type: 'number', key: 'start_hour', label: 'Start Hour', min: 0, max: 23 },
      { type: 'number', key: 'end_hour', label: 'End Hour', min: 0, max: 23 },
      { type: 'select', key: 'aggregation_mode', label: 'Aggregation Mode', options: { average: 'Average', min: 'Min', max: 'Max' } },
      { type: 'select', key: 'data_source', label: 'Data Source', options: { 'auto': 'Auto (statistics for past, history for current)', 'history': 'History only (limited by purge_keep_days)', 'statistics': 'Statistics only (long-term hourly data)' } },
      { type: 'select', key: 'statistic_type', label: 'Statistic Type', options: { 'mean': 'Average', 'max': 'Maximum', 'min': 'Minimum' } },
      { type: 'number', key: 'decimals', label: 'Decimals', min: 0, max: 2 },
      { type: 'select', key: 'unit', label: 'Unit', options: { '°C': 'Celsius', '°F': 'Fahrenheit' } },
      { type: 'number', key: 'refresh_interval', label: 'Refresh Interval (s)', min: 10, max: 3600 },
      { type: 'select', key: 'click_action', label: 'Click Action', options: { none: 'None', 'more-info': 'More Info', tooltip: 'Tooltip' } },
      { type: 'switch', key: 'show_entity_name', label: 'Show Entity Name' },
      { type: 'switch', key: 'show_legend', label: 'Show Legend' },
      { type: 'switch', key: 'show_degree_symbol', label: 'Show Degree Symbol (°)' },
      { type: 'number', key: 'cell_height', label: 'Cell Height', min: 10, max: 200 },
      { type: 'text', key: 'cell_width', label: 'Cell Width (px or fr)' },
      { type: 'number', key: 'cell_padding', label: 'Cell Padding', min: 0, max: 50 },
      { type: 'number', key: 'cell_gap', label: 'Cell Gap', min: 0, max: 50 },
      { type: 'number', key: 'cell_font_size', label: 'Cell Font Size', min: 6, max: 32 },
      { type: 'switch', key: 'compact', label: 'Compact Mode' },
      { type: 'switch', key: 'compact_header', label: 'Compact Header' },
      { type: 'switch', key: 'rounded_corners', label: 'Rounded Corners' },
      { type: 'switch', key: 'interpolate_colors', label: 'Interpolate Colors' },
      { type: 'select', key: 'color_interpolation', label: 'Color Interpolation', options: { rgb: 'RGB', gamma: 'Gamma RGB', hsl: 'HSL', lab: 'LAB' } },
      { type: 'switch', key: 'fill_gaps', label: 'Fill Gaps - use at your own risk (forward-fills last known value into empty buckets)' },
      { type: 'thresholds', key: 'color_thresholds', label: 'Colors' },
    ];

    // Create fields dynamically
    fields.forEach((f) => this._createField(f));

    this._updateValues();
  }

  _createThresholdEditor() {
    // Function to create a threshold row
    const createRow = (threshold, index) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '8px';

      const valueInput = document.createElement('ha-textfield');
      valueInput.type = 'number';
      valueInput.value = threshold.value;

      valueInput.addEventListener('change', (e) => {
        e.stopPropagation();
        const newThresholds = [...this._config.color_thresholds];
        const updatedThreshold = { ...this._config.color_thresholds[index] };
        updatedThreshold.value = Number(e.target.value);
        newThresholds[index] = updatedThreshold;
        this._onFieldChange('color_thresholds', newThresholds);
        this._refreshThresholdEditor();
      });

      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = threshold.color;
      colorInput.addEventListener('change', (e) => {
        e.stopPropagation();
        const newThresholds = [...this._config.color_thresholds];
        const updatedThreshold = { ...this._config.color_thresholds[index] };
        updatedThreshold.color = e.target.value;
        newThresholds[index] = updatedThreshold;
        this._onFieldChange('color_thresholds', newThresholds);
        this._refreshThresholdEditor();
      });

      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'X';
      removeBtn.style.cursor = 'pointer';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const newThresholds = [...this._config.color_thresholds];
        newThresholds.splice(index, 1);
        this._onFieldChange('color_thresholds', newThresholds);
        this._refreshThresholdEditor();
      });

      row.appendChild(valueInput);
      row.appendChild(colorInput);
      row.appendChild(removeBtn);
      this.container_threshold.appendChild(row);
    };

    // Create all rows
    if (!this._config.color_thresholds) this._config.color_thresholds = [];
    this._config.color_thresholds.forEach((t, i) => createRow(t, i));
  }

  _refreshThresholdEditor() {
    // Remove old rows and recreate
    while (this.container_threshold.firstChild) {
      this.container_threshold.removeChild(this.container_threshold.firstChild);
    }
    this._createThresholdEditor();
  }

  _updateValues() {
    if (!this._config) return;
    for (const key in this.fields) {
      const input = this.fields[key].input;
      if (this.fields[key].type === 'checkbox' || this.fields[key].type === 'switch') {
        input.checked = !!this._config[key];
      } else if (this.fields[key].type === 'thresholds') {
        this._refreshThresholdEditor();
      } else {
        input.value = this._config[key] !== undefined ? this._config[key] : '';
      }
    }
  }

  // Generic function to create a field
  _createField({ type, key, label, min, max, options, required }) {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.marginBottom = '8px';

    let input;

    if (type === 'switch') {
      // Switch / checkbox
      wrapper.style.flexDirection = 'row';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '8px';

      input = document.createElement('ha-switch');

      const lbl = document.createElement('label');
      lbl.textContent = label;

      wrapper.appendChild(input);
      wrapper.appendChild(lbl);

      input.addEventListener('change', (e) => {
        e.stopPropagation();
        this._onFieldChange(key, input.checked);
      });
    } else if (type === 'thresholds') {
      const lbl = document.createElement('label');
      lbl.textContent = label;
      wrapper.appendChild(lbl);

      // Container for the list
      const list = document.createElement('div');
      list.style.display = 'grid';
      list.style.gridGap = '8px';
      wrapper.appendChild(list);

      this.container_threshold = list;

      // Button to add a threshold
      const addBtn = document.createElement('button');
      addBtn.textContent = 'Add Threshold';
      addBtn.style.marginTop = '8px';
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const newThresholds = [...this._config.color_thresholds];
        newThresholds.push({ value: 0, color: '#ffffff' });
        this._onFieldChange(key, newThresholds);
      });

      wrapper.appendChild(addBtn);
    } else {
      // All other types with label above
      const lbl = document.createElement('label');
      lbl.textContent = label;
      wrapper.appendChild(lbl);

      if (type === 'entity') {
        input = document.createElement('ha-entity-picker');
        input.setAttribute('allow-custom-entity', '');
        input.hass = this._hass;

        input.addEventListener('value-changed', (e) => {
          e.stopPropagation();
          this._onFieldChange(key, e.detail.value);
        });
      } else if (type === 'number' || type === 'text') {
        input = document.createElement('ha-textfield');
        input.type = type;
        if (min !== undefined) input.min = min;
        if (max !== undefined) input.max = max;
        if (required) input.required = true;

        input.addEventListener('change', (e) => {
          e.stopPropagation();
          const value = type === 'number' ? Number(input.value) : input.value;
          this._onFieldChange(key, value);
        });
      } else if (type === 'select') {
        input = document.createElement('ha-select');
        for (const val in options) {
          const opt = document.createElement('mwc-list-item');
          opt.value = val;
          opt.innerText = options[val];
          input.appendChild(opt);
        }

        input.addEventListener('selected', (e) => {
          e.stopPropagation();
          this._onFieldChange(key, e.target.value);
        });
        input.addEventListener('closed', (e) => {
          e.stopPropagation();
        });
      }

      wrapper.appendChild(input);
    }
    this.fields[key] = {};
    this.fields[key].input = input;
    this.fields[key].type = type;
    this.content.appendChild(wrapper);
  }

  // Handle field changes
  _onFieldChange(key, value) {
    const newConfig = { ...this._config, [key]: value };
    this._config = newConfig;
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config: newConfig },
        bubbles: true,
        composed: true,
      })
    );
  }

  // Cleanup when editor is removed from DOM
  disconnectedCallback() {
    this.fields = {};
    this.container_threshold = null;
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

// Register with Home Assistant custom cards
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'ha-temperature-heatmap-card',
  name: 'Temperature Heatmap Card',
  description: 'Display temperature history as a color-coded heatmap'
});

// Console banner
console.info(
  '%c TEMPERATURE-HEATMAP-CARD %c v' + VERSION + ' ',
  'color: lightblue; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray'
);

// Register custom elements
customElements.define('ha-temperature-heatmap-card-editor', TemperatureHeatmapCardEditor);
customElements.define('ha-temperature-heatmap-card', TemperatureHeatmapCard);
