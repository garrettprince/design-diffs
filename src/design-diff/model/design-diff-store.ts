import { makeAutoObservable, reaction, runInAction } from "mobx";
import type {
  BorderPatch,
  EditorGroup,
  EditorShape,
  FillPatch,
  GroupPatch,
  InnerShadowPatch,
  LayoutPatch,
  OutlinePatch,
  ShapePatch,
  ShadowPatch,
} from "../../editor/model/types";
import type { EditorStore } from "../../editor/model/editor-store";
import { requestDesignDiffs } from "../api/design-diff-client";
import {
  getBorderDesignDiffState,
  getCenterPreservingLayoutPatch,
  getDesignDiffValue,
  getGroupDesignDiffTarget,
  getInnerShadowDesignDiffState,
  getLayoutDesignDiffState,
  getOutlineDesignDiffState,
  getShadowDesignDiffState,
  parseBorderDesignDiffState,
  parseInnerShadowDesignDiffState,
  parseLayoutDesignDiffState,
  parseOutlineDesignDiffState,
  parseShadowDesignDiffState,
  serializeBorderDesignDiffState,
  serializeInnerShadowDesignDiffState,
  serializeLayoutDesignDiffState,
  serializeOutlineDesignDiffState,
  serializeShadowDesignDiffState,
  type DesignDiffGroupPreview,
  type DesignDiffProperty,
  type DesignDiffProvider,
  type DesignDiffStep,
  type DesignDiffTarget,
  type DesignDiffValue,
} from "./design-diff-model";

export type { DesignDiffGroupPreview } from "./design-diff-model";

const PROVIDER_STORAGE_KEY = "paper-design-diff.provider.v1";
const LOADING_MINIMUM_MS = 5000;

export type DesignDiffTargetKind = "shape" | "group";

export type DesignDiffReview = {
  id: string;
  instruction: string;
  beforeSnapshot: string;
  targetId: string;
  targetKind: DesignDiffTargetKind;
  editTargetId: string;
  editTargetKind: DesignDiffTargetKind;
  steps: DesignDiffStep[];
  currentIndex: number;
  previewEnabled: boolean;
};

export type DesignDiffHistoryState = {
  status: "idle" | "review";
  targetId: string | null;
  targetKind: DesignDiffTargetKind | null;
  review: DesignDiffReview | null;
};

