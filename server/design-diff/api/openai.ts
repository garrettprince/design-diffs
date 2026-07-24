import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import type { ParsedResponse } from 'openai/resources/responses/responses'
import {
  modelDesignDiffSchema,
  normalizeModelChanges,
  type DesignDiffRequestTarget,
  type ModelDesignDiff,
} from '../../../src/contracts/design-diff.js'
import { DESIGN_DIFF_MODEL, designDiffSystemPrompt } from '../constants/prompt.js'

export class DesignDiffRefusalError extends Error {}

const getRefusal = (response: ParsedResponse<ModelDesignDiff>) => {
  for (const output of response.output) {
    if (output.type !== 'message') continue
    const refusal = output.content.find((item) => item.type === 'refusal')
    if (refusal?.type === 'refusal') return refusal.refusal
  }
  return null
}

export function createOpenAiDesignDiffClient(apiKey: string) {
  const openai = new OpenAI({ apiKey })

  return async (instruction: string, target: DesignDiffRequestTarget) => {
    const response = await openai.responses.parse({
      model: DESIGN_DIFF_MODEL,
      reasoning: { effort: 'low' },
      store: false,
      input: [
        { role: 'system', content: designDiffSystemPrompt },
        { role: 'user', content: JSON.stringify({ instruction, target }) },
      ],
      text: { format: zodTextFormat(modelDesignDiffSchema, 'design_diff') },
    })

    const refusal = getRefusal(response)
    if (refusal) throw new DesignDiffRefusalError(refusal)
    if (!response.output_parsed) throw new Error('The model did not return a design diff.')

    const normalized = normalizeModelChanges(response.output_parsed, target.availableProperties)
    return {
      changes: normalized.map((change) => ({
        property: change.property,
        numericValue: typeof change.value === 'number' ? change.value : null,
        stringValue: typeof change.value === 'string' ? change.value : null,
      })),
    }
  }
}
