import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const AIService = require('../../lib/ai-service');

export const name = 'ai.chat';
export const description = 'Stream chat completions from AI provider';
export const argsSchema = {
  type: 'object',
  properties: { prompt: { type: 'string' } },
  required: ['prompt'],
};

export async function handler({ prompt }) {
  const ai = new AIService();
  const response = await ai.chatCompletion([
    { role: 'user', content: prompt },
  ]);
  return { text: response };
}
