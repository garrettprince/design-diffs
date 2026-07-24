export type ShapeType = "rectangle" | "ellipse" | "text";
export type EditorTool =
  | "select"
  | "hand"
  | "frame"
  | "pen"
  | "image-gen"
  | "svg-gen"
  | "shaders"
  | ShapeType;
export type TextAlignment = "left" | "center" | "right";
export type FontWeight = 400 | 500 | 600 | 700;
export type FillType = "solid" | "gradient";
export type BorderSides = "all";

export type EditorTransform = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

export type EditorVisualProperties = EditorTransform & {
  fill: string;
  fillType: FillType;
  fillGradientStart: string;
  fillGradientEnd: string;
  fillGradientAngle: number;
  fillOpacity: number;
  fillVisible: boolean;
  fillPresent: boolean;
  outlineVisible: boolean;
  outlinePresent: boolean;
  outlineWidth: number;
  outlineOffset: number;
  outlineColor: string;
  outlineOpacity: number;
  borderVisible: boolean;
  borderPresent: boolean;
  borderWidth: number;
  borderSides: BorderSides;
  borderColor: string;
  borderOpacity: number;
  shadowVisible: boolean;
  shadowPresent: boolean;
  shadowX: number;
  shadowY: number;
  shadowBlur: number;
  shadowSpread: number;
  shadowColor: string;
  shadowOpacity: number;
  innerShadowVisible: boolean;
  innerShadowPresent: boolean;
  innerShadowX: number;
  innerShadowY: number;
  innerShadowBlur: number;
  innerShadowSpread: number;
  innerShadowColor: string;
  innerShadowOpacity: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
};

export type EditorShape = EditorVisualProperties & {
  id: string;
  type: ShapeType;
  name: string;
  groupId: string | null;
  radius: number;
  smoothing: number;
  independentCorners: boolean;
  radiusTopLeft: number;
  radiusTopRight: number;
  radiusBottomRight: number;
  radiusBottomLeft: number;
  text: string;
  fontSize: number;
  fontWeight: FontWeight;
  textAlign: TextAlignment;
};

export type EditorGroup = EditorVisualProperties & {
  id: string;
  name: string;
  shapeIds: string[];
};

export type ShapeDraft = Pick<
  EditorShape,
  "type" | "x" | "y" | "width" | "height"
>;
export type ShapePatch = Partial<Omit<EditorShape, "id" | "type" | "groupId">>;
export type GroupPatch = Partial<Omit<EditorGroup, "id" | "shapeIds">>;
export type FillPatch = Partial<
  Pick<
    EditorShape,
    | "fill"
    | "fillType"
    | "fillGradientStart"
    | "fillGradientEnd"
    | "fillGradientAngle"
    | "fillOpacity"
    | "fillVisible"
    | "fillPresent"
  >
>;
export type OutlinePatch = Partial<
  Pick<
    EditorShape,
    | "outlineVisible"
    | "outlinePresent"
    | "outlineWidth"
    | "outlineOffset"
    | "outlineColor"
    | "outlineOpacity"
  >
>;
export type BorderPatch = Partial<
  Pick<
    EditorShape,
    | "borderVisible"
    | "borderPresent"
    | "borderWidth"
    | "borderSides"
    | "borderColor"
    | "borderOpacity"
  >
>;
export type ShadowPatch = Partial<
  Pick<
    EditorShape,
    | "shadowVisible"
    | "shadowPresent"
    | "shadowX"
    | "shadowY"
    | "shadowBlur"
    | "shadowSpread"
    | "shadowColor"
    | "shadowOpacity"
  >
>;
export type InnerShadowPatch = Partial<
  Pick<
    EditorShape,
    | "innerShadowVisible"
    | "innerShadowPresent"
    | "innerShadowX"
    | "innerShadowY"
    | "innerShadowBlur"
    | "innerShadowSpread"
    | "innerShadowColor"
    | "innerShadowOpacity"
  >
>;
export type LayoutPatch = Partial<
  Pick<EditorShape, "x" | "y" | "width" | "height" | "rotation">
>;

export type CanvasItem =
  | { kind: "shape"; shape: EditorShape }
  | { kind: "group"; group: EditorGroup; shapes: EditorShape[] };

export type LayerReference =
  | { kind: "shape"; id: string; groupId: string | null }
  | { kind: "group"; id: string; groupId: null };

export type LayerPlacement = "above" | "below";
