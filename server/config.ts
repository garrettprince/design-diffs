import { loadEnv } from "vite";

const isProduction = process.env.NODE_ENV === "production";
const environment = loadEnv(
  isProduction ? "production" : "development",
  process.cwd(),
  "",
);

const getEnvironmentValue = (name: string) =>
  process.env[name] ?? environment[name];
const port = Number(getEnvironmentValue("PORT") ?? 5173);

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

export const serverConfig = {
  isProduction,
  port,
  host: getEnvironmentValue("HOST") ?? (isProduction ? "0.0.0.0" : "127.0.0.1"),
  openAiApiKey: getEnvironmentValue("OPENAI_API_KEY"),
  forceMockProvider: getEnvironmentValue("DESIGN_DIFF_MOCK") === "true",
};
