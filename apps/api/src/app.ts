import cors from "cors";
import express, { type Express } from "express";
import { roomsRouter } from "./modules/rooms/rooms.controller.js";

export function buildApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/rooms", roomsRouter);
  return app;
}
