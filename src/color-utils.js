// Color parsing, interpolation, and utility functions

/**
 * Parse color string to RGB object.
 * Supports hex (#RRGGBB), rgba(), and rgb() formats.
 * @param {string} color - Color string
 * @returns {Object|null} - RGB object {r, g, b} or null if parsing fails
 */
export function parseColor(color) {
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
export function rgbToHex(rgb) {
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
export function interpolateRGB(rgb1, rgb2, t) {
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
export function interpolateGamma(rgb1, rgb2, t, gamma = 2.2) {
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
export function rgbToHsl(rgb) {
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
export function hslToRgb(hsl) {
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
export function interpolateHSL(rgb1, rgb2, t) {
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
export function rgbToLab(rgb) {
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
export function labToRgb(lab) {
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
export function interpolateLAB(rgb1, rgb2, t) {
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
export function interpolateColor(color1, color2, t, method = 'hsl') {
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
export function getContrastTextColor(backgroundColor) {
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
export function getColorForTemperature(temperature, thresholds, interpolate = false, interpolationMethod = 'hsl') {
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
