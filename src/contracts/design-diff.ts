import { z } from "zod";

export const designDiffProperties = [
  "radius",
  "smoothing",
  "opacity",
  "fill",
  "fillOpacity",
  "shadow",
  "outline",
  "border",
  "innerShadow",
  "layout",
  "width",
  "height",
  "rotation",
  "text",
  "fontSize",
  "fontWeight",
  "textAlign",
] as const;

export const designDiffPropertySchema = z.enum(designDiffProperties);
export type DesignDiffProperty = z.infer<typeof designDiffPropertySchema>;

export const designDiffProviderSchema = z.enum(["mock", "openai"]);
export type DesignDiffProvider = z.infer<typeof designDiffProviderSchema>;

export const designDiffShapeTypeSchema = z.enum([
  "rectangle",
  "ellipse",
  "text",
]);
export type DesignDiffShapeType = z.infer<typeof designDiffShapeTypeSchema>;

export const modelDesignDiffSchema = z.object({
  changes: z
    .array(
      z.object({
        property: designDiffPropertySchema,
        numericValue: z.number().nullable(),
        stringValue: z.string().nullable(),
      }),
    )
    .min(1)
    .max(5),
});

export type ModelDesignDiff = z.infer<typeof modelDesignDiffSchema>;
export type DesignDiffValue = number | string;
export type DesignDiffChange = {
  property: DesignDiffProperty;
  value: DesignDiffValue;
};

export type DesignDiffRequestTarget = {
  kind: "shape" | "group";
  id: string;
  type?: DesignDiffShapeType;
  name: string;
  properties: Record<string, string | number>;
  availableProperties: DesignDiffProperty[];
};

export const designDiffRequestSchema = z.object({
  instruction: z.string().trim().min(1).max(1000),
  provider: designDiffProviderSchema.default("openai"),
  target: z.object({
    kind: z.enum(["shape", "group"]),
    id: z.string().min(1),
    type: designDiffShapeTypeSchema.optional(),
    name: z.string().min(1),
    properties: z.record(z.string(), z.union([z.string(), z.number()])),
    availableProperties: z.array(designDiffPropertySchema).min(1),
  }),
});

export type ShadowDesignDiffState = {
  shadowPresent: boolean;
  shadowVisible: boolean;
  shadowX: number;
  shadowY: number;
  shadowBlur: number;
  shadowSpread: number;
  shadowColor: string;
  shadowOpacity: number;
};

export type OutlineDesignDiffState = {
  outlinePresent: boolean;
  outlineVisible: boolean;
  outlineWidth: number;
  outlineOffset: number;
  outlineColor: string;
  outlineOpacity: number;
};

export type BorderDesignDiffState = {
  borderPresent: boolean;
  borderVisible: boolean;
  borderWidth: number;
  borderSides: "all";
  borderColor: string;
  borderOpacity: number;
};

export type InnerShadowDesignDiffState = {
  innerShadowPresent: boolean;
  innerShadowVisible: boolean;
  innerShadowX: number;
  innerShadowY: number;
  innerShadowBlur: number;
  innerShadowSpread: number;
  innerShadowColor: string;
  innerShadowOpacity: number;
};

export type LayoutDesignDiffState = {
  width: number;
  height: number;
};

const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/i;
const MAX_EFFECT_DISTANCE = 2_048;
const MAX_EFFECT_SIZE = 1_024;

export const MAX_DESIGN_DIFF_DIMENSION = 10_000;
export const MAX_DESIGN_DIFF_FONT_SIZE = 512;

export const clampDesignDiffValue = (
  value: number,
  minimum: number,
  maximum: number,
) => Math.min(maximum, Math.max(minimum, value));

export const isFiniteDesignDiffNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const isDesignDiffHexColor = (value: unknown): value is string =>
  typeof value === "string" && HEX_COLOR_PATTERN.test(value);

