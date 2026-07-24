import express from "express";
import { createServer as createViteServer } from "vite";
import { serverConfig } from "./config.js";
import { createDesignDiffRoute } from "./design-diff/api/route.js";
import { DESIGN_DIFF_MODEL } from "./design-diff/constants/prompt.js";

const app = express();
const designDiff = createDesignDiffRoute(serverConfig);

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
app.use("/api/design-diffs", designDiff.route);

if (serverConfig.isProduction) {
  app.use(express.static("dist"));
  app.use((_request, response) =>
    response.sendFile("index.html", { root: "dist" }),
  );
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

app.listen(serverConfig.port, serverConfig.host, () => {
  console.log(
    `Paper design diff running at http://localhost:${serverConfig.port}`,
  );
  console.log(
    `Design diff providers: Mock Data ready; ${DESIGN_DIFF_MODEL} ${designDiff.isOpenAiReady ? "ready" : "unavailable (missing OPENAI_API_KEY)"}`,
  );
});
