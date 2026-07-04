import { describe, it, expect } from 'vitest'
import { generateDemoBrief } from '../lib/demo'

describe('generateDemoBrief', () => {
  it('generates a demo brief with blocks', () => {
    const blocks = [
      {
        id: '1',
        category: 'context' as const,
        content: 'Build a landing page',
        order: 0,
      },
    ]

    const brief = generateDemoBrief(blocks, 'saas-neon')

    expect(brief.vibe).toBe('saas-neon')
    expect(brief.isDemoMode).toBe(true)
    expect(brief.structure.overview).toBeTruthy()
    expect(brief.structure.keyFeatures).toBeTruthy()
  })

  it('handles empty blocks', () => {
    const brief = generateDemoBrief([], 'cyber-studio')

    expect(brief.vibe).toBe('cyber-studio')
    expect(brief.isDemoMode).toBe(true)
    expect(brief.structure.overview).toBeTruthy()
  })
})
