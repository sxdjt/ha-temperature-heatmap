// Default color thresholds for temperature display

// Default color thresholds for Fahrenheit
export const DEFAULT_THRESHOLDS_F = [
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
export const DEFAULT_THRESHOLDS_C = [
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
export const DEFAULT_THRESHOLDS = DEFAULT_THRESHOLDS_F;
export const DEFAULT_THRESHOLDS_CELSIUS = DEFAULT_THRESHOLDS_C;

/**
 * Get appropriate default thresholds based on unit of measurement.
 * @param {string} unit - The unit of measurement (F, C, etc.)
 * @returns {Array} - Array of threshold objects with value and color properties
 */
export function getDefaultThresholdsForUnit(unit) {
  if (!unit) return DEFAULT_THRESHOLDS_F;
  const u = unit.toLowerCase().trim();
  if (u.includes('c') || u === '°c' || u === 'celsius') {
    return DEFAULT_THRESHOLDS_C;
  }
  return DEFAULT_THRESHOLDS_F;
}

// Card version
export const VERSION = '0.7.0';
