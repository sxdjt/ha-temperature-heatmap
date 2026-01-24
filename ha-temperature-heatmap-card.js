/* Last modified: 23-Jan-2026 14:30 */

// Register with Home Assistant custom cards
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'ha-temperature-heatmap-card',
  name: 'Temperature Heatmap Card',
  description: 'Display temperature history as a color-coded heatmap'
});

console.info(
  '%c TEMPERATURE-HEATMAP-CARD %c v0.2.1 ',
  'color: lightblue; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray'
);

// Default color thresholds for Fahrenheit
const DEFAULT_THRESHOLDS = [
  { value: 0,  color: '#1a237e' },  // 0°F: Deep freeze (dark blue)
  { value: 32, color: '#42a5f5' },  // 32°F: Freezing (light blue)
  { value: 40, color: '#80deea' },  // 40°F: Cold (cyan)
  { value: 50, color: '#66bb6a' },  // 50°F: Cool/comfortable start (green)
  { value: 60, color: '#4caf50' },  // 60°F: Comfortable (medium green)
  { value: 70, color: '#81c784' },  // 70°F: Comfortable (light green)
  { value: 75, color: '#ffeb3b' },  // 75°F: Getting warm/caution (yellow)
  { value: 80, color: '#ff9800' },  // 80°F: Warm (orange)
  { value: 85, color: '#f44336' }   // 85°F: Hot (red)
];

