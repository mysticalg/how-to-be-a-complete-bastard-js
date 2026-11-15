import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4173);
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".md": "text/plain",
};
http
  .createServer((req, res) => {
    let relative = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (relative === "/") relative = "/index.html";
    let target = path.resolve(root, "." + relative);
    if (!target.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs.readFile(target, (err, body) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, {
        "Content-Type":
          types[path.extname(target)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(body);
    });
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`Local game: http://127.0.0.1:${port}`),
  );
