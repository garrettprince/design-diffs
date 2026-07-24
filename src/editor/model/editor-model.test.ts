import assert from 'node:assert/strict'
import test from 'node:test'
import { createEditorShape, hydrateEditorShape } from './editor-model'

test('creates and hydrates editor shapes from centralized defaults', () => {
  const shape = createEditorShape({
    id: 'new-rectangle',
    type: 'rectangle',
    name: 'Rectangle',
    groupId: null,
    x: 10,
    y: 20,
    width: 120,
    height: 80,
  })
  const hydrated = hydrateEditorShape({
    ...shape,
    smoothing: undefined as unknown as number,
    radiusTopLeft: undefined as unknown as number,
  })

  assert.equal(shape.fill, '#5D8FF2')
  assert.equal(shape.shadowBlur, 18)
  assert.equal(hydrated.smoothing, 0)
  assert.equal(hydrated.radiusTopLeft, shape.radius)
})
