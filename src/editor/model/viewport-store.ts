import { makeAutoObservable } from "mobx";
import { MAX_CANVAS_ZOOM, MIN_CANVAS_ZOOM } from "../constants/editor-constants";
import type { EditorTool } from "./types";
import type { EditorStore } from "./editor-store";

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export class ViewportStore {
  readonly #editor: EditorStore;
  tool: EditorTool = "select";
  zoom = 1;
  panX = 0;
  panY = 0;
  isSpacePressed = false;
  isOptionPressed = false;

  constructor(editor: EditorStore) {
    this.#editor = editor;
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get zoomPercent() {
    return Math.round(this.zoom * 100);
  }

  setTool(tool: EditorTool) {
    if (this.#editor.designDiff.isWorking) return;
    this.#editor.designDiff.dismissPrompt();
    this.tool = tool;
  }

  setSpacePressed(pressed: boolean) {
    this.isSpacePressed = pressed;
  }

  setOptionPressed(pressed: boolean) {
    this.isOptionPressed = pressed;
  }

  setViewport(zoom: number, panX: number, panY: number) {
    this.zoom = clamp(zoom, MIN_CANVAS_ZOOM, MAX_CANVAS_ZOOM);
    this.panX = panX;
    this.panY = panY;
  }

  setPan(panX: number, panY: number) {
    this.panX = panX;
    this.panY = panY;
  }

  reset() {
    this.tool = "select";
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
  }
}
