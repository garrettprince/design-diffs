import { Router } from "express";
import { designDiffRequestSchema } from "../../../src/contracts/design-diff";
import { createMockDesignDiff } from "./mock";
import {
  createOpenAiDesignDiffClient,
  DesignDiffRefusalError,
} from "./openai";

type DesignDiffRouteConfig = {
  forceMockProvider: boolean;
  openAiApiKey: string | undefined;
};

export function createDesignDiffRoute(config: DesignDiffRouteConfig) {
  const route = Router();
  const createOpenAiDesignDiff = config.openAiApiKey
    ? createOpenAiDesignDiffClient(config.openAiApiKey)
    : null;

  route.post("/", async (request, response) => {
    const parsed = designDiffRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response
        .status(400)
        .json({ error: "The design change request is invalid." });
      return;
    }

    const { instruction, provider, target } = parsed.data;
    if (config.forceMockProvider || provider === "mock") {
      const result = createMockDesignDiff(instruction, target.properties);
      if (result.changes.length === 0) {
        response.status(422).json({
          error: "No supported changes were found in that instruction.",
        });
        return;
      }
      response.json(result);
      return;
    }

    if (!createOpenAiDesignDiff) {
      response.status(503).json({
        error: "Add OPENAI_API_KEY to .env.local, then restart the app.",
      });
      return;
    }

    try {
      const result = await createOpenAiDesignDiff(instruction, target);
      if (result.changes.length === 0) {
        response.status(422).json({
          error: "No supported changes were suggested for this object.",
        });
        return;
      }
      response.json(result);
    } catch (error) {
      if (error instanceof DesignDiffRefusalError) {
        response
          .status(422)
          .json({ error: "That design request could not be completed." });
        return;
      }
      console.error("Design diff request failed:", error);
      response.status(500).json({
        error: "The design changes could not be created. Please try again.",
      });
    }
  });

  return {
    route,
    isOpenAiReady: Boolean(createOpenAiDesignDiff),
  };
}
