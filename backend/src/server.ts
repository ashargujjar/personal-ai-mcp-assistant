import "dotenv/config";
import { createApp } from "./app";
import { connectDB } from "./db/connect";
import {
  captureBackendError,
  installProcessErrorLogAnalyzer,
  shutdownErrorLogAnalyzer,
} from "./services/error-log-analyzer.service";

const PORT = Number(process.env.PORT ?? 4000);

installProcessErrorLogAnalyzer("backend-server");

async function main() {
  await connectDB();

  const app = createApp();

  app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("[server] failed to start", err);
  void captureBackendError(err, { source: "backend-server:startup" }).finally(
    () => {
      process.exit(1);
    },
  );
});

async function shutdown() {
  await shutdownErrorLogAnalyzer();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
