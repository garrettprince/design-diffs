import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import vercelDesignDiffHandler from "../../../api/design-diffs";
import { createDesignDiffHandler } from "./handler";

const target = {
  kind: "shape" as const,
  id: "shape-1",
  type: "rectangle" as const,
  name: "Rectangle 1",
  properties: {
    fill: "#5D8FF2",
    radius: 0,
  },
  availableProperties: ["fill", "radius"] as const,
};

const createResponseRecorder = () => {
  let statusCode = 200;
  let payload: unknown;
  const headers = new Map<string, string>();
  const response = {
    setHeader(name: string, value: string) {
      headers.set(name, value);
      return response;
    },
    status(status: number) {
      statusCode = status;
      return response;
    },
    json(body: unknown) {
      payload = body;
      return response;
    },
  } as unknown as Response;

  return {
    response,
    get statusCode() {
      return statusCode;
    },
    get payload() {
      return payload;
    },
    headers,
  };
};

test("rejects an invalid design-diff request", async () => {
  const designDiff = createDesignDiffHandler({
    forceMockProvider: false,
    openAiApiKey: undefined,
  });

  const result = await designDiff.handle({});

  assert.equal(result.status, 400);
  assert.deepEqual(result.payload, {
    error: "The design change request is invalid.",
  });
});

test("returns a configuration error when OpenAI is unavailable", async () => {
  const designDiff = createDesignDiffHandler({
    forceMockProvider: false,
    openAiApiKey: undefined,
  });

  const result = await designDiff.handle({
    instruction: "Make it green",
    provider: "openai",
    target,
  });

  assert.equal(result.status, 503);
  assert.deepEqual(result.payload, {
    error: "The OpenAI provider is not configured.",
  });
});

test("uses the shared handler for deterministic mock requests", async () => {
  const designDiff = createDesignDiffHandler({
    forceMockProvider: false,
    openAiApiKey: undefined,
  });

  const result = await designDiff.handle({
    instruction: "Make it green",
    provider: "mock",
    target,
  });

  assert.equal(result.status, 200);
  assert.deepEqual(result.payload, {
    changes: [
      {
        property: "fill",
        numericValue: null,
        stringValue: "#34C759",
      },
    ],
  });
});

test("serves mock requests through the Vercel function adapter", async () => {
  const recorder = createResponseRecorder();

  await vercelDesignDiffHandler(
    {
      method: "POST",
      body: {
        instruction: "Make it green",
        provider: "mock",
        target,
      },
    } as Request,
    recorder.response,
  );

  assert.equal(recorder.statusCode, 200);
  assert.deepEqual(recorder.payload, {
    changes: [
      {
        property: "fill",
        numericValue: null,
        stringValue: "#34C759",
      },
    ],
  });
});

test("limits the Vercel function adapter to POST requests", async () => {
  const recorder = createResponseRecorder();

  await vercelDesignDiffHandler(
    { method: "GET" } as Request,
    recorder.response,
  );

  assert.equal(recorder.statusCode, 405);
  assert.equal(recorder.headers.get("Allow"), "POST");
  assert.deepEqual(recorder.payload, { error: "Method not allowed." });
});
