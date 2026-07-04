import { Card, CardHeader, CardBody } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { useStore } from '../lib/store'
import { vibeProfiles } from '../features/vibes/vibe-tokens'

export function SettingsRoute() {
  const { selectedVibe, theme, isDemoMode } = useStore()
  const currentVibe = vibeProfiles[selectedVibe as keyof typeof vibeProfiles]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-400">Application configuration and status</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold">Appearance</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Current Theme</p>
                <p className="text-sm text-gray-400">Display mode for the interface</p>
              </div>
              <Badge variant="default">{theme}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Current Vibe</p>
                <p className="text-sm text-gray-400">{currentVibe.name}</p>
              </div>
              <Badge variant="primary">{selectedVibe}</Badge>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold">AI Provider Status</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="p-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">OpenAI</p>
                <Badge variant="default">Not Configured</Badge>
              </div>
              <p className="text-sm text-gray-400">
                Configure OPENAI_API_KEY in environment variables
              </p>
            </div>
            <div className="p-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">Anthropic</p>
                <Badge variant="default">Not Configured</Badge>
              </div>
              <p className="text-sm text-gray-400">
                Configure ANTHROPIC_API_KEY in environment variables
              </p>
            </div>
            {isDemoMode && (
              <div className="p-4 bg-[var(--accent)]/10 border border-[var(--accent)] rounded-lg">
                <p className="text-sm text-[var(--accent)]">
                  <strong>Demo Mode Active:</strong> The application is running without AI providers. 
                  Brief generation uses deterministic demo data. Configure provider keys to enable 
                  AI-powered generation.
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold">Data Storage</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg">
                <div>
                  <p className="font-medium">Templates</p>
                  <p className="text-sm text-gray-400">Stored locally in browser</p>
                </div>
                <Badge variant="success">Local</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg">
                <div>
                  <p className="font-medium">Board Tasks</p>
                  <p className="text-sm text-gray-400">Stored locally in browser</p>
                </div>
                <Badge variant="success">Local</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg">
                <div>
                  <p className="font-medium">Checklist Progress</p>
                  <p className="text-sm text-gray-400">Stored locally in browser</p>
                </div>
                <Badge variant="success">Local</Badge>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold">About</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-2 text-sm">
              <p><strong>Version:</strong> 1.0.0</p>
              <p><strong>Build:</strong> Production</p>
              <p><strong>License:</strong> MIT</p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
