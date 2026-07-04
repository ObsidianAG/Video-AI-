import { PromptBlock, BuildBrief } from '@vibe-coding-studio/shared'

export function generateDemoBrief(blocks: PromptBlock[], vibe: string): BuildBrief {
  const contextBlocks = blocks.filter(b => b.category === 'context')
  const requirementBlocks = blocks.filter(b => b.category === 'requirements')
  const constraintBlocks = blocks.filter(b => b.category === 'constraints')
  const outputBlocks = blocks.filter(b => b.category === 'output')
  
  const overview = contextBlocks.length > 0
    ? `This project aims to ${contextBlocks[0].content.slice(0, 100)}...`
    : 'This is a demonstration build brief generated without AI provider access. Enable AI providers in settings to generate real briefs.'
  
  const keyFeatures = requirementBlocks.slice(0, 5).map((block, i) => {
    const content = block.content.slice(0, 60)
    return `Feature ${i + 1}: ${content}${content.length < block.content.length ? '...' : ''}`
  })
  
  if (keyFeatures.length === 0) {
    keyFeatures.push(
      'Modern, responsive user interface',
      'Type-safe implementation with TypeScript',
      'Comprehensive test coverage',
      'Production-ready deployment configuration',
      'Accessibility compliance (WCAG AA)'
    )
  }
  
  const technicalRequirements = [
    'TypeScript with strict mode enabled',
    'Modern React with hooks and functional components',
    'Responsive design for mobile, tablet, and desktop',
    'Accessibility compliance (WCAG AA)',
    'Unit tests with >80% coverage',
  ]
  
  const constraints = constraintBlocks.length > 0
    ? constraintBlocks.map(b => b.content.slice(0, 80))
    : ['Follow best practices', 'Maintain clean code standards', 'Keep bundle size optimized']
  
  const deliverables = outputBlocks.length > 0
    ? outputBlocks.map(b => b.content.slice(0, 80))
    : ['Working prototype', 'Documentation', 'Test suite', 'Deployment guide']
  
  return {
    id: `brief-${Date.now()}`,
    prompt: blocks.map(b => b.content).join('\n\n'),
    generatedAt: new Date().toISOString(),
    vibe,
    structure: {
      overview,
      keyFeatures,
      technicalRequirements,
      constraints,
      deliverables,
    },
    isDemoMode: true,
  }
}
