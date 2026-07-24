import assert from 'node:assert/strict'
import test from 'node:test'
import { createEditorShape } from '../../editor/model/editor-model'
import type { EditorGroup, EditorShape } from '../../editor/model/types'
import {
  designDiffRequestSchema,
  getCenterPreservingLayoutPatch,
  getDesignDiffPropertyPanelTarget,
  getGroupContentCenteringOffset,
  getGroupDesignDiffTarget,
  getValidatedDesignDiffChanges,
  normalizeModelChanges,
  parseBorderDesignDiffState,
  parseShadowDesignDiffState,
  serializeShadowDesignDiffState,
} from './design-diff-model'
import type { DesignDiffStep } from './design-diff-model'

const rectangle: EditorShape = {
  ...createEditorShape({
    id: 'rectangle-1',
    type: 'rectangle',
    name: 'Rectangle',
    groupId: null,
    x: 0,
    y: 0,
    width: 160,
    height: 100,
  }),
  radius: 8,
  radiusTopLeft: 8,
  radiusTopRight: 8,
  radiusBottomRight: 8,
  radiusBottomLeft: 8,
}

test('keeps only requested, valid model changes', () => {
  const shadow = serializeShadowDesignDiffState({
    shadowPresent: true,
    shadowVisible: true,
    shadowX: 0,
    shadowY: 8,
    shadowBlur: 18,
    shadowSpread: 0,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
  })

  const changes = getValidatedDesignDiffChanges(rectangle, [
    { property: 'fill', value: '#34c759' },
    { property: 'shadow', value: shadow },
  ])

  assert.deepEqual(changes.map((change) => change.property), ['fill', 'shadow'])
  assert.equal(changes[0]?.value, '#34C759')
  assert.deepEqual(parseShadowDesignDiffState(changes[1]?.value ?? ''), {
    shadowPresent: true,
    shadowVisible: true,
    shadowX: 0,
    shadowY: 8,
    shadowBlur: 18,
    shadowSpread: 0,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
  })
})

test('rejects invalid or unchanged values and clamps safe numeric ranges', () => {
  const changes = getValidatedDesignDiffChanges(rectangle, [
    { property: 'fill', value: rectangle.fill },
    { property: 'shadow', value: '{"shadowPresent":false,"shadowVisible":true}' },
    { property: 'radius', value: 500 },
    { property: 'opacity', value: -4 },
  ])

  assert.deepEqual(changes, [
    { property: 'radius', value: 50 },
    { property: 'opacity', value: 0 },
  ])
})

test('defaults API requests to the real provider when provider is omitted', () => {
  const parsed = designDiffRequestSchema.parse({
    instruction: 'make it green',
    target: {
      kind: 'shape',
      id: 'rectangle-1',
      type: 'rectangle',
      name: 'Rectangle',
      properties: { fill: '#5D8FF2' },
      availableProperties: ['fill'],
    },
  })

  assert.equal(parsed.provider, 'openai')
})

test('rejects ambiguous structured output values', () => {
  const changes = normalizeModelChanges({
    changes: [
      { property: 'radius', numericValue: 12, stringValue: '12' },
      { property: 'fill', numericValue: 1, stringValue: '#34C759' },
      { property: 'opacity', numericValue: 0.5, stringValue: null },
    ],
  }, ['radius', 'fill', 'opacity'])

  assert.deepEqual(changes, [{ property: 'opacity', value: 0.5 }])
})

