import { designDiffRequestSchema } from "../../../src/contracts/design-diff.js";
import { createMockDesignDiff } from "./mock.js";
import {
  createOpenAiDesignDiffClient,
  DesignDiffRefusalError,
} from "./openai.js";

export type DesignDiffHandlerConfig = {
  forceMockProvider: boolean;
  openAiApiKey: string | undefined;
};

type DesignDiffHandlerResult = {
  status: number;
  payload: { error: string } | ReturnType<typeof createMockDesignDiff>;
};

export function createDesignDiffHandler(config: DesignDiffHandlerConfig) {
  const createOpenAiDesignDiff = config.openAiApiKey
    ? createOpenAiDesignDiffClient(config.openAiApiKey)
    : null;

  const handle = async (body: unknown): Promise<DesignDiffHandlerResult> => {
    const parsed = designDiffRequestSchema.safeParse(body);
    if (!parsed.success) {
      return {
        status: 400,
        payload: { error: "The design change request is invalid." },
      };
    }

    const { instruction, provider, target } = parsed.data;
    if (config.forceMockProvider || provider === "mock") {
      const result = createMockDesignDiff(instruction, target.properties);
      if (result.changes.length === 0) {
        return {
          status: 422,
          payload: {
            error: "No supported changes were found in that instruction.",
          },
        };
      }
      return { status: 200, payload: result };
    }

    if (!createOpenAiDesignDiff) {
      return {
        status: 503,
        payload: { error: "The OpenAI provider is not configured." },
      };
    }

    try {
      const result = await createOpenAiDesignDiff(instruction, target);
      if (result.changes.length === 0) {
        return {
          status: 422,
          payload: {
            error: "No supported changes were suggested for this object.",
          },
        };
      }
      return { status: 200, payload: result };
    } catch (error) {
      if (error instanceof DesignDiffRefusalError) {
        return {
          status: 422,
          payload: { error: "That design request could not be completed." },
        };
      }
      console.error("Design diff request failed:", error);
      return {
        status: 500,
        payload: {
          error: "The design changes could not be created. Please try again.",
        },
      };
    }
  };

  return {
    handle,
    isOpenAiReady: Boolean(createOpenAiDesignDiff),
  };
}
