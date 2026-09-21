/**
 * Thermia & Multi-Brand Heat Pump Card for Home Assistant
 * Compatible with Ground-Source (Geothermal/Brine) & Air-to-Water heat pumps
 * Author: Antigravity & MaxVonk
 * Version: 1.3.0
 */

class ThermiaCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._expanded = false;
    this._config = {};
    this._hass = null;
    this._discoveredPrefix = null;
  }

  static getStubConfig() {
    return {
      type: "custom:thermia-card",
      title: "Thermia Heat Pump",
      system_type: "ground_source"
    };
  }

  setConfig(config) {
    this._config = {
      title: "Thermia",
      system_type: "ground_source", // 'ground_source' or 'air_to_water'
      ...config,
      entities: {
        ...(config.entities || {})
      }
    };
    this._discoveredPrefix = null;
    this._render();
  }

  set hass(hass) {
    const oldHass = this._hass;
    this._hass = hass;
    if (!this._discoveredPrefix) {
      this._discoveredPrefix = this._autoDiscoverPrefix();
    }
    if (!oldHass || this._hasStateChanged(oldHass, hass)) {
      this._updateStates();
    }
  }

  getCardSize() {
    return this._expanded ? 7 : 5;
  }

  _isAirToWater() {
    return this._config.system_type === 'air_to_water' || this._config.system_type === 'air_water';
  }

  _autoDiscoverPrefix() {
    if (this._config.prefix && this._config.prefix !== 'thermia') {
      return this._config.prefix;
    }
    if (!this._hass) return this._config.prefix || 'thermia';

    // 1. Check if default 'thermia' exists
    if (this._hass.states['sensor.thermia_supply_line_temperature']) {
      return 'thermia';
    }

    // 2. Look for any sensor ending in _supply_line_temperature
    const supplySensor = Object.keys(this._hass.states).find(k => 
      k.startsWith('sensor.') && k.endsWith('_supply_line_temperature')
    );
    if (supplySensor) {
      return supplySensor.replace('sensor.', '').replace('_supply_line_temperature', '');
    }

    // 3. Look for any water_heater.* entity
    const wh = Object.keys(this._hass.states).find(k => k.startsWith('water_heater.'));
    if (wh) {
      return wh.replace('water_heater.', '');
    }

    return this._config.prefix || 'thermia';
  }

  _resolveEntity(key, fallbackSuffixes) {
    if (this._config.entities && this._config.entities[key]) {
      return this._config.entities[key];
    }
    const prefix = this._discoveredPrefix || this._config.prefix || 'thermia';
    for (const suffix of fallbackSuffixes) {
      const candidate = `${suffix.domain}.${prefix}_${suffix.name}`;
      if (this._hass && this._hass.states[candidate]) {
        return candidate;
      }
    }
    // Check if suffix matches exact entity name (e.g. water_heater.<prefix>)
    for (const suffix of fallbackSuffixes) {
      if (suffix.name === '') {
        const candidate = `${suffix.domain}.${prefix}`;
        if (this._hass && this._hass.states[candidate]) {
          return candidate;
        }
      }
    }
    // Default fallback
    const def = fallbackSuffixes[0];
    return def.name === '' ? `${def.domain}.${prefix}` : `${def.domain}.${prefix}_${def.name}`;
  }

  _getEntityMap() {
    return {
      supply_temp: this._resolveEntity('supply_temp', [
        { domain: 'sensor', name: 'supply_line_temperature' },
        { domain: 'sensor', name: 'supplyline_t' }
      ]),
      desired_supply_temp: this._resolveEntity('desired_supply_temp', [
        { domain: 'sensor', name: 'desired_supply_line_temperature' }
      ]),
      return_temp: this._resolveEntity('return_temp', [
        { domain: 'sensor', name: 'return_line_temperature' },
        { domain: 'sensor', name: 'returnline_t' }
      ]),
      brine_in_temp: this._resolveEntity('brine_in_temp', [
        { domain: 'sensor', name: 'brine_in_temperature' },
        { domain: 'sensor', name: 'brine_in_t' }
      ]),
      brine_out_temp: this._resolveEntity('brine_out_temp', [
        { domain: 'sensor', name: 'brine_out_temperature' },
        { domain: 'sensor', name: 'brine_out_t' }
      ]),
      evaporator_temp: this._resolveEntity('evaporator_temp', [
        { domain: 'sensor', name: 'evaporator_temperature' },
        { domain: 'sensor', name: 'outdoor_coil_temperature' },
        { domain: 'sensor', name: 'brine_out_temperature' }
      ]),
      hot_water_temp: this._resolveEntity('hot_water_temp', [
        { domain: 'sensor', name: 'hot_water_temperature' },
        { domain: 'sensor', name: 'boiler_t' }
      ]),
      pressure_pipe_temp: this._resolveEntity('pressure_pipe_temp', [
        { domain: 'sensor', name: 'pressurepipe_t' },
        { domain: 'sensor', name: 'discharge_temperature' }
      ]),
      outdoor_temp: this._resolveEntity('outdoor_temp', [
        { domain: 'sensor', name: 'outdoor_temperature' },
        { domain: 'sensor', name: 'outdoor_t' }
      ]),
      indoor_temp: this._resolveEntity('indoor_temp', [
        { domain: 'sensor', name: 'indoor_temperature' },
        { domain: 'sensor', name: 'indoor_t' }
      ]),
      heat_target_temp: this._resolveEntity('heat_target_temp', [
        { domain: 'sensor', name: 'heat_target_temperature' },
        { domain: 'number', name: 'indoor_requested_t' }
      ]),
      integral: this._resolveEntity('integral', [
        { domain: 'sensor', name: 'integral' },
        { domain: 'sensor', name: 'integral1' }
      ]),
      active_alarms: this._resolveEntity('active_alarms', [
        { domain: 'sensor', name: 'active_alarms' },
        { domain: 'binary_sensor', name: 'alarm_indication_on' }
      ]),
      compressor: this._resolveEntity('compressor', [
        { domain: 'binary_sensor', name: 'compressor_operational_status' },
        { domain: 'binary_sensor', name: 'compressor_power_status' },
        { domain: 'binary_sensor', name: 'compressor_on' }
      ]),
      brine_pump: this._resolveEntity('brine_pump', [
        { domain: 'binary_sensor', name: 'brine_pump_operational_status' },
        { domain: 'binary_sensor', name: 'brine_pump_power_status' },
        { domain: 'binary_sensor', name: 'brine_pump_on' }
      ]),
      outdoor_fan: this._resolveEntity('outdoor_fan', [
        { domain: 'binary_sensor', name: 'outdoor_fan_operational_status' },
        { domain: 'binary_sensor', name: 'fan_operational_status' },
        { domain: 'binary_sensor', name: 'fan' }
      ]),
      defrost: this._resolveEntity('defrost', [
        { domain: 'binary_sensor', name: 'defrost_operational_status' },
        { domain: 'binary_sensor', name: 'defrosting' },
        { domain: 'binary_sensor', name: 'defrost' }
      ]),
      circulation_pump: this._resolveEntity('circulation_pump', [
        { domain: 'binary_sensor', name: 'circulation_pump_operational_status' },
        { domain: 'binary_sensor', name: 'circulation_pump_power_status' },
        { domain: 'binary_sensor', name: 'supply_pump_on' }
      ]),
      water_heater: this._resolveEntity('water_heater', [
        { domain: 'water_heater', name: '' },
        { domain: 'select', name: 'main_mode' }
      ]),
      hot_water_switch: this._resolveEntity('hot_water_switch', [
        { domain: 'switch', name: 'hot_water' }
      ]),
      hot_water_boost_switch: this._resolveEntity('hot_water_boost_switch', [
        { domain: 'switch', name: 'hot_water_boost' }
      ]),
      compressor_time: this._resolveEntity('compressor_time', [
        { domain: 'sensor', name: 'compressor_operational_time' },
        { domain: 'sensor', name: 'compressor_runtime_h' }
      ]),
      heating_time: this._resolveEntity('heating_time', [
        { domain: 'sensor', name: 'heating_operational_time' }
      ]),
      hot_water_time: this._resolveEntity('hot_water_time', [
        { domain: 'sensor', name: 'hot_water_operational_time' },
        { domain: 'sensor', name: 'hotwater_runtime_h' }
      ]),
      aux_time: this._resolveEntity('aux_time', [
        { domain: 'sensor', name: 'auxiliary_heater_1_operational_time' },
        { domain: 'sensor', name: 'boiler_3kw_runtime_h' }
      ])
    };
  }

  _hasStateChanged(oldHass, newHass) {
    const map = this._getEntityMap();
    for (const entityId of Object.values(map)) {
      if (!entityId) continue;
      if (oldHass.states[entityId] !== newHass.states[entityId]) {
        return true;
      }
    }
    return false;
  }

  _getState(entityId, defaultValue = '--') {
    if (!this._hass || !entityId || !this._hass.states[entityId]) {
      return defaultValue;
    }
    const state = this._hass.states[entityId].state;
    if (state === 'unavailable' || state === 'unknown') {
      return defaultValue;
    }
    return state;
  }

  _formatTemp(val) {
    if (val === '--' || isNaN(parseFloat(val))) return '--';
    return `${Math.round(parseFloat(val) * 10) / 10} °C`;
  }

  _formatBadgeTemp(val) {
    if (val === '--' || isNaN(parseFloat(val))) return '--';
    return `${Math.round(parseFloat(val))}°c`;
  }

  _isEntityOn(entityId) {
    const state = this._getState(entityId, 'off');
    return state === 'on' || state === 'running' || state === 'true';
  }

  _fireMoreInfo(entityId) {
    if (!entityId || !this._hass || !this._hass.states[entityId]) return;
    const event = new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId }
    });
    this.dispatchEvent(event);
  }

  _render() {
    const isAir = this._isAirToWater();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        ha-card {
          padding: 16px;
          background: var(--ha-card-background, var(--card-background-color, #ffffff));
          box-shadow: var(--ha-card-box-shadow, none);
          border-radius: var(--ha-card-border-radius, 12px);
          border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color, #e5e7eb));
          color: var(--primary-text-color, #1f2937);
          font-family: var(--paper-font-body1_-_font-family, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
          position: relative;
          overflow: hidden;
          box-sizing: border-box;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .header-title-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--primary-text-color, #111827);
          letter-spacing: -0.01em;
        }
        .system-type-badge {
          font-size: 0.68rem;
          padding: 2px 7px;
          border-radius: 9999px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          background: var(--secondary-background-color, rgba(125, 125, 125, 0.1));
          color: var(--secondary-text-color, #6b7280);
        }

        .alarm-banner {
          display: none;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
        }
        .alarm-banner.active {
          display: inline-flex;
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        /* Schematic Container */
        .schematic-wrapper {
          background: var(--card-background-color, #ffffff);
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
          border-radius: 12px;
          padding: 8px 4px;
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
        }
        @media (prefers-color-scheme: dark) {
          .schematic-wrapper {
            background: rgba(0, 0, 0, 0.15);
            border-color: rgba(255, 255, 255, 0.08);
          }
        }

        svg {
          width: 100%;
          max-width: 380px;
          height: auto;
          display: block;
          user-select: none;
        }

        /* Keyframes */
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .spin {
          animation: spin 2.2s linear infinite;
        }
        .spin-fast {
          animation: spin 1.2s linear infinite;
        }

        /* SVG Interactive Badges */
        .badge-group {
          cursor: pointer;
          transition: transform 0.15s ease, filter 0.15s ease;
        }
        .badge-group:hover {
          filter: brightness(1.1);
        }
        .badge-rect {
          fill: #9ca3af;
          rx: 4px;
        }
        .badge-text {
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          fill: #ffffff;
          text-anchor: middle;
          dominant-baseline: central;
        }
        @media (prefers-color-scheme: dark) {
          .badge-rect {
            fill: #4b5563;
          }
        }

        /* Native Home Assistant Controls & Tile Styling */
        .controls-section {
          margin-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* 1. Mode Tile */
        .ha-mode-tile {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: var(--ha-card-background, var(--card-background-color, #ffffff));
          border: 1px solid var(--ha-card-border-color, var(--divider-color, rgba(0, 0, 0, 0.08)));
          border-radius: var(--ha-card-border-radius, 12px);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          gap: 12px;
        }

        .ha-mode-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .ha-icon-box {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background-color 0.2s ease, color 0.2s ease;
        }
        .ha-icon-box.primary {
          background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.12);
          color: var(--primary-color, #0284c7);
        }
        .ha-icon-box.hw-active {
          background: rgba(6, 182, 212, 0.15);
          color: #0891b2;
        }
        .ha-icon-box.boost-active {
          background: rgba(245, 158, 11, 0.15);
          color: #d97706;
        }
        .ha-icon-box.inactive {
          background: var(--secondary-background-color, rgba(125, 125, 125, 0.1));
          color: var(--secondary-text-color, #6b7280);
        }

        .ha-tile-meta {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .ha-tile-title {
          font-size: 0.88rem;
          font-weight: 500;
          color: var(--primary-text-color, #111827);
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ha-tile-subtitle {
          font-size: 0.72rem;
          color: var(--secondary-text-color, #6b7280);
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Segmented Mode Selector */
        .ha-segmented-control {
          display: flex;
          align-items: center;
          background: var(--secondary-background-color, rgba(125, 125, 125, 0.08));
          border-radius: 8px;
          padding: 2px;
          border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.06));
          flex-shrink: 0;
        }
        .ha-seg-btn {
          border: none;
          background: transparent;
          font-family: inherit;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--secondary-text-color, #6b7280);
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
          user-select: none;
        }
        .ha-seg-btn:hover {
          color: var(--primary-text-color, #111827);
        }
        .ha-seg-btn.active {
          background: var(--ha-card-background, var(--card-background-color, #ffffff));
          color: var(--primary-color, #0284c7);
          font-weight: 600;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        @media (prefers-color-scheme: dark) {
          .ha-seg-btn.active {
            background: rgba(255, 255, 255, 0.15);
            color: #38bdf8;
          }
        }

        /* 2-Column Grid of Switches */
        .ha-tiles-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        @media (max-width: 360px) {
          .ha-tiles-grid {
            grid-template-columns: 1fr;
          }
        }

        .ha-switch-tile {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: var(--ha-card-background, var(--card-background-color, #ffffff));
          border: 1px solid var(--ha-card-border-color, var(--divider-color, rgba(0, 0, 0, 0.08)));
          border-radius: var(--ha-card-border-radius, 12px);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
          user-select: none;
          gap: 8px;
        }
        .ha-switch-tile:hover {
          border-color: var(--primary-color, #0284c7);
        }

        /* Home Assistant Switch Component */
        .ha-switch {
          position: relative;
          width: 36px;
          height: 16px;
          background: var(--divider-color, rgba(125, 125, 125, 0.35));
          border-radius: 9999px;
          cursor: pointer;
          transition: background 0.25s ease;
          flex-shrink: 0;
          display: flex;
          align-items: center;
        }
        .ha-switch.on {
          background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.5);
        }
        .ha-switch-thumb {
          position: absolute;
          left: 0;
          width: 18px;
          height: 18px;
          background: #ffffff;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.22s ease;
        }
        .ha-switch.on .ha-switch-thumb {
          transform: translateX(18px);
          background: var(--primary-color, #0284c7);
        }

        /* Expander Bar */
        .ha-expander {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          margin-top: 4px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
          user-select: none;
          color: var(--secondary-text-color, #6b7280);
          font-size: 0.78rem;
          font-weight: 500;
        }
        .ha-expander:hover {
          background: var(--secondary-background-color, rgba(125, 125, 125, 0.08));
          color: var(--primary-text-color, #111827);
        }
        .ha-expander-label {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .ha-expander-chevron {
          transition: transform 0.25s ease;
        }
        .ha-expander.open .ha-expander-chevron {
          transform: rotate(180deg);
        }

        /* Expandable Drawer in pure HA style */
        .drawer {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .drawer.open {
          max-height: 500px;
          margin-top: 8px;
        }
        .ha-sensor-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-bottom: 10px;
        }
        @media (max-width: 360px) {
          .ha-sensor-grid {
            grid-template-columns: 1fr;
          }
        }

        .ha-sensor-tile {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: var(--ha-card-background, var(--card-background-color, #ffffff));
          border: 1px solid var(--ha-card-border-color, var(--divider-color, rgba(0, 0, 0, 0.08)));
          border-radius: var(--ha-card-border-radius, 12px);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
          cursor: pointer;
          transition: border-color 0.15s ease, transform 0.15s ease;
        }
        .ha-sensor-tile:hover {
          border-color: var(--primary-color, #0284c7);
        }

        .ha-sensor-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ha-sensor-icon svg {
          width: 18px;
          height: 18px;
        }
        .ha-sensor-icon.green {
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
        }
        .ha-sensor-icon.blue {
          background: rgba(59, 130, 246, 0.12);
          color: #3b82f6;
        }
        .ha-sensor-icon.orange {
          background: rgba(249, 115, 22, 0.12);
          color: #f97316;
        }
        .ha-sensor-icon.purple {
          background: rgba(168, 85, 247, 0.12);
          color: #a855f7;
        }

        .ha-sensor-info {
          min-width: 0;
        }
        .ha-sensor-label {
          font-size: 0.7rem;
          font-weight: 500;
          color: var(--secondary-text-color, #6b7280);
          line-height: 1.1;
        }
        .ha-sensor-value {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--primary-text-color, #111827);
          margin-top: 2px;
        }

        /* Modern HA Statistics Panel */
        .ha-stats-panel {
          padding: 10px 12px;
          background: var(--ha-card-background, var(--card-background-color, #ffffff));
          border: 1px solid var(--ha-card-border-color, var(--divider-color, rgba(0, 0, 0, 0.08)));
          border-radius: var(--ha-card-border-radius, 12px);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
        }
        .ha-stats-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--secondary-text-color, #6b7280);
          margin-bottom: 8px;
        }
        .ha-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }
        @media (max-width: 400px) {
          .ha-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .ha-stat-box {
          background: var(--secondary-background-color, rgba(125, 125, 125, 0.05));
          padding: 6px 8px;
          border-radius: 8px;
          text-align: center;
        }
        .ha-stat-name {
          font-size: 0.68rem;
          color: var(--secondary-text-color, #6b7280);
          font-weight: 500;
        }
        .ha-stat-val {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--primary-text-color, #111827);
          margin-top: 2px;
        }
      </style>

      <ha-card>
        <div class="header">
          <div class="header-title-group">
            <h2 id="card-title">${this._config.title || 'Thermia'}</h2>
            <span class="system-type-badge">${isAir ? 'Air/Water' : 'Ground'}</span>
          </div>
          <div class="alarm-banner" id="alarm-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L1 21h22L12 2zm1 14h-2v-2h2v2zm0-4h-2V8h2v4z"/>
            </svg>
            <span id="alarm-text">Alarms Active</span>
          </div>
        </div>

        <div class="schematic-wrapper">
          <svg viewBox="0 0 380 340">
            <defs>
              <linearGradient id="cab-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#d1d5db" />
                <stop offset="15%" stop-color="#f3f4f6" />
                <stop offset="85%" stop-color="#f3f4f6" />
                <stop offset="100%" stop-color="#9ca3af" />
              </linearGradient>

              <linearGradient id="brine-in-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#0284c7" />
                <stop offset="100%" stop-color="#38bdf8" />
              </linearGradient>

              <linearGradient id="brine-out-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#7c3aed" />
                <stop offset="100%" stop-color="#8b5cf6" />
              </linearGradient>

              <linearGradient id="supply-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#b91c1c" />
                <stop offset="100%" stop-color="#ef4444" />
              </linearGradient>

              <linearGradient id="return-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#9333ea" />
                <stop offset="100%" stop-color="#c026d3" />
              </linearGradient>

              <filter id="badge-shadow" x="-10%" y="-15%" width="120%" height="135%">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.15" />
              </filter>
            </defs>

            <!-- Feet of indoor unit -->
            <rect x="156" y="286" width="16" height="5" rx="1.5" fill="#4b5563" />
            <rect x="208" y="286" width="16" height="5" rx="1.5" fill="#4b5563" />

            <!-- Main Indoor Cabinet Frame -->
            <rect x="145" y="16" width="90" height="270" rx="9" fill="url(#cab-grad)" stroke="#9ca3af" stroke-width="1.5" />
            <line x1="146" y1="32" x2="234" y2="32" stroke="#d1d5db" stroke-width="1" />
            <rect x="170" y="40" width="40" height="42" rx="3" fill="#374151" stroke="#1f2937" stroke-width="1" />
            <rect x="174" y="44" width="32" height="34" rx="2" fill="#1e293b" />

            <!-- ================= LEFT SOURCE CIRCUIT ================= -->
            ${!isAir ? `
              <!-- Ground-Source Brine Circuit -->
              <path d="M 30 250 L 158 250 L 158 238" fill="none" stroke="url(#brine-in-grad)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
              <rect x="153" y="145" width="10" height="92" rx="2" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.2" />
              <path d="M 158 145 L 158 132 L 30 132" fill="none" stroke="url(#brine-out-grad)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />

              <!-- Brine Pump Housing -->
              <g transform="translate(75, 132)">
                <circle cx="0" cy="0" r="17" fill="#ffffff" stroke="#6b7280" stroke-width="2.5" />
                <g id="brine-pump-spin-group" class="">
                  <path d="M -9 0 A 9 9 0 0 1 7 -5" fill="none" stroke="#1f2937" stroke-width="2" stroke-linecap="round" />
                  <polygon points="7,-9 11,-4 6,-2" fill="#1f2937" />
                  <path d="M 9 0 A 9 9 0 0 1 -7 5" fill="none" stroke="#1f2937" stroke-width="2" stroke-linecap="round" />
                  <polygon points="-7,9 -11,4 -6,2" fill="#1f2937" />
                </g>
              </g>

              <!-- Brine flow arrows -->
              <polygon points="85,247 95,250 85,253" fill="#ffffff" opacity="0.9" />
              <polygon points="120,129 110,132 120,135" fill="#ffffff" opacity="0.9" />

              <!-- Brine In Badge -->
              <g class="badge-group" id="badge-brine-in" transform="translate(68, 238)">
                <rect class="badge-rect" x="-26" y="-10" width="52" height="20" filter="url(#badge-shadow)" />
                <text class="badge-text" id="val-brine-in">--°c</text>
              </g>

              <!-- Brine Pump Speed Badge -->
              <g class="badge-group" id="badge-brine-pump" transform="translate(75, 158)">
                <rect class="badge-rect" x="-24" y="-9" width="48" height="18" filter="url(#badge-shadow)" />
                <text class="badge-text" id="val-brine-pump">ON</text>
              </g>

              <!-- Brine Out Badge -->
              <g class="badge-group" id="badge-brine-out" transform="translate(68, 102)">
                <rect class="badge-rect" x="-26" y="-10" width="52" height="20" filter="url(#badge-shadow)" />
                <text class="badge-text" id="val-brine-out">--°c</text>
              </g>
            ` : `
              <!-- Air-to-Water Outdoor Unit -->
              <g id="outdoor-unit-group">
                <!-- Outdoor unit casing -->
                <rect x="22" y="90" width="102" height="145" rx="8" fill="url(#cab-grad)" stroke="#9ca3af" stroke-width="1.6" />
                <!-- Outdoor feet -->
                <rect x="30" y="235" width="14" height="4" rx="1" fill="#4b5563" />
                <rect x="102" y="235" width="14" height="4" rx="1" fill="#4b5563" />

                <!-- Evaporator fins on left side -->
                <line x1="28" y1="102" x2="28" y2="223" stroke="#94a3b8" stroke-width="2" stroke-dasharray="3,3" />
                <line x1="33" y1="102" x2="33" y2="223" stroke="#94a3b8" stroke-width="2" stroke-dasharray="3,3" />

                <!-- Big Outdoor Axial Fan Shroud -->
                <circle cx="74" cy="162" r="33" fill="#1e293b" stroke="#64748b" stroke-width="2" />
                <circle cx="74" cy="162" r="28" fill="none" stroke="#475569" stroke-width="1" stroke-dasharray="4,3" />

                <!-- Rotating Fan Blades -->
                <g transform="translate(74, 162)">
                  <g id="outdoor-fan-spin-group" class="spin-fast">
                    <!-- 4 Aerodynamic Blades -->
                    <path d="M 0 0 C 4 -12 14 -18 22 -15 C 24 -11 18 -4 0 0 Z" fill="#94a3b8" />
                    <path d="M 0 0 C 12 4 18 14 15 22 C 11 24 4 18 0 0 Z" fill="#94a3b8" />
                    <path d="M 0 0 C -4 12 -14 18 -22 15 C -24 11 -18 4 0 0 Z" fill="#94a3b8" />
                    <path d="M 0 0 C -12 -4 -18 -14 -15 -22 C -11 -24 -4 -18 0 0 Z" fill="#94a3b8" />
                    <circle cx="0" cy="0" r="5" fill="#334155" />
                  </g>
                </g>

                <!-- Connecting Refrigerant Lines to Indoor Cabinet -->
                <path d="M 124 132 L 145 132" fill="none" stroke="url(#brine-out-grad)" stroke-width="6" stroke-linecap="round" />
                <path d="M 124 215 L 145 215" fill="none" stroke="url(#brine-in-grad)" stroke-width="6" stroke-linecap="round" />

                <!-- Air flow arrows -->
                <polygon points="12,159 18,162 12,165" fill="#38bdf8" opacity="0.9" />
                <polygon points="132,129 138,132 132,135" fill="#ffffff" opacity="0.9" />

                <!-- Outdoor Air Temp Badge (Top of outdoor unit) -->
                <g class="badge-group" id="badge-outdoor-air" transform="translate(74, 68)">
                  <rect class="badge-rect" x="-26" y="-10" width="52" height="20" filter="url(#badge-shadow)" />
                  <text class="badge-text" id="val-outdoor-air">--°c</text>
                  <!-- Thermometer / sun mini icon -->
                  <circle cx="32" cy="0" r="3" fill="#f59e0b" />
                </g>

                <!-- Evaporator / Defrost Temp Badge (Bottom of outdoor unit) -->
                <g class="badge-group" id="badge-evaporator" transform="translate(74, 258)">
                  <rect class="badge-rect" x="-26" y="-10" width="52" height="20" filter="url(#badge-shadow)" />
                  <text class="badge-text" id="val-evaporator">--°c</text>
                  <!-- Defrost active snowflake icon -->
                  <g id="defrost-icon" transform="translate(30, -5)" style="display:none;">
                    <path d="M 5 0 L 5 10 M 0 5 L 10 5 M 1 1 L 9 9 M 9 1 L 1 9" stroke="#38bdf8" stroke-width="1.2" />
                  </g>
                </g>
              </g>
            `}

            <!-- ================= REFRIGERANT CIRCUIT (Center) ================= -->
            <path d="M 168 120 L 168 98 L 212 98 L 212 120" fill="none" stroke="url(#brine-out-grad)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="190" cy="98" r="14" fill="#ffffff" stroke="#1f2937" stroke-width="2" />
            <path d="M 183 93 L 197 98 L 183 103 Z" fill="#1f2937" />

            <line x1="168" y1="120" x2="168" y2="242" stroke="#3b82f6" stroke-width="7" stroke-linecap="round" />
            <line x1="212" y1="120" x2="212" y2="242" stroke="url(#return-grad)" stroke-width="7" stroke-linecap="round" />

            <path d="M 168 242 L 168 266 L 212 266 L 212 242" fill="none" stroke="#3b82f6" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
            <g transform="translate(190, 266)">
              <polygon points="-8,-6 8,6 8,-6 -8,6" fill="#ffffff" stroke="#1f2937" stroke-width="1.8" stroke-linejoin="round" />
            </g>

            <!-- Rotating Central Compressor Gear -->
            <g id="compressor-gear" transform="translate(190, 185)">
              <g id="gear-spin-group" class="">
                <circle cx="0" cy="0" r="16" fill="#1f2937" />
                <rect x="-3" y="-22" width="6" height="44" rx="2" fill="#1f2937" />
                <rect x="-22" y="-3" width="44" height="6" rx="2" fill="#1f2937" />
                <rect x="-3" y="-22" width="6" height="44" rx="2" fill="#1f2937" transform="rotate(45)" />
                <rect x="-3" y="-22" width="6" height="44" rx="2" fill="#1f2937" transform="rotate(-45)" />
                <circle cx="0" cy="0" r="7" fill="#f3f4f6" />
              </g>
            </g>

            <!-- ================= HEATING CIRCUIT (Right) ================= -->
            <path d="M 216 112 L 340 112" fill="none" stroke="url(#supply-grad)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M 235 112 L 235 152 L 340 152" fill="none" stroke="url(#supply-grad)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M 340 250 L 222 250" fill="none" stroke="url(#return-grad)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M 222 250 L 222 152" fill="none" stroke="url(#return-grad)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />

            <!-- Circulation Pump Housing (Right) -->
            <g transform="translate(295, 250)">
              <circle cx="0" cy="0" r="17" fill="#ffffff" stroke="#6b7280" stroke-width="2.5" />
              <g id="circ-pump-spin-group" class="">
                <path d="M -9 0 A 9 9 0 0 1 7 -5" fill="none" stroke="#1f2937" stroke-width="2" stroke-linecap="round" />
                <polygon points="7,-9 11,-4 6,-2" fill="#1f2937" />
                <path d="M 9 0 A 9 9 0 0 1 -7 5" fill="none" stroke="#1f2937" stroke-width="2" stroke-linecap="round" />
                <polygon points="-7,9 -11,4 -6,2" fill="#1f2937" />
              </g>
            </g>

            <!-- Heating Flow Arrows -->
            <polygon points="265,109 275,112 265,115" fill="#ffffff" opacity="0.9" />
            <polygon points="265,149 275,152 265,155" fill="#ffffff" opacity="0.9" />
            <polygon points="255,247 245,250 255,253" fill="#ffffff" opacity="0.9" />

            <!-- Badges (Center & Right) -->
            <!-- Hot Water / Boiler Temp -->
            <g class="badge-group" id="badge-hot-water" transform="translate(190, 80)">
              <rect class="badge-rect" x="-25" y="-10" width="50" height="20" filter="url(#badge-shadow)" />
              <text class="badge-text" id="val-hot-water">--°c</text>
            </g>

            <!-- Discharge / Internal Temp -->
            <g class="badge-group" id="badge-internal" transform="translate(190, 138)">
              <rect class="badge-rect" x="-25" y="-10" width="50" height="20" filter="url(#badge-shadow)" />
              <text class="badge-text" id="val-internal">--°c</text>
            </g>

            <!-- Supply Line Temp -->
            <g class="badge-group" id="badge-supply" transform="translate(295, 96)">
              <rect class="badge-rect" x="-25" y="-10" width="50" height="20" filter="url(#badge-shadow)" />
              <text class="badge-text" id="val-supply">--°c</text>
              <path d="M 28 3 C 27 -2 30 -7 33 -10 C 34 -8 34 -6 35 -4 C 37 -6 37 -9 37 -10 C 42 -5 44 2 40 7 C 38 9 34 10 32 10 C 29 10 27 7 28 3 Z" fill="#ef4444" />
            </g>

            <!-- Radiator Circuit Temp -->
            <g class="badge-group" id="badge-desired-supply" transform="translate(295, 138)">
              <rect class="badge-rect" x="-25" y="-10" width="50" height="20" filter="url(#badge-shadow)" />
              <text class="badge-text" id="val-desired-supply">--°c</text>
              <g transform="translate(30, -8)">
                <rect x="0" y="0" width="16" height="15" rx="1" fill="#e5e7eb" stroke="#6b7280" stroke-width="1" />
                <line x1="4" y1="3" x2="4" y2="12" stroke="#6b7280" stroke-width="1.5" />
                <line x1="8" y1="3" x2="8" y2="12" stroke="#6b7280" stroke-width="1.5" />
                <line x1="12" y1="3" x2="12" y2="12" stroke="#6b7280" stroke-width="1.5" />
              </g>
            </g>

            <!-- Return Line Temp -->
            <g class="badge-group" id="badge-return" transform="translate(295, 218)">
              <rect class="badge-rect" x="-25" y="-10" width="50" height="20" filter="url(#badge-shadow)" />
              <text class="badge-text" id="val-return">--°c</text>
            </g>

            <!-- Heating Circulation Pump Speed -->
            <g class="badge-group" id="badge-circ-pump" transform="translate(295, 276)">
              <rect class="badge-rect" x="-24" y="-9" width="48" height="18" filter="url(#badge-shadow)" />
              <text class="badge-text" id="val-circ-pump">ON</text>
            </g>

            <!-- Timestamp Status Bar -->
            <g transform="translate(190, 310)">
              <rect x="-85" y="-10" width="170" height="20" rx="5" fill="#9ca3af" opacity="0.9" />
              <text id="val-timestamp" x="0" y="1" font-family="inherit" font-size="12" font-weight="600" fill="#ffffff" text-anchor="middle" dominant-baseline="central">--</text>
            </g>
          </svg>
        </div>

        <!-- Primary Controls Section (Pure Home Assistant Style) -->
        <div class="controls-section">
          <!-- 1. Mode Tile -->
          <div class="ha-mode-tile">
            <div class="ha-mode-left">
              <div class="ha-icon-box primary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.56 5.44l-1.45 1.45A7 7 0 1 1 8.89 6.89L7.44 5.44A9 9 0 1 0 16.56 5.44zM13 2h-2v10h2V2z"/>
                </svg>
              </div>
              <div class="ha-tile-meta">
                <span class="ha-tile-title" id="mode-heat-pump-name">Heat Pump Mode</span>
                <span class="ha-tile-subtitle" id="mode-subtitle">Auto • 20 °C</span>
              </div>
            </div>
            <!-- Segmented Control Buttons -->
            <div class="ha-segmented-control" id="mode-segmented">
              <button type="button" class="ha-seg-btn active" data-mode="Auto" id="btn-mode-auto">Auto</button>
              <button type="button" class="ha-seg-btn" data-mode="Manual" id="btn-mode-manual">Manual</button>
              <button type="button" class="ha-seg-btn" data-mode="Off" id="btn-mode-off">Off</button>
            </div>
          </div>

          <!-- 2-Column Grid of Switches (Hot Water & Boost) -->
          <div class="ha-tiles-grid">
            
            <!-- Hot Water Tile -->
            <div class="ha-switch-tile" id="tile-hw">
              <div class="ha-mode-left">
                <div class="ha-icon-box hw-active" id="hw-icon-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a6 6 0 0 0-6 6v10a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V8a6 6 0 0 0-6-6zm0 2a4 4 0 0 1 4 4v2H8V8a4 4 0 0 1 4-4zm-2 10a2 2 0 1 1 4 0 2 2 0 0 1-4 0z"/>
                  </svg>
                </div>
                <div class="ha-tile-meta">
                  <span class="ha-tile-title">Hot Water</span>
                  <span class="ha-tile-subtitle" id="status-hw">On</span>
                </div>
              </div>
              <div class="ha-switch on" id="switch-hw" title="Toggle Hot Water">
                <div class="ha-switch-thumb"></div>
              </div>
            </div>

            <!-- Hot Water Boost Tile -->
            <div class="ha-switch-tile" id="tile-boost">
              <div class="ha-mode-left">
                <div class="ha-icon-box inactive" id="boost-icon-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 14h4v7a1 1 0 0 0 1.7.7l11-13A1 1 0 0 0 20 7h-4V1a1 1 0 0 0-1.7-.7l-11 13A1 1 0 0 0 4 14z"/>
                  </svg>
                </div>
                <div class="ha-tile-meta">
                  <span class="ha-tile-title">Boost</span>
                  <span class="ha-tile-subtitle" id="status-boost">Off</span>
                </div>
              </div>
              <div class="ha-switch" id="switch-boost" title="Toggle Hot Water Boost">
                <div class="ha-switch-thumb"></div>
              </div>
            </div>

          </div>
        </div>

        <!-- Expander Button Bar -->
        <div class="ha-expander" id="chevron-btn" title="Toggle detailed metrics">
          <span class="ha-expander-label">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
            Detailed Metrics & Runtime
          </span>
          <svg class="ha-expander-chevron" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
          </svg>
        </div>

        <!-- Expandable Drawer in Pure HA Style -->
        <div class="drawer" id="drawer">
          <!-- 2x2 Metric Tiles -->
          <div class="ha-sensor-grid">
            <!-- Indoor Temp -->
            <div class="ha-sensor-tile" id="card-indoor">
              <div class="ha-sensor-icon green">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3zm0 10.5a1.5 1.5 0 0 1-1.5-1.5c0-.5.2-.9.6-1.2V8a.9.9 0 0 1 1.8 0v2.8c.4.3.6.7.6 1.2 0 .8-.7 1.5-1.5 1.5z"/></svg>
              </div>
              <div class="ha-sensor-info">
                <div class="ha-sensor-label">Indoor</div>
                <div class="ha-sensor-value" id="val-indoor">--</div>
              </div>
            </div>

            <!-- Outdoor Temp -->
            <div class="ha-sensor-tile" id="card-outdoor">
              <div class="ha-sensor-icon blue">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 20q-2.275 0-3.887-1.575Q1 16.85 1 14.575q0-1.95 1.175-3.475Q3.35 9.575 5.25 9.15q.625-2.3 2.5-3.725Q9.625 4 12 4q2.925 0 4.962 2.038Q19 8.075 19 11q1.725.2 2.862 1.488Q23 13.775 23 15.5q0 1.875-1.312 3.188Q20.375 20 18.5 20Z"/></svg>
              </div>
              <div class="ha-sensor-info">
                <div class="ha-sensor-label">Outdoor</div>
                <div class="ha-sensor-value" id="val-outdoor">--</div>
              </div>
            </div>

            <!-- Target Temp -->
            <div class="ha-sensor-tile" id="card-target">
              <div class="ha-sensor-icon orange">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm0-14a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4zm0-6a2 2 0 1 0 2 2 2 2 0 0 0-2-2z"/></svg>
              </div>
              <div class="ha-sensor-info">
                <div class="ha-sensor-label">Heat Target</div>
                <div class="ha-sensor-value" id="val-target">--</div>
              </div>
            </div>

            <!-- Integral -->
            <div class="ha-sensor-tile" id="card-integral">
              <div class="ha-sensor-icon purple">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2V7h2v10zm-4 0H6v-6h2v6zm8 0h-2v-4h2v4z"/></svg>
              </div>
              <div class="ha-sensor-info">
                <div class="ha-sensor-label">System Integral</div>
                <div class="ha-sensor-value" id="val-integral">--</div>
              </div>
            </div>
          </div>

          <!-- Operational Runtime Stats Panel -->
          <div class="ha-stats-panel">
            <div class="ha-stats-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.5h-2V13h2v3.5zm0-5.5h-2V7h2v4z"/></svg>
              <span>Operational Runtime</span>
            </div>
            <div class="ha-stats-grid">
              <div class="ha-stat-box">
                <div class="ha-stat-name">Compressor</div>
                <div class="ha-stat-val" id="hours-compressor">-- h</div>
              </div>
              <div class="ha-stat-box">
                <div class="ha-stat-name">Heating</div>
                <div class="ha-stat-val" id="hours-heating">-- h</div>
              </div>
              <div class="ha-stat-box">
                <div class="ha-stat-name">Hot Water</div>
                <div class="ha-stat-val" id="hours-hot-water">-- h</div>
              </div>
              <div class="ha-stat-box">
                <div class="ha-stat-name">Aux Heater</div>
                <div class="ha-stat-val" id="hours-aux">-- h</div>
              </div>
            </div>
          </div>
        </div>
      </ha-card>
    `;

    // Attach DOM Event Listeners
    const chevron = this.shadowRoot.getElementById('chevron-btn');
    const drawer = this.shadowRoot.getElementById('drawer');
    if (chevron && drawer) {
      chevron.addEventListener('click', () => {
        this._expanded = !this._expanded;
        chevron.classList.toggle('open', this._expanded);
        drawer.classList.toggle('open', this._expanded);
      });
    }

    // Segmented Mode Buttons
    const segButtons = this.shadowRoot.querySelectorAll('.ha-seg-btn');
    segButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        if (mode) this._handleModeChange(mode);
      });
    });

    const tileHw = this.shadowRoot.getElementById('tile-hw');
    if (tileHw) {
      tileHw.addEventListener('click', () => {
        this._toggleSwitch(this._getEntityMap().hot_water_switch);
      });
    }

    const tileBoost = this.shadowRoot.getElementById('tile-boost');
    if (tileBoost) {
      tileBoost.addEventListener('click', () => {
        this._toggleSwitch(this._getEntityMap().hot_water_boost_switch);
      });
    }

    // Badge click bindings
    const bindClick = (elemId, key) => {
      const el = this.shadowRoot.getElementById(elemId);
      if (el) {
        el.addEventListener('click', () => {
          this._fireMoreInfo(this._getEntityMap()[key]);
        });
      }
    };

    bindClick('badge-supply', 'supply_temp');
    bindClick('badge-desired-supply', 'desired_supply_temp');
    bindClick('badge-return', 'return_temp');
    bindClick('badge-hot-water', 'hot_water_temp');
    bindClick('badge-internal', 'pressure_pipe_temp');
    bindClick('badge-circ-pump', 'circulation_pump');
    bindClick('card-indoor', 'indoor_temp');
    bindClick('card-outdoor', 'outdoor_temp');
    bindClick('card-target', 'heat_target_temp');
    bindClick('card-integral', 'integral');
    bindClick('alarm-banner', 'active_alarms');

    if (!isAir) {
      bindClick('badge-brine-in', 'brine_in_temp');
      bindClick('badge-brine-out', 'brine_out_temp');
      bindClick('badge-brine-pump', 'brine_pump');
    } else {
      bindClick('badge-outdoor-air', 'outdoor_temp');
      bindClick('badge-evaporator', 'evaporator_temp');
    }

    this._updateStates();
  }

  _handleModeChange(newMode) {
    const map = this._getEntityMap();
    const waterHeater = map.water_heater;
    if (!this._hass || !waterHeater) return;

    if (waterHeater.startsWith('water_heater.')) {
      this._hass.callService('water_heater', 'set_operation_mode', {
        entity_id: waterHeater,
        operation_mode: newMode
      });
    } else if (waterHeater.startsWith('select.')) {
      this._hass.callService('select', 'select_option', {
        entity_id: waterHeater,
        option: newMode
      });
    }
  }

  _toggleSwitch(entityId) {
    if (!this._hass || !entityId) return;
    this._hass.callService('switch', 'toggle', {
      entity_id: entityId
    });
  }

  _updateStates() {
    if (!this._hass || !this.shadowRoot) return;
    const map = this._getEntityMap();
    const isAir = this._isAirToWater();

    const setText = (id, text) => {
      const el = this.shadowRoot.getElementById(id);
      if (el) el.textContent = text;
    };

    // 1. Shared Temperatures
    const supply = this._getState(map.supply_temp);
    const desired = this._getState(map.desired_supply_temp);
    const ret = this._getState(map.return_temp);
    const hotWater = this._getState(map.hot_water_temp);
    const pressurePipe = this._getState(map.pressure_pipe_temp, supply);

    setText('val-supply', this._formatBadgeTemp(supply));
    setText('val-desired-supply', this._formatBadgeTemp(desired));
    setText('val-return', this._formatBadgeTemp(ret));
    setText('val-hot-water', this._formatBadgeTemp(hotWater));
    setText('val-internal', this._formatBadgeTemp(pressurePipe));

    // 2. Source Loop Temperatures & Status
    const compressorOn = this._isEntityOn(map.compressor);
    const circPumpOn = this._isEntityOn(map.circulation_pump);

    if (!isAir) {
      const brineIn = this._getState(map.brine_in_temp);
      const brineOut = this._getState(map.brine_out_temp);
      const brinePumpOn = this._isEntityOn(map.brine_pump);

      setText('val-brine-in', this._formatBadgeTemp(brineIn));
      setText('val-brine-out', this._formatBadgeTemp(brineOut));
      setText('val-brine-pump', brinePumpOn ? '100%' : 'OFF');

      const brineSpin = this.shadowRoot.getElementById('brine-pump-spin-group');
      if (brineSpin) {
        brineSpin.setAttribute('class', brinePumpOn ? 'spin-fast' : '');
      }
    } else {
      const outdoorAir = this._getState(map.outdoor_temp);
      const evap = this._getState(map.evaporator_temp);
      const fanOn = this._isEntityOn(map.outdoor_fan) || compressorOn;
      const isDefrost = this._isEntityOn(map.defrost);

      setText('val-outdoor-air', this._formatBadgeTemp(outdoorAir));
      setText('val-evaporator', this._formatBadgeTemp(evap));

      const fanSpin = this.shadowRoot.getElementById('outdoor-fan-spin-group');
      if (fanSpin) {
        fanSpin.setAttribute('class', fanOn ? 'spin-fast' : '');
      }

      const defrostIcon = this.shadowRoot.getElementById('defrost-icon');
      if (defrostIcon) {
        defrostIcon.style.display = isDefrost ? 'block' : 'none';
      }
    }

    // Compressor animation
    const gearSpin = this.shadowRoot.getElementById('gear-spin-group');
    if (gearSpin) {
      gearSpin.setAttribute('class', compressorOn ? 'spin' : '');
    }

    // Circulation pump animation
    const circSpin = this.shadowRoot.getElementById('circ-pump-spin-group');
    if (circSpin) {
      circSpin.setAttribute('class', circPumpOn ? 'spin-fast' : '');
    }
    setText('val-circ-pump', circPumpOn ? 'ON' : 'OFF');

    // 3. Timestamp
    const dateObj = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timestampStr = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}`;
    setText('val-timestamp', timestampStr);

    // 4. Water Heater / Mode selector
    const waterHeaterState = this._hass.states[map.water_heater];
    if (waterHeaterState) {
      const currentOp = waterHeaterState.state || 'Auto';
      const friendlyName = waterHeaterState.attributes.friendly_name || 'Thermia';
      setText('mode-heat-pump-name', friendlyName);
      const targetT = waterHeaterState.attributes.temperature;
      const curT = waterHeaterState.attributes.current_temperature;
      if (targetT !== undefined) {
        setText('mode-subtitle', `${currentOp} • Target: ${targetT} °C${curT !== undefined ? ` • Current: ${curT} °C` : ''}`);
      } else {
        setText('mode-subtitle', `Mode: ${currentOp}`);
      }

      // Highlight active segmented button
      const segButtons = this.shadowRoot.querySelectorAll('.ha-seg-btn');
      segButtons.forEach(btn => {
        const isActive = btn.dataset.mode && (btn.dataset.mode.toLowerCase() === currentOp.toLowerCase());
        btn.classList.toggle('active', isActive);
      });
    }

    // 5. Switches on Main Card
    const hwSwitchOn = this._isEntityOn(map.hot_water_switch);
    const switchHw = this.shadowRoot.getElementById('switch-hw');
    const hwIconBox = this.shadowRoot.getElementById('hw-icon-box');
    if (switchHw) {
      switchHw.classList.toggle('on', hwSwitchOn);
      setText('status-hw', hwSwitchOn ? 'On' : 'Off');
    }
    if (hwIconBox) {
      hwIconBox.className = `ha-icon-box ${hwSwitchOn ? 'hw-active' : 'inactive'}`;
    }

    const boostOn = this._isEntityOn(map.hot_water_boost_switch);
    const switchBoost = this.shadowRoot.getElementById('switch-boost');
    const boostIconBox = this.shadowRoot.getElementById('boost-icon-box');
    if (switchBoost) {
      switchBoost.classList.toggle('on', boostOn);
      setText('status-boost', boostOn ? 'Active' : 'Off');
    }
    if (boostIconBox) {
      boostIconBox.className = `ha-icon-box ${boostOn ? 'boost-active' : 'inactive'}`;
    }

    // 6. Drawer Secondary Stats
    const indoor = this._getState(map.indoor_temp);
    const outdoor = this._getState(map.outdoor_temp);
    const target = this._getState(map.heat_target_temp);
    const integral = this._getState(map.integral);

    setText('val-indoor', this._formatTemp(indoor));
    setText('val-outdoor', this._formatTemp(outdoor));
    setText('val-target', this._formatTemp(target));
    setText('val-integral', integral !== '--' ? `${integral} °min` : '--');

    // Operational statistics
    setText('hours-compressor', `${this._getState(map.compressor_time, '0')} h`);
    setText('hours-heating', `${this._getState(map.heating_time, '0')} h`);
    setText('hours-hot-water', `${this._getState(map.hot_water_time, '0')} h`);
    setText('hours-aux', `${this._getState(map.aux_time, '0')} h`);

    // Alarm banner
    const alarms = this._getState(map.active_alarms, '0');
    const alarmBanner = this.shadowRoot.getElementById('alarm-banner');
    if (alarmBanner) {
      const hasAlarm = alarms !== '0' && alarms !== 'None' && alarms !== 'off' && alarms !== '--';
      alarmBanner.classList.toggle('active', hasAlarm);
      setText('alarm-text', hasAlarm ? `Alarm (${alarms})` : '');
    }
  }
}

// Register custom element
if (!customElements.get('thermia-card')) {
  customElements.define('thermia-card', ThermiaCard);
}

// Register with Home Assistant custom card registry
window.customCards = window.customCards || [];
window.customCards.push({
  type: "thermia-card",
  name: "Thermia Heat Pump Card",
  description: "A graphical schematic card for Ground-Source and Air-to-Water heat pumps with live animated flows and controls.",
  preview: true,
  documentationURL: "https://github.com/MaxVonk/thermia-card"
});
