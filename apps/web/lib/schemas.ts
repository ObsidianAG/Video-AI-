import { z } from 'zod';

export const shotSchema = z.object({
  shotNumber: z.number().int().positive(),
  shotType: z.string().min(1),
  cameraMovement: z.string().min(1),
  lens: z.string().min(1),
  lighting: z.string().min(1),
  subject: z.string().min(1),
  action: z.string().min(1),
  continuityNotes: z.string().min(1),
  renderPrompt: z.string().min(1),
  safetyNotes: z.string().min(1),
});

export const sceneSchema = z.object({
  sceneNumber: z.number().int().positive(),
  title: z.string().min(1),
  summary: z.string().min(1),
  location: z.string().min(1),
  timeOfDay: z.string().min(1),
  emotionalPurpose: z.string().min(1),
  shots: z.array(shotSchema).min(1),
});

export const shotPlanOutputSchema = z.object({
  title: z.string().min(1),
  logline: z.string().min(1),
  genre: z.string().min(1),
  mood: z.string().min(1),
  scenes: z.array(sceneSchema).min(1),
});

export const shotPlanInputSchema = z.object({
  projectTitle: z.string().min(1),
  directorIdea: z.string().min(10),
  genre: z.string().min(1),
  mood: z.string().min(1),
  targetAudience: z.string().min(1),
  visualStyle: z.string().min(1),
  cameraStyle: z.string().min(1),
  duration: z.string().min(1),
  aspectRatio: z.string().min(1),
  safetyRightsConfirmed: z.literal(true),
});

export const createMockRenderJobSchema = z.object({
  projectId: z.string().min(1),
  shotId: z.string().min(1),
  prompt: z.string().min(1),
});

export const rejectRenderJobSchema = z.object({
  reason: z.string().min(3),
  actor: z.string().min(1).default('human_reviewer'),
});

export type ShotPlanInput = z.infer<typeof shotPlanInputSchema>;
export type ShotPlanOutput = z.infer<typeof shotPlanOutputSchema>;
