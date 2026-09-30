// Global test setup, loaded before every test file.
//
// Two jobs: register the jest-dom matchers so assertions can read like
// `expect(el).toBeInTheDocument()`, and stub the browser APIs jsdom does not
// implement but the export utilities depend on. A missing API in jsdom is not a
// bug in the code under test, so it is filled in here rather than worked around
// in every test that happens to touch it.
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// jsdom implements neither matchMedia nor ResizeObserver, both of which Headless
// UI and react-hot-toast call as soon as a dialog or toast mounts. Without these
// a whole file fails on an unrelated-looking TypeError.
if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

if (typeof globalThis.ResizeObserver !== "function") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom has no layout engine, so anything that measures an element gets zeroes.
if (typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom has no object-URL implementation, and the CSV export path needs one.
// Records what was created so a test can read the blob back and assert on the
// file contents, which is the whole point of testing the exporters.
export const objectUrls = [];

/**
 * Every blob ever created during a test, including ones already revoked.
 * `objectUrls` only holds live ones, so a test can assert that a URL was
 * released while still being able to read the file back afterwards.
 */
export const generatedFiles = [];

// jsdom's Blob does not implement .text(), so the contents are captured when the
// Blob is constructed instead. This keeps the assertion on the real generated
// file rather than on a mock of the serialiser.
const RealBlob = globalThis.Blob;
globalThis.Blob = class CapturingBlob extends RealBlob {
  constructor(parts = [], options) {
    super(parts, options);
    this.__text = parts.map((part) => String(part)).join("");
  }

  async text() {
    return this.__text;
  }
};

if (typeof URL.createObjectURL !== "function") {
  URL.createObjectURL = () => "";
}

beforeEach(() => {
  objectUrls.length = 0;
  generatedFiles.length = 0;
});

let urlCounter = 0;

// Deliberately does not delegate to jsdom's implementation. jsdom keys its
// object-URL registry on the exact Blob instance and reaches into a private
// `_buffer`, so a Blob subclass throws "Cannot read properties of undefined". The
// URL is never fetched in these tests — only recorded and revoked — so a
// synthetic one is enough and keeps the assertions on the real file contents.
URL.createObjectURL = (blob) => {
  urlCounter += 1;
  const url = `blob:crm-test/${urlCounter}`;

  objectUrls.push({ url, blob });
  generatedFiles.push({ url, blob });

  return url;
};

URL.revokeObjectURL = (url) => {
  const index = objectUrls.findIndex((entry) => entry.url === url);
  if (index !== -1) objectUrls.splice(index, 1);
};

// Keeps the noise down: a component that logs an expected error during a test is
// not a failure, but a genuinely unexpected one should still be visible.
const originalError = console.error;
beforeEach(() => {
  console.error = (...args) => {
    if (typeof args[0] === "string" && args[0].includes("not wrapped in act")) return;
    originalError(...args);
  };
});
afterEach(() => {
  console.error = originalError;
});
