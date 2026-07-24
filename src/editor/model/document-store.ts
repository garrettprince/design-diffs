import { makeAutoObservable, reaction } from "mobx";
import type {
  CanvasItem,
  EditorGroup,
  EditorShape,
  GroupPatch,
  LayerPlacement,
  LayerReference,
  ShapePatch,
  ShapeType,
} from "./types";
import type {
  DesignDiffGroupPreview,
  DesignDiffHistoryState,
} from "../../design-diff/model/design-diff-store";
import type { EditorStore } from "./editor-store";
import {
  createEditorGroup,
  createEditorShape,
  hydrateEditorGroup,
  hydrateEditorShape,
} from "./editor-model";
import {
  applyGroupPatchToDocument,
  applyShapePatchToShapes,
  applyTopLevelLayerOrder,
  centerGroupContentOnShape,
  restoreGroupPreviewGeometry,
} from "./document-operations";

const STORAGE_KEY = "paper-design-diff.document.v1";
const HISTORY_LIMIT = 100;

const createId = (prefix: "shape" | "group") =>
  globalThis.crypto?.randomUUID?.() ??
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const round = (value: number) => Math.round(value * 100) / 100;
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));
const snapShapeGeometryPatch = (patch: ShapePatch): ShapePatch => ({
  ...patch,
  ...(patch.x !== undefined ? { x: Math.round(patch.x) } : {}),
  ...(patch.y !== undefined ? { y: Math.round(patch.y) } : {}),
  ...(patch.width !== undefined ? { width: Math.round(patch.width) } : {}),
  ...(patch.height !== undefined ? { height: Math.round(patch.height) } : {}),
  ...(patch.rotation !== undefined
    ? { rotation: Math.round(patch.rotation) }
    : {}),
  ...(patch.radius !== undefined ? { radius: Math.round(patch.radius) } : {}),
  ...(patch.radiusTopLeft !== undefined
    ? { radiusTopLeft: Math.round(patch.radiusTopLeft) }
    : {}),
  ...(patch.radiusTopRight !== undefined
    ? { radiusTopRight: Math.round(patch.radiusTopRight) }
    : {}),
  ...(patch.radiusBottomRight !== undefined
    ? { radiusBottomRight: Math.round(patch.radiusBottomRight) }
    : {}),
  ...(patch.radiusBottomLeft !== undefined
    ? { radiusBottomLeft: Math.round(patch.radiusBottomLeft) }
    : {}),
  ...(patch.smoothing !== undefined
    ? { smoothing: round(patch.smoothing) }
    : {}),
});
const snapGroupGeometryPatch = (patch: GroupPatch): GroupPatch => ({
  ...patch,
  ...(patch.x !== undefined ? { x: Math.round(patch.x) } : {}),
  ...(patch.y !== undefined ? { y: Math.round(patch.y) } : {}),
  ...(patch.width !== undefined ? { width: Math.round(patch.width) } : {}),
  ...(patch.height !== undefined ? { height: Math.round(patch.height) } : {}),
  ...(patch.rotation !== undefined
    ? { rotation: Math.round(patch.rotation) }
    : {}),
});
type PersistedDocument = {
  shapes: EditorShape[];
  groups?: EditorGroup[];
};

type SelectionBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};
type TransformBox = Pick<
  EditorShape,
  "x" | "y" | "width" | "height" | "rotation"
>;
type HistoryEntry = {
  snapshot: string;
  kind: "document" | "design-diff";
  designDiffReviewId?: string;
};
type HistorySnapshot = PersistedDocument & {
  designDiff: DesignDiffHistoryState;
};

