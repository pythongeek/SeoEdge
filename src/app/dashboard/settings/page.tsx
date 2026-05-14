"use client";

import { useState } from "react";
import { Settings, Link, Save } from "lucide-react";

export default function SettingsPage() {
  const [syncFrequency, setSyncFrequency] = useState("daily");
  const [alertThreshold, setAlertThreshold] = useState(0.1);
  const [emailReports, setEmailReports] = useState(false);
  const [gscConnected, setGscConnected] = useState(false);

  const handleConnectGSC = async () => {
    try {
      const res = await fetch("/api/gsc/oauth");
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Settings className="w-6 h-6 text-gray-400" />
        Settings
      </h1>

      <div className="max-w-2xl space-y-6">
        {/* GSC Connection */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-200">Google Search Console</h3>
              <p className="text-xs text-gray-500 mt-1">Connect your GSC property for live data</p>
            </div>
            {gscConnected ? (
              <span className="text-xs bg-emerald-600/20 text-emerald-400 px-3 py-1.5 rounded-lg">
                Connected
              </span>
            ) : (
              <button
                onClick={handleConnectGSC}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-lg transition-colors"
              >
                <Link className="w-3.5 h-3.5" />
                Connect GSC
              </button>
            )}
          </div>
        </div>

        {/* Sync Settings */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-200">Data Sync</h3>

          <div>
            <label className="text-xs text-gray-500 block mb-2">Sync Frequency</label>
            <select
              value={syncFrequency}
              onChange={(e) => setSyncFrequency(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="manual">Manual only</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-2">CTR Alert Threshold</label>
            <input
              type="range"
              min={0.01}
              max={0.5}
              step={0.01}
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(parseFloat(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-400 mt-1">{(alertThreshold * 100).toFixed(0)}%</p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm text-gray-300">Email Reports</label>
              <p className="text-xs text-gray-500">Receive weekly digest emails</p>
            </div>
            <button
              onClick={() => setEmailReports(!emailReports)}
              className={`w-10 h-6 rounded-full transition-colors ${
                emailReports ? "bg-blue-600" : "bg-gray-700"
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full transition-transform mx-0.5 ${
                  emailReports ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <Save className="w-4 h-4" />
          Save Settings
        </button>
      </div>
    </div>
  );
}
