import assert from 'node:assert/strict'
import test from 'node:test'
import { applyGroupPatchToDocument } from './document-operations'
import { createEditorGroup, createEditorShape } from './editor-model'

test('scales grouped content and propagates normalized visual changes', () => {
  const shape = createEditorShape({
    id: 'grouped-shape',
    type: 'rectangle',
    name: 'Rectangle',
    groupId: 'group-1',
    x: 10,
    y: 12,
    width: 100,
    height: 40,
  })
  const group = createEditorGroup({
    id: 'group-1',
    name: 'Group',
    shapeIds: [shape.id],
    x: 0,
    y: 0,
    width: 100,
    height: 40,
  }, shape)

  const document = applyGroupPatchToDocument([shape], [group], group.id, {
    width: 200,
    height: 80,
    shadowPresent: true,
    shadowVisible: true,
    shadowBlur: 12.345,
    shadowOpacity: 2,
  })

  assert.deepEqual({
    x: document.shapes[0].x,
    y: document.shapes[0].y,
    width: document.shapes[0].width,
    height: document.shapes[0].height,
    shadowBlur: document.shapes[0].shadowBlur,
    shadowOpacity: document.shapes[0].shadowOpacity,
  }, {
    x: 20,
    y: 24,
    width: 200,
    height: 80,
    shadowBlur: 12.35,
    shadowOpacity: 1,
  })
  assert.equal(document.groups[0].width, 200)
  assert.equal(document.groups[0].shadowOpacity, 1)
})
