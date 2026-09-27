import "dotenv/config";
import { createApp } from "./app.js";
import { seed } from "./db/seed.js";
import { config } from "./config.js";

seed();

createApp().listen(config.port, () => {
  console.log(`CRM API listening on http://localhost:${config.port}`);
});
