import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { GenerateBriefRequestSchema } from '@vibe-coding-studio/shared'
import { generateDemoBrief } from '../lib/demo'

export const generateBriefRoute = new Hono()

generateBriefRoute.post(
  '/generate-brief',
  zValidator('json', GenerateBriefRequestSchema),
  async c => {
    const { blocks, vibe } = c.req.valid('json')
    
    const hasProvider = !!process.env.OPENAI_API_KEY || !!process.env.ANTHROPIC_API_KEY
    
    if (!hasProvider) {
      const brief = generateDemoBrief(blocks, vibe)
      return c.json({
        brief,
        isDemoMode: true,
      })
    }
    
    const brief = generateDemoBrief(blocks, vibe)
    return c.json({
      brief,
      isDemoMode: true,
    })
  }
)
