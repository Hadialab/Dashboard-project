// The human-readable API reference.
//
// Server-rendered and dependency-free on purpose. The obvious choice is to serve
// Swagger UI or Redoc from a CDN, and that has two costs this project should not
// pay: it breaks for anyone behind a proxy that blocks CDNs — which includes a
// lot of corporate networks, and this is a CRM sold to companies — and it makes
// the docs page a third-party script with the documentation's full trust. A
// developer cannot read the docs offline, and neither can a penetration test.

import { buildOpenApiDocument } from "./openapi.js";

/** Escapes text for interpolation into HTML. */
const escape = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

// Method colours. Reads as a traffic light, which is the convention every HTTP
// client uses and the one people already recognise.
const METHOD_TONE = {
  get: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  post: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  put: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  patch: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  delete: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

/**
 * Renders a description.
 *
 * Enough markdown to make the descriptions in the spec legible — headings, lists,
 * code spans, bold — and nothing more. A full renderer would be a dependency and an
 * XSS surface to do work these strings do not need.
 *
 * Split on blank lines first, so a paragraph stays a paragraph and a heading does
 * not swallow the text under it.
 */
function prose(text) {
  if (!text) return "";

  return String(text)
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n").filter(Boolean);
      const items = lines.filter((line) => /^[-*] /.test(line));
      const heading = /^(#{1,6}) (.*)$/.exec(lines[0]);

      if (heading) {
        const level = Math.min(heading[1].length + 2, 6);
        return `<h${level} class="mt-6 text-base font-semibold text-slate-900 dark:text-white">${escape(heading[2])}</h${level}>`;
      }

      if (items.length === lines.length) {
        return `<ul class="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">${items
          .map((line) => `<li>${inlineCode(line.slice(2))}</li>`)
          .join("")}</ul>`;
      }

      return `<p class="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">${inlineCode(block)}</p>`;
    })
    .join("");
}

