// Visual configuration editor for the Temperature Heatmap Card

import { DEFAULT_THRESHOLDS_F, DEFAULT_THRESHOLDS_C } from './constants.js';

/**
 * Visual editor for the Temperature Heatmap Card.
 * Provides a UI for configuring all card options.
 */
export class TemperatureHeatmapCardEditor extends HTMLElement {
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
      rounded_corners: true,
      interpolate_colors: false,
      color_interpolation: 'hsl',
      color_thresholds: [],  // Empty array - editor will populate, card auto-detects if empty
      data_source: 'auto',
      statistic_type: 'mean',
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
