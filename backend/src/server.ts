import "dotenv/config";
import { createApp } from "./app";
import { connectDB } from "./db/connect";

const PORT = Number(process.env.PORT ?? 4000);

async function main() {
  await connectDB();

  const app = createApp();

  app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("[server] failed to start", err);
  process.exit(1);
});