/** `code` spans and **bold**, which is all the descriptions above use. */
function inlineCode(text) {
  return escape(text)
    .replace(/`([^`]+)`/g, '<code class="rounded bg-slate-100 px-1 py-0.5 text-[0.85em] text-slate-800 dark:bg-slate-800 dark:text-slate-200">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-slate-900 dark:text-white">$1</strong>');
}

function parameterTable(parameters) {
  if (!parameters?.length) return "";

  const rows = parameters
    .map(
      (parameter) => `
        <tr class="border-t border-slate-200 dark:border-slate-800">
          <td class="py-2 pr-4 align-top font-mono text-xs">${escape(parameter.name)}
            ${parameter.required ? '<span class="text-red-600 dark:text-red-400" title="required">*</span>' : ""}
          </td>
          <td class="py-2 pr-4 align-top text-xs text-slate-500 dark:text-slate-400">${escape(parameter.in)}</td>
          <td class="py-2 align-top text-xs text-slate-600 dark:text-slate-300">${inlineCode(parameter.description ?? "")}</td>
        </tr>`,
    )
    .join("");

  return `
    <table class="mt-4 w-full border-collapse text-left">
      <caption class="mb-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Parameters</caption>
      <tbody>${rows}</tbody>
    </table>`;
}

function responseList(responses) {
  const codes = Object.keys(responses ?? {});

  return `
    <table class="mt-4 w-full border-collapse text-left">
      <caption class="mb-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Responses</caption>
      <tbody>
        ${codes
          .map((code) => {
            const tone =
              code.startsWith("2")
                ? "text-green-700 dark:text-green-400"
                : code.startsWith("4") || code.startsWith("5")
                  ? "text-amber-700 dark:text-amber-400"
                  : "";

            return `<tr class="border-t border-slate-200 dark:border-slate-800">
              <td class="w-20 py-2 pr-4 align-top font-mono text-xs ${tone}">${escape(code)}</td>
              <td class="py-2 align-top text-xs text-slate-600 dark:text-slate-300">${inlineCode(responses[code].description ?? "")}</td>
            </tr>`;
          })
          .join("")}
      </tbody>
    </table>`;
}

/** Every path/method pair, in the order the spec declares them. */
function operations(document) {
  const out = [];

  for (const [path, item] of Object.entries(document.paths)) {
    for (const [method, operation] of Object.entries(item)) {
      if (method === "parameters") continue;
      out.push({ path, method, operation, sharedParameters: item.parameters ?? [] });
    }
  }

  return out;
}

export function renderDocsPage(document) {
  const grouped = new Map();

  for (const entry of operations(document)) {
    const tag = entry.operation.tags?.[0] ?? "Other";
    if (!grouped.has(tag)) grouped.set(tag, []);
    grouped.get(tag).push(entry);
  }

  const sections = [...grouped.entries()]
    .map(([tag, entries]) => {
      const cards = entries
        .map(({ path, method, operation, sharedParameters }) => {
          const parameters = [...sharedParameters, ...(operation.parameters ?? [])];
          const body = operation.requestBody?.content?.["application/json"]?.schema;
          const requiredFields = body?.required ?? [];

          return `
          <article class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
            <div class="flex flex-wrap items-center gap-3">
              <span class="rounded-md px-2 py-1 font-mono text-xs font-semibold uppercase ${METHOD_TONE[method] ?? ""}">${escape(method)}</span>
              <code class="font-mono text-sm font-semibold text-slate-900 dark:text-white">${escape(path)}</code>
              ${operation.security ? '<span class="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">requires auth</span>' : ""}
            </div>
            <h3 class="mt-3 text-base font-semibold text-slate-900 dark:text-white">${escape(operation.summary ?? "")}</h3>
            ${prose(operation.description)}
            ${parameterTable(parameters)}
            ${
              requiredFields.length
                ? `<p class="mt-4 text-xs text-slate-600 dark:text-slate-300">
                     Required body fields: ${requiredFields.map((f) => `<code class="rounded bg-slate-100 px-1 dark:bg-slate-800">${escape(f)}</code>`).join(" ")}
                   </p>`
                : ""
            }
            ${body?.properties
              ? `<details class="mt-3">
                   <summary class="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Body fields</summary>
                   <ul class="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                     ${Object.entries(body.properties)
                       .map(
                         ([field, schema]) =>
                           `<li><code class="rounded bg-slate-100 px-1 dark:bg-slate-800">${escape(field)}</code> ${escape(schema.type ?? "any")}${schema.enum ? ` — ${escape(schema.enum.join(" | "))}` : ""}</li>`,
                       )
                       .join("")}
                   </ul>
                 </details>`
              : ""}
            ${responseList(operation.responses)}
          </article>`;
        })
        .join("");

      return `
        <section id="${escape(tag.toLowerCase())}" class="scroll-mt-6">
          <h2 class="text-lg font-bold tracking-tight text-slate-900 dark:text-white">${escape(tag)}</h2>
          <div class="mt-3 space-y-4">${cards}</div>
        </section>`;
    })
    .join("");

  const nav = [...grouped.keys()]
    .map(
      (tag) =>
        `<li><a href="#${escape(tag.toLowerCase())}" class="text-slate-600 hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-400">${escape(tag)}</a></li>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en" class="h-full">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escape(document.info.title)}</title>
    <style>
      /* Tailwind's classes, spelled out. No build step for the docs page, and no
         network fetch for its styles — the reference has to work offline and
         behind a proxy that blocks CDNs. */
      :root { color-scheme: light dark; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
      @media (prefers-color-scheme: dark) { body { background: #020617; color: #e2e8f0; } }
    </style>
  </head>
  <body class="min-h-full bg-slate-100 dark:bg-slate-900">
    <div class="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <nav class="hidden w-52 shrink-0 lg:block" aria-label="Sections">
        <p class="sticky top-8 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Sections</p>
        <ul class="sticky top-14 mt-3 space-y-1.5 text-sm">${nav}</ul>
        <p class="sticky top-14 mt-6 text-xs text-slate-500 dark:text-slate-400">
          <a href="/openapi.json" class="underline">openapi.json</a>
        </p>
      </nav>

      <main class="min-w-0 flex-1 space-y-10">
        <header>
          <p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Reference</p>
          <h1 class="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">${escape(document.info.title)}</h1>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
            OpenAPI ${escape(document.openapi)} · served from <code class="rounded bg-slate-200 px-1 dark:bg-slate-800">/openapi.json</code>
          </p>
          ${prose(document.info.description)}
        </header>

        ${sections}
      </main>
    </div>
  </body>
</html>`;
}

export { buildOpenApiDocument };