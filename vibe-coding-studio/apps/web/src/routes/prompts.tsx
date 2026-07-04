import { useState } from 'react'
import { Card, CardHeader, CardBody } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Badge } from '../components/ui/badge'
import { Search, Plus, Star, Download } from 'lucide-react'
import { useStore } from '../lib/store'
import { PromptTemplate } from '@vibe-coding-studio/shared'

export function PromptsRoute() {
  const { templates, addTemplate, toggleFavorite, deleteTemplate } = useStore()
  const [search, setSearch] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    tags: '',
  })

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
  )

  const handleCreate = () => {
    if (!newTemplate.name) return

    const template: PromptTemplate = {
      id: `template-${Date.now()}`,
      name: newTemplate.name,
      description: newTemplate.description,
      tags: newTemplate.tags.split(',').map((t) => t.trim()).filter(Boolean),
      blocks: [],
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    addTemplate(template)
    setNewTemplate({ name: '', description: '', tags: '' })
    setIsCreating(false)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Prompt Templates</h1>
          <p className="text-gray-400">Manage reusable prompt templates for your projects</p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {isCreating && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-xl font-bold">Create Template</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Template Name"
              value={newTemplate.name}
              onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
              placeholder="My awesome template"
            />
            <Textarea
              label="Description"
              value={newTemplate.description}
              onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
              placeholder="What is this template for?"
              rows={3}
            />
            <Input
              label="Tags (comma-separated)"
              value={newTemplate.tags}
              onChange={(e) => setNewTemplate({ ...newTemplate, tags: e.target.value })}
              placeholder="react, typescript, api"
            />
            <div className="flex gap-3">
              <Button onClick={handleCreate}>Create</Button>
              <Button variant="ghost" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="pl-12"
          />
        </div>
      </div>

      {filteredTemplates.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <p className="text-gray-400 mb-4">
              {templates.length === 0
                ? 'No templates yet. Create your first template above.'
                : 'No templates match your search.'}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} hover>
              <CardBody className="space-y-4">
                <div className="flex items-start justify-between">
                  <h3 className="text-xl font-bold">{template.name}</h3>
                  <button
                    onClick={() => toggleFavorite(template.id)}
                    className="text-gray-400 hover:text-[var(--highlight)] transition-colors"
                  >
                    <Star
                      className="w-5 h-5"
                      fill={template.isFavorite ? 'currentColor' : 'none'}
                    />
                  </button>
                </div>
                
                {template.description && (
                  <p className="text-sm text-gray-400">{template.description}</p>
                )}
                
                {template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="default">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <div className="flex gap-2 pt-4">
                  <Button variant="secondary" size="sm" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTemplate(template.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
