/**
 * Thermia Heat Pump Card for Home Assistant
 * Compatible with klejejs/ha-thermia-heat-pump-integration and ThermIQ
 * Author: Antigravity
 * Version: 1.0.0
 */

class ThermiaCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._expanded = false;
    this._config = {};
    this._hass = null;
  }

  static getStubConfig() {
    return {
      type: "custom:thermia-card",
      prefix: "thermia",
      title: "Thermia"
    };
  }

  setConfig(config) {
    this._config = {
      prefix: "thermia",
      title: "Thermia",
      ...config,
      entities: {
        ...(config.entities || {})
      }
    };
    this._render();
  }

  set hass(hass) {
    const oldHass = this._hass;
    this._hass = hass;
    if (!oldHass || this._hasStateChanged(oldHass, hass)) {
      this._updateStates();
    }
  }

  getCardSize() {
    return this._expanded ? 7 : 4;
  }

  _resolveEntity(key, fallbackSuffixes) {
    if (this._config.entities && this._config.entities[key]) {
      return this._config.entities[key];
    }
    const prefix = this._config.prefix || 'thermia';
    for (const suffix of fallbackSuffixes) {
      const candidate = `${suffix.domain}.${prefix}_${suffix.name}`;
      if (this._hass && this._hass.states[candidate]) {
        return candidate;
      }
    }
    // Default to the first candidate even if not loaded yet
    const def = fallbackSuffixes[0];
    return `${def.domain}.${prefix}_${def.name}`;
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
      circulation_pump: this._resolveEntity('circulation_pump', [
        { domain: 'binary_sensor', name: 'circulation_pump_operational_status' },
        { domain: 'binary_sensor', name: 'circulation_pump_power_status' },
        { domain: 'binary_sensor', name: 'supply_pump_on' }
      ]),
      water_heater: this._resolveEntity('water_heater', [
        { domain: 'water_heater', name: (this._config.prefix || 'thermia') },
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
        .header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--primary-text-color, #111827);
          letter-spacing: -0.01em;
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
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .spin {
          animation: spin 2.2s linear infinite;
        }
        .spin-fast {
          animation: spin 1.4s linear infinite;
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

        /* Mode & Controls row */
        .controls-row {
          margin-top: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 8px;
        }
        .mode-container {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }
        .mode-icon-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--secondary-background-color, rgba(125, 125, 125, 0.1));
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary-color, #0284c7);
        }
        .mode-details {
          display: flex;
          flex-direction: column;
        }
        .mode-label {
          font-size: 0.72rem;
          color: var(--secondary-text-color, #6b7280);
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.05em;
        }
        .mode-select {
          background: transparent;
          border: none;
          color: var(--primary-text-color, #111827);
          font-size: 1.05rem;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          padding: 2px 0;
          outline: none;
          border-bottom: 1px solid var(--divider-color, #d1d5db);
        }
        .mode-select option {
          background: var(--ha-card-background, var(--card-background-color, #ffffff));
          color: var(--primary-text-color, #111827);
        }

        .divider {
          height: 1px;
          background: var(--divider-color, rgba(0, 0, 0, 0.08));
          margin: 10px 0 4px 0;
        }
        @media (prefers-color-scheme: dark) {
          .divider {
            background: rgba(255, 255, 255, 0.08);
          }
        }

        .chevron-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          margin: 0 auto;
          cursor: pointer;
          background: var(--secondary-background-color, rgba(125, 125, 125, 0.08));
          color: var(--secondary-text-color, #6b7280);
          transition: transform 0.25s ease, background 0.2s ease;
          user-select: none;
        }
        .chevron-btn:hover {
          background: var(--secondary-background-color, rgba(125, 125, 125, 0.16));
          color: var(--primary-text-color, #111827);
        }
        .chevron-btn.open {
          transform: rotate(180deg);
        }

        /* Collapsible Drawer */
        .drawer {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .drawer.open {
          max-height: 500px;
          margin-top: 12px;
        }
        .drawer-content {
          padding-top: 8px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        @media (max-width: 380px) {
          .drawer-content {
            grid-template-columns: 1fr;
          }
        }

        .stat-card {
          background: var(--secondary-background-color, rgba(125, 125, 125, 0.06));
          border-radius: 8px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          cursor: pointer;
        }
        .stat-card:hover {
          background: var(--secondary-background-color, rgba(125, 125, 125, 0.12));
        }
        .stat-title {
          font-size: 0.75rem;
          color: var(--secondary-text-color, #6b7280);
          font-weight: 500;
        }
        .stat-value {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--primary-text-color, #111827);
        }

        .switch-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--secondary-background-color, rgba(125, 125, 125, 0.06));
          border-radius: 8px;
          padding: 10px 12px;
        }
        .switch-label {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--primary-text-color, #111827);
        }
        .toggle-btn {
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease;
          outline: none;
        }
        .toggle-btn.active {
          background: var(--primary-color, #0284c7);
          color: #ffffff;
        }
        .toggle-btn.inactive {
          background: var(--divider-color, rgba(125, 125, 125, 0.2));
          color: var(--secondary-text-color, #6b7280);
        }

        .full-span {
          grid-column: 1 / -1;
        }

        .hours-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
          font-size: 0.8rem;
          color: var(--secondary-text-color, #6b7280);
        }
        .hours-item {
          display: flex;
          justify-content: space-between;
          padding: 3px 0;
          border-bottom: 1px dashed var(--divider-color, rgba(125, 125, 125, 0.2));
        }
        .hours-item strong {
          color: var(--primary-text-color, #111827);
        }
      </style>

      <ha-card>
        <div class="header">
          <h2 id="card-title">${this._config.title || 'Thermia'}</h2>
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
              <!-- Cabinet Gradient -->
              <linearGradient id="cab-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#d1d5db" />
                <stop offset="15%" stop-color="#f3f4f6" />
                <stop offset="85%" stop-color="#f3f4f6" />
                <stop offset="100%" stop-color="#9ca3af" />
              </linearGradient>

              <!-- Brine Inflow Pipe Gradient (Cyan/Blue) -->
              <linearGradient id="brine-in-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#0284c7" />
                <stop offset="100%" stop-color="#38bdf8" />
              </linearGradient>

              <!-- Brine Outflow Pipe Gradient (Violet/Purple) -->
              <linearGradient id="brine-out-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#7c3aed" />
                <stop offset="100%" stop-color="#8b5cf6" />
              </linearGradient>

              <!-- Supply Flow Gradient (Warm Crimson/Red) -->
              <linearGradient id="supply-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#b91c1c" />
                <stop offset="100%" stop-color="#ef4444" />
              </linearGradient>

              <!-- Return Flow Gradient (Cooler Violet/Magenta) -->
              <linearGradient id="return-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#9333ea" />
                <stop offset="100%" stop-color="#c026d3" />
              </linearGradient>

              <!-- Shadow for badges -->
              <filter id="badge-shadow" x="-10%" y="-15%" width="120%" height="135%">
                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.15" />
              </filter>
            </defs>

            <!-- ================= Heat Pump Unit Cabinet ================= -->
            <!-- Feet -->
            <rect x="156" y="286" width="16" height="5" rx="1.5" fill="#4b5563" />
            <rect x="208" y="286" width="16" height="5" rx="1.5" fill="#4b5563" />

            <!-- Main Cabinet Frame -->
            <rect x="145" y="16" width="90" height="270" rx="9" fill="url(#cab-grad)" stroke="#9ca3af" stroke-width="1.5" />
            <!-- Top division line -->
            <line x1="146" y1="32" x2="234" y2="32" stroke="#d1d5db" stroke-width="1" />
            <!-- Display Panel Window -->
            <rect x="170" y="40" width="40" height="42" rx="3" fill="#374151" stroke="#1f2937" stroke-width="1" />
            <rect x="174" y="44" width="32" height="34" rx="2" fill="#1e293b" />

            <!-- ================= PIPING SYSTEM ================= -->

            <!-- 1. Brine Loop (Left side) -->
            <!-- Brine In (Bottom left blue line into cabinet) -->
            <path d="M 30 250 L 158 250 L 158 238" fill="none" stroke="url(#brine-in-grad)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
            <!-- Evaporator coil / heat exchange on left side of cabinet -->
            <rect x="153" y="145" width="10" height="92" rx="2" fill="#e0f2fe" stroke="#0284c7" stroke-width="1.2" />
            <!-- Brine Out (Exits top left) -->
            <path d="M 158 145 L 158 132 L 30 132" fill="none" stroke="url(#brine-out-grad)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />

            <!-- 2. Refrigerant Circuit (Center) -->
            <!-- Top condenser / compressor supply pipe loop -->
            <path d="M 168 120 L 168 98 L 212 98 L 212 120" fill="none" stroke="url(#brine-out-grad)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
            <!-- Compressor circle (top) -->
            <circle cx="190" cy="98" r="14" fill="#ffffff" stroke="#1f2937" stroke-width="2" />
            <path d="M 183 93 L 197 98 L 183 103 Z" fill="#1f2937" />

            <!-- Vertical discharge / return refrigerant lines inside -->
            <line x1="168" y1="120" x2="168" y2="242" stroke="#3b82f6" stroke-width="7" stroke-linecap="round" />
            <line x1="212" y1="120" x2="212" y2="242" stroke="url(#return-grad)" stroke-width="7" stroke-linecap="round" />

            <!-- Bottom expansion valve line -->
            <path d="M 168 242 L 168 266 L 212 266 L 212 242" fill="none" stroke="#3b82f6" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
            <!-- Expansion Valve Symbol (Hourglass) -->
            <g transform="translate(190, 266)">
              <polygon points="-8,-6 8,6 8,-6 -8,6" fill="#ffffff" stroke="#1f2937" stroke-width="1.8" stroke-linejoin="round" />
            </g>

            <!-- 3. Heating Circuit (Right side) -->
            <!-- Supply top branch (to Hot Water & Radiators) -->
            <path d="M 216 112 L 340 112" fill="none" stroke="url(#supply-grad)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
            <!-- Radiator sub-branch -->
            <path d="M 235 112 L 235 152 L 340 152" fill="none" stroke="url(#supply-grad)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
            <!-- Return line from radiators -->
            <path d="M 340 250 L 222 250" fill="none" stroke="url(#return-grad)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
            <!-- Return connection up into condenser -->
            <path d="M 222 250 L 222 152" fill="none" stroke="url(#return-grad)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />

            <!-- ================= ROTATING MECHANICS ================= -->

            <!-- Central Gear / Compressor Running Icon -->
            <g id="compressor-gear" transform="translate(190, 185)">
              <g id="gear-spin-group" class="">
                <!-- 8-tooth gear -->
                <circle cx="0" cy="0" r="16" fill="#1f2937" />
                <rect x="-3" y="-22" width="6" height="44" rx="2" fill="#1f2937" />
                <rect x="-22" y="-3" width="44" height="6" rx="2" fill="#1f2937" />
                <rect x="-3" y="-22" width="6" height="44" rx="2" fill="#1f2937" transform="rotate(45)" />
                <rect x="-3" y="-22" width="6" height="44" rx="2" fill="#1f2937" transform="rotate(-45)" />
                <circle cx="0" cy="0" r="7" fill="#f3f4f6" />
              </g>
            </g>

            <!-- Brine Pump Housing (Left) -->
            <g transform="translate(75, 132)">
              <circle cx="0" cy="0" r="17" fill="#ffffff" stroke="#6b7280" stroke-width="2.5" />
              <g id="brine-pump-spin-group" class="">
                <!-- Pump rotating arrows -->
                <path d="M -9 0 A 9 9 0 0 1 7 -5" fill="none" stroke="#1f2937" stroke-width="2" stroke-linecap="round" />
                <polygon points="7,-9 11,-4 6,-2" fill="#1f2937" />
                <path d="M 9 0 A 9 9 0 0 1 -7 5" fill="none" stroke="#1f2937" stroke-width="2" stroke-linecap="round" />
                <polygon points="-7,9 -11,4 -6,2" fill="#1f2937" />
              </g>
            </g>

            <!-- Heating Circulation Pump Housing (Right) -->
            <g transform="translate(295, 250)">
              <circle cx="0" cy="0" r="17" fill="#ffffff" stroke="#6b7280" stroke-width="2.5" />
              <g id="circ-pump-spin-group" class="">
                <!-- Pump rotating arrows -->
                <path d="M -9 0 A 9 9 0 0 1 7 -5" fill="none" stroke="#1f2937" stroke-width="2" stroke-linecap="round" />
                <polygon points="7,-9 11,-4 6,-2" fill="#1f2937" />
                <path d="M 9 0 A 9 9 0 0 1 -7 5" fill="none" stroke="#1f2937" stroke-width="2" stroke-linecap="round" />
                <polygon points="-7,9 -11,4 -6,2" fill="#1f2937" />
              </g>
            </g>

            <!-- Flow Arrows along pipes -->
            <!-- Brine in arrow -->
            <polygon points="85,247 95,250 85,253" fill="#ffffff" opacity="0.9" />
            <!-- Brine out arrow -->
            <polygon points="120,129 110,132 120,135" fill="#ffffff" opacity="0.9" />
            <!-- Flow top right arrow -->
            <polygon points="265,109 275,112 265,115" fill="#ffffff" opacity="0.9" />
            <!-- Radiator branch arrow -->
            <polygon points="265,149 275,152 265,155" fill="#ffffff" opacity="0.9" />
            <!-- Return line arrow -->
            <polygon points="255,247 245,250 255,253" fill="#ffffff" opacity="0.9" />

            <!-- ================= TEMPERATURE & STATUS BADGES ================= -->

            <!-- 1. Brine In (3°c) -->
            <g class="badge-group" id="badge-brine-in" transform="translate(68, 238)">
              <rect class="badge-rect" x="-26" y="-10" width="52" height="20" filter="url(#badge-shadow)" />
              <text class="badge-text" id="val-brine-in">--°c</text>
            </g>

            <!-- 2. Brine Pump Speed (100%) -->
            <g class="badge-group" id="badge-brine-pump" transform="translate(75, 158)">
              <rect class="badge-rect" x="-24" y="-9" width="48" height="18" filter="url(#badge-shadow)" />
              <text class="badge-text" id="val-brine-pump">ON</text>
            </g>

            <!-- 3. Brine Out (0°c) -->
            <g class="badge-group" id="badge-brine-out" transform="translate(68, 102)">
              <rect class="badge-rect" x="-26" y="-10" width="52" height="20" filter="url(#badge-shadow)" />
              <text class="badge-text" id="val-brine-out">--°c</text>
            </g>

            <!-- 4. Hot Water / Boiler Temp (74°c at top center) -->
            <g class="badge-group" id="badge-hot-water" transform="translate(190, 80)">
              <rect class="badge-rect" x="-25" y="-10" width="50" height="20" filter="url(#badge-shadow)" />
              <text class="badge-text" id="val-hot-water">--°c</text>
            </g>

            <!-- 5. Discharge / Internal Temp (79°c) -->
            <g class="badge-group" id="badge-internal" transform="translate(190, 138)">
              <rect class="badge-rect" x="-25" y="-10" width="50" height="20" filter="url(#badge-shadow)" />
              <text class="badge-text" id="val-internal">--°c</text>
            </g>

            <!-- 6. Supply Line Temp (75°c + Flame icon) -->
            <g class="badge-group" id="badge-supply" transform="translate(295, 96)">
              <rect class="badge-rect" x="-25" y="-10" width="50" height="20" filter="url(#badge-shadow)" />
              <text class="badge-text" id="val-supply">--°c</text>
              <!-- Flame icon -->
              <path d="M 28 3 C 27 -2 30 -7 33 -10 C 34 -8 34 -6 35 -4 C 37 -6 37 -9 37 -10 C 42 -5 44 2 40 7 C 38 9 34 10 32 10 C 29 10 27 7 28 3 Z" fill="#ef4444" />
            </g>

            <!-- 7. Radiator Circuit / Target Supply Temp (45°c + Radiator icon) -->
            <g class="badge-group" id="badge-desired-supply" transform="translate(295, 138)">
              <rect class="badge-rect" x="-25" y="-10" width="50" height="20" filter="url(#badge-shadow)" />
              <text class="badge-text" id="val-desired-supply">--°c</text>
              <!-- Small Radiator Icon -->
              <g transform="translate(30, -8)">
                <rect x="0" y="0" width="16" height="15" rx="1" fill="#e5e7eb" stroke="#6b7280" stroke-width="1" />
                <line x1="4" y1="3" x2="4" y2="12" stroke="#6b7280" stroke-width="1.5" />
                <line x1="8" y1="3" x2="8" y2="12" stroke="#6b7280" stroke-width="1.5" />
                <line x1="12" y1="3" x2="12" y2="12" stroke="#6b7280" stroke-width="1.5" />
              </g>
            </g>

            <!-- 8. Return Line Temp (36°c) -->
            <g class="badge-group" id="badge-return" transform="translate(295, 218)">
              <rect class="badge-rect" x="-25" y="-10" width="50" height="20" filter="url(#badge-shadow)" />
              <text class="badge-text" id="val-return">--°c</text>
            </g>

            <!-- 9. Heating Circulation Pump Speed (59%) -->
            <g class="badge-group" id="badge-circ-pump" transform="translate(295, 276)">
              <rect class="badge-rect" x="-24" y="-9" width="48" height="18" filter="url(#badge-shadow)" />
              <text class="badge-text" id="val-circ-pump">ON</text>
            </g>

            <!-- ================= Timestamp Status Bar ================= -->
            <g transform="translate(190, 310)">
              <rect x="-85" y="-10" width="170" height="20" rx="5" fill="#9ca3af" opacity="0.9" />
              <text id="val-timestamp" x="0" y="1" font-family="inherit" font-size="12" font-weight="600" fill="#ffffff" text-anchor="middle" dominant-baseline="central">--</text>
            </g>
          </svg>
        </div>

        <!-- Mode Selector Row -->
        <div class="controls-row">
          <div class="mode-container">
            <div class="mode-icon-circle">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.56 5.44l-1.45 1.45A7 7 0 1 1 8.89 6.89L7.44 5.44A9 9 0 1 0 16.56 5.44zM13 2h-2v10h2V2z"/>
              </svg>
            </div>
            <div class="mode-details">
              <span class="mode-label">Thermia Mode</span>
              <select class="mode-select" id="mode-select">
                <option value="Auto">Auto</option>
                <option value="Manual">Manual</option>
                <option value="Off">Off</option>
              </select>
            </div>
          </div>
        </div>

        <div class="divider"></div>

        <!-- Chevron Expand Button -->
        <div class="chevron-btn" id="chevron-btn" title="Toggle detailed controls">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
          </svg>
        </div>

        <!-- Expandable Drawer -->
        <div class="drawer" id="drawer">
          <div class="drawer-content">
            <!-- Indoor Temp -->
            <div class="stat-card" id="card-indoor">
              <span class="stat-title">Indoor Temperature</span>
              <span class="stat-value" id="val-indoor">--</span>
            </div>

            <!-- Outdoor Temp -->
            <div class="stat-card" id="card-outdoor">
              <span class="stat-title">Outdoor Temperature</span>
              <span class="stat-value" id="val-outdoor">--</span>
            </div>

            <!-- Target Temp -->
            <div class="stat-card" id="card-target">
              <span class="stat-title">Heat Target Temp</span>
              <span class="stat-value" id="val-target">--</span>
            </div>

            <!-- Integral -->
            <div class="stat-card" id="card-integral">
              <span class="stat-title">System Integral</span>
              <span class="stat-value" id="val-integral">--</span>
            </div>

            <!-- Hot Water Switch -->
            <div class="switch-row" id="row-hot-water-switch">
              <span class="switch-label">Hot Water</span>
              <button class="toggle-btn inactive" id="btn-hot-water">OFF</button>
            </div>

            <!-- Hot Water Boost Switch -->
            <div class="switch-row" id="row-hot-water-boost">
              <span class="switch-label">Hot Water Boost</span>
              <button class="toggle-btn inactive" id="btn-hot-water-boost">OFF</button>
            </div>

            <!-- Operational Hours -->
            <div class="stat-card full-span">
              <span class="stat-title" style="margin-bottom: 6px;">Operational Statistics</span>
              <div class="hours-grid">
                <div class="hours-item"><span>Compressor:</span> <strong id="hours-compressor">-- h</strong></div>
                <div class="hours-item"><span>Heating:</span> <strong id="hours-heating">-- h</strong></div>
                <div class="hours-item"><span>Hot Water:</span> <strong id="hours-hot-water">-- h</strong></div>
                <div class="hours-item"><span>Aux Heater:</span> <strong id="hours-aux">-- h</strong></div>
              </div>
            </div>
          </div>
        </div>
      </ha-card>
    `;

    // Attach DOM Event Listeners
    const chevron = this.shadowRoot.getElementById('chevron-btn');
    const drawer = this.shadowRoot.getElementById('drawer');
    chevron.addEventListener('click', () => {
      this._expanded = !this._expanded;
      chevron.classList.toggle('open', this._expanded);
      drawer.classList.toggle('open', this._expanded);
    });

    const modeSelect = this.shadowRoot.getElementById('mode-select');
    modeSelect.addEventListener('change', (e) => {
      this._handleModeChange(e.target.value);
    });

    const btnHw = this.shadowRoot.getElementById('btn-hot-water');
    btnHw.addEventListener('click', () => {
      this._toggleSwitch(this._getEntityMap().hot_water_switch);
    });

    const btnBoost = this.shadowRoot.getElementById('btn-hot-water-boost');
    btnBoost.addEventListener('click', () => {
      this._toggleSwitch(this._getEntityMap().hot_water_boost_switch);
    });

    // Badge more-info click bindings
    const bindClick = (elemId, key) => {
      const el = this.shadowRoot.getElementById(elemId);
      if (el) {
        el.addEventListener('click', () => {
          this._fireMoreInfo(this._getEntityMap()[key]);
        });
      }
    };

    bindClick('badge-brine-in', 'brine_in_temp');
    bindClick('badge-brine-out', 'brine_out_temp');
    bindClick('badge-supply', 'supply_temp');
    bindClick('badge-desired-supply', 'desired_supply_temp');
    bindClick('badge-return', 'return_temp');
    bindClick('badge-hot-water', 'hot_water_temp');
    bindClick('badge-internal', 'pressure_pipe_temp');
    bindClick('badge-brine-pump', 'brine_pump');
    bindClick('badge-circ-pump', 'circulation_pump');
    bindClick('card-indoor', 'indoor_temp');
    bindClick('card-outdoor', 'outdoor_temp');
    bindClick('card-target', 'heat_target_temp');
    bindClick('card-integral', 'integral');
    bindClick('alarm-banner', 'active_alarms');

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

    // 1. Temperature Values
    const supply = this._getState(map.supply_temp);
    const desired = this._getState(map.desired_supply_temp);
    const ret = this._getState(map.return_temp);
    const brineIn = this._getState(map.brine_in_temp);
    const brineOut = this._getState(map.brine_out_temp);
    const hotWater = this._getState(map.hot_water_temp);
    const pressurePipe = this._getState(map.pressure_pipe_temp, supply);

    const setText = (id, text) => {
      const el = this.shadowRoot.getElementById(id);
      if (el) el.textContent = text;
    };

    setText('val-supply', this._formatBadgeTemp(supply));
    setText('val-desired-supply', this._formatBadgeTemp(desired));
    setText('val-return', this._formatBadgeTemp(ret));
    setText('val-brine-in', this._formatBadgeTemp(brineIn));
    setText('val-brine-out', this._formatBadgeTemp(brineOut));
    setText('val-hot-water', this._formatBadgeTemp(hotWater));
    setText('val-internal', this._formatBadgeTemp(pressurePipe));

    // 2. Binary Status & Animations
    const compressorOn = this._isEntityOn(map.compressor);
    const brinePumpOn = this._isEntityOn(map.brine_pump);
    const circPumpOn = this._isEntityOn(map.circulation_pump);

    // Compressor animation
    const gearSpin = this.shadowRoot.getElementById('gear-spin-group');
    if (gearSpin) {
      gearSpin.setAttribute('class', compressorOn ? 'spin' : '');
    }

    // Brine pump impeller animation
    const brineSpin = this.shadowRoot.getElementById('brine-pump-spin-group');
    if (brineSpin) {
      brineSpin.setAttribute('class', brinePumpOn ? 'spin-fast' : '');
    }
    setText('val-brine-pump', brinePumpOn ? '100%' : 'OFF');

    // Circulation pump impeller animation
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

    // 4. Mode selector
    const waterHeaterState = this._hass.states[map.water_heater];
    const modeSelect = this.shadowRoot.getElementById('mode-select');
    if (waterHeaterState && modeSelect) {
      const currentOp = waterHeaterState.state;
      const opList = waterHeaterState.attributes.operation_list || ['Auto', 'Manual', 'Off'];
      
      // Update options if not already matching
      if (modeSelect.options.length !== opList.length) {
        modeSelect.innerHTML = '';
        opList.forEach(op => {
          const opt = document.createElement('option');
          opt.value = op;
          opt.textContent = op;
          modeSelect.appendChild(opt);
        });
      }
      modeSelect.value = currentOp;
    }

    // 5. Drawer Secondary Stats
    const indoor = this._getState(map.indoor_temp);
    const outdoor = this._getState(map.outdoor_temp);
    const target = this._getState(map.heat_target_temp);
    const integral = this._getState(map.integral);

    setText('val-indoor', this._formatTemp(indoor));
    setText('val-outdoor', this._formatTemp(outdoor));
    setText('val-target', this._formatTemp(target));
    setText('val-integral', integral !== '--' ? `${integral} °min` : '--');

    // Switches
    const hwSwitchOn = this._isEntityOn(map.hot_water_switch);
    const btnHw = this.shadowRoot.getElementById('btn-hot-water');
    if (btnHw) {
      btnHw.textContent = hwSwitchOn ? 'ON' : 'OFF';
      btnHw.className = `toggle-btn ${hwSwitchOn ? 'active' : 'inactive'}`;
    }

    const boostOn = this._isEntityOn(map.hot_water_boost_switch);
    const btnBoost = this.shadowRoot.getElementById('btn-hot-water-boost');
    if (btnBoost) {
      btnBoost.textContent = boostOn ? 'ON' : 'OFF';
      btnBoost.className = `toggle-btn ${boostOn ? 'active' : 'inactive'}`;
    }

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

// Register the custom element
if (!customElements.get('thermia-card')) {
  customElements.define('thermia-card', ThermiaCard);
}

// Register with Home Assistant custom card registry
window.customCards = window.customCards || [];
window.customCards.push({
  type: "thermia-card",
  name: "Thermia Heat Pump Card",
  description: "A graphical schematic card for Thermia heat pumps with live animated flows and controls.",
  preview: true,
  documentationURL: "https://github.com/klejejs/ha-thermia-heat-pump-integration"
});

