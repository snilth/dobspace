import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    const parsedUrl = parse(req.url!, true);
    await handle(req, res, parsedUrl);
  });

  httpServer.listen(port, hostname, () => {
    console.log(`▲ DobSpace ready on http://${hostname}:${port}`);
  });
});
