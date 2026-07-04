import { describe, it, expect } from 'vitest'
import { 
  PromptBlockSchema, 
  PromptTemplateSchema,
  BuildBriefSchema 
} from '../schemas'

describe('Schemas', () => {
  it('validates PromptBlock', () => {
    const valid = {
      id: '1',
      category: 'context',
      content: 'Test content',
      order: 0,
    }

    const result = PromptBlockSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('rejects invalid PromptBlock category', () => {
    const invalid = {
      id: '1',
      category: 'invalid',
      content: 'Test',
      order: 0,
    }

    const result = PromptBlockSchema.safeParse(invalid)
    expect(result.success).toBe(false)
  })

  it('validates PromptTemplate', () => {
    const valid = {
      id: '1',
      name: 'Test Template',
      tags: ['test'],
      blocks: [],
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const result = PromptTemplateSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('validates BuildBrief', () => {
    const valid = {
      id: '1',
      prompt: 'Test prompt',
      generatedAt: new Date().toISOString(),
      vibe: 'saas-neon',
      structure: {
        overview: 'Test overview',
        keyFeatures: ['Feature 1'],
        technicalRequirements: ['Req 1'],
        constraints: ['Constraint 1'],
        deliverables: ['Deliverable 1'],
      },
      isDemoMode: true,
    }

    const result = BuildBriefSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })
})
