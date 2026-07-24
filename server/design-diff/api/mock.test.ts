import assert from 'node:assert/strict'
import test from 'node:test'
import { parseShadowDesignDiffState } from '../../../src/design-diff/model/design-diff-model'
import { createMockDesignDiff } from './mock'

test('creates deterministic button changes within the five-change limit', () => {
  const result = createMockDesignDiff('make this a modern button', {
    layout: '{"width":200,"height":48}',
    radius: 4,
    smoothing: 0,
    fill: '#5D8FF2',
    border: '{"borderPresent":false}',
    shadow: '{"shadowPresent":false}',
  })

  assert.deepEqual(result.changes.map((change) => change.property), [
    'layout',
    'radius',
    'smoothing',
    'border',
    'shadow',
  ])
  assert.ok(result.changes.length <= 5)
})

test('preserves existing shadow fields while adding depth', () => {
  const result = createMockDesignDiff('add more depth', {
    shadow: JSON.stringify({
      shadowPresent: true,
      shadowVisible: true,
      shadowX: 2,
      shadowY: 3,
      shadowBlur: 4,
      shadowSpread: 1,
      shadowColor: '#123456',
      shadowOpacity: 0.2,
    }),
  })

  const shadowChange = result.changes.find((change) => change.property === 'shadow')
  assert.ok(shadowChange?.stringValue)
  assert.deepEqual(parseShadowDesignDiffState(shadowChange.stringValue), {
    shadowPresent: true,
    shadowVisible: true,
    shadowX: 2,
    shadowY: 8,
    shadowBlur: 18,
    shadowSpread: 1,
    shadowColor: '#123456',
    shadowOpacity: 0.2,
  })
})
