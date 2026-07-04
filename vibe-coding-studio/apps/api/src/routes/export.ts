import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { ExportRequestSchema } from '@vibe-coding-studio/shared'

export const exportRoute = new Hono()

exportRoute.post('/export', zValidator('json', ExportRequestSchema), async c => {
  const { type, format, data } = c.req.valid('json')
  
  if (format === 'json') {
    return c.json(data)
  }
  
  let markdown = ''
  
  if (type === 'template') {
    markdown = `# ${data.name}\n\n${data.description || ''}\n\n`
    markdown += `**Tags:** ${data.tags.join(', ')}\n\n`
    markdown += `## Blocks\n\n`
    for (const block of data.blocks) {
      markdown += `### ${block.category.toUpperCase()}\n\n${block.content}\n\n`
    }
  } else if (type === 'checklist') {
    markdown = `# Production Checklist\n\n`
    const byCategory: Record<string, unknown[]> = {}
    for (const item of data) {
      if (!byCategory[item.category]) byCategory[item.category] = []
      byCategory[item.category].push(item)
    }
    for (const [category, items] of Object.entries(byCategory)) {
      markdown += `## ${category}\n\n`
      for (const item of items) {
        const checkItem = item as { isComplete: boolean; title: string }
        markdown += `- [${checkItem.isComplete ? 'x' : ' '}] ${checkItem.title}\n`
      }
      markdown += '\n'
    }
  } else if (type === 'brief') {
    markdown = `# Build Brief\n\n`
    markdown += `**Generated:** ${data.generatedAt}\n`
    markdown += `**Vibe:** ${data.vibe}\n\n`
    markdown += `## Overview\n\n${data.structure.overview}\n\n`
    markdown += `## Key Features\n\n`
    for (const feature of data.structure.keyFeatures) {
      markdown += `- ${feature}\n`
    }
    markdown += '\n'
  }
  
  return c.text(markdown, 200, {
    'Content-Type': 'text/markdown',
  })
})
