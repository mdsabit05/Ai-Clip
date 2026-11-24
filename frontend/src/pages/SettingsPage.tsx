import { useState } from 'react'
import { Save, Key, Database, Cpu, AlertCircle } from 'lucide-react'

interface Settings {
  anthropic_api_key: string
  storage_path: string
  max_concurrent_jobs: number
  default_caption_style: string
  default_streamer_height: number
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    anthropic_api_key: '',
    storage_path: './storage',
    max_concurrent_jobs: 2,
    default_caption_style: 'minimal',
    default_streamer_height: 35,
  })
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    // In production, POST to /api/settings
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-forge-text">Settings</h1>
        <p className="text-forge-muted text-sm mt-1">Configure ClipForge AI behavior and credentials.</p>
      </div>

      <div className="space-y-6">
        {/* API Keys */}
        <div className="forge-card p-6">
          <h2 className="text-sm font-semibold text-forge-muted mb-4 uppercase tracking-widest flex items-center gap-2">
            <Key size={14} />
            API Keys
          </h2>
          <div className="space-y-4">
            <div>
              <label className="forge-label">Anthropic API Key</label>
              <input
                type="password"
                value={settings.anthropic_api_key}
                onChange={(e) => setSettings({ ...settings, anthropic_api_key: e.target.value })}
                placeholder="sk-ant-…"
                className="forge-input w-full"
              />
              <p className="text-xs text-forge-muted mt-1.5">
                Used for instruction parsing and viral moment analysis.
              </p>
            </div>
          </div>
        </div>

        {/* Storage */}
        <div className="forge-card p-6">
          <h2 className="text-sm font-semibold text-forge-muted mb-4 uppercase tracking-widest flex items-center gap-2">
            <Database size={14} />
            Storage
          </h2>
          <div>
            <label className="forge-label">Video Storage Path</label>
            <input
              type="text"
              value={settings.storage_path}
              onChange={(e) => setSettings({ ...settings, storage_path: e.target.value })}
              className="forge-input w-full"
            />
            <p className="text-xs text-forge-muted mt-1.5">
              Where downloaded and rendered videos are stored.
            </p>
          </div>
        </div>

        {/* Processing */}
        <div className="forge-card p-6">
          <h2 className="text-sm font-semibold text-forge-muted mb-4 uppercase tracking-widest flex items-center gap-2">
            <Cpu size={14} />
            Processing
          </h2>
          <div className="space-y-4">
            <div>
              <label className="forge-label">Max Concurrent Jobs</label>
              <input
                type="number"
                min={1}
                max={8}
                value={settings.max_concurrent_jobs}
                onChange={(e) => setSettings({ ...settings, max_concurrent_jobs: Number(e.target.value) })}
                className="forge-input w-32"
              />
            </div>
            <div>
              <label className="forge-label">Default Caption Style</label>
              <select
                value={settings.default_caption_style}
                onChange={(e) => setSettings({ ...settings, default_caption_style: e.target.value })}
                className="forge-input"
              >
                <option value="minimal">Minimal</option>
                <option value="bold">Bold</option>
                <option value="neon">Neon</option>
                <option value="none">None</option>
              </select>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <label className="forge-label mb-0">Default Streamer Height</label>
                <span className="text-xs text-forge-subtle">{settings.default_streamer_height}%</span>
              </div>
              <input
                type="range"
                min={20}
                max={50}
                value={settings.default_streamer_height}
                onChange={(e) => setSettings({ ...settings, default_streamer_height: Number(e.target.value) })}
                className="w-full accent-forge-accent"
              />
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-forge-cyan-dim border border-forge-cyan/20">
          <AlertCircle size={16} className="text-forge-cyan flex-shrink-0 mt-0.5" />
          <p className="text-sm text-forge-cyan/80">
            API keys are stored only in the backend <code className="text-xs">.env</code> file.
            Settings here configure the UI defaults and processing behavior.
          </p>
        </div>

        <div className="flex justify-end">
          <button onClick={handleSave} className="forge-btn-primary flex items-center gap-2">
            <Save size={16} />
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
