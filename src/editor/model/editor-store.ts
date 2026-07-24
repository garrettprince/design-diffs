import { DesignDiffStore } from "../../design-diff/model/design-diff-store";
import { DocumentStore } from "./document-store";
import { ViewportStore } from "./viewport-store";

export class EditorStore {
  readonly document: DocumentStore;
  readonly viewport: ViewportStore;
  readonly designDiff: DesignDiffStore;

  constructor() {
    this.viewport = new ViewportStore(this);
    this.document = new DocumentStore(this);
    this.designDiff = new DesignDiffStore(this);
  }
}

export const editorStore = new EditorStore();
