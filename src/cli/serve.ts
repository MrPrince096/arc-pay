/**
 * Boots the PraneethArc web server.
 *
 *   pnpm dev     (rebuilds the wallet-connect client bundle first, then serves)
 */
import "../core/loadEnv.js";
import { startAppServer } from "../server/appServer.js";

const port = Number(process.env.PORT) || 8787;
startAppServer(port);
