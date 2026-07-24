import { useEffect } from "react";
import { editorStore } from "../model/editor-store";

const isEditableTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  return (
    element?.tagName === "INPUT" ||
    element?.tagName === "TEXTAREA" ||
    element?.isContentEditable
  );
};

export function useEditorShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;

      if (event.key === "Alt") editorStore.viewport.setOptionPressed(true);

      if (editorStore.designDiff.isReviewActive && !isEditableTarget(event.target)) {
        if (event.key === "Escape") {
          event.preventDefault();
          editorStore.designDiff.cancelReview();
          return;
        }
        if (!modifier && event.key.toLowerCase() === "r") {
          event.preventDefault();
          editorStore.designDiff.rejectCurrentStep();
          return;
        }
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          const direction = event.key === "ArrowLeft" ? -1 : 1;
          editorStore.designDiff.goToStep(
            (editorStore.designDiff.review?.currentIndex ?? 0) + direction,
          );
          return;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          if (modifier) editorStore.designDiff.acceptAll();
          else editorStore.designDiff.acceptCurrentStep();
          return;
        }
      }

      if (event.code === "Space" && !isEditableTarget(event.target)) {
        event.preventDefault();
        editorStore.viewport.setSpacePressed(true);
      }

      if (isEditableTarget(event.target)) return;

      if (!modifier && !event.altKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        if (!event.repeat) editorStore.designDiff.togglePrompt();
        return;
      }

      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) editorStore.document.redo();
        else editorStore.document.undo();
        return;
      }

      if (modifier && event.key.toLowerCase() === "g") {
        event.preventDefault();
        if (event.shiftKey) editorStore.document.ungroupSelected();
        else editorStore.document.groupSelection();
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        editorStore.document.deleteSelected();
        return;
      }

      if (event.key === "Escape") {
        editorStore.document.select(null);
        editorStore.viewport.setTool("select");
        return;
      }

      if (event.shiftKey && event.key === "0") {
        event.preventDefault();
        editorStore.viewport.setViewport(1, 0, 0);
        return;
      }

      const layerBoundary =
        event.code === "BracketRight" || event.key === "]"
          ? "top"
          : event.code === "BracketLeft" || event.key === "["
            ? "bottom"
            : null;
      if (!modifier && !event.altKey && layerBoundary) {
        event.preventDefault();
        editorStore.document.moveSelectedLayerToBoundary(layerBoundary);
        return;
      }

      const distance = event.shiftKey ? 10 : 1;
      const nudges: Record<string, [number, number]> = {
        ArrowLeft: [-distance, 0],
        ArrowRight: [distance, 0],
        ArrowUp: [0, -distance],
        ArrowDown: [0, distance],
      };
      const nudge = nudges[event.key];
      if (nudge) {
        event.preventDefault();
        editorStore.document.nudgeSelected(...nudge);
        return;
      }

      const tools = {
        v: "select",
        h: "hand",
        f: "frame",
        r: "rectangle",
        o: "ellipse",
        p: "pen",
        t: "text",
        i: "image-gen",
        g: "svg-gen",
        s: "shaders",
      } as const;
      const tool = tools[event.key.toLowerCase() as keyof typeof tools];
      if (tool) editorStore.viewport.setTool(tool);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") editorStore.viewport.setSpacePressed(false);
      if (event.key === "Alt") editorStore.viewport.setOptionPressed(false);
    };

    const onBlur = () => {
      editorStore.viewport.setSpacePressed(false);
      editorStore.viewport.setOptionPressed(false);
    };
    globalThis.addEventListener("keydown", onKeyDown);
    globalThis.addEventListener("keyup", onKeyUp);
    globalThis.addEventListener("blur", onBlur);
    return () => {
      globalThis.removeEventListener("keydown", onKeyDown);
      globalThis.removeEventListener("keyup", onKeyUp);
      globalThis.removeEventListener("blur", onBlur);
    };
  }, []);
}
