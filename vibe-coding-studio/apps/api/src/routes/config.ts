import { Hono } from 'hono'

export const configRoute = new Hono()

configRoute.get('/public', c => {
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY
  
  return c.json({
    appName: process.env.VITE_PUBLIC_APP_NAME || 'Vibe Coding Studio',
    providers: {
      openai: {
        isConfigured: hasOpenAI,
        isAvailable: hasOpenAI,
      },
      anthropic: {
        isConfigured: hasAnthropic,
        isAvailable: hasAnthropic,
      },
    },
    isDemoMode: !hasOpenAI && !hasAnthropic,
  })
})
