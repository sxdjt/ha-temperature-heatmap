// Temperature Heatmap Card - Entry point

import { TemperatureHeatmapCard } from './temperature-heatmap-card.js';
import { TemperatureHeatmapCardEditor } from './editor.js';
import { VERSION } from './constants.js';

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
