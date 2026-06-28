import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(process.cwd(), "dist");
const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".ico", "image/x-icon"],
  [".pbix", "application/octet-stream"],
]);

const server = createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url ?? "/", "http://127.0.0.1");
    const pathname = decodeURIComponent(reqUrl.pathname);
    let target = path.join(root, pathname === "/" ? "index.html" : pathname.replace(/^\/+/, ""));

    try {
      const details = await stat(target);
      if (details.isDirectory()) {
        target = path.join(target, "index.html");
      }
    } catch {
      target = path.join(root, "index.html");
    }

    const ext = path.extname(target).toLowerCase();
    const data = await readFile(target);
    res.writeHead(200, { "Content-Type": mimeTypes.get(ext) ?? "application/octet-stream" });
    res.end(data);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(String(error));
  }
});

server.listen(5175, "127.0.0.1", () => {
  console.log("preview server ready on http://127.0.0.1:5175");
});