const createReviewId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `review-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const getFillState = (target: DesignDiffTarget): Required<FillPatch> => ({
  fill: target.fill,
  fillType: target.fillType,
  fillGradientStart: target.fillGradientStart,
  fillGradientEnd: target.fillGradientEnd,
  fillGradientAngle: target.fillGradientAngle,
  fillOpacity: target.fillOpacity,
  fillVisible: target.fillVisible,
  fillPresent: target.fillPresent,
});

export class DesignDiffStore {
  readonly #editor: EditorStore;
  provider: DesignDiffProvider = "openai";
  status: "idle" | "loading" | "review" = "idle";
  error: string | null = null;
  targetId: string | null = null;
  targetKind: DesignDiffTargetKind | null = null;
  review: DesignDiffReview | null = null;
  isPromptOpen = false;
  promptDraft = "";

  constructor(editor: EditorStore) {
    this.#editor = editor;
    makeAutoObservable(this, {}, { autoBind: true });
    const provider = globalThis.localStorage?.getItem(PROVIDER_STORAGE_KEY);
    if (provider === "mock" || provider === "openai") this.provider = provider;
    reaction(
      () => this.provider,
      (nextProvider) =>
        globalThis.localStorage?.setItem(
          PROVIDER_STORAGE_KEY,
          nextProvider,
        ),
    );
  }

  get isWorking() {
    return this.status === "loading" || this.status === "review";
  }

  get isReviewActive() {
    return this.status === "review" && Boolean(this.review);
  }

  get currentStep() {
    return this.review?.steps[this.review.currentIndex] ?? null;
  }

  get canOpenPrompt() {
    return (
      !this.isWorking &&
      Boolean(this.#editor.document.selectedShape || this.#editor.document.selectedGroup)
    );
  }

  get historyState(): DesignDiffHistoryState {
    return {
      status: this.status === "review" ? "review" : "idle",
      targetId: this.targetId,
      targetKind: this.targetKind,
      review: this.review,
    };
  }

  restoreHistoryState(state: DesignDiffHistoryState) {
    this.status = state.status;
    this.targetId = state.targetId;
    this.targetKind = state.targetKind;
    this.review = state.review;
    this.error = null;
    this.promptDraft = "";
    this.isPromptOpen = false;
  }

  setProvider(provider: DesignDiffProvider) {
    if (this.isWorking) return;
    this.provider = provider;
  }

  togglePrompt() {
    if (!this.canOpenPrompt) return;
    if (!this.isPromptOpen) this.promptDraft = "";
    this.isPromptOpen = !this.isPromptOpen;
  }

  dismissPrompt() {
    this.isPromptOpen = false;
  }

  closePrompt() {
    this.isPromptOpen = false;
    this.promptDraft = "";
    this.error = null;
  }

  clearError() {
    this.error = null;
  }

  async create(instruction: string) {
    const selectedGroup = this.#editor.document.selectedGroup;
    const selectedTarget = selectedGroup ?? this.#editor.document.selectedShape;
    if (!selectedTarget) return false;
    const editTarget = selectedGroup
      ? (getGroupDesignDiffTarget(selectedGroup, this.#editor.document.shapes) ??
        selectedGroup)
      : selectedTarget;
    const minimumLoadingTime = new Promise<void>((resolve) =>
      setTimeout(resolve, LOADING_MINIMUM_MS),
    );
    const targetKind: DesignDiffTargetKind = selectedGroup ? "group" : "shape";
    const editTargetKind: DesignDiffTargetKind =
      "type" in editTarget ? "shape" : "group";
    const targetSnapshot = this.getSelectionSnapshot(
      targetKind,
      selectedTarget.id,
    );
    runInAction(() => {
      this.status = "loading";
      this.error = null;
      this.targetId = selectedTarget.id;
      this.targetKind = targetKind;
      this.isPromptOpen = true;
    });

    try {
      const changes = await requestDesignDiffs(
        instruction,
        editTarget,
        this.provider,
      );
      await minimumLoadingTime;
      const currentSnapshot = this.getSelectionSnapshot(
        targetKind,
        selectedTarget.id,
      );
      if (!currentSnapshot || currentSnapshot !== targetSnapshot)
        throw new Error(
          "The selected object changed before the design diff was ready.",
        );
      runInAction(() =>
        this.startReview(
          targetKind,
          selectedTarget.id,
          editTargetKind,
          editTarget.id,
          instruction.trim(),
          changes,
        ),
      );
      return true;
    } catch (caughtError) {
      await minimumLoadingTime;
      runInAction(() => {
        this.status = "idle";
        this.targetId = null;
        this.targetKind = null;
        this.error =
          caughtError instanceof Error
            ? caughtError.message
            : "The design changes could not be created.";
        this.isPromptOpen = true;
      });
      return false;
    }
  }

  isTarget(kind: DesignDiffTargetKind, id: string) {
    return (
      this.isWorking && this.targetKind === kind && this.targetId === id
    );
  }

  togglePreview() {
    if (this.review)
      this.review.previewEnabled = !this.review.previewEnabled;
  }

  goToStep(index: number) {
    if (!this.review) return;
    this.review.currentIndex = clamp(
      index,
      0,
      this.review.steps.length - 1,
    );
  }

  updateCurrentStepAfterValue(value: DesignDiffValue) {
    const review = this.review;
    const step = this.currentStep;
    if (!review || !step) return;
    if (typeof value === "number" && !Number.isFinite(value)) return;

    this.applyValue(
      review.editTargetKind,
      review.editTargetId,
      step.property,
      value,
    );
    const currentTarget = this.getTarget(
      review.editTargetKind,
      review.editTargetId,
    );
    const normalizedValue =
      currentTarget?.[step.property as keyof DesignDiffTarget];
    if (
      typeof normalizedValue !== "string" &&
      typeof normalizedValue !== "number"
    )
      return;

    step.afterValue = normalizedValue;
    step.afterTarget = {
      ...step.afterTarget,
      [step.property]: normalizedValue,
    };
    step.afterPreview = this.getGroupPreview(review);
    step.accepted = true;
    this.propagateTargetPatch(review, {
      [step.property]: normalizedValue,
    });
  }

  updateCurrentFill(patch: FillPatch) {
    const review = this.review;
    const step = this.currentStep;
    if (!review || !step || step.property !== "fill") return;
    this.applyPatch(review.editTargetKind, review.editTargetId, patch);
    const currentTarget = this.getTarget(
      review.editTargetKind,
      review.editTargetId,
    );
    if (!currentTarget) return;
    const fillState = getFillState(currentTarget);
    step.afterValue = currentTarget.fill;
    step.afterTarget = { ...step.afterTarget, ...fillState };
    step.afterPreview = this.getGroupPreview(review);
    step.accepted = true;
    this.propagateTargetPatch(review, fillState);
  }

  updateCurrentOutline(patch: OutlinePatch) {
    const review = this.review;
    const step = this.currentStep;
    if (!review || !step || step.property !== "outline") return;
    this.applyPatch(review.editTargetKind, review.editTargetId, patch);
    const currentTarget = this.getTarget(
      review.editTargetKind,
      review.editTargetId,
    );
    if (!currentTarget) return;
    const state = getOutlineDesignDiffState(currentTarget);
    step.afterValue = serializeOutlineDesignDiffState(state);
    step.afterTarget = { ...step.afterTarget, ...state };
    step.afterPreview = this.getGroupPreview(review);
    step.accepted = true;
    this.propagateTargetPatch(review, state);
  }

  updateCurrentBorder(patch: BorderPatch) {
    const review = this.review;
    const step = this.currentStep;
    if (!review || !step || step.property !== "border") return;
    this.applyPatch(review.editTargetKind, review.editTargetId, patch);
    const currentTarget = this.getTarget(
      review.editTargetKind,
      review.editTargetId,
    );
    if (!currentTarget) return;
    const state = getBorderDesignDiffState(currentTarget);
    step.afterValue = serializeBorderDesignDiffState(state);
    step.afterTarget = { ...step.afterTarget, ...state };
    step.afterPreview = this.getGroupPreview(review);
    step.accepted = true;
    this.propagateTargetPatch(review, state);
  }

  updateCurrentShadow(patch: ShadowPatch) {
    const review = this.review;
    const step = this.currentStep;
    if (!review || !step || step.property !== "shadow") return;
    this.applyPatch(review.editTargetKind, review.editTargetId, patch);
    const currentTarget = this.getTarget(
      review.editTargetKind,
      review.editTargetId,
    );
    if (!currentTarget) return;
    const state = getShadowDesignDiffState(currentTarget);
    step.afterValue = serializeShadowDesignDiffState(state);
    step.afterTarget = { ...step.afterTarget, ...state };
    step.afterPreview = this.getGroupPreview(review);
    step.accepted = true;
    this.propagateTargetPatch(review, state);
  }

  updateCurrentInnerShadow(patch: InnerShadowPatch) {
    const review = this.review;
    const step = this.currentStep;
    if (!review || !step || step.property !== "innerShadow") return;
    this.applyPatch(review.editTargetKind, review.editTargetId, patch);
    const currentTarget = this.getTarget(
      review.editTargetKind,
      review.editTargetId,
    );
    if (!currentTarget) return;
    const state = getInnerShadowDesignDiffState(currentTarget);
    step.afterValue = serializeInnerShadowDesignDiffState(state);
    step.afterTarget = { ...step.afterTarget, ...state };
    step.afterPreview = this.getGroupPreview(review);
    step.accepted = true;
    this.propagateTargetPatch(review, state);
  }

  updateCurrentLayout(patch: LayoutPatch) {
    const review = this.review;
    const step = this.currentStep;
    if (!review || !step || step.property !== "layout") return;
    const editTarget = this.getTarget(
      review.editTargetKind,
      review.editTargetId,
    );
    if (
      !editTarget ||
      (patch.width === undefined && patch.height === undefined)
    )
      return;
    this.applyValue(
      review.editTargetKind,
      review.editTargetId,
      "layout",
      serializeLayoutDesignDiffState({
        width: patch.width ?? editTarget.width,
        height: patch.height ?? editTarget.height,
      }),
    );
    const currentTarget = this.getTarget(
      review.editTargetKind,
      review.editTargetId,
    );
    if (!currentTarget) return;
    const layoutState = getLayoutDesignDiffState(currentTarget);
    const layoutPatch = {
      ...layoutState,
      x: currentTarget.x,
      y: currentTarget.y,
    };
    step.afterValue = serializeLayoutDesignDiffState(layoutState);
    step.afterTarget = { ...step.afterTarget, ...layoutPatch };
    step.afterPreview = this.getGroupPreview(review);
    step.accepted = true;
    this.propagateTargetPatch(review, layoutPatch);
  }

  acceptCurrentStep() {
    const review = this.review;
    const step = this.currentStep;
    if (!review || !step) return;
    const before = this.#editor.document.historySnapshot();
    if (!step.accepted) {
      if (step.property === "fill")
        this.applyFillState(
          review.editTargetKind,
          review.editTargetId,
          step.afterTarget,
        );
      else {
        this.applyValue(
          review.editTargetKind,
          review.editTargetId,
          step.property,
          step.afterValue,
        );
        if (step.property === "layout" && review.targetKind === "group")
          this.#editor.document.restoreGroupPreviewGeometry(step.afterPreview);
      }
      step.accepted = true;
    }
    this.propagateStepChoice(review, step, step.afterTarget);
    if (review.currentIndex >= review.steps.length - 1) this.finalizeReview();
    else review.currentIndex += 1;
    this.#editor.document.recordHistory(before, "design-diff", review.id);
  }

  rejectCurrentStep() {
    const review = this.review;
    const step = this.currentStep;
    if (!review || !step) return;
    const before = this.#editor.document.historySnapshot();
    if (step.accepted) {
      if (step.property === "fill")
        this.applyFillState(
          review.editTargetKind,
          review.editTargetId,
          step.beforeTarget,
        );
      else {
        this.applyValue(
          review.editTargetKind,
          review.editTargetId,
          step.property,
          step.beforeValue,
        );
        if (step.property === "layout" && review.targetKind === "group")
          this.#editor.document.restoreGroupPreviewGeometry(step.beforePreview);
      }
      step.accepted = false;
    }
    this.propagateStepChoice(review, step, step.beforeTarget);
    if (review.currentIndex >= review.steps.length - 1) this.finalizeReview();
    else review.currentIndex += 1;
    this.#editor.document.recordHistory(before, "design-diff", review.id);
  }

  acceptAll() {
    const review = this.review;
    if (!review) return;
    const before = this.#editor.document.historySnapshot();
    this.finalizeReview();
    this.#editor.document.recordHistory(before, "design-diff", review.id);
  }

  cancelReview() {
    if (!this.review) return;
    this.#editor.document.restoreDocument(this.review.beforeSnapshot);
    this.clearState();
  }

  restartFromPrompt() {
    const review = this.review;
    if (!review) return;
    const instruction = review.instruction;
    this.#editor.document.restoreDocument(review.beforeSnapshot);
    this.clearState();
    this.promptDraft = instruction;
    this.isPromptOpen = true;
  }

  clearState() {
    this.review = null;
    this.status = "idle";
    this.targetId = null;
    this.targetKind = null;
    this.error = null;
    this.promptDraft = "";
    this.isPromptOpen = false;
  }

  private startReview(
    targetKind: DesignDiffTargetKind,
    targetId: string,
    editTargetKind: DesignDiffTargetKind,
    editTargetId: string,
    instruction: string,
    changes: Array<{
      property: DesignDiffProperty;
      value: DesignDiffValue;
    }>,
  ) {
    const beforeSnapshot = this.#editor.document.documentSnapshot();
    const steps: DesignDiffStep[] = [];
    const previewReview = { targetKind, targetId } as Pick<
      DesignDiffReview,
      "targetKind" | "targetId"
    >;

    for (const change of changes) {
      const beforeTarget = this.getTarget(editTargetKind, editTargetId);
      if (!beforeTarget) continue;
      const beforePreview = this.getGroupPreview(previewReview);
      const beforeValue = getDesignDiffValue(beforeTarget, change.property);
      if (beforeValue === null) continue;
      this.applyValue(
        editTargetKind,
        editTargetId,
        change.property,
        change.value,
      );
      const afterTarget = this.getTarget(editTargetKind, editTargetId);
      if (!afterTarget) continue;
      const afterPreview = this.getGroupPreview(previewReview);
      const afterValue = getDesignDiffValue(afterTarget, change.property);
      if (afterValue === null || beforeValue === afterValue) continue;
      steps.push({
        id: `${targetId}-${change.property}`,
        property: change.property,
        beforeValue,
        afterValue,
        beforeTarget,
        afterTarget,
        ...(beforePreview ? { beforePreview } : {}),
        ...(afterPreview ? { afterPreview } : {}),
        accepted: true,
      });
    }

    if (steps.length === 0) {
      this.#editor.document.restoreDocument(beforeSnapshot);
      this.status = "idle";
      this.targetId = null;
      this.targetKind = null;
      this.error = "The suggested values already match this object.";
      this.isPromptOpen = true;
      return;
    }

    this.review = {
      id: createReviewId(),
      instruction,
      beforeSnapshot,
      targetId,
      targetKind,
      editTargetId,
      editTargetKind,
      steps,
      currentIndex: 0,
      previewEnabled: true,
    };
    this.status = "review";
    this.isPromptOpen = false;
  }

  private getTarget(
    kind: DesignDiffTargetKind,
    id: string,
  ): DesignDiffTarget | null {
    const target =
      kind === "group"
        ? this.#editor.document.groups.find((group) => group.id === id)
        : this.#editor.document.shapes.find((shape) => shape.id === id);
    return target
      ? (JSON.parse(JSON.stringify(target)) as DesignDiffTarget)
      : null;
  }

  private getSelectionSnapshot(
    kind: DesignDiffTargetKind,
    id: string,
  ): string | null {
    if (kind === "shape") {
      const shape = this.#editor.document.shapes.find(
        (candidate) => candidate.id === id,
      );
      return shape ? JSON.stringify(shape) : null;
    }
    const group = this.#editor.document.groups.find(
      (candidate) => candidate.id === id,
    );
    if (!group) return null;
    return JSON.stringify({
      group,
      shapes: this.#editor.document.shapes.filter(
        (shape) => shape.groupId === group.id,
      ),
    });
  }

  private getGroupPreview(
    review: Pick<DesignDiffReview, "targetKind" | "targetId">,
  ): DesignDiffGroupPreview | undefined {
    if (review.targetKind !== "group") return undefined;
    const group = this.#editor.document.groups.find(
      (candidate) => candidate.id === review.targetId,
    );
    if (!group) return undefined;
    return JSON.parse(
      JSON.stringify({
        group,
        shapes: this.#editor.document.shapes.filter(
          (shape) => shape.groupId === group.id,
        ),
      }),
    ) as DesignDiffGroupPreview;
  }

  private applyValue(
    kind: DesignDiffTargetKind,
    id: string,
    property: DesignDiffProperty,
    value: DesignDiffValue,
  ) {
    if (property === "outline") {
      const state = parseOutlineDesignDiffState(value);
      if (state) this.applyPatch(kind, id, state);
      return;
    }
    if (property === "border") {
      const state = parseBorderDesignDiffState(value);
      if (state) this.applyPatch(kind, id, state);
      return;
    }
    if (property === "shadow") {
      const state = parseShadowDesignDiffState(value);
      if (state) this.applyPatch(kind, id, state);
      return;
    }
    if (property === "innerShadow") {
      const state = parseInnerShadowDesignDiffState(value);
      if (state) this.applyPatch(kind, id, state);
      return;
    }
    if (property === "layout") {
      const state = parseLayoutDesignDiffState(value);
      if (!state) return;
      if (kind === "group") this.#editor.document.applyGroupPatch(id, state);
      else {
        const shape = this.#editor.document.shapes.find(
          (candidate) => candidate.id === id,
        );
        const isGroupedTarget = Boolean(
          shape?.groupId &&
          this.targetKind === "group" &&
          this.targetId === shape.groupId,
        );
        this.#editor.document.applyShapePatch(
          id,
          shape && isGroupedTarget
            ? getCenterPreservingLayoutPatch(shape, state)
            : state,
        );
        if (shape?.groupId && isGroupedTarget)
          this.#editor.document.centerGroupContentOnShape(shape.groupId, id);
      }
      return;
    }
    this.applyPatch(
      kind,
      id,
      { [property]: value } as ShapePatch | GroupPatch,
    );
  }

  private applyPatch(
    kind: DesignDiffTargetKind,
    id: string,
    patch: ShapePatch | GroupPatch,
  ) {
    if (kind === "group")
      this.#editor.document.applyGroupPatch(id, patch as GroupPatch);
    else this.#editor.document.applyShapePatch(id, patch as ShapePatch);
  }

  private applyFillState(
    kind: DesignDiffTargetKind,
    id: string,
    target: DesignDiffTarget,
  ) {
    this.applyPatch(kind, id, getFillState(target));
  }

  private propagateTargetPatch(
    review: DesignDiffReview,
    patch: Partial<DesignDiffTarget>,
  ) {
    const groupedLayoutPositions =
      review.targetKind === "group" &&
      review.editTargetKind === "shape" &&
      (patch.x !== undefined ||
        patch.y !== undefined ||
        patch.width !== undefined ||
        patch.height !== undefined)
        ? new Map(
            this.getGroupPreview(review)?.shapes.map((shape) => [
              shape.id,
              { x: shape.x, y: shape.y },
            ]),
          )
        : null;
    const updatePreview = (preview: DesignDiffGroupPreview | undefined) => {
      if (!preview) return undefined;
      if (review.editTargetKind === "group")
        return {
          ...preview,
          group: { ...preview.group, ...patch } as EditorGroup,
        };
      return {
        ...preview,
        shapes: preview.shapes.map((shape) => {
          if (shape.id === review.editTargetId)
            return { ...shape, ...patch } as EditorShape;
          const position = groupedLayoutPositions?.get(shape.id);
          return position ? { ...shape, ...position } : shape;
        }),
      };
    };

    for (const laterStep of review.steps.slice(review.currentIndex + 1)) {
      laterStep.beforeTarget = { ...laterStep.beforeTarget, ...patch };
      laterStep.afterTarget = { ...laterStep.afterTarget, ...patch };
      laterStep.beforePreview = updatePreview(laterStep.beforePreview);
      laterStep.afterPreview = updatePreview(laterStep.afterPreview);
    }
  }

  private propagateStepChoice(
    review: DesignDiffReview,
    step: DesignDiffStep,
    target: DesignDiffTarget,
  ) {
    let patch: Partial<DesignDiffTarget>;
    if (step.property === "fill") patch = getFillState(target);
    else if (step.property === "outline")
      patch = getOutlineDesignDiffState(target);
    else if (step.property === "border")
      patch = getBorderDesignDiffState(target);
    else if (step.property === "shadow")
      patch = getShadowDesignDiffState(target);
    else if (step.property === "innerShadow")
      patch = getInnerShadowDesignDiffState(target);
    else if (step.property === "layout")
      patch = {
        ...getLayoutDesignDiffState(target),
        x: target.x,
        y: target.y,
      };
    else {
      const value = target[step.property as keyof DesignDiffTarget];
      if (typeof value !== "string" && typeof value !== "number") return;
      patch = { [step.property]: value } as Partial<DesignDiffTarget>;
    }
    this.propagateTargetPatch(review, patch);
  }

  private finalizeReview() {
    if (this.review) this.clearState();
  }
}
