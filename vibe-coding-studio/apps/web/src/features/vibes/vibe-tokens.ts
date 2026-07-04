export const vibeProfiles = {
  'saas-neon': {
    id: 'saas-neon',
    name: 'SaaS Neon',
    description: 'Electric violet and cyan for modern SaaS platforms',
    colors: {
      primary: '#7c3aed',
      accent: '#06b6d4',
      background: '#0a0a0f',
      surface: 'rgba(255, 255, 255, 0.05)',
    },
    radius: '8px',
    mood: 'Professional, energetic, modern',
  },
  'brutalist-terminal': {
    id: 'brutalist-terminal',
    name: 'Brutalist Terminal',
    description: 'Raw, minimal terminal aesthetic',
    colors: {
      primary: '#00ff41',
      accent: '#ff0066',
      background: '#000000',
      surface: 'rgba(255, 255, 255, 0.03)',
    },
    radius: '0px',
    mood: 'Raw, technical, no-nonsense',
  },
  'calm-builder': {
    id: 'calm-builder',
    name: 'Calm Builder',
    description: 'Soft blues and greens for focused work',
    colors: {
      primary: '#3b82f6',
      accent: '#10b981',
      background: '#f8fafc',
      surface: 'rgba(0, 0, 0, 0.03)',
    },
    radius: '12px',
    mood: 'Calm, focused, productive',
  },
  'cyber-studio': {
    id: 'cyber-studio',
    name: 'Cyber Studio',
    description: 'Futuristic orange and pink',
    colors: {
      primary: '#f59e0b',
      accent: '#ec4899',
      background: '#0f0f1a',
      surface: 'rgba(255, 255, 255, 0.05)',
    },
    radius: '6px',
    mood: 'Futuristic, bold, creative',
  },
  'minimal-founder': {
    id: 'minimal-founder',
    name: 'Minimal Founder',
    description: 'Clean, focused, distraction-free',
    colors: {
      primary: '#111827',
      accent: '#6366f1',
      background: '#ffffff',
      surface: 'rgba(0, 0, 0, 0.02)',
    },
    radius: '4px',
    mood: 'Clean, minimal, focused',
  },
}

export type VibeProfileId = keyof typeof vibeProfiles
