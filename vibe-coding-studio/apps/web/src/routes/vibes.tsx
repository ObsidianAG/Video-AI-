import { Card, CardBody } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Check } from 'lucide-react'
import { useStore } from '../lib/store'
import { vibeProfiles, VibeProfileId } from '../features/vibes/vibe-tokens'

export function VibesRoute() {
  const { selectedVibe, setSelectedVibe } = useStore()

  const handleSelectVibe = (vibeId: string) => {
    setSelectedVibe(vibeId)
    const vibe = vibeProfiles[vibeId as VibeProfileId]
    
    document.documentElement.style.setProperty('--primary', vibe.colors.primary)
    document.documentElement.style.setProperty('--accent', vibe.colors.accent)
    document.documentElement.style.setProperty('--background', vibe.colors.background)
    document.documentElement.style.setProperty('--card-bg', vibe.colors.surface)
    document.documentElement.style.setProperty('--radius', vibe.radius)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Vibe Profiles</h1>
        <p className="text-gray-400">
          Choose a visual identity for your project. Each vibe includes complete design tokens.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {Object.values(vibeProfiles).map((vibe) => (
          <Card
            key={vibe.id}
            hover
            className={selectedVibe === vibe.id ? 'ring-2 ring-[var(--primary)]' : ''}
          >
            <CardBody className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold mb-1">{vibe.name}</h3>
                  <p className="text-sm text-gray-400">{vibe.description}</p>
                </div>
                {selectedVibe === vibe.id && (
                  <Badge variant="success">
                    <Check className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-400 mb-2">Color Palette</p>
                  <div className="flex gap-2">
                    <div
                      className="w-16 h-16 rounded-lg border border-[var(--border)]"
                      style={{ backgroundColor: vibe.colors.primary }}
                      title="Primary"
                    />
                    <div
                      className="w-16 h-16 rounded-lg border border-[var(--border)]"
                      style={{ backgroundColor: vibe.colors.accent }}
                      title="Accent"
                    />
                    <div
                      className="w-16 h-16 rounded-lg border border-[var(--border)]"
                      style={{ backgroundColor: vibe.colors.background }}
                      title="Background"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-1">Border Radius</p>
                  <code className="text-sm bg-[var(--card-bg)] px-2 py-1 rounded">
                    {vibe.radius}
                  </code>
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-1">Mood</p>
                  <p className="text-sm">{vibe.mood}</p>
                </div>
              </div>

              <Button
                onClick={() => handleSelectVibe(vibe.id)}
                variant={selectedVibe === vibe.id ? 'primary' : 'secondary'}
                className="w-full"
              >
                {selectedVibe === vibe.id ? 'Current Vibe' : 'Apply Vibe'}
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardBody>
          <h3 className="text-xl font-bold mb-4">Design Token Export</h3>
          <p className="text-gray-400 mb-4">
            Copy these CSS variables to use in your project:
          </p>
          <pre className="bg-black/50 p-4 rounded-lg overflow-x-auto text-sm">
            <code>{`:root {
  --primary: ${vibeProfiles[selectedVibe as VibeProfileId].colors.primary};
  --accent: ${vibeProfiles[selectedVibe as VibeProfileId].colors.accent};
  --background: ${vibeProfiles[selectedVibe as VibeProfileId].colors.background};
  --surface: ${vibeProfiles[selectedVibe as VibeProfileId].colors.surface};
  --radius: ${vibeProfiles[selectedVibe as VibeProfileId].radius};
}`}</code>
          </pre>
        </CardBody>
      </Card>
    </div>
  )
}