const parseSerializedState = (
  value: DesignDiffValue,
): Record<string, unknown> | null => {
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

export const serializeShadowDesignDiffState = (
  state: ShadowDesignDiffState,
) => JSON.stringify(state);

export const serializeOutlineDesignDiffState = (
  state: OutlineDesignDiffState,
) => JSON.stringify(state);

export const serializeBorderDesignDiffState = (
  state: BorderDesignDiffState,
) => JSON.stringify(state);

export const serializeInnerShadowDesignDiffState = (
  state: InnerShadowDesignDiffState,
) => JSON.stringify(state);

export const serializeLayoutDesignDiffState = (
  state: LayoutDesignDiffState,
) => JSON.stringify(state);

export function parseShadowDesignDiffState(
  value: DesignDiffValue,
): ShadowDesignDiffState | null {
  const state = parseSerializedState(value);
  if (
    !state ||
    typeof state.shadowPresent !== "boolean" ||
    typeof state.shadowVisible !== "boolean" ||
    !isDesignDiffHexColor(state.shadowColor)
  )
    return null;
  if (state.shadowVisible && !state.shadowPresent) return null;
  if (
    ![
      state.shadowX,
      state.shadowY,
      state.shadowBlur,
      state.shadowSpread,
      state.shadowOpacity,
    ].every(isFiniteDesignDiffNumber)
  )
    return null;
  return {
    shadowPresent: state.shadowPresent,
    shadowVisible: state.shadowVisible,
    shadowX: clampDesignDiffValue(
      state.shadowX as number,
      -MAX_EFFECT_DISTANCE,
      MAX_EFFECT_DISTANCE,
    ),
    shadowY: clampDesignDiffValue(
      state.shadowY as number,
      -MAX_EFFECT_DISTANCE,
      MAX_EFFECT_DISTANCE,
    ),
    shadowBlur: clampDesignDiffValue(
      state.shadowBlur as number,
      0,
      MAX_EFFECT_SIZE,
    ),
    shadowSpread: clampDesignDiffValue(
      state.shadowSpread as number,
      -MAX_EFFECT_SIZE,
      MAX_EFFECT_SIZE,
    ),
    shadowColor: (state.shadowColor as string).toUpperCase(),
    shadowOpacity: clampDesignDiffValue(
      state.shadowOpacity as number,
      0,
      1,
    ),
  };
}

export function parseOutlineDesignDiffState(
  value: DesignDiffValue,
): OutlineDesignDiffState | null {
  const state = parseSerializedState(value);
  if (
    !state ||
    typeof state.outlinePresent !== "boolean" ||
    typeof state.outlineVisible !== "boolean" ||
    !isDesignDiffHexColor(state.outlineColor)
  )
    return null;
  if (state.outlineVisible && !state.outlinePresent) return null;
  if (
    ![state.outlineWidth, state.outlineOffset, state.outlineOpacity].every(
      isFiniteDesignDiffNumber,
    )
  )
    return null;
  return {
    outlinePresent: state.outlinePresent,
    outlineVisible: state.outlineVisible,
    outlineWidth: clampDesignDiffValue(
      state.outlineWidth as number,
      0,
      MAX_EFFECT_SIZE,
    ),
    outlineOffset: clampDesignDiffValue(
      state.outlineOffset as number,
      -MAX_EFFECT_SIZE,
      MAX_EFFECT_SIZE,
    ),
    outlineColor: (state.outlineColor as string).toUpperCase(),
    outlineOpacity: clampDesignDiffValue(
      state.outlineOpacity as number,
      0,
      1,
    ),
  };
}

export function parseBorderDesignDiffState(
  value: DesignDiffValue,
): BorderDesignDiffState | null {
  const state = parseSerializedState(value);
  if (
    !state ||
    typeof state.borderPresent !== "boolean" ||
    typeof state.borderVisible !== "boolean" ||
    state.borderSides !== "all" ||
    !isDesignDiffHexColor(state.borderColor)
  )
    return null;
  if (state.borderVisible && !state.borderPresent) return null;
  if (
    ![state.borderWidth, state.borderOpacity].every(isFiniteDesignDiffNumber)
  )
    return null;
  return {
    borderPresent: state.borderPresent,
    borderVisible: state.borderVisible,
    borderWidth: clampDesignDiffValue(
      state.borderWidth as number,
      0,
      MAX_EFFECT_SIZE,
    ),
    borderSides: "all",
    borderColor: (state.borderColor as string).toUpperCase(),
    borderOpacity: clampDesignDiffValue(
      state.borderOpacity as number,
      0,
      1,
    ),
  };
}

export function parseInnerShadowDesignDiffState(
  value: DesignDiffValue,
): InnerShadowDesignDiffState | null {
  const state = parseSerializedState(value);
  if (
    !state ||
    typeof state.innerShadowPresent !== "boolean" ||
    typeof state.innerShadowVisible !== "boolean" ||
    !isDesignDiffHexColor(state.innerShadowColor)
  )
    return null;
  if (state.innerShadowVisible && !state.innerShadowPresent) return null;
  if (
    ![
      state.innerShadowX,
      state.innerShadowY,
      state.innerShadowBlur,
      state.innerShadowSpread,
      state.innerShadowOpacity,
    ].every(isFiniteDesignDiffNumber)
  )
    return null;
  return {
    innerShadowPresent: state.innerShadowPresent,
    innerShadowVisible: state.innerShadowVisible,
    innerShadowX: clampDesignDiffValue(
      state.innerShadowX as number,
      -MAX_EFFECT_DISTANCE,
      MAX_EFFECT_DISTANCE,
    ),
    innerShadowY: clampDesignDiffValue(
      state.innerShadowY as number,
      -MAX_EFFECT_DISTANCE,
      MAX_EFFECT_DISTANCE,
    ),
    innerShadowBlur: clampDesignDiffValue(
      state.innerShadowBlur as number,
      0,
      MAX_EFFECT_SIZE,
    ),
    innerShadowSpread: clampDesignDiffValue(
      state.innerShadowSpread as number,
      -MAX_EFFECT_SIZE,
      MAX_EFFECT_SIZE,
    ),
    innerShadowColor: (state.innerShadowColor as string).toUpperCase(),
    innerShadowOpacity: clampDesignDiffValue(
      state.innerShadowOpacity as number,
      0,
      1,
    ),
  };
}

export function parseLayoutDesignDiffState(
  value: DesignDiffValue,
): LayoutDesignDiffState | null {
  const state = parseSerializedState(value);
  if (
    !state ||
    ![state.width, state.height].every(isFiniteDesignDiffNumber)
  )
    return null;
  return {
    width: clampDesignDiffValue(
      state.width as number,
      1,
      MAX_DESIGN_DIFF_DIMENSION,
    ),
    height: clampDesignDiffValue(
      state.height as number,
      1,
      MAX_DESIGN_DIFF_DIMENSION,
    ),
  };
}

const numericProperties = new Set<DesignDiffProperty>([
  "radius",
  "smoothing",
  "opacity",
  "fillOpacity",
  "width",
  "height",
  "rotation",
  "fontSize",
  "fontWeight",
]);

export function normalizeModelChanges(
  result: ModelDesignDiff,
  availableProperties: DesignDiffProperty[],
) {
  const available = new Set(availableProperties);
  const used = new Set<DesignDiffProperty>();
  return result.changes.flatMap((change) => {
    if (!available.has(change.property) || used.has(change.property)) return [];
    const numericProperty = numericProperties.has(change.property);
    if (
      numericProperty
        ? change.stringValue !== null
        : change.numericValue !== null
    )
      return [];
    const value = numericProperty ? change.numericValue : change.stringValue;
    if (value === null) return [];
    used.add(change.property);
    return [{ property: change.property, value }];
  });
}
