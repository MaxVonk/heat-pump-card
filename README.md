# Thermia Heat Pump Home Assistant Card

A beautiful, interactive Home Assistant dashboard card for monitoring and controlling your **Thermia heat pump**, specifically designed for the [klejejs/ha-thermia-heat-pump-integration](https://github.com/klejejs/ha-thermia-heat-pump-integration) (Thermia Online API) and also backward-compatible with [ThermIQ-MQTT](https://github.com/ThermIQ/thermiq_mqtt-ha).

---

## Visual & Functional Features

The card faithfully matches the dedicated heat pump schematic view:
- **Heat Pump Unit Schematic**: Sleek cabinet rendering with display panel, internal refrigerant loop, evaporator, condenser, and expansion valve.
- **Brine Circuit (Ground Loop)**:
  - Brine Inflow & Outflow temperature badges (`sensor.<hp>_brine_in_temperature`, `sensor.<hp>_brine_out_temperature`).
  - Brine pump status & animated spinning impeller when active (`binary_sensor.<hp>_brine_pump_operational_status`).
- **Heating & Hot Water Loop**:
  - Supply line temperature badge with flame indicator (`sensor.<hp>_supply_line_temperature`).
  - Desired/target radiator flow temperature badge with radiator icon (`sensor.<hp>_desired_supply_line_temperature`).
  - Return line temperature badge (`sensor.<hp>_return_line_temperature`).
  - Heating circulation pump status & animated spinning impeller when active (`binary_sensor.<hp>_circulation_pump_operational_status`).
- **Compressor & Internal Circuit**:
  - Central gear that rotates when the compressor is running (`binary_sensor.<hp>_compressor_operational_status`).
  - Hot water / boiler temperature badge (`sensor.<hp>_hot_water_temperature`).
  - Hot gas / internal discharge temperature badge (`sensor.<hp>_pressure_pipe_temperature` or supply).
- **Interactive Mode Selector**:
  - Direct dropdown controlling the heat pump mode (`Auto`, `Manual`, `Off`, etc.) via `water_heater.<hp>`.
- **Collapsible Drawer (Accordion)**:
  - Toggled by the bottom chevron icon to keep your dashboard clean.
  - Exposes indoor and outdoor temperatures, heat target temperature, system integral (°min), hot water switch, hot water boost switch, and compressor/heating operating hours.
- **Clickable Badges**:
  - Clicking any temperature badge or pump opens Home Assistant's native **More-Info** dialog with historical graphs.
- **Theme Adaptive**:
  - Seamlessly supports both Home Assistant Light and Dark modes.

---

## Method 1: Modern Custom Card (`thermia-card.js`) — Recommended

This method is self-contained: **no external HACS frontend cards or image uploads are required**.

### Step 1: Copy `thermia-card.js` to Home Assistant
Copy the file `thermia-card.js` to your Home Assistant configuration directory under:
```text
/config/www/thermia-card.js
```
*(Note: Files in `/config/www/` are served by Home Assistant at `/local/`).*

### Step 2: Register as a Dashboard Resource
1. In Home Assistant, go to **Settings** → **Dashboards**.
2. Click the three dots (top right corner) and select **Resources**.
3. Click **Add Resource** (+ button at bottom right).
4. Enter:
   - **URL**: `/local/thermia-card.js?v=1.0.0`
   - **Resource type**: `JavaScript Module`
5. Click **Create** and hard-refresh your browser (`Ctrl+Shift+R` or `Cmd+Shift+R`).

### Step 3: Add the Card to Your Dashboard
In any dashboard, click **Edit Dashboard** → **Add Card** → **Manual**, and paste:

```yaml
type: custom:thermia-card
prefix: thermia
title: Thermia Heat Pump
```

> [!TIP]
> If your heat pump entity prefix is different (for example, `sensor.heat_pump_supply_line_temperature` or `sensor.thermia_online_supply_line_temperature`), simply update `prefix`:
> ```yaml
> type: custom:thermia-card
> prefix: heat_pump
> ```

### Full Custom Configuration (Optional)
If you have custom or renamed entity IDs, you can override any individual entity:

```yaml
type: custom:thermia-card
title: My Thermia
prefix: thermia
entities:
  supply_temp: sensor.thermia_supply_line_temperature
  desired_supply_temp: sensor.thermia_desired_supply_line_temperature
  return_temp: sensor.thermia_return_line_temperature
  brine_in_temp: sensor.thermia_brine_in_temperature
  brine_out_temp: sensor.thermia_brine_out_temperature
  hot_water_temp: sensor.thermia_hot_water_temperature
  pressure_pipe_temp: sensor.thermia_supply_line_temperature
  outdoor_temp: sensor.thermia_outdoor_temperature
  indoor_temp: sensor.thermia_indoor_temperature
  heat_target_temp: sensor.thermia_heat_target_temperature
  integral: sensor.thermia_integral
  compressor: binary_sensor.thermia_compressor_operational_status
  brine_pump: binary_sensor.thermia_brine_pump_operational_status
  circulation_pump: binary_sensor.thermia_circulation_pump_operational_status
  water_heater: water_heater.thermia
  hot_water_switch: switch.thermia_hot_water
  hot_water_boost_switch: switch.thermia_hot_water_boost
  active_alarms: sensor.thermia_active_alarms
```

---

## Method 2: Classic PNG + YAML Card (`thermia_classic_card.yaml`)

If you prefer using the exact community PNG graphics (`vp_base.png`, `vp_base_hw.png`, `vp_base_hgwon.png`):

1. **Install HACS Frontend Cards**:
   - `HTML Jinja2 Template card` (`custom:html-template-card`)
   - `fold-entity-row` (`custom:fold-entity-row`)
2. **Copy Images**:
   - Copy the files in `www/community/` from this repo to your Home Assistant machine at `/config/www/community/`.
3. **Add Card**:
   - Copy and paste the contents of [thermia_classic_card.yaml](thermia_classic_card.yaml) into a **Manual** card.

---

## How to Find Your Exact Entity IDs

If any sensor displays `--°c`:
1. In Home Assistant, open **Developer Tools** → **States**.
2. Filter the entity search by `thermia` or `water_heater`.
3. Verify your exact sensor names and ensure your Thermia Online credentials and integration status are active in **Settings** → **Devices & Services**.

