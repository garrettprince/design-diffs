import { Router } from "express";
import {
  createDesignDiffHandler,
  type DesignDiffHandlerConfig,
} from "./handler.js";

export function createDesignDiffRoute(config: DesignDiffHandlerConfig) {
  const route = Router();
  const designDiff = createDesignDiffHandler(config);

  route.post("/", async (request, response) => {
    const result = await designDiff.handle(request.body);
    response.status(result.status).json(result.payload);
  });

  return {
    route,
    isOpenAiReady: designDiff.isOpenAiReady,
  };
}
