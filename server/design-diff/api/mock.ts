import {
  parseLayoutDesignDiffState,
  parseShadowDesignDiffState,
  serializeBorderDesignDiffState,
  serializeLayoutDesignDiffState,
  serializeShadowDesignDiffState,
  type ModelDesignDiff,
} from "../../../src/contracts/design-diff.js";

type DesignDiffProperties = Record<string, string | number>;
type ModelChange = ModelDesignDiff["changes"][number];

const numericChange = (
  property: ModelChange["property"],
  numericValue: number,
): ModelChange => ({
  property,
  numericValue,
  stringValue: null,
});

const stringChange = (
  property: ModelChange["property"],
  stringValue: string,
): ModelChange => ({
  property,
  numericValue: null,
  stringValue,
});

export function createMockDesignDiff(
  instruction: string,
  properties: DesignDiffProperties,
): ModelDesignDiff {
  const lower = instruction.toLowerCase();
  const changes: ModelChange[] = [];

  if (lower.includes("button")) {
    if (lower.includes("green") && typeof properties.fill === "string")
      changes.push(stringChange("fill", "#34C759"));
    else if (lower.includes("red") && typeof properties.fill === "string")
      changes.push(stringChange("fill", "#FF4438"));

    if (typeof properties.layout === "string") {
      const currentLayout = parseLayoutDesignDiffState(properties.layout);
      if (currentLayout) {
        changes.push(
          stringChange(
            "layout",
            serializeLayoutDesignDiffState({
              width: Math.min(240, Math.max(96, currentLayout.width)),
              height: 40,
            }),
          ),
        );
      }
    }
    if (typeof properties.radius === "number")
      changes.push(numericChange("radius", 10));
    if (typeof properties.smoothing === "number")
      changes.push(numericChange("smoothing", 0.6));
    if (
      typeof properties.border === "string" &&
      typeof properties.fill === "string" &&
      /^#[0-9A-F]{6}$/i.test(properties.fill)
    ) {
      changes.push(
        stringChange(
          "border",
          serializeBorderDesignDiffState({
            borderPresent: true,
            borderVisible: true,
            borderWidth: 1,
            borderSides: "all",
            borderColor: properties.fill.toUpperCase(),
            borderOpacity: 0.1,
          }),
        ),
      );
    }
    if (typeof properties.shadow === "string") {
      changes.push(
        stringChange(
          "shadow",
          serializeShadowDesignDiffState({
            shadowPresent: true,
            shadowVisible: true,
            shadowX: 0,
            shadowY: 2,
            shadowBlur: 6,
            shadowSpread: 0,
            shadowColor: "#000000",
            shadowOpacity: 0.18,
          }),
        ),
      );
    }
    return { changes: changes.slice(0, 5) };
  }

  if (lower.includes("round") && typeof properties.radius === "number")
    changes.push(numericChange("radius", Math.max(10, properties.radius + 10)));
  if (
    (lower.includes("smooth") || lower.includes("squircle")) &&
    typeof properties.smoothing === "number"
  )
    changes.push(
      numericChange(
        "smoothing",
        lower.includes("maximum") || lower.includes("100%") ? 1 : 0.6,
      ),
    );
  if (
    (lower.includes("transparent") || lower.includes("opacity")) &&
    typeof properties.opacity === "number"
  )
    changes.push(
      numericChange(
        "opacity",
        lower.includes("little")
          ? Math.max(0.1, properties.opacity - 0.2)
          : 0.5,
      ),
    );
  if (lower.includes("red") && typeof properties.fill === "string")
    changes.push(stringChange("fill", "#FF4438"));
  if (lower.includes("green") && typeof properties.fill === "string")
    changes.push(stringChange("fill", "#34C759"));

  if (
    (lower.includes("depth") || lower.includes("shadow")) &&
    typeof properties.shadow === "string"
  ) {
    const currentShadow = parseShadowDesignDiffState(properties.shadow);
    changes.push(
      stringChange(
        "shadow",
        serializeShadowDesignDiffState(
          currentShadow
            ? {
                ...currentShadow,
                shadowPresent: true,
                shadowVisible: true,
                shadowY: Math.max(8, currentShadow.shadowY),
                shadowBlur: Math.max(18, currentShadow.shadowBlur),
                shadowOpacity: Math.max(0.18, currentShadow.shadowOpacity),
              }
            : {
                shadowPresent: true,
                shadowVisible: true,
                shadowX: 0,
                shadowY: 8,
                shadowBlur: 18,
                shadowSpread: 0,
                shadowColor: "#000000",
                shadowOpacity: 0.18,
              },
        ),
      ),
    );
  }

  return { changes };
}
