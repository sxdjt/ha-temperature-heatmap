// Formatting and utility functions

/**
 * Escape HTML to prevent XSS via textContent/innerHTML conversion.
 * @param {string} text - Text to escape
 * @returns {string} - HTML-escaped text
 */
export function escapeHtml(text) {
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
export function formatHourLabel(hour, format = '24') {
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
export function normalizeSize(value, defaultValue) {
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
export function getDateKey(date) {
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
export function getHourBucket(hour, intervalHours) {
  return Math.floor(hour / intervalHours) * intervalHours;
}
