import "dotenv/config";
import { createApp } from "./app.js";
import { seed } from "./db/seed.js";

const port = Number(process.env.PORT) || 5000;

seed();

createApp().listen(port, () => {
  console.log(`CRM API listening on http://localhost:${port}`);
});
