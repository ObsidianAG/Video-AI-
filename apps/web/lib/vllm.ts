import 'server-only';
import { shotPlanOutputSchema, type ShotPlanInput } from '@/lib/schemas';

const fallbackShotPlan = (input: ShotPlanInput) => ({
  title: `${input.projectTitle} — Shot Plan`,
  logline: input.directorIdea,
  genre: input.genre,
  mood: input.mood,
  scenes: [
    {
      sceneNumber: 1,
      title: 'Opening Moment',
      summary: `Set tone for ${input.targetAudience} with a ${input.visualStyle} visual approach.`,
      location: 'Primary story location',
      timeOfDay: 'Golden Hour',
      emotionalPurpose: `Establish ${input.mood.toLowerCase()} emotional baseline.`,
      shots: [
        {
          shotNumber: 1,
          shotType: 'Wide Establishing',
          cameraMovement: input.cameraStyle,
          lens: '35mm',
          lighting: `${input.visualStyle} motivated lighting`,
          subject: 'Primary protagonist',
          action: 'Character enters frame and orients to the story world.',
          continuityNotes: 'Maintain wardrobe and prop continuity through sequence.',
          renderPrompt:
            `${input.visualStyle} film frame, ${input.genre} mood, ${input.aspectRatio}, ${input.duration}, cinematic composition`,
          safetyNotes: 'Respect rights and likeness policies. No disallowed content.',
        },
      ],
    },
  ],
});

const systemPrompt =
  'You are CineForge Studio AI, an enterprise film production planning assistant. Convert the director’s idea into a structured production-aware shot plan. You do not claim that video has been generated. You only create a shot plan. Return strict JSON only. Include scenes, shots, camera movement, lighting, lens, continuity notes, safety notes, and provider-ready render prompts. Every shot must be realistic enough for a production team to review.';

export const generateShotPlanFromVllm = async (input: ShotPlanInput) => {
  const mode = process.env.VIDEO_PROVIDER_MODE ?? 'mock';

  if (mode === 'mock') {
    return shotPlanOutputSchema.parse(fallbackShotPlan(input));
  }

  const baseUrl = process.env.VLLM_BASE_URL;
  const apiKey = process.env.VLLM_API_KEY;
  const model = process.env.VLLM_MODEL;

  if (!baseUrl || !apiKey || !model) {
    throw new Error('Missing required vLLM environment variables.');
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: JSON.stringify(input),
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'shot_plan',
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['title', 'logline', 'genre', 'mood', 'scenes'],
            properties: {
              title: { type: 'string' },
              logline: { type: 'string' },
              genre: { type: 'string' },
              mood: { type: 'string' },
              scenes: {
                type: 'array',
                minItems: 1,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: [
                    'sceneNumber',
                    'title',
                    'summary',
                    'location',
                    'timeOfDay',
                    'emotionalPurpose',
                    'shots',
                  ],
                  properties: {
                    sceneNumber: { type: 'integer' },
                    title: { type: 'string' },
                    summary: { type: 'string' },
                    location: { type: 'string' },
                    timeOfDay: { type: 'string' },
                    emotionalPurpose: { type: 'string' },
                    shots: {
                      type: 'array',
                      minItems: 1,
                      items: {
                        type: 'object',
                        additionalProperties: false,
                        required: [
                          'shotNumber',
                          'shotType',
                          'cameraMovement',
                          'lens',
                          'lighting',
                          'subject',
                          'action',
                          'continuityNotes',
                          'renderPrompt',
                          'safetyNotes',
                        ],
                        properties: {
                          shotNumber: { type: 'integer' },
                          shotType: { type: 'string' },
                          cameraMovement: { type: 'string' },
                          lens: { type: 'string' },
                          lighting: { type: 'string' },
                          subject: { type: 'string' },
                          action: { type: 'string' },
                          continuityNotes: { type: 'string' },
                          renderPrompt: { type: 'string' },
                          safetyNotes: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`vLLM request failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('vLLM returned empty content.');
  }

  const parsed = JSON.parse(content) as unknown;
  return shotPlanOutputSchema.parse(parsed);
};
