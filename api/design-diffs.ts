import type { Request, Response } from "express";
import { createDesignDiffHandler } from "../server/design-diff/api/handler";

const designDiff = createDesignDiffHandler({
  forceMockProvider: process.env.DESIGN_DIFF_MOCK === "true",
  openAiApiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(request: Request, response: Response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  const result = await designDiff.handle(request.body);
  response.status(result.status).json(result.payload);
}