test('accepts a modern button recipe without adding unrelated changes', () => {
  const changes = getValidatedDesignDiffChanges(rectangle, [
    { property: 'layout', value: '{"width":160,"height":40}' },
    { property: 'radius', value: 10 },
    { property: 'smoothing', value: 0.6 },
    {
      property: 'border',
      value: '{"borderPresent":true,"borderVisible":true,"borderWidth":1,"borderSides":"all","borderColor":"#5D8FF2","borderOpacity":0.1}',
    },
    {
      property: 'shadow',
      value: '{"shadowPresent":true,"shadowVisible":true,"shadowX":0,"shadowY":2,"shadowBlur":6,"shadowSpread":0,"shadowColor":"#000000","shadowOpacity":0.18}',
    },
  ])

  assert.deepEqual(changes.map((change) => change.property), ['layout', 'radius', 'smoothing', 'border', 'shadow'])
  assert.equal(parseBorderDesignDiffState(changes[3]?.value ?? '')?.borderOpacity, 0.1)
  assert.deepEqual(parseShadowDesignDiffState(changes[4]?.value ?? ''), {
    shadowPresent: true,
    shadowVisible: true,
    shadowX: 0,
    shadowY: 2,
    shadowBlur: 6,
    shadowSpread: 0,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
  })
})

test('targets the visual background of a group without selecting its text', () => {
  const background: EditorShape = { ...rectangle, id: 'background', groupId: 'group-1', width: 180, height: 48 }
  const label: EditorShape = {
    ...rectangle,
    id: 'label',
    type: 'text',
    groupId: 'group-1',
    width: 240,
    height: 36,
    text: 'Continue',
  }
  const group: EditorGroup = {
    ...rectangle,
    id: 'group-1',
    name: 'Button',
    shapeIds: [background.id, label.id],
  }

  assert.equal(getGroupDesignDiffTarget(group, [label, background])?.id, background.id)
})

test('resizes a grouped background around its center', () => {
  const largeBackground: EditorShape = {
    ...rectangle,
    x: 20,
    y: 30,
    width: 500,
    height: 200,
  }

  const patch = getCenterPreservingLayoutPatch(largeBackground, { width: 240, height: 40 })

  assert.deepEqual(patch, {
    x: 150,
    y: 110,
    width: 240,
    height: 40,
  })
  assert.equal(patch.x + patch.width / 2, largeBackground.x + largeBackground.width / 2)
  assert.equal(patch.y + patch.height / 2, largeBackground.y + largeBackground.height / 2)
})

test('centers grouped content inside a resized background', () => {
  const background: EditorShape = {
    ...rectangle,
    id: 'background',
    groupId: 'group-1',
    x: 0,
    y: 30,
    width: 96,
    height: 40,
  }
  const label: EditorShape = {
    ...rectangle,
    id: 'label',
    type: 'text',
    groupId: 'group-1',
    x: 0,
    y: 78,
    width: 96,
    height: 22,
    text: 'Sign In',
  }

  const offset = getGroupContentCenteringOffset(background, [background, label])

  assert.deepEqual(offset, { x: 0, y: -39 })
  assert.equal(label.x + offset!.x + label.width / 2, background.x + background.width / 2)
  assert.equal(label.y + offset!.y + label.height / 2, background.y + background.height / 2)
})

test('shows a removed shadow as a zero-value result instead of an empty state', () => {
  const previousTarget: EditorShape = {
    ...rectangle,
    shadowPresent: true,
    shadowVisible: true,
    shadowX: 0,
    shadowY: 2,
    shadowBlur: 6,
    shadowSpread: 0,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
  }
  const removedTarget: EditorShape = {
    ...previousTarget,
    shadowPresent: false,
    shadowVisible: false,
  }
  const step: DesignDiffStep = {
    id: 'remove-shadow',
    property: 'shadow',
    beforeValue: serializeShadowDesignDiffState(previousTarget),
    afterValue: serializeShadowDesignDiffState(removedTarget),
    beforeTarget: previousTarget,
    afterTarget: removedTarget,
    accepted: true,
  }

  const resultTarget = getDesignDiffPropertyPanelTarget(step, 'after')

  assert.equal(resultTarget.shadowPresent, true)
  assert.equal(resultTarget.shadowVisible, true)
  assert.equal(resultTarget.shadowOpacity, 0)
  assert.equal(resultTarget.shadowY, previousTarget.shadowY)
  assert.equal(resultTarget.shadowBlur, previousTarget.shadowBlur)
})
