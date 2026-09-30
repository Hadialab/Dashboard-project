import { describe, it, expect } from "vitest";

import {
  DEAL_STAGES,
  OPEN_STAGES,
  WON_STAGE,
  LOST_STAGE,
  LEAD_STATUSES,
  LEAD_SOURCES,
  CUSTOMER_STATUSES,
  CONVERTED_STATUS,
  STAGE_PROBABILITY,
  probabilityFor,
  boardStages,
  stageBadge,
  leadStatusBadge,
  leadSourceBadge,
  customerStatusBadge,
} from "../utils/crmConstants";

describe("the vocabulary", () => {
  it("lists the pipeline in board order", () => {
    expect(DEAL_STAGES).toEqual(["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"]);
  });

  it("keeps Lost out of the open stages, since it is the way off the ladder", () => {
    expect(OPEN_STAGES).not.toContain(LOST_STAGE);
    expect(OPEN_STAGES).not.toContain(WON_STAGE);
    expect(OPEN_STAGES).toHaveLength(4);
  });

  it("includes Converted in the lead statuses", () => {
    expect(LEAD_STATUSES).toContain(CONVERTED_STATUS);
  });

  it("has no duplicates in any list", () => {
    for (const list of [DEAL_STAGES, OPEN_STAGES, LEAD_STATUSES, LEAD_SOURCES, CUSTOMER_STATUSES]) {
      expect(new Set(list).size).toBe(list.length);
    }
  });

  it("only lists statuses and stages that the tables actually offer", () => {
    // The database has no CHECK constraint, so these are a UI-level contract.
    // Every stage the forecast weights must be a real stage.
    for (const stage of Object.keys(STAGE_PROBABILITY)) {
      expect(DEAL_STAGES).toContain(stage);
    }
  });
});

describe("probabilityFor", () => {
  it("weights a later stage more heavily than an earlier one", () => {
    expect(probabilityFor("Lead")).toBeLessThan(probabilityFor("Qualified"));
    expect(probabilityFor("Qualified")).toBeLessThan(probabilityFor("Proposal"));
    expect(probabilityFor("Proposal")).toBeLessThan(probabilityFor("Negotiation"));
    expect(probabilityFor("Negotiation")).toBeLessThan(probabilityFor("Won"));
  });

  it("weights a lost deal at zero", () => {
    expect(probabilityFor(LOST_STAGE)).toBe(0);
  });

  it("contributes nothing for a stage it has never heard of", () => {
    // A new stage must not quietly inflate the forecast.
    expect(probabilityFor("Teleported")).toBe(0);
    expect(probabilityFor(undefined)).toBe(0);
  });

  it("keeps every weight between 0 and 1", () => {
    for (const weight of Object.values(STAGE_PROBABILITY)) {
      expect(weight).toBeGreaterThanOrEqual(0);
      expect(weight).toBeLessThanOrEqual(1);
    }
  });
});

describe("boardStages", () => {
  it("always renders the whole canonical pipeline, even when empty", () => {
    // A board that hides an empty stage has nowhere to drag a deal into.
    expect(boardStages([])).toEqual(DEAL_STAGES);
  });

  it("keeps a stage present once a deal occupies it", () => {
    expect(boardStages([{ stage: "Proposal" }])).toEqual(DEAL_STAGES);
  });

  it("appends an unknown stage so no deal becomes invisible", () => {
    const result = boardStages([{ stage: "Zebezene" }, { stage: "Aardvark" }]);

    expect(result).toContain("Aardvark");
    expect(result).toContain("Zebezene");
    // Appended after the canonical stages, and sorted among themselves.
    expect(result.slice(DEAL_STAGES.length)).toEqual(["Aardvark", "Zebezene"]);
  });

  it("does not duplicate a canonical stage found in the data", () => {
    const result = boardStages([{ stage: "Lead" }, { stage: "Won" }]);

    expect(result.filter((s) => s === "Lead")).toHaveLength(1);
    expect(result).toHaveLength(DEAL_STAGES.length);
  });

  it("ignores a deal with no stage rather than creating an empty column", () => {
    expect(boardStages([{ stage: null }, { title: "no stage" }])).toEqual(DEAL_STAGES);
  });
});

describe("badge helpers", () => {
  it("gives every canonical stage a distinct colour", () => {
    const colours = DEAL_STAGES.map(stageBadge);
    expect(new Set(colours).size).toBe(DEAL_STAGES.length);
  });

  it("falls back to a neutral badge for an unknown value", () => {
    const fallback = "bg-slate-100";

    expect(stageBadge("Teleported")).toContain(fallback);
    expect(leadStatusBadge("Nonsense")).toContain(fallback);
    expect(leadSourceBadge("Carrier Pigeon")).toContain(fallback);
    expect(customerStatusBadge("Nonsense")).toContain(fallback);
  });

  it("returns a real class list, not undefined", () => {
    for (const stage of DEAL_STAGES) expect(stageBadge(stage)).toBeTruthy();
    for (const status of LEAD_STATUSES) expect(leadStatusBadge(status)).toBeTruthy();
    for (const source of LEAD_SOURCES) expect(leadSourceBadge(source)).toBeTruthy();
    for (const status of CUSTOMER_STATUSES) expect(customerStatusBadge(status)).toBeTruthy();
  });

  it("gives a converted lead its own colour, distinct from Lost", () => {
    expect(leadStatusBadge(CONVERTED_STATUS)).not.toBe(leadStatusBadge("Lost"));
  });
});
