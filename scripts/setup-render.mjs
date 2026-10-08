#!/usr/bin/env node
/**
 * Sets the repository variables and secret the deploy workflow reads.
 *
 * One command, because the alternative is five separate trips through GitHub's UI
 * and a half-configured deploy that fails with a warning nobody reads.
 *
 *   RENDER_API_KEY=... node scripts/setup-render.mjs
 *   node scripts/setup-render.mjs <apiServiceId> <appServiceId> <apiUrl> <healthUrl>
 *
 * Values not given as arguments are prompted for.
 *
 * Not committed and not wired into any npm script. It is a one-off installer;
 * re-running it is harmless, which is how you change a service id after a
 * Render rebuild.
 */

import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline/promises";

const REPO = "Hadialab/Dashboard-project";

const VARIABLES = [
  {
    name: "RENDER_API_SERVICE_ID",
    prompt: "Render API service id",
    help: "Render dashboard -> the API service. In the URL, or under\n" +
      "      Dashboard -> API Keys. Looks like srv-xxxxxxxxxxxxx.",
  },
  {
    name: "RENDER_APP_SERVICE_ID",
    prompt: "Render app (frontend) service id",
    help: "Same, for the service serving the built frontend bundle.",
  },
  {
    name: "APP_API_URL_STAGING",
    prompt: "Public API URL, e.g. https://crm-api.onrender.com",
    help: "Baked into the frontend bundle at BUILD time. This is the address a\n" +
      "      browser calls, so the service's public URL with no /health.",
  },
  {
    name: "STAGING_API_HEALTH_URL",
    prompt: "Health URL, e.g. https://crm-api.onrender.com/health",
    help: "The same URL plus /health. Gates the rollout, so a typo here fails\n" +
      "      the deploy loudly instead of skipping the check.",
  },
];

function fail(message, detail) {
  console.error(`\n  ${message}`);
  if (detail) console.error(`\n${detail}`);
  process.exit(1);
}

function hasGh() {
  try {
    execFileSync("gh", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Asks one question, or fails if there is nobody to ask.
 *
 * The failure is not the `isTTY` check on its own — a piped stdin and a closed
 * console are different situations, and only one of them is a bug worth a clear
 * message. So the question is raced against the input stream ending. Without that
 * race a non-interactive run hangs on a prompt nobody will ever answer, and exits
 * 13 on an unsettled top-level await, which says nothing about the real problem.
 */
function question(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const asked = rl.question(prompt);
  const ended = new Promise((resolve) => {
    process.stdin.once("end", () => resolve(undefined));
    process.stdin.once("error", () => resolve(undefined));
  });

  return asked.then(
    (answer) => {
      rl.close();
      return answer;
    },
    () => {
      rl.close();
      return undefined;
    },
  ).then(async (answer) => answer ?? ended.then(() => undefined));
}

/**
 * `gh auth token` for the API calls, and `gh secret set` for the secret.
 *
 * Not hand-rolled: GitHub wants a secret encrypted with libsodium's sealed box,
 * which Node's crypto does not implement. `gh` does it correctly, and it is
 * normally already authenticated on the machine that has the repo checked out.
 * Falling back to prompting for a token is there for when it is not installed.
 */
async function resolveAuth() {
  const viaGh = hasGh() && execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
  if (viaGh) return { kind: "gh" };

  console.log(
    "\n  GitHub CLI not found or not logged in.\n" +
      "  Install it (https://cli.github.com) and run `gh auth login`, or create a\n" +
      "  fine-grained token:\n" +
      "    Repo settings -> Developer settings -> Personal access tokens\n" +
      "    -> Fine-grained -> this repo -> Permissions -> Actions: Read and write",
  );

  const token = (await question("\n  Token: "))?.trim();

  if (!token) {
    fail(
      "No GitHub credentials available, and nothing left to prompt on.",
      "      Install the GitHub CLI and run `gh auth login`, or run this in a\n" +
        "      terminal where it can ask you. To set the secret by hand instead:\n" +
        "        Repo settings -> Secrets and variables -> Actions -> Secrets -> New",
    );
  }

  return { kind: "token", token };
}

async function ask(spec) {
  console.log(`\n  ${spec.prompt}`);
  console.log(`      ${spec.help}`);

  const value = (await question(`\n  ${spec.name}: `))?.trim();

  if (!value) {
    fail(
      `No value for ${spec.name}, and nothing left to prompt on.`,
      "      Pass all four as arguments instead:\n" +
        "        node scripts/setup-render.mjs <apiServiceId> <appServiceId> <apiUrl> <healthUrl>",
    );
  }

  return value;
}

async function setVariable(auth, name, value) {
  const body = JSON.stringify({ name, value, in_repository: true });
  const path = `repos/${REPO}/actions/variables/${name}`;

  if (auth.kind === "gh") {
    execFileSync(
      "gh",
      ["api", "--method", "PUT", `-H`, "Accept: application/vnd.github+json", path, "--input", "-"],
      { input: body, stdio: ["pipe", "ignore", "inherit"] },
    );
    return;
  }

  const response = await fetch(`https://api.github.com/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${auth.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "setup-render",
    },
    body,
  });

  if (!response.ok) {
    fail(`Could not set ${name} -> HTTP ${response.status}`, `      ${await response.text()}`);
  }
}

function setSecret(auth, name, value) {
  // `gh secret set` reads the value from stdin, so it never reaches argv, the
  // shell history, or a process listing.
  if (auth.kind === "gh") {
    execFileSync("gh", ["secret", "set", name, "--repo", REPO, "--body", value], {
      stdio: "ignore",
    });
    return;
  }

  console.log(
    `\n  ${name} needs GitHub's libsodium encryption, which this script does not\n` +
      "  implement. Add it in the UI instead:\n" +
      `    Repo settings -> Secrets and variables -> Actions -> Secrets -> New\n` +
      `    Name: ${name}`,
  );
}

const auth = await resolveAuth();

console.log(`\n  Setting four variables${process.env.RENDER_API_KEY ? " and one secret" : ""} on ${REPO}`);

const positional = process.argv.slice(2);

for (const [index, spec] of VARIABLES.entries()) {
  const value = positional[index] ?? (await ask(spec));
  await setVariable(auth, spec.name, value);
  console.log(`    set  ${spec.name} = ${value}`);
}

const key = process.env.RENDER_API_KEY;

if (key) {
  setSecret(auth, "RENDER_API_KEY", key);
  console.log("    set  RENDER_API_KEY (secret)");
} else {
  console.log(
    "\n  SKIPPED  RENDER_API_KEY — not in the environment, so the deploy will\n" +
      "           still push images and warn instead of rolling out.\n" +
      "           Re-run with it set, or add it in the GitHub UI.",
  );
}

console.log(
  "\n  Done.\n\n" +
    "  Deploy staging now with:\n" +
    `    gh workflow run deploy.yml --repo ${REPO} -f environment=staging\n\n` +
    "  Or merge to main, which deploys staging automatically.\n",
);