import { getValidatedDesignDiffChanges, modelDesignDiffSchema, normalizeModelChanges, serializeDesignDiffTarget, type DesignDiffProvider, type DesignDiffTarget } from '../model/design-diff-model'

export async function requestDesignDiffs(instruction: string, target: DesignDiffTarget, provider: DesignDiffProvider, signal?: AbortSignal) {
  const serializedTarget = serializeDesignDiffTarget(target)
  const response = await fetch('/api/design-diffs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instruction, provider, target: serializedTarget }),
    signal,
  })

  const payload = await response.json().catch(() => null) as { error?: string } | null
  if (!response.ok) throw new Error(payload?.error ?? 'Unable to create design changes.')
  const parsed = modelDesignDiffSchema.safeParse(payload)
  if (!parsed.success) throw new Error('The model returned an invalid design change.')
  const suggestedChanges = normalizeModelChanges(parsed.data, serializedTarget.availableProperties)
  const changes = getValidatedDesignDiffChanges(target, suggestedChanges)
  if (changes.length === 0) throw new Error('No supported changes were suggested for this object.')
  return changes
}
