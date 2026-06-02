import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import * as dotenv from "dotenv";
import { runDeadlineCheck } from "./lib/jobs/deadline-check";

dotenv.config({ path: ".env.local" });

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer({ maxHeaderSize: 32768 }, async (req, res) => {
    const parsedUrl = parse(req.url!, true);
    await handle(req, res, parsedUrl);
  });

  httpServer.listen(port, hostname, () => {
    console.log(`▲ DobSpace ready on http://${hostname}:${port}`);
  });

  // Deadline notification job — runs every 30 minutes
  const THIRTY_MIN = 30 * 60 * 1000;
  runDeadlineCheck().catch(console.error);
  setInterval(() => runDeadlineCheck().catch(console.error), THIRTY_MIN);
});
