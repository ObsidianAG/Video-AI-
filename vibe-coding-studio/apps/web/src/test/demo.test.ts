import { describe, it, expect } from 'vitest'
import { generateDemoBrief } from '../lib/demo'
import { PromptBlock } from '@vibe-coding-studio/shared'

describe('generateDemoBrief', () => {
  it('generates a brief from prompt blocks', () => {
    const blocks: PromptBlock[] = [
      {
        id: '1',
        category: 'context',
        content: 'Build a task management app',
        order: 0,
      },
      {
        id: '2',
        category: 'requirements',
        content: 'User authentication, task CRUD, filtering',
        order: 1,
      },
    ]

    const brief = generateDemoBrief(blocks, 'saas-neon')

    expect(brief.vibe).toBe('saas-neon')
    expect(brief.isDemoMode).toBe(true)
    expect(brief.structure.overview).toContain('Build a task management app')
    expect(brief.structure.keyFeatures.length).toBeGreaterThan(0)
    expect(brief.structure.technicalRequirements.length).toBeGreaterThan(0)
  })

  it('generates default content when blocks are empty', () => {
    const brief = generateDemoBrief([], 'minimal-founder')

    expect(brief.vibe).toBe('minimal-founder')
    expect(brief.structure.keyFeatures.length).toBeGreaterThan(0)
    expect(brief.structure.deliverables.length).toBeGreaterThan(0)
  })
})
