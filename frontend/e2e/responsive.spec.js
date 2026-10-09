import { test, expect } from "@playwright/test";
import { signUp, signIn } from "./helpers.js";

/**
 * Responsiveness.
 *
 * Not a visual-regression suite and not a snapshot test: asserting on pixels
 * would fail on a font hinting difference and tell you nothing useful. What it
 * does assert is the class of bug that only appears at a narrow width — an
 * element wider than the viewport, a control with no reachable hit area, a table
 * that forces the whole page sideways — because each of those makes the app
 * unusable on a phone and none of them is caught by a desktop-only run.
 *
 * Every page is visited at each width. That matters more than the number of
 * assertions: the failure mode of a responsive bug is "someone opens it on their
 * phone and it is broken", and that is only prevented by visiting every page.
 */

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 720 },   // iPhone SE / small Android
  { name: "tablet", width: 768, height: 1024 },  // iPad portrait
  { name: "laptop", width: 1280, height: 800 },
  { name: "wide", width: 1920, height: 1080 },
];

const PAGES = [
  ["/dashboard", "Dashboard"],
  ["/customers", "Customers"],
  ["/leads", "Leads"],
  ["/deals", "Deals"],
  ["/pipeline", "Pipeline"],
  ["/followups", "Follow-ups"],
  ["/reports", "Reports"],
  ["/settings", "Settings"],
  ["/team", "Team"],
  ["/audit", "Audit"],
  ["/company", "Company"],
  ["/profile", "Profile"],
];

/**
 * Waits for the page shell to render, not for the network to fall quiet.
 *
 * `waitForLoadState("networkidle")` is the obvious choice and the wrong one: this
 * app holds an SSE connection open to /events, so the network is never idle, and
 * on a slower CI runner the wait burns the whole 45s test timeout and fails on
 * timing rather than on layout. Playwright's own guidance is to avoid it.
 *
 * Layout is what this file is checking, and layout exists whether or not the data
 * has arrived, so waiting for the shell to be on screen is both sufficient and
 * much faster.
 */
async function waitForRender(page) {
  await page.locator("main").waitFor({ state: "attached", timeout: 15_000 });
  await page.locator("main").first().waitFor({ state: "visible", timeout: 15_000 });
}
let credentials;

// Registered through the real signup form rather than seeded, so the session
// these tests assert on is one the app itself issued. `signIn` takes the
// credential object, not the company, hence `.admin`.
//
// A plain beforeEach rather than beforeAll: Playwright builds `page` per test, so
// a hook that receives one cannot run once for the file. The cost is one extra
// signup per test, which is a few hundred milliseconds against a suite that
// already creates a company per test.
test.beforeEach(async ({ page }) => {
  const company = await signUp(page);
  credentials = company.admin;
});

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("keeps every element inside the viewport", async ({ page }) => {
      await signIn(page, credentials);

      const offenders = [];

      for (const [path, label] of PAGES) {
        await page.goto(path);
        await waitForRender(page);

        const overflow = await page.evaluate(() => {
          // Measured by geometry, NOT by documentElement.scrollWidth.
          //
          // index.css sets `overflow-x: hidden` on html and body, so a page
          // that overflows is *clipped* rather than scrollable — scrollWidth stays
          // pinned to the viewport width and a scrollWidth-based check can never
          // fail. The first version of this test did exactly that and passed at
          // every width including 240px, while a 5000px element sat invisible
          // beside the viewport.
          //
          // Clipping is not a free pass either: content past the right edge is
          // unreachable, with no scrollbar and no way to reach it. So what is
          // asserted here is that no element extends past the viewport at all.
          const slack = 2; // sub-pixel layout rounding, not a bug
          const viewWidth = document.documentElement.clientWidth;

          const describe = (el) => {
            const cls = String(el.className || "").split(" ").filter(Boolean).slice(0, 2).join(".");
            const text = (el.innerText || "").trim().replace(/\s+/g, " ").slice(0, 40);
            return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""}${text ? ` "${text}"` : ""}`;
          };

          const past = [...document.querySelectorAll("body *")]
            .filter((el) => {
              const r = el.getBoundingClientRect();
              if (r.width === 0 || r.height === 0) return false;
              const style = getComputedStyle(el);
              if (style.visibility === "hidden" || style.display === "none") return false;
              return r.right > viewWidth + slack;
            })
            // Deepest first: the element actually sticking out is more useful
            // than the full-width wrapper that contains it.
            .sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right)
            .slice(0, 4)
            .map(describe);

          return past.length ? { viewWidth, past } : null;
        });

        if (overflow) {
          offenders.push(`${label}: ${overflow.past.join(", ")}`);
        }
      }

      expect(offenders, `elements past the right edge at ${vp.width}px:\n  ${offenders.join("\n  ")}`).toEqual([]);
    });

    test("keeps every navigation link reachable and tappable", async ({ page }) => {
      await signIn(page, credentials);
      await page.goto("/dashboard");
      await waitForRender(page);

      const links = page.getByRole("navigation").getByRole("link");
      const count = await links.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const link = links.nth(i);
        const box = await link.boundingBox();
        const name = (await link.innerText()).trim();

        expect(box, `"${name}" is in the navigation but has no box — it is not rendered`).not.toBeNull();
        // 24px is the WCAG 2.2 minimum target size (2.5.8), and is also roughly
        // the smallest a fingertip reliably hits. Desktop links are smaller than
        // this by design, so this only applies at touch widths.
        if (vp.width <= 768) {
          expect(
            box.height,
            `"${name}" is only ${Math.round(box.height)}px tall at ${vp.width}px wide`,
          ).toBeGreaterThanOrEqual(24);
        }
      }
    });

    test("shows no console errors on any page", async ({ page }) => {
      const errors = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      page.on("pageerror", (err) => errors.push(String(err)));

      await signIn(page, credentials);

      for (const [path] of PAGES) {
        await page.goto(path);
        await waitForRender(page);
      }

      expect(errors, `console errors: ${errors.join(" | ")}`).toEqual([]);
    });
  });
}