import cors from "cors";
import express, { type Application } from "express";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*", credentials: true }));
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/api", routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
