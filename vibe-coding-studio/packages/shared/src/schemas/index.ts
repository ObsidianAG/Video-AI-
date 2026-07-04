import { z } from 'zod'

export const PromptBlockSchema = z.object({
  id: z.string(),
  category: z.enum(['context', 'requirements', 'constraints', 'output']),
  content: z.string(),
  order: z.number(),
})

export const PromptTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()),
  blocks: z.array(PromptBlockSchema),
  isFavorite: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const BuildBriefSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  generatedAt: z.string(),
  vibe: z.string(),
  structure: z.object({
    overview: z.string(),
    keyFeatures: z.array(z.string()),
    technicalRequirements: z.array(z.string()),
    constraints: z.array(z.string()),
    deliverables: z.array(z.string()),
  }),
  isDemoMode: z.boolean(),
})

export const BoardTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  column: z.enum(['idea', 'prompt', 'design', 'build', 'test', 'ship']),
  order: z.number(),
  createdAt: z.string(),
})

export const ChecklistItemSchema = z.object({
  id: z.string(),
  category: z.string(),
  title: z.string(),
  description: z.string().optional(),
  isComplete: z.boolean().default(false),
  order: z.number(),
})

export const VibeProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  colors: z.object({
    primary: z.string(),
    accent: z.string(),
    background: z.string(),
    surface: z.string(),
  }),
  radius: z.string(),
  mood: z.string(),
})

export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number(),
})

export const ProviderStatusSchema = z.object({
  provider: z.string(),
  isConfigured: z.boolean(),
  isAvailable: z.boolean(),
})

export const GenerateBriefRequestSchema = z.object({
  blocks: z.array(PromptBlockSchema),
  vibe: z.string(),
})

export const GenerateBriefResponseSchema = z.object({
  brief: BuildBriefSchema,
  isDemoMode: z.boolean(),
})

export const ExportRequestSchema = z.object({
  type: z.enum(['template', 'checklist', 'brief']),
  format: z.enum(['json', 'markdown']),
  data: z.any(),
})

export type PromptBlock = z.infer<typeof PromptBlockSchema>
export type PromptTemplate = z.infer<typeof PromptTemplateSchema>
export type BuildBrief = z.infer<typeof BuildBriefSchema>
export type BoardTask = z.infer<typeof BoardTaskSchema>
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>
export type VibeProfile = z.infer<typeof VibeProfileSchema>
export type ApiError = z.infer<typeof ApiErrorSchema>
export type ProviderStatus = z.infer<typeof ProviderStatusSchema>
export type GenerateBriefRequest = z.infer<typeof GenerateBriefRequestSchema>
export type GenerateBriefResponse = z.infer<typeof GenerateBriefResponseSchema>
export type ExportRequest = z.infer<typeof ExportRequestSchema>
