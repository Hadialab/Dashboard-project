import fs from "node:fs";
import { Client } from "pg";

const dev = fs.readFileSync(".env", "utf8");
const url = dev.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m)[1].trim();
const admin = url.replace(/\/[^/?]+(\?|$)/, "/postgres$1");

const c = new Client({ connectionString: admin });
await c.connect();
await c.query("DROP DATABASE IF EXISTS crm_realtime_probe");
await c.query("CREATE DATABASE crm_realtime_probe");
await c.end();
console.log("recreated crm_realtime_probe");