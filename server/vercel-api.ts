import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";

const app = express();
const httpServer = createServer(app);

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

await registerRoutes(httpServer, app);

app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  console.error("Internal Server Error:", err?.message || err);
  if (res.headersSent) return next(err);
  return res.status(status).json({ message: status >= 500 ? "Erro interno do servidor" : (err.message || "Erro") });
});

export default app;
