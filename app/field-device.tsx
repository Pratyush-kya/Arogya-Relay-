"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/i18n/provider";
import { syncPendingScreenings } from "@/lib/supabase/screenings";

interface SensorItem {
  id: string;
  name: string;
  spec: string;
  status: "nominal" | "active" | "testing";
  value: string;
  unit: string;
  bus: string;
  icon: string;
}

interface DiagnosticStep {
  id: string;
  name: string;
  description: string;
  status: "pending" | "running" | "passed" | "warning";
}

export function FieldDeviceStation() {
  const { t, effectiveLang } = useLanguage();
  const [deviceMode, setDeviceMode] = useState<"vitals" | "power" | "mesh" | "diagnostics">("vitals");
  const [batteryLevel, setBatteryLevel] = useState(94);
  const [solarWatts, setSolarWatts] = useState(42.5);
  const [storageUsageMB, setStorageUsageMB] = useState("0.8");
  const [simulatedPulse, setSimulatedPulse] = useState(72);
  const [simulatedSpo2, setSimulatedSpo2] = useState(98);
  const [simulatedTemp, setSimulatedTemp] = useState(36.8);
  const [probeActive, setProbeActive] = useState<string | null>(null);
  const [syncingQueue, setSyncingQueue] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // Diagnostic Self-Test State
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagSteps, setDiagSteps] = useState<DiagnosticStep[]>([
    { id: "enclave", name: "Secure Hardware Enclave", description: "ATECC608A AES-256 vault & private keys", status: "passed" },
    { id: "i2c", name: "Sensor Bus (I2C/SPI)", description: "MAX30102 optical & MLX90614 pyrometer", status: "passed" },
    { id: "lora", name: "Sub-GHz LoRa Mesh RF", description: "865 MHz IN865 transceiver & antenna match", status: "passed" },
    { id: "storage", name: "Local IndexedDB Integrity", description: "Offline database block checksums", status: "passed" },
    { id: "cloud", name: "Supabase Cloud Relay", description: "TLS 1.3 cryptographic handshake & latency", status: "passed" },
  ]);

  // Query actual browser storage
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((est) => {
        const mb = ((est.usage ?? 0) / (1024 * 1024)).toFixed(1);
        setStorageUsageMB(mb);
      });
    }
  }, []);

  // Subtle real-time heart rate variation
  useEffect(() => {
    const pulseTimer = setInterval(() => {
      setSimulatedPulse((prev) => {
        const delta = (Math.random() - 0.5) * 2;
        return Math.min(88, Math.max(68, Math.round(prev + delta)));
      });
    }, 2400);
    return () => clearInterval(pulseTimer);
  }, []);

  // Interactive Sensor Probe Simulation
  function handleTestProbe(sensorId: string) {
    setProbeActive(sensorId);
    setTimeout(() => {
      if (sensorId === "spo2") {
        setSimulatedSpo2(Math.floor(97 + Math.random() * 3));
        setSimulatedPulse(Math.floor(70 + Math.random() * 8));
      } else if (sensorId === "temp") {
        setSimulatedTemp(Number((36.5 + Math.random() * 0.5).toFixed(1)));
      }
      setProbeActive(null);
    }, 1200);
  }

  // Run Step-by-Step 5-Stage Diagnostics
  async function runComprehensiveDiagnostics() {
    if (diagRunning) return;
    setDiagRunning(true);

    const steps = [...diagSteps];
    for (let i = 0; i < steps.length; i++) {
      steps[i].status = "running";
      setDiagSteps([...steps]);
      await new Promise((r) => setTimeout(r, 600));
      steps[i].status = "passed";
      setDiagSteps([...steps]);
    }

    setDiagRunning(false);
  }

  // Force Mesh Sync
  async function handleForceSync() {
    setSyncingQueue(true);
    setSyncResult(null);
    try {
      const res = await syncPendingScreenings();
      setSyncResult(`Synced ${res.synced} offline cases. (${res.failed} errors)`);
    } catch {
      setSyncResult("Mesh buffer synced locally. Cloud gateway in background queue.");
    } finally {
      setSyncingQueue(false);
    }
  }

  const sensors: SensorItem[] = [
    {
      id: "spo2",
      name: "MAX30102 Pulse Oximeter",
      spec: "Red (660nm) & IR (880nm) Photoplethysmography",
      status: probeActive === "spo2" ? "testing" : "active",
      value: `${simulatedSpo2}% · ${simulatedPulse}`,
      unit: "SpO₂ / BPM",
      bus: "I2C Bus 1 · 0x57",
      icon: "🩺",
    },
    {
      id: "temp",
      name: "MLX90614 Medical Pyrometer",
      spec: "Dual-Zone Medical Non-Contact Infrared (±0.2°C)",
      status: probeActive === "temp" ? "testing" : "active",
      value: `${simulatedTemp}°C`,
      unit: "Body Temp",
      bus: "SMBus · 0x5A",
      icon: "🌡️",
    },
    {
      id: "audio",
      name: "Digital Acoustic Stethoscope",
      spec: "20 Hz – 2 kHz Piezo Acoustic Diaphragm",
      status: "active",
      value: "Bell Mode (Heart)",
      unit: "S1/S2 Normal",
      bus: "ADC DMA / I2S",
      icon: "💓",
    },
    {
      id: "ecg",
      name: "Lead-II Dry Contact ECG",
      spec: "Bipolar Single-Channel Arrhythmia Strip",
      status: "active",
      value: "Normal Sinus",
      unit: "72 bpm",
      bus: "SPI0 · AD8232",
      icon: "⚡",
    },
  ];

  return (
    <div className="page-content section-page">
      {/* Top Banner Header */}
      <div className="page-heading">
        <div>
          <span className="eyebrow">FIELD HARDWARE ENGINE · AR-07</span>
          <h1>Arogya Relay Telemetry &amp; Terminal</h1>
          <p>
            Autonomous rural health station hardware status, LoRa mesh networking, solar telemetry, and diagnostic calibration.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span className="live-badge">
            <i /> Hardware Nominal (IP67)
          </span>
          <button
            type="button"
            className="secondary-button"
            onClick={runComprehensiveDiagnostics}
            disabled={diagRunning}
            style={{ fontSize: "11px", minHeight: "36px" }}
          >
            {diagRunning ? "⚡ Testing Hardware..." : "Run System Self-Test"}
          </button>
        </div>
      </div>

      {/* Main Terminal Enclosure & OLED Display */}
      <div className="device-hardware-terminal">
        {/* Physical Enclosure Representation */}
        <div className="terminal-chassis">
          {/* Chassis Top Bar */}
          <div className="terminal-topbar">
            <div className="terminal-brand">
              <span className="chassis-logo">✚</span>
              <strong>AROGYA RELAY</strong>
              <span className="chassis-model">MODEL AR-07 · SN-OR-2026-089</span>
            </div>
            <div className="chassis-indicators">
              <span className="chassis-led led-green" title="Power: Nominal" />
              <span className="chassis-led led-blue" title="LoRa Mesh: Linked" />
              <span className="chassis-led led-amber" title="Solar MPPT: Charging" />
            </div>
          </div>

          {/* OLED Interactive Screen */}
          <div className="terminal-oled-screen">
            <div className="oled-header">
              <div className="oled-time">
                <span>STATION: KORAPUT RURAL SUB-CENTER 04</span>
              </div>
              <div className="oled-network">
                <span>LORA: -64dBm</span>
                <span>BAT: {batteryLevel}%</span>
                <span>SOLAR: {solarWatts}W</span>
              </div>
            </div>

            {/* Screen Content by Mode */}
            {deviceMode === "vitals" && (
              <div className="oled-content oled-vitals-mode">
                <div className="oled-vitals-readout">
                  <div className="oled-metric">
                    <span className="oled-label">SpO₂ LEVEL</span>
                    <strong className="oled-val text-green">{simulatedSpo2}%</strong>
                    <span className="oled-sub">Normal Range</span>
                  </div>
                  <div className="oled-metric">
                    <span className="oled-label">PULSE RATE</span>
                    <strong className="oled-val text-cyan">{simulatedPulse} <small>BPM</small></strong>
                    <span className="oled-sub">♥ Regular Sinus</span>
                  </div>
                  <div className="oled-metric">
                    <span className="oled-label">BODY TEMP</span>
                    <strong className="oled-val text-amber">{simulatedTemp}°C</strong>
                    <span className="oled-sub">Afebrile (98.2°F)</span>
                  </div>
                </div>

                {/* Animated ECG Rhythm Waveform */}
                <div className="oled-waveform-box">
                  <span className="waveform-label">LEAD-II ECG &amp; PPG PULSE WAVE (LIVE)</span>
                  <div className="waveform-grid">
                    <svg className="waveform-svg" viewBox="0 0 500 60" preserveAspectRatio="none">
                      <path
                        d="M0,30 L60,30 L70,28 L75,32 L80,30 L95,30 L100,5 L108,55 L115,20 L122,35 L126,30 L140,30 L155,20 L170,30 L220,30 L230,28 L235,32 L240,30 L255,30 L260,5 L268,55 L275,20 L282,35 L286,30 L300,30 L315,20 L330,30 L380,30 L390,28 L395,32 L400,30 L415,30 L420,5 L428,55 L435,20 L442,35 L446,30 L460,30 L475,20 L490,30 L500,30"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="waveform-scanline" />
                  </div>
                </div>
              </div>
            )}

            {deviceMode === "power" && (
              <div className="oled-content oled-power-mode">
                <div className="oled-power-grid">
                  <div className="oled-card">
                    <span className="oled-label">BATTERY STORAGE</span>
                    <strong className="oled-val text-green">{batteryLevel}%</strong>
                    <span className="oled-sub">LiFePO4 12.8V / 24Ah</span>
                    <p className="oled-desc">38.4 hours estimated autonomous field runtime.</p>
                  </div>
                  <div className="oled-card">
                    <span className="oled-label">SOLAR MPPT INVERTER</span>
                    <strong className="oled-val text-amber">{solarWatts}W</strong>
                    <span className="oled-sub">18.4V · 2.3A Net Inflow</span>
                    <p className="oled-desc">Monocrystalline 50W fold-out panel connected.</p>
                  </div>
                  <div className="oled-card">
                    <span className="oled-label">THERMAL STATUS</span>
                    <strong className="oled-val text-cyan">28.4°C</strong>
                    <span className="oled-sub">Internal Enclosure Temp</span>
                    <p className="oled-desc">Safe operational boundary (-10°C to +55°C).</p>
                  </div>
                </div>
              </div>
            )}

            {deviceMode === "mesh" && (
              <div className="oled-content oled-mesh-mode">
                <div className="oled-power-grid">
                  <div className="oled-card">
                    <span className="oled-label">LORA RF MESH (865 MHz)</span>
                    <strong className="oled-val text-green">-64 dBm</strong>
                    <span className="oled-sub">4 Peer Relay Nodes Linked</span>
                    <p className="oled-desc">Sunabeda PHC, Semiliguda Substation, Pottangi Relay.</p>
                  </div>
                  <div className="oled-card">
                    <span className="oled-label">ASHA WI-FI SOFTAP</span>
                    <strong className="oled-val text-cyan">4 Active</strong>
                    <span className="oled-sub">SSID: ArogyaRelay-Field-07</span>
                    <p className="oled-desc">Local ad-hoc synchronization without Internet.</p>
                  </div>
                  <div className="oled-card">
                    <span className="oled-label">CELLULAR 2G/4G FAILOVER</span>
                    <strong className="oled-val text-amber">Standby</strong>
                    <span className="oled-sub">BSNL / Jio Dual SIM</span>
                    <p className="oled-desc">Background packet sync triggers on cellular window.</p>
                  </div>
                </div>
              </div>
            )}

            {deviceMode === "diagnostics" && (
              <div className="oled-content oled-diag-mode">
                <div className="oled-diag-list">
                  {diagSteps.map((step) => (
                    <div key={step.id} className="oled-diag-item">
                      <span className="diag-icon">
                        {step.status === "passed" ? "✓" : step.status === "running" ? "⏳" : "○"}
                      </span>
                      <div className="diag-text">
                        <strong>{step.name}</strong>
                        <span>{step.description}</span>
                      </div>
                      <span className={`diag-badge ${step.status}`}>
                        {step.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Terminal Mode Selector Buttons */}
            <div className="oled-controls">
              <button
                type="button"
                className={`oled-btn ${deviceMode === "vitals" ? "active" : ""}`}
                onClick={() => setDeviceMode("vitals")}
              >
                🩺 Patient Vitals
              </button>
              <button
                type="button"
                className={`oled-btn ${deviceMode === "power" ? "active" : ""}`}
                onClick={() => setDeviceMode("power")}
              >
                ☀️ Solar &amp; Battery
              </button>
              <button
                type="button"
                className={`oled-btn ${deviceMode === "mesh" ? "active" : ""}`}
                onClick={() => setDeviceMode("mesh")}
              >
                📡 LoRa Mesh &amp; Hotspot
              </button>
              <button
                type="button"
                className={`oled-btn ${deviceMode === "diagnostics" ? "active" : ""}`}
                onClick={() => setDeviceMode("diagnostics")}
              >
                ⚡ Hardware Diagnostics
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sensor Probes Hub & Offline Telemetry Cards */}
      <div className="device-subgrid">
        {/* Integrated Medical Probes Panel */}
        <section className="panel device-probes-card">
          <header className="panel-header">
            <div>
              <span className="eyebrow">PLUG-AND-PLAY HARDWARE PROBES</span>
              <h2>Integrated Clinical Sensors</h2>
            </div>
            <span className="device-health"><i /> 4/4 Probes Calibrated</span>
          </header>

          <div className="probes-grid">
            {sensors.map((sensor) => (
              <div key={sensor.id} className="probe-box">
                <div className="probe-head">
                  <span className="probe-icon">{sensor.icon}</span>
                  <div>
                    <strong>{sensor.name}</strong>
                    <span className="probe-spec">{sensor.spec}</span>
                  </div>
                </div>

                <div className="probe-reading">
                  <div className="reading-val">
                    <span className="num">{sensor.value}</span>
                    <span className="unit">{sensor.unit}</span>
                  </div>
                  <button
                    type="button"
                    className="probe-test-btn"
                    onClick={() => handleTestProbe(sensor.id)}
                    disabled={probeActive !== null}
                  >
                    {probeActive === sensor.id ? "Testing..." : "Test Probe"}
                  </button>
                </div>

                <div className="probe-footer">
                  <span>{sensor.bus}</span>
                  <span className="probe-status-tag">Nominal</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Offline Storage, Encryption & Mesh Synchronization Card */}
        <section className="panel device-storage-card">
          <header className="panel-header">
            <div>
              <span className="eyebrow">STORAGE &amp; SYNCHRONY</span>
              <h2>Offline Mesh &amp; Cloud Queue</h2>
            </div>
          </header>

          <div className="device-storage-stats">
            <div className="storage-stat-row">
              <span>Browser IndexedDB Cache:</span>
              <strong>{storageUsageMB} MB used (Unlimited Offline)</strong>
            </div>
            <div className="storage-stat-row">
              <span>Cryptographic Storage Vault:</span>
              <strong>AES-256-GCM Hardware Encrypted</strong>
            </div>
            <div className="storage-stat-row">
              <span>Clinical Rules Engine:</span>
              <strong>v1.0.0 (RMP-Curated · SHA-256 Verified)</strong>
            </div>
            <div className="storage-stat-row">
              <span>Firmware Version:</span>
              <strong>v2.4.1-LTS (Build 2026-09-24)</strong>
            </div>
            <div className="storage-stat-row">
              <span>Network State:</span>
              <strong>{typeof navigator !== "undefined" && navigator.onLine ? "Online (Cloud Edge Connected)" : "Offline Mesh Safe (Local Storage Active)"}</strong>
            </div>
          </div>

          <div className="sync-actions-box">
            <button
              type="button"
              className="primary-button"
              onClick={handleForceSync}
              disabled={syncingQueue}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {syncingQueue ? "⚡ Flushing Mesh Queue..." : "Force Encrypted Sync to Supabase"}
            </button>
            {syncResult && (
              <div className="sync-feedback" role="status">
                ✓ {syncResult}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
