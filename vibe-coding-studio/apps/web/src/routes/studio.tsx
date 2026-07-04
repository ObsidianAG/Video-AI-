import { useState } from 'react'
import { Card, CardHeader, CardBody } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Textarea } from '../components/ui/textarea'
import { Badge } from '../components/ui/badge'
import { Plus, Sparkles } from 'lucide-react'
import { useStore } from '../lib/store'
import { PromptBlock, BuildBrief } from '@vibe-coding-studio/shared'
import { generateDemoBrief } from '../lib/demo'

export function StudioRoute() {
  const { selectedVibe, isDemoMode } = useStore()
  const [blocks, setBlocks] = useState<PromptBlock[]>([])
  const [currentBlock, setCurrentBlock] = useState<Partial<PromptBlock>>({
    category: 'context',
    content: '',
  })
  const [brief, setBrief] = useState<BuildBrief | null>(null)

  const addBlock = () => {
    if (!currentBlock.content) return
    
    const newBlock: PromptBlock = {
      id: `block-${Date.now()}`,
      category: currentBlock.category as PromptBlock['category'],
      content: currentBlock.content,
      order: blocks.length,
    }
    
    setBlocks([...blocks, newBlock])
    setCurrentBlock({ category: 'context', content: '' })
  }

  const generateBrief = () => {
    if (blocks.length === 0) return
    const generated = generateDemoBrief(blocks, selectedVibe)
    setBrief(generated)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Build Studio</h1>
        <p className="text-gray-400">Compose your prompt blocks and generate a build brief</p>
        {isDemoMode && (
          <Badge variant="accent" className="mt-2">Demo Mode Active</Badge>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold">Prompt Composer</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Block Category</label>
                <select
                  value={currentBlock.category}
                  onChange={(e) => setCurrentBlock({ ...currentBlock, category: e.target.value as PromptBlock['category'] })}
                  className="w-full px-4 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="context">Context</option>
                  <option value="requirements">Requirements</option>
                  <option value="constraints">Constraints</option>
                  <option value="output">Output Format</option>
                </select>
              </div>
              
              <Textarea
                label="Block Content"
                value={currentBlock.content}
                onChange={(e) => setCurrentBlock({ ...currentBlock, content: e.target.value })}
                placeholder="Describe this aspect of your project..."
                rows={6}
              />
              
              <Button onClick={addBlock} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Block
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold">Your Blocks ({blocks.length})</h2>
            </CardHeader>
            <CardBody>
              {blocks.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No blocks yet. Add your first block above.</p>
              ) : (
                <div className="space-y-3">
                  {blocks.map((block) => (
                    <div
                      key={block.id}
                      className="p-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg"
                    >
                      <Badge variant="primary" className="mb-2">
                        {block.category}
                      </Badge>
                      <p className="text-sm text-gray-300">{block.content}</p>
                    </div>
                  ))}
                </div>
              )}
              
              {blocks.length > 0 && (
                <Button onClick={generateBrief} variant="primary" className="w-full mt-4">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Build Brief
                </Button>
              )}
            </CardBody>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold">Build Brief</h2>
            </CardHeader>
            <CardBody>
              {!brief ? (
                <div className="text-center py-12">
                  <Sparkles className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Add blocks and generate a brief to see it here</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold mb-2">Overview</h3>
                    <p className="text-gray-300">{brief.structure.overview}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold mb-2">Key Features</h3>
                    <ul className="space-y-2">
                      {brief.structure.keyFeatures.map((feature, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-[var(--accent)]">•</span>
                          <span className="text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold mb-2">Technical Requirements</h3>
                    <ul className="space-y-2">
                      {brief.structure.technicalRequirements.map((req, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-[var(--primary)]">•</span>
                          <span className="text-gray-300">{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {brief.isDemoMode && (
                    <div className="p-4 bg-[var(--accent)]/10 border border-[var(--accent)] rounded-lg">
                      <p className="text-sm text-[var(--accent)]">
                        This is a demo brief. Configure AI providers in settings for enhanced generation.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