const getRotatedBounds = (box: TransformBox): SelectionBounds => {
  const radians = (box.rotation * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const points = [
    [0, 0],
    [box.width, 0],
    [box.width, box.height],
    [0, box.height],
  ].map(([x, y]) => ({
    x: box.x + x * cosine - y * sine,
    y: box.y + x * sine + y * cosine,
  }));

  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const left = Math.min(...xValues);
  const top = Math.min(...yValues);
  return {
    left,
    top,
    right: Math.max(...xValues),
    bottom: Math.max(...yValues),
  };
};

const intersects = (first: SelectionBounds, second: SelectionBounds) =>
  first.left <= second.right &&
  first.right >= second.left &&
  first.top <= second.bottom &&
  first.bottom >= second.top;
const isSameLayer = (first: LayerReference, second: LayerReference) =>
  first.kind === second.kind && first.id === second.id;

export class DocumentStore {
  readonly #editor: EditorStore;
  shapes: EditorShape[] = [];
  groups: EditorGroup[] = [];
  selectedIds: string[] = [];
  selectedGroupId: string | null = null;
  private past: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];
  private interactionSnapshot: string | null = null;

  constructor(editor: EditorStore) {
    this.#editor = editor;
    makeAutoObservable(this, {}, { autoBind: true });
    this.load();

    reaction(
      () => JSON.stringify({ shapes: this.shapes, groups: this.groups }),
      (document) => globalThis.localStorage?.setItem(STORAGE_KEY, document),
    );
  }

  get selectedId() {
    return this.selectedIds.length === 1 ? this.selectedIds[0] : null;
  }

  get selectedShape() {
    if (this.selectedGroupId || this.selectedIds.length !== 1) return null;
    return this.shapeById.get(this.selectedIds[0]) ?? null;
  }

  get selectedShapes() {
    return this.selectedIds
      .map((id) => this.shapeById.get(id))
      .filter((shape): shape is EditorShape => Boolean(shape));
  }

  get selectedGroup() {
    return this.selectedGroupId
      ? (this.groupById.get(this.selectedGroupId) ?? null)
      : null;
  }

  get canGroup() {
    return (
      !this.selectedGroupId &&
      this.selectedIds.length > 1 &&
      this.selectedShapes.every((shape) => !shape.groupId)
    );
  }

  get canUndo() {
    if (this.#editor.designDiff.status === "loading") return false;
    const previous = this.past.at(-1);
    if (!this.#editor.designDiff.review) return Boolean(previous);
    return (
      previous?.kind === "design-diff" &&
      previous.designDiffReviewId === this.#editor.designDiff.review.id
    );
  }

  get canRedo() {
    if (this.#editor.designDiff.status === "loading") return false;
    const next = this.future[0];
    if (!this.#editor.designDiff.review) return Boolean(next);
    return (
      next?.kind === "design-diff" &&
      next.designDiffReviewId === this.#editor.designDiff.review.id
    );
  }

  get selectedBounds() {
    const target = this.selectedGroup ?? this.selectedShape;
    return target ? getRotatedBounds(target) : null;
  }

  get canvasItems(): CanvasItem[] {
    const renderedGroups = new Set<string>();
    const items: CanvasItem[] = [];
    for (const shape of this.shapes) {
      if (!shape.groupId) {
        items.push({ kind: "shape", shape });
        continue;
      }
      if (renderedGroups.has(shape.groupId)) continue;
      const group = this.groupById.get(shape.groupId);
      if (!group) continue;
      renderedGroups.add(group.id);
      items.push({
        kind: "group",
        group,
        shapes: group.shapeIds
          .map((id) => this.shapeById.get(id))
          .filter((candidate): candidate is EditorShape => Boolean(candidate)),
      });
    }
    return items;
  }

  private get shapeById() {
    return new Map(this.shapes.map((shape) => [shape.id, shape]));
  }

  private get groupById() {
    return new Map(this.groups.map((group) => [group.id, group]));
  }

  select(id: string | null, additive = false) {
    if (this.#editor.designDiff.isWorking) return;
    this.#editor.designDiff.dismissPrompt();
    if (!id) {
      this.selectedIds = [];
      this.selectedGroupId = null;
      return;
    }

    const shape = this.shapes.find((candidate) => candidate.id === id);
    if (shape?.groupId) {
      this.selectGroup(shape.groupId);
      return;
    }

    this.selectedGroupId = null;
    if (!additive) {
      this.selectedIds = [id];
      return;
    }
    this.selectedIds = this.selectedIds.includes(id)
      ? this.selectedIds.filter((selectedId) => selectedId !== id)
      : [...this.selectedIds, id];
  }

  selectGroup(id: string | null) {
    if (this.#editor.designDiff.isWorking) return;
    this.#editor.designDiff.dismissPrompt();
    this.selectedIds = [];
    this.selectedGroupId = id;
  }

  selectNestedShape(id: string, additive = false) {
    if (this.#editor.designDiff.isWorking) return;
    const shape = this.shapes.find((candidate) => candidate.id === id);
    if (!shape?.groupId) {
      this.select(id, additive);
      return;
    }
    this.#editor.designDiff.dismissPrompt();
    this.selectedGroupId = null;
    if (!additive) {
      this.selectedIds = [id];
      return;
    }
    this.selectedIds = this.selectedIds.includes(id)
      ? this.selectedIds.filter((selectedId) => selectedId !== id)
      : [...this.selectedIds, id];
  }

  selectInBounds(bounds: SelectionBounds, additive = false) {
    if (this.#editor.designDiff.isWorking) return;
    this.#editor.designDiff.dismissPrompt();
    const shapeIds = this.shapes
      .filter(
        (shape) =>
          !shape.groupId &&
          shape.visible &&
          intersects(bounds, getRotatedBounds(shape)),
      )
      .map((shape) => shape.id);
    const matchingGroups = this.groups.filter(
      (group) => group.visible && intersects(bounds, getRotatedBounds(group)),
    );

    if (shapeIds.length === 0 && matchingGroups.length === 1 && !additive) {
      this.selectGroup(matchingGroups[0].id);
      return;
    }

    this.selectedGroupId = null;
    this.selectedIds = additive
      ? [...new Set([...this.selectedIds, ...shapeIds])]
      : shapeIds;
  }

  isShapeSelected(id: string) {
    return this.selectedIds.includes(id);
  }


  createShape(
    type: ShapeType,
    x: number,
    y: number,
    width?: number,
    height?: number,
  ) {
    const dimensions = this.getDefaultDimensions(type, width, height);
    const index = this.shapes.filter((shape) => shape.type === type).length + 1;
    const shape = createEditorShape({
      id: createId("shape"),
      type,
      name: `${type === "text" ? "Text" : type === "ellipse" ? "Ellipse" : "Rectangle"} ${index}`,
      groupId: null,
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(dimensions.width),
      height: Math.round(dimensions.height),
    });

    this.commit(() => {
      this.shapes = [...this.shapes, shape];
      this.selectedIds = [shape.id];
      this.selectedGroupId = null;
      this.#editor.viewport.setTool("select");
    });

    return shape.id;
  }

  groupSelection() {
    if (this.#editor.designDiff.isWorking) return;
    if (!this.canGroup) return;
    this.#editor.designDiff.dismissPrompt();
    const selected = this.selectedShapes;
    const bounds = selected.map(getRotatedBounds);
    const left = Math.min(...bounds.map((bound) => bound.left));
    const top = Math.min(...bounds.map((bound) => bound.top));
    const right = Math.max(...bounds.map((bound) => bound.right));
    const bottom = Math.max(...bounds.map((bound) => bound.bottom));
    const group = createEditorGroup(
      {
        id: createId("group"),
        name: `Group ${this.groups.length + 1}`,
        shapeIds: selected.map((shape) => shape.id),
        x: round(left),
        y: round(top),
        width: round(right - left),
        height: round(bottom - top),
      },
      selected[0],
    );

    this.commit(() => {
      this.shapes = this.shapes.map((shape) =>
        selected.some((item) => item.id === shape.id)
          ? {
              ...shape,
              groupId: group.id,
              x: round(shape.x - left),
              y: round(shape.y - top),
            }
          : shape,
      );
      this.groups = [...this.groups, group];
      this.selectedIds = [];
      this.selectedGroupId = group.id;
    });
  }

  ungroupSelected() {
    if (this.#editor.designDiff.isWorking) return;
    const group = this.selectedGroup;
    if (!group) return;
    this.#editor.designDiff.dismissPrompt();
    const radians = (group.rotation * Math.PI) / 180;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);

    this.commit(() => {
      this.shapes = this.shapes.map((shape) => {
        if (shape.groupId !== group.id) return shape;
        return {
          ...shape,
          groupId: null,
          x: round(group.x + shape.x * cosine - shape.y * sine),
          y: round(group.y + shape.x * sine + shape.y * cosine),
          rotation: round(shape.rotation + group.rotation),
          opacity: clamp(round(shape.opacity * group.opacity), 0, 1),
          visible: shape.visible && group.visible,
        };
      });
      this.groups = this.groups.filter(
        (candidate) => candidate.id !== group.id,
      );
      this.selectedGroupId = null;
      this.selectedIds = [...group.shapeIds];
    });
  }

  updateShape(id: string, patch: ShapePatch) {
    if (this.#editor.designDiff.isWorking) return;
    this.commit(() => this.applyShapePatch(id, patch));
  }

  updateShapeLive(id: string, patch: ShapePatch) {
    if (this.#editor.designDiff.isWorking) return;
    this.applyShapePatch(id, snapShapeGeometryPatch(patch));
  }

  updateGroup(id: string, patch: GroupPatch) {
    if (this.#editor.designDiff.isWorking) return;
    this.commit(() => this.applyGroupPatch(id, patch));
  }

  updateGroupLive(id: string, patch: GroupPatch) {
    if (this.#editor.designDiff.isWorking) return;
    this.applyGroupPatch(id, snapGroupGeometryPatch(patch), true);
  }

  renameShape(id: string, name: string) {
    const trimmed = name.trim();
    if (trimmed) this.updateShape(id, { name: trimmed });
  }

  renameGroup(id: string, name: string) {
    const trimmed = name.trim();
    if (trimmed) this.updateGroup(id, { name: trimmed });
  }

  setShapeVisibility(id: string, visible: boolean) {
    this.updateShape(id, { visible });
  }

  setGroupVisibility(id: string, visible: boolean) {
    this.updateGroup(id, { visible });
  }

  setShapeLocked(id: string, locked: boolean) {
    this.updateShape(id, { locked });
  }

  setGroupLocked(id: string, locked: boolean) {
    this.updateGroup(id, { locked });
  }

  deleteSelected() {
    if (this.#editor.designDiff.isWorking) return;
    this.#editor.designDiff.dismissPrompt();
    if (this.selectedGroup) {
      const group = this.selectedGroup;
      this.commit(() => {
        this.shapes = this.shapes.filter((shape) => shape.groupId !== group.id);
        this.groups = this.groups.filter(
          (candidate) => candidate.id !== group.id,
        );
        this.selectedGroupId = null;
      });
      return;
    }
    if (this.selectedIds.length === 0) return;
    const selected = new Set(this.selectedIds);
    this.commit(() => {
      this.shapes = this.shapes.filter((shape) => !selected.has(shape.id));
      this.selectedIds = [];
    });
  }

  nudgeSelected(deltaX: number, deltaY: number) {
    if (this.#editor.designDiff.isWorking) return;
    if (this.selectedGroup) {
      this.updateGroup(this.selectedGroup.id, {
        x: Math.round(this.selectedGroup.x + deltaX),
        y: Math.round(this.selectedGroup.y + deltaY),
      });
      return;
    }
    if (this.selectedIds.length === 0) return;
    this.commit(() => {
      for (const shape of this.selectedShapes)
        this.applyShapePatch(shape.id, {
          x: Math.round(shape.x + deltaX),
          y: Math.round(shape.y + deltaY),
        });
    });
  }

  reorderLayer(
    dragged: LayerReference,
    target: LayerReference,
    placement: LayerPlacement,
  ) {
    if (
      this.#editor.designDiff.isWorking ||
      isSameLayer(dragged, target) ||
      dragged.groupId !== target.groupId
    )
      return;

    if (dragged.groupId) {
      if (dragged.kind !== "shape" || target.kind !== "shape") return;
      const group = this.groups.find(
        (candidate) => candidate.id === dragged.groupId,
      );
      if (
        !group ||
        !group.shapeIds.includes(dragged.id) ||
        !group.shapeIds.includes(target.id)
      )
        return;
      const nextShapeIds = group.shapeIds.filter((id) => id !== dragged.id);
      const targetIndex = nextShapeIds.indexOf(target.id);
      nextShapeIds.splice(
        placement === "above" ? targetIndex + 1 : targetIndex,
        0,
        dragged.id,
      );
      this.commit(() => {
        this.groups = this.groups.map((candidate) =>
          candidate.id === group.id
            ? { ...candidate, shapeIds: nextShapeIds }
            : candidate,
        );
      });
      return;
    }

    const references = this.canvasItems.map<LayerReference>((item) =>
      item.kind === "shape"
        ? { kind: "shape", id: item.shape.id, groupId: null }
        : { kind: "group", id: item.group.id, groupId: null },
    );
    const draggedIndex = references.findIndex((reference) =>
      isSameLayer(reference, dragged),
    );
    const targetExists = references.some((reference) =>
      isSameLayer(reference, target),
    );
    if (draggedIndex < 0 || !targetExists) return;
    const nextReferences = references.filter(
      (reference) => !isSameLayer(reference, dragged),
    );
    const targetIndex = nextReferences.findIndex((reference) =>
      isSameLayer(reference, target),
    );
    nextReferences.splice(
      placement === "above" ? targetIndex + 1 : targetIndex,
      0,
      dragged,
    );
    this.commit(() => this.applyTopLevelLayerOrder(nextReferences));
  }

  moveSelectedLayerToBoundary(boundary: "top" | "bottom") {
    if (this.#editor.designDiff.isWorking) return;
    const selectedLayer: LayerReference | null = this.selectedGroup
      ? { kind: "group", id: this.selectedGroup.id, groupId: null }
      : this.selectedShape
        ? {
            kind: "shape",
            id: this.selectedShape.id,
            groupId: this.selectedShape.groupId,
          }
        : null;
    if (!selectedLayer) return;

    if (selectedLayer.groupId) {
      const group = this.groups.find(
        (candidate) => candidate.id === selectedLayer.groupId,
      );
      if (
        !group ||
        group.shapeIds.at(boundary === "top" ? -1 : 0) === selectedLayer.id
      )
        return;
      const nextShapeIds = group.shapeIds.filter(
        (id) => id !== selectedLayer.id,
      );
      if (boundary === "top") nextShapeIds.push(selectedLayer.id);
      else nextShapeIds.unshift(selectedLayer.id);
      this.commit(() => {
        this.groups = this.groups.map((candidate) =>
          candidate.id === group.id
            ? { ...candidate, shapeIds: nextShapeIds }
            : candidate,
        );
      });
      return;
    }

    const references = this.canvasItems.map<LayerReference>((item) =>
      item.kind === "shape"
        ? { kind: "shape", id: item.shape.id, groupId: null }
        : { kind: "group", id: item.group.id, groupId: null },
    );
    if (
      isSameLayer(
        references.at(boundary === "top" ? -1 : 0) ?? selectedLayer,
        selectedLayer,
      )
    )
      return;
    const nextReferences = references.filter(
      (reference) => !isSameLayer(reference, selectedLayer),
    );
    if (boundary === "top") nextReferences.push(selectedLayer);
    else nextReferences.unshift(selectedLayer);
    this.commit(() => this.applyTopLevelLayerOrder(nextReferences));
  }

  beginShapeDrag(id: string, duplicate: boolean) {
    if (this.#editor.designDiff.isWorking) return;
    this.beginInteraction();
    if (!duplicate) return;

    const shapeIndex = this.shapes.findIndex((shape) => shape.id === id);
    const shape = this.shapes[shapeIndex];
    if (!shape) return;

    const duplicateId = createId("shape");
    const duplicateShape: EditorShape = { ...shape, id: duplicateId };
    this.shapes = [
      ...this.shapes.slice(0, shapeIndex),
      duplicateShape,
      ...this.shapes.slice(shapeIndex),
    ];

    if (shape.groupId) {
      this.groups = this.groups.map((group) => {
        if (group.id !== shape.groupId) return group;
        const shapeIdIndex = group.shapeIds.indexOf(id);
        if (shapeIdIndex < 0) return group;
        return {
          ...group,
          shapeIds: [
            ...group.shapeIds.slice(0, shapeIdIndex),
            duplicateId,
            ...group.shapeIds.slice(shapeIdIndex),
          ],
        };
      });
    }

    this.#editor.designDiff.dismissPrompt();
    this.selectedIds = [id];
    this.selectedGroupId = null;
  }

  beginGroupDrag(id: string, duplicate: boolean) {
    if (this.#editor.designDiff.isWorking) return;
    this.beginInteraction();
    if (!duplicate) return;

    const groupIndex = this.groups.findIndex((group) => group.id === id);
    const group = this.groups[groupIndex];
    if (!group) return;

    const duplicateGroupId = createId("group");
    const duplicateIdByShapeId = new Map(
      group.shapeIds.map((shapeId) => [shapeId, createId("shape")]),
    );
    const duplicateShapes = group.shapeIds.flatMap((shapeId) => {
      const shape = this.shapes.find((candidate) => candidate.id === shapeId);
      const duplicateId = duplicateIdByShapeId.get(shapeId);
      return shape && duplicateId
        ? [{ ...shape, id: duplicateId, groupId: duplicateGroupId }]
        : [];
    });
    if (duplicateShapes.length === 0) return;

    const groupShapeIds = new Set(group.shapeIds);
    const firstGroupShapeIndex = this.shapes.findIndex((shape) =>
      groupShapeIds.has(shape.id),
    );
    const insertionIndex =
      firstGroupShapeIndex < 0 ? this.shapes.length : firstGroupShapeIndex;
    this.shapes = [
      ...this.shapes.slice(0, insertionIndex),
      ...duplicateShapes,
      ...this.shapes.slice(insertionIndex),
    ];
    this.groups = [
      ...this.groups.slice(0, groupIndex),
      {
        ...group,
        id: duplicateGroupId,
        shapeIds: group.shapeIds.flatMap((shapeId) => {
          const duplicateId = duplicateIdByShapeId.get(shapeId);
          return duplicateId ? [duplicateId] : [];
        }),
      },
      ...this.groups.slice(groupIndex),
    ];

    this.#editor.designDiff.dismissPrompt();
    this.selectedIds = [];
    this.selectedGroupId = id;
  }

  beginInteraction() {
    if (!this.interactionSnapshot)
      this.interactionSnapshot = this.historySnapshot();
  }

  endInteraction() {
    if (!this.interactionSnapshot) return;
    const before = this.interactionSnapshot;
    this.interactionSnapshot = null;
    this.recordHistory(before);
  }

  undo() {
    if (!this.canUndo) return;
    const previous = this.past.at(-1);
    if (!previous) return;
    this.#editor.designDiff.dismissPrompt();
    this.future = [
      { ...previous, snapshot: this.historySnapshot() },
      ...this.future,
    ].slice(0, HISTORY_LIMIT);
    this.past = this.past.slice(0, -1);
    this.restoreHistory(previous.snapshot);
  }

  redo() {
    if (!this.canRedo) return;
    const next = this.future[0];
    if (!next) return;
    this.#editor.designDiff.dismissPrompt();
    this.past = [
      ...this.past,
      { ...next, snapshot: this.historySnapshot() },
    ].slice(-HISTORY_LIMIT);
    this.future = this.future.slice(1);
    this.restoreHistory(next.snapshot);
  }

  resetDocument() {
    if (this.#editor.designDiff.isWorking) return;
    if (this.shapes.length === 0) return;
    this.commit(() => {
      this.shapes = [];
      this.groups = [];
      this.selectedIds = [];
      this.selectedGroupId = null;
      this.#editor.designDiff.dismissPrompt();
      this.#editor.viewport.reset();
    });
  }

  private getDefaultDimensions(
    type: ShapeType,
    width?: number,
    height?: number,
  ) {
    const drawnWidth = Math.abs(width ?? 0);
    const drawnHeight = Math.abs(height ?? 0);
    if (type === "text")
      return { width: drawnWidth >= 8 ? drawnWidth : 180, height: 36 };
    if (type === "ellipse")
      return {
        width: drawnWidth >= 8 ? drawnWidth : 120,
        height: drawnHeight >= 8 ? drawnHeight : 120,
      };
    return {
      width: drawnWidth >= 8 ? drawnWidth : 140,
      height: drawnHeight >= 8 ? drawnHeight : 100,
    };
  }


  applyShapePatch(id: string, patch: ShapePatch) {
    this.shapes = applyShapePatchToShapes(this.shapes, id, patch);
  }

  applyGroupPatch(id: string, patch: GroupPatch, snapGeometry = false) {
    const document = applyGroupPatchToDocument(
      this.shapes,
      this.groups,
      id,
      patch,
      snapGeometry,
    );
    this.shapes = document.shapes;
    this.groups = document.groups;
  }

  centerGroupContentOnShape(groupId: string, targetId: string) {
    this.shapes = centerGroupContentOnShape(this.shapes, groupId, targetId);
  }

  restoreGroupPreviewGeometry(
    preview: DesignDiffGroupPreview | undefined,
  ) {
    this.shapes = restoreGroupPreviewGeometry(this.shapes, preview);
  }

  private commit(change: () => void) {
    const before = this.historySnapshot();
    change();
    this.recordHistory(before);
  }

  private applyTopLevelLayerOrder(references: LayerReference[]) {
    this.shapes = applyTopLevelLayerOrder(this.shapes, this.groups, references);
  }

  recordHistory(
    before: string,
    kind: HistoryEntry["kind"] = "document",
    designDiffReviewId?: string,
  ) {
    if (before === this.historySnapshot()) return;
    this.past = [
      ...this.past.slice(-(HISTORY_LIMIT - 1)),
      { snapshot: before, kind, designDiffReviewId },
    ];
    this.future = [];
  }

  historySnapshot() {
    return JSON.stringify({
      shapes: this.shapes,
      groups: this.groups,
      designDiff: this.#editor.designDiff.historyState,
    } satisfies HistorySnapshot);
  }

  documentSnapshot() {
    return JSON.stringify({ shapes: this.shapes, groups: this.groups });
  }

  restoreDocument(snapshot: string) {
    const document = JSON.parse(snapshot) as PersistedDocument;
    this.shapes = document.shapes;
    this.groups = document.groups ?? [];
    if (
      this.selectedGroupId &&
      !this.groups.some((group) => group.id === this.selectedGroupId)
    )
      this.selectedGroupId = null;
    this.selectedIds = this.selectedIds.filter((id) =>
      this.shapes.some((shape) => shape.id === id),
    );
  }

  private restoreHistory(snapshot: string) {
    const state = JSON.parse(snapshot) as HistorySnapshot;
    this.restoreDocument(
      JSON.stringify({ shapes: state.shapes, groups: state.groups }),
    );
    this.#editor.designDiff.restoreHistoryState(state.designDiff);
  }

  private load() {
    try {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
      if (!raw) return;
      const document = JSON.parse(raw) as PersistedDocument;
      if (Array.isArray(document.shapes))
        this.shapes = document.shapes.map(hydrateEditorShape);
      if (Array.isArray(document.groups))
        this.groups = document.groups.map(hydrateEditorGroup);
    } catch {
      globalThis.localStorage?.removeItem(STORAGE_KEY);
    }
  }
}
