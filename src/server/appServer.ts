import { createServer, type Server, type IncomingMessage } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { log } from "../core/logger.js";
import { appPage } from "./appPage.js";
import { payPage } from "./payPage.js";
import { agentPage } from "./agentPage.js";
import { swapPage } from "./swapPage.js";
import { faucetPage } from "./faucetPage.js";
import { transactionsPage } from "./transactionsPage.js";
import { signPage } from "./signPage.js";
import { mintPage } from "./mintPage.js";
import {
  apiBalance, apiTxs,
  apiListInvoices, apiGetInvoice, apiCreateInvoice, apiConfirmInvoice,
  apiAgentAction, apiAgentSpendLog,
  apiVerifySignature, apiVerifyTypedData,
  apiNftStats,
  apiFxRates,
} from "./api.js";

/** `body` is `undefined` for GET routes — same pattern as the sibling Crypto auto project. */
type Handler = (q: URLSearchParams, body: unknown) => Promise<unknown>;

const MAX_BODY_BYTES = 1_000_000;

async function readBody(req: IncomingMessage): Promise<unknown> {
  if (req.method !== "POST") return undefined;
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) throw new Error("Request body too large.");
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON body.");
  }
}

const ROUTES: Record<string, Handler> = {
  "/api/balance": apiBalance,
  "/api/txs": apiTxs,
  "/api/invoices": apiListInvoices,
  "/api/invoices/get": apiGetInvoice,
  "/api/invoices/create": apiCreateInvoice,
  "/api/invoices/confirm": apiConfirmInvoice,
  "/api/agent/action": apiAgentAction,
  "/api/agent/spend-log": apiAgentSpendLog,
  "/api/sign/verify": apiVerifySignature,
  "/api/sign/verify-typed": apiVerifyTypedData,
  "/api/nft/stats": apiNftStats,
  "/api/fx": apiFxRates,
};

const STATIC_DIR = join(process.cwd(), "src", "server", "static");
const MIME: Record<string, string> = {
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json",
};

/**
 * The control-panel web server. Serves the dashboard at `/`, the payer view
 * at `/pay/:id`, static assets (the Vite-built wallet-connect bundle) under
 * `/static/`, and JSON API routes under `/api/*`. Errors become `{ error }`
 * with a 400 so the UI can show them cleanly — same pattern as the sibling
 * Crypto auto project.
 */
export function startAppServer(port: number): Server {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (url.pathname === "/" || url.pathname === "/index.html") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(appPage());
      return;
    }

    if (url.pathname.startsWith("/pay/")) {
      const id = url.pathname.slice("/pay/".length);
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(payPage(id));
      return;
    }

    if (url.pathname === "/agent") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(agentPage());
      return;
    }

    if (url.pathname === "/swap") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(swapPage());
      return;
    }

    if (url.pathname === "/faucet") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(faucetPage());
      return;
    }

    if (url.pathname === "/transactions") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(transactionsPage());
      return;
    }

    if (url.pathname === "/sign") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(signPage());
      return;
    }

    if (url.pathname === "/mint") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(mintPage());
      return;
    }

    if (url.pathname.startsWith("/static/")) {
      try {
        const filePath = join(STATIC_DIR, url.pathname.slice("/static/".length));
        const data = await readFile(filePath);
        const ext = extname(filePath);
        res.writeHead(200, { "content-type": MIME[ext] ?? "application/octet-stream" });
        res.end(data);
      } catch {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("not found");
      }
      return;
    }

    const handler = ROUTES[url.pathname];
    if (handler) {
      try {
        const body = await readBody(req);
        const data = await handler(url.searchParams, body);
        res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
        res.end(JSON.stringify(data));
      } catch (e) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: (e as Error).message }));
      }
      return;
    }

    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  });
  server.listen(port, () => log.info(`arc-pay running: http://localhost:${port}`));
  return server;
}