// Default color thresholds for Celsius
const DEFAULT_THRESHOLDS_CELSIUS = [
  { value: -18, color: '#1a237e' },  // -18°C: Deep freeze (dark blue)
  { value: 0,   color: '#42a5f5' },  // 0°C: Freezing (light blue)
  { value: 4,   color: '#80deea' },  // 4°C: Cold (cyan)
  { value: 10,  color: '#66bb6a' },  // 10°C: Cool/comfortable start (green)
  { value: 16,  color: '#4caf50' },  // 16°C: Comfortable (medium green)
  { value: 21,  color: '#81c784' },  // 21°C: Comfortable (light green)
  { value: 24,  color: '#ffeb3b' },  // 24°C: Getting warm/caution (yellow)
  { value: 27,  color: '#ff9800' },  // 27°C: Warm (orange)
  { value: 29,  color: '#f44336' }   // 29°C: Hot (red)
];

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
    this._initializeStyles();
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

      // Color thresholds - auto-detect based on unit if not provided
      color_thresholds: config.color_thresholds || this._getDefaultThresholds(),

      // Refresh
      refresh_interval: config.refresh_interval || 300,  // Seconds (5 min default)

      // Interaction
      click_action: config.click_action || 'more-info',  // 'none', 'more-info', 'tooltip'

      // Display options
      show_entity_name: config.show_entity_name || false,

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
    let thresholds = DEFAULT_THRESHOLDS.slice();  // Default to Fahrenheit
    if (temperatureSensors.length > 0) {
      const unit = hass.states[temperatureSensors[0]]?.attributes?.unit_of_measurement || '';
      if (unit.toLowerCase().includes('c') || unit === '°C') {
        thresholds = DEFAULT_THRESHOLDS_CELSIUS.slice();
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
    if (unit.includes('c') || unit === '°c' || unit === 'celsius') {
      return DEFAULT_THRESHOLDS_CELSIUS.slice();
    }
    return DEFAULT_THRESHOLDS.slice(); // Fahrenheit default
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

  // Initialize and inject CSS styles into Shadow DOM
  _initializeStyles() {
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

      .cell:hover:not(.no-data) {
        transform: scale(1.08);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        z-index: 10;
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

      .cell.no-data:hover {
        transform: none;
        box-shadow: none;
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
    this.shadowRoot.appendChild(style);
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

  // Fetch historical data from Home Assistant
  async _fetchHistoryData() {
    if (this._isLoading) {
      console.log('Temperature Heatmap: Already loading, skipping duplicate fetch');
      return;
    }

    this._isLoading = true;
    this._error = null;
    this._render();  // Show loading state

    console.log('Temperature Heatmap: Starting data fetch...');

    try {
      // Calculate date range in LOCAL timezone, excluding current incomplete interval
      const now = new Date();

      let endTime;

      if (this._viewOffset === 0) {
        // Current view: use last complete interval
        const currentHour = now.getHours();
        const intervalHours = this._config.time_interval;
        const lastCompleteHour = Math.floor(currentHour / intervalHours) * intervalHours;
        endTime = new Date(now);
        endTime.setHours(lastCompleteHour, 0, 0, 0);
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
      console.log(`Temperature Heatmap: Current time: ${now.toLocaleString()}, Last complete interval: ${endTime.toLocaleString()}`);

      // Convert local times to ISO strings (the API returns data in UTC, so we send UTC times)
      const startTimeISO = startTime.toISOString();
      const endTimeISO = endTime.toISOString();

      console.log(`Temperature Heatmap: API times - Start: ${startTimeISO}, End: ${endTimeISO}`);

      // Build API URL
      const temperatureUrl = `history/period/${startTimeISO}?` +
        `filter_entity_id=${this._config.entity}&` +
        `end_time=${endTimeISO}&` +
        `minimal_response&no_attributes`;

      // Fetch with timeout to prevent hanging
      const fetchWithTimeout = (promise, timeoutMs = 30000) => {
        return Promise.race([
          promise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout after 30 seconds')), timeoutMs)
          )
        ]);
      };

      // Fetch with timeout
      const startFetch = Date.now();
      const result = await this.fetchWithCache(temperatureUrl);
      const fetchDuration = ((Date.now() - startFetch) / 1000).toFixed(1);

      console.log(`Temperature Heatmap: Received ${result?.[0]?.length || 0} temperature points in ${fetchDuration}s`);

      this._historyData = {
        temperature: result?.[0] || [],
        startTime,
        endTime
      };

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

  // Process raw history data into grid structure
  _processData() {
    if (!this._historyData) {
      this._processedData = null;
      return;
    }

    const { temperature, startTime } = this._historyData;
    const intervalHours = this._config.time_interval;
    const rowsPerDay = 24 / intervalHours;

    // Build grid with bucketed data
    // Key format: "YYYY-MM-DD_HH" -> { sum, count, min, max }
    const grid = {};

    // Process temperature data into time buckets using optimized running statistics
    temperature.forEach(point => {
      const timestamp = new Date(point.last_changed || point.last_updated);
      const dateKey = this._getDateKey(timestamp);
      const hourKey = this._getHourBucket(timestamp.getHours(), intervalHours);
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
        label: this._formatHourLabel(hour),
        cells: dates.map(date => {
          const dateKey = this._getDateKey(date);
          const key = `${dateKey}_${hour}`;
          const bucket = grid[key];

          const cell = {
            date,
            temperature: bucket?.temperature ?? null,
            hasData: bucket && bucket.temperature !== null
          };

          if (cell.temperature !== null) {
            allTemperatures.push(cell.temperature);
          }

          return cell;
        })
      };
      rows.push(row);
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

  // Get date key in format YYYY-MM-DD using LOCAL timezone
  _getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Bucket hour into interval (e.g., hour 7 with 2-hour interval -> 6)
  _getHourBucket(hour, intervalHours) {
    return Math.floor(hour / intervalHours) * intervalHours;
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

  // Format hour as "12a", "3p", etc. (12-hour) or "00", "15", etc. (24-hour)
  _formatHourLabel(hour) {
    if (this._config.time_format === '24') {
      return String(hour).padStart(2, '0');
    }
    // 12-hour format
    const h = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
    const suffix = hour < 12 ? 'a' : 'p';
    return `${h}${suffix}`;
  }

  // Main render method
  _render() {
    if (!this._config || !this._hass) return;

    this._content.innerHTML = `
      <div class="card-header">
        <span class="title">${this._escapeHtml(this._config.title)}</span>
        ${this._renderNavControls()}
      </div>

      ${this._error ? this._renderError() : ''}
      ${this._isLoading ? this._renderLoading() : ''}
      ${this._processedData && !this._error ? this._renderGrid() : ''}
      ${this._processedData && !this._error ? this._renderFooter() : ''}
    `;

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
        <button class="nav-btn" data-direction="back" aria-label="Previous period">←</button>
        <span class="date-range">${dateRange}</span>
        <button class="nav-btn" data-direction="forward"
                ${canGoForward ? '' : 'disabled'}
                aria-label="Next period">→</button>
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
        <div class="error-icon">⚠</div>
        <div class="error-text">
          <strong>${this._escapeHtml(this._error.message)}</strong>
          <div class="error-details">${this._escapeHtml(this._error.details)}</div>
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

    const bgColor = this._getColorForTemperature(cell.temperature);
    const textColor = this._getContrastTextColor(bgColor);
    const decimals = this._config.decimals;

    return `
      <div class="cell"
           style="background-color: ${bgColor}; color: ${textColor}"
           data-temperature="${cell.temperature}"
           data-date="${cell.date.toISOString()}"
           tabindex="0"
           role="button"
           aria-label="Temperature ${cell.temperature.toFixed(decimals)}">
        <span class="temperature">${cell.temperature.toFixed(decimals)}</span>
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
      entityName = `<div class="entity-name">${this._escapeHtml(friendlyName)}</div>`;
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

  _interpolateRGB(c1, c2, t) {
    const a = this._hexToRgb(c1);
    const b = this._hexToRgb(c2);

    return this._rgbToHex({
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t)
    });
  }
  _interpolateGamma(c1, c2, t, gamma = 2.2) {
    const a = this._hexToRgb(c1);
    const b = this._hexToRgb(c2);

    const interp = (x, y) =>
      Math.pow(
        Math.pow(x / 255, gamma) +
        (Math.pow(y / 255, gamma) - Math.pow(x / 255, gamma)) * t,
        1 / gamma
      ) * 255;

    return this._rgbToHex({
      r: interp(a.r, b.r),
      g: interp(a.g, b.g),
      b: interp(a.b, b.b)
    });
  }
  _interpolateHSL(c1, c2, t) {
    const a = this._rgbToHsl(this._hexToRgb(c1));
    const b = this._rgbToHsl(this._hexToRgb(c2));

    let dh = b.h - a.h;
    if (Math.abs(dh) > 180) dh -= Math.sign(dh) * 360;

    const h = (a.h + dh * t + 360) % 360;
    const s = a.s + (b.s - a.s) * t;
    const l = a.l + (b.l - a.l) * t;

    return this._rgbToHex(this._hslToRgb({ h, s, l }));
  }
  _interpolateLAB(c1, c2, t) {
    const a = this._rgbToLab(this._hexToRgb(c1));
    const b = this._rgbToLab(this._hexToRgb(c2));

    const lab = {
      l: a.l + (b.l - a.l) * t,
      a: a.a + (b.a - a.a) * t,
      b: a.b + (b.b - a.b) * t
    };

    return this._rgbToHex(this._labToRgb(lab));
  }

  _hexToRgb(hex) {
    const cleanHex = hex.replace("#", "");
    return {
      r: parseInt(cleanHex.substring(0, 2), 16),
      g: parseInt(cleanHex.substring(2, 4), 16),
      b: parseInt(cleanHex.substring(4, 6), 16),
    };
  }
  _rgbToHex({ r, g, b }) {
    const toHex = v =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, "0");

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  _rgbToHsl({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
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
  _hslToRgb({ h, s, l }) {
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

  _rgbToLab({ r, g, b }) {
    const xyz = this._rgbToXyz(r, g, b);
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
  _labToRgb({ l, a, b }) {
    let y = (l + 16) / 116;
    let x = a / 500 + y;
    let z = y - b / 200;

    [x, y, z] = [x, y, z].map(v => {
      const v3 = v ** 3;
      return v3 > 0.008856 ? v3 : (v - 16 / 116) / 7.787;
    });

    x *= 95.047;
    y *= 100.0;
    z *= 108.883;

    return this._xyzToRgb(x, y, z);
  }

  _rgbToXyz(r, g, b) {
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
  _xyzToRgb(x, y, z) {
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


  _interpolateColor(color1, color2, ratio) {
    switch (this._config.color_interpolation) {
      case "gamma":
        return this._interpolateGamma(color1, color2, ratio);
      case "hsl":
        return this._interpolateHSL(color1, color2, ratio);
      case "lab":
        return this._interpolateLAB(color1, color2, ratio);
      case "rgb":
      default:
        return this._interpolateRGB(color1, color2, ratio);
    }
  }
  // Get color for temperature value based on thresholds
  _getColorForTemperature(temperature) {
    if (temperature === null || temperature === undefined) {
      return 'var(--disabled-color, #f0f0f0)';
    }

    const thresholds = this._config.color_thresholds;
    const interpolate = this._config.interpolate_colors === true;

    // ===== THRESHOLD MODE (legacy behavior) =====
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

    // ===== INTERPOLATION MODE =====

    // Below first threshold
    if (temperature <= thresholds[0].value) {
      return thresholds[0].color;
    }

    // Above last threshold
    if (temperature >= thresholds[thresholds.length - 1].value) {
      return thresholds[thresholds.length - 1].color;
    }

    // Between two thresholds
    for (let i = 0; i < thresholds.length - 1; i++) {
      const t1 = thresholds[i];
      const t2 = thresholds[i + 1];

      if (temperature >= t1.value && temperature <= t2.value) {
        const ratio = (temperature - t1.value) / (t2.value - t1.value);

        return this._interpolateColor(t1.color, t2.color, ratio);
      }
    }

    return thresholds[0].color;
  }

  // Get contrasting text color (black or white) for background color
  _getContrastTextColor(backgroundColor) {
    // Handle CSS variables
    if (backgroundColor.startsWith('var(')) {
      return 'var(--primary-text-color)';
    }

    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return black for light backgrounds, white for dark backgrounds
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  // Get unit of measurement for temperature
  _getUnit() {
    // Try config first
    if (this._config.unit) {
      return this._config.unit;
    }

    // Auto-detect from entity attributes
    const stateObj = this._hass?.states[this._config.entity];
    if (stateObj?.attributes?.unit_of_measurement) {
      return stateObj.attributes.unit_of_measurement;
    }

    // Default fallback
    return '°F';
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

    tooltip.innerHTML = `
      <div><strong>${dateStr}</strong></div>
      <div>Temperature: ${temperature.toFixed(decimals)} ${unit}</div>
      <div>Mode: ${this._config.aggregation_mode}</div>
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

  // Escape HTML to prevent XSS
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Normalize size values: numbers → "Npx", strings → pass through
  _normalizeSize(value, defaultValue) {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }
    if (typeof value === 'number') {
      return `${value}px`;
    }
    return String(value);
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
      cellHeight: this._normalizeSize(this._config.cell_height, "36px"),
      cellWidth: this._normalizeSize(this._config.cell_width, "1fr"),
      cellPadding: this._normalizeSize(this._config.cell_padding, "2px"),
      cellGap: this._normalizeSize(this._config.cell_gap, "2px"),
      cellFontSize: this._normalizeSize(this._config.cell_font_size, "11px"),
    };
  }
}

class TemperatureHeatmapCardEditor extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (!this.content) this._buildEditor();
  }

  async setConfig(config) {
    // Clone to avoid modifying the read-only object
    // (Clone pour etre sur de ne pas modifier l'objet read-only)
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

    // Default values (Valeurs par defaut)
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
      unit: 'c',
      refresh_interval: 300,
      click_action: 'more-info',
      show_entity_name: false,
      cell_height: 36,
      cell_width: '1fr',
      cell_padding: 2,
      cell_gap: 2,
      cell_font_size: 11,
      compact: false,
      rounded_corners: true,
      interpolate_colors: false,
      color_interpolation: 'hsl',
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

    // Field definitions (Definition des champs)
    const fields = [
      { type: 'entity', key: 'entity', label: 'Entity', required: true },
      { type: 'text', key: 'title', label: 'Title' },
      { type: 'number', key: 'days', label: 'Days', min: 1, max: 365 },
      { type: 'number', key: 'time_interval', label: 'Time Interval (hours)', min: 1, max: 24 },
      { type: 'select', key: 'time_format', label: 'Time Format', options: { 24: '24h', 12: '12h' } },
      { type: 'number', key: 'start_hour', label: 'Start Hour', min: 0, max: 23 },
      { type: 'number', key: 'end_hour', label: 'End Hour', min: 0, max: 23 },
      { type: 'select', key: 'aggregation_mode', label: 'Aggregation Mode', options: { average: 'Average', min: 'Min', max: 'Max' } },
      { type: 'number', key: 'decimals', label: 'Decimals', min: 0, max: 2 },
      { type: 'select', key: 'unit', label: 'Unit', options: { c: '°C', f: '°F' } },
      { type: 'number', key: 'refresh_interval', label: 'Refresh Interval (s)', min: 10, max: 3600 },
      { type: 'select', key: 'click_action', label: 'Click Action', options: { none: 'None', 'more-info': 'More Info', tooltip: 'Tooltip' } },
      { type: 'switch', key: 'show_entity_name', label: 'Show Entity Name' },
      { type: 'number', key: 'cell_height', label: 'Cell Height', min: 10, max: 200 },
      { type: 'text', key: 'cell_width', label: 'Cell Width (px or fr)' },
      { type: 'number', key: 'cell_padding', label: 'Cell Padding', min: 0, max: 50 },
      { type: 'number', key: 'cell_gap', label: 'Cell Gap', min: 0, max: 50 },
      { type: 'number', key: 'cell_font_size', label: 'Cell Font Size', min: 6, max: 32 },
      { type: 'switch', key: 'compact', label: 'Compact Mode' },
      { type: 'switch', key: 'rounded_corners', label: 'Rounded Corners' },
      { type: 'switch', key: 'interpolate_colors', label: 'Interpolate Colors' },
      { type: 'select', key: 'color_interpolation', label: 'Color Interpolation', options: { rgb: 'RGB', gamma: 'Gamma RGB', hsl: 'HSL', lab: 'LAB' } },
      { type: 'thresholds', key: 'color_thresholds', label: 'Colors' },
    ];

    // Create fields dynamically (Creation des champs dynamiquement)
    fields.forEach((f) => this._createField(f));

    this._updateValues();
  }

  _createThresholdEditor() {
    // Function to create a threshold row (Fonction pour creer un threshold row)
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

    // Create all rows (Cree toutes les lignes)
    if (!this._config.color_thresholds) this._config.color_thresholds = [];
    this._config.color_thresholds.forEach((t, i) => createRow(t, i));
  }

  _refreshThresholdEditor() {
    // Remove old rows and recreate (Supprime l'ancien container et recree les rows)
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

  // Generic function to create a field (Fonction generique pour creer un champ)
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

      // Container for the list (Container pour la liste)
      const list = document.createElement('div');
      list.style.display = 'grid';
      list.style.gridGap = '8px';
      wrapper.appendChild(list);

      this.container_threshold = list;

      // Button to add a threshold (Bouton pour ajouter un threshold)
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
      // All other types with label above (Tous les autres types avec label au-dessus)
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

  // Handle field changes (Gestion des changements de champ)
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

// Register custom elements
customElements.define('ha-temperature-heatmap-card-editor', TemperatureHeatmapCardEditor);
customElements.define('ha-temperature-heatmap-card', TemperatureHeatmapCard);
