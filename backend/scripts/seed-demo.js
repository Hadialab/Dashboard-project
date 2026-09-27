#!/usr/bin/env node
// Fills a company with realistic demo data: customers, leads, deals, notes and
// follow-ups, plus a few Sales teammates so ownership and permissions have
// something to work with.
//
//   npm run seed:demo                                  # seeds the only company
//   npm run seed:demo -- you@example.com               # seeds that account's company
//   npm run seed:demo -- you@example.com --force       # clears its CRM data first
//
// This writes straight to the database, so it does not need the API running. It
// is deliberately opt-in and refuses to run twice in a row: silently duplicating
// a customer's data is worse than an error message.
import "dotenv/config";
import bcrypt from "bcryptjs";

import { migrate } from "../src/db/migrate.js";
import { closePool, pool, query, transaction } from "../src/db/pool.js";
import { repo } from "../src/db/repos/crm.js";
import { followUpsRepo, notesRepo } from "../src/db/repos/activity.js";
import { insertUser, findUserByEmail } from "../src/db/repos/users.js";
import { DEFAULT_PERMISSIONS } from "../src/auth/permissions.js";

const DEMO_PASSWORD = "sales12345";

const customers = repo("customers");
const leads = repo("leads");
const deals = repo("deals");

// ===== Dates, relative to today so the data is never stale =====

const DAY = 86400000;
const NOW = Date.now();

const daysAgo = (n) => new Date(NOW - n * DAY).toISOString().slice(0, 10);
const daysAhead = (n) => new Date(NOW + n * DAY).toISOString().slice(0, 10);
const atNoon = (n) => new Date(NOW - n * DAY).toISOString();

// ===== The data =====

const CUSTOMERS = [
  { name: "Jad Khoury", company: "Vertex Logistics", email: "jad@vertexlogistics.com", phone: "+961 1 111 222", status: "Active" },
  { name: "Sara Mansour", company: "Nova Analytics", email: "sara@novaanalytics.io", phone: "+961 3 222 333", status: "Active" },
  { name: "Rami Assaf", company: "Tyre Seafood Exports", email: "rami@tyreseafood.com", phone: "+961 70 333 444", status: "Pending" },
  { name: "Nadine Chalhoub", company: "Beirut Dairy Co", email: "nadine@beirutdairy.com", phone: "+961 71 444 555", status: "Active" },
  { name: "Michel Aoun", company: "Kfarhbab Steel Works", email: "michel@kfarhbabsteel.com", phone: "+961 81 555 666", status: "Inactive" },
  { name: "Elias Grewe", company: "Jbeil Marine Charters", email: "elias@jbeilcharters.com", phone: "+961 3 666 777", status: "Active" },
  { name: "Grace Abillama", company: "Ehden Craft Breweries", email: "grace@ehdenbrew.com", phone: "+961 70 777 888", status: "Pending" },
  { name: "Peter Nakhle", company: "Sin El Fil Auto", email: "peter@sinelfilauto.com", phone: "+961 76 888 999", status: "Active" },
  { name: "Carine Feghali", company: "Mansourieh Furniture", email: "carine@mansouriehfurniture.com", phone: "+961 81 999 000", status: "Active" },
  { name: "Toni Saad", company: "Antelias Print & Design", email: "toni@antelaisprint.com", phone: "+961 1 000 111", status: "Inactive" },
  { name: "Rasha Douaihy", company: "Zgharta Olive Oil", email: "rasha@zghartaoliveoil.com", phone: "+961 3 111 222", status: "Active" },
  { name: "Bassam Khalil", company: "Choueifat Hub", email: "bassam@choueifathub.com", phone: "+961 70 222 333", status: "Pending" },
];

// `status` is spread across the pipeline, and `company`/`email` are unique so the
// duplicate-email check has something realistic to work against.
const LEADS = [
  { name: "Marwan Yazbek", company: "Bekaa Valley Dairy", email: "marwan@bekaadairy.com", phone: "+961 71 333 444", status: "New", source: "Website", age: 2 },
  { name: "Nadia Chami", company: "Achrafieh Hotels", email: "nadia@achrafiehotels.com", phone: "+961 76 444 555", status: "New", source: "Facebook", age: 5 },
  { name: "Sandra Matar", company: "Achrafieh Wellness", email: "sandra@achrafiehwellness.com", phone: "+961 3 555 666", status: "Contacted", source: "Referral", age: 9 },
  { name: "Fouad Estephan", company: "Chekka Cement", email: "fouad@chekkacement.com", phone: "+961 81 666 777", status: "Contacted", source: "Cold Call", age: 12 },
  { name: "Mireille Khoreich", company: "Jounieh Events", email: "mireille@jouniehevents.com", phone: "+961 3 777 888", status: "Qualified", source: "LinkedIn", age: 16 },
  { name: "Walid Abou Khalil", company: "Rabieh Renewables", email: "walid@rabiehrenewables.com", phone: "+961 70 888 999", status: "Qualified", source: "Website", age: 21 },
  // Deliberately old and still untouched: this is what a "stale lead" check
  // should surface.
  { name: "Hiba Salameh", company: "Kaslik Digital", email: "hiba@kaslikdigital.com", phone: "+961 71 999 000", status: "New", source: "Google Ads", age: 34 },
  { name: "Nabil Chaaya", company: "Ras Beirut Imports", email: "nabil@rasbeirutimports.com", phone: "+961 76 000 111", status: "Proposal", source: "Referral", age: 19 },
  { name: "Zeina Abou Zeid", company: "Ain Saade Landscaping", email: "zeina@ainsaadelandscaping.com", phone: "+961 81 111 222", status: "Lost", source: "Website", age: 27 },
  { name: "Hala Daher", company: "Sidon Solar", email: "hala@sidonsolar.com", phone: "+961 3 222 333", status: "Converted", source: "LinkedIn", age: 30 },
];

// `close` is days from today. Spread deliberately: some overdue, two inside a
// week, the rest far out, so a "closing soon" widget and an overdue check both
// have real rows to find.
const DEALS = [
  { title: "Vertex Fleet Tracking", customer: "Vertex Logistics", stage: "Lead", value: 14000, close: 34, age: 6 },
  { title: "Nova Dashboards", customer: "Nova Analytics", stage: "Lead", value: 8500, close: 41, age: 3 },
  { title: "Beirut Dairy Rollout", customer: "Beirut Dairy Co", stage: "Qualified", value: 32000, close: 12, age: 14 },
  { title: "Ehden Brewery POS", customer: "Ehden Craft Breweries", stage: "Qualified", value: 19500, close: -3, age: 22 },
  { title: "Tyre Export Suite", customer: "Tyre Seafood Exports", stage: "Proposal", value: 47500, close: 5, age: 25 },
  { title: "Jbeil Charter Platform", customer: "Jbeil Marine Charters", stage: "Negotiation", value: 64000, close: 2, age: 31 },
  { title: "Zgharta Olive CRM", customer: "Zgharta Olive Oil", stage: "Negotiation", value: 28000, close: 9, age: 18 },
  { title: "Sin El Fil Service Book", customer: "Sin El Fil Auto", stage: "Won", value: 16500, close: -8, age: 44 },
  { title: "Mansourieh Showroom", customer: "Mansourieh Furniture", stage: "Won", value: 41000, close: -20, age: 60 },
  { title: "Choueifat Freight Desk", customer: "Choueifat Hub", stage: "Won", value: 23500, close: -33, age: 70 },
  { title: "Kfarhbab Steel Quotes", customer: "Kfarhbab Steel Works", stage: "Lost", value: 12500, close: -11, age: 38 },
  { title: "Antelias Print Jobs", customer: "Antelias Print & Design", stage: "Lost", value: 6000, close: -26, age: 52 },
];

const REPS = [
  { name: "Nadine Saade", email: "nadine.demo@example.com" },
  { name: "Rami Mansour", email: "rami.demo@example.com" },
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function resolveOrganization(email) {
  if (email) {
    const user = await findUserByEmail(email);
    if (!user) fail(`No account with email ${email}.`);

    const { rows } = await query("SELECT id, name FROM organizations WHERE id = $1", [
      user.organization_id,
    ]);
    return { organization: rows[0], admin: user };
  }

  // With no email given, only proceed if there is exactly one company to pick,
  // because guessing between several would seed the wrong tenant.
  const { rows } = await query("SELECT id, name FROM organizations ORDER BY id");
  if (rows.length === 0) fail("No companies yet. Register through the app first.");
  if (rows.length > 1) {
    fail(
      `More than one company exists, so pass the admin email to seed:\n${rows
        .map((row) => `  #${row.id} ${row.name}`)
        .join("\n")}\n\n  npm run seed:demo -- you@example.com`,
    );
  }

  const { rows: admins } = await query(
    'SELECT * FROM users WHERE organization_id = $1 AND role = $2 LIMIT 1',
    [rows[0].id, "admin"],
  );

  return { organization: rows[0], admin: admins[0] };
}

async function countRows(organizationId) {
  const { rows } = await query(
    `SELECT
       (SELECT count(*) FROM customers WHERE organization_id = $1) AS customers,
       (SELECT count(*) FROM leads     WHERE organization_id = $1) AS leads,
       (SELECT count(*) FROM deals     WHERE organization_id = $1) AS deals,
       (SELECT count(*) FROM notes     WHERE organization_id = $1) AS notes,
       (SELECT count(*) FROM followups WHERE organization_id = $1) AS followups`,
    [organizationId],
  );
  return rows[0];
}

async function clearRows(organizationId) {
  // CRM data only. The admin running this and any existing team are left alone.
  await query("DELETE FROM notes     WHERE organization_id = $1", [organizationId]);
  await query("DELETE FROM followups WHERE organization_id = $1", [organizationId]);
  await query("DELETE FROM deals     WHERE organization_id = $1", [organizationId]);
  await query("DELETE FROM leads     WHERE organization_id = $1", [organizationId]);
  await query("DELETE FROM customers WHERE organization_id = $1", [organizationId]);
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const force = process.argv.includes("--force");
  const email = args[0];

  await migrate();

  const { organization, admin } = await resolveOrganization(email);
  const orgId = organization.id;

  console.log(`\nSeeding "${organization.name}" (organization #${orgId})`);

  const existing = await countRows(orgId);
  const total =
    Number(existing.customers) +
    Number(existing.leads) +
    Number(existing.deals) +
    Number(existing.notes) +
    Number(existing.followups);

  if (total > 0 && !force) {
    fail(
      `This company already has ${total} rows\n` +
        `  (${existing.customers} customers, ${existing.leads} leads, ${existing.deals} deals, ` +
        `${existing.notes} notes, ${existing.followups} follow-ups).\n\n` +
        "Re-run with --force to delete that and replace it.",
    );
  }

  if (force && total > 0) {
    console.log("  --force: clearing existing CRM data...");
    await clearRows(orgId);
  }

  // Owners are real users, not display strings. A lead with no owner is
  // admin-only, which would make most of this data invisible to a Sales user.
  const owners = [admin];

  for (const rep of REPS) {
    const existingRep = await findUserByEmail(rep.email);

    owners.push(
      existingRep ??
        (await insertUser(orgId, {
          name: rep.name,
          email: rep.email,
          passwordHash: bcrypt.hashSync(DEMO_PASSWORD, 10),
          role: "rep",
          permissions: structuredClone(DEFAULT_PERMISSIONS),
        })),
    );
  }

  const pick = (index) => owners[index % owners.length];

  // Customers first: deals reference them by name.
  const createdCustomers = [];
  for (const row of CUSTOMERS) {
    createdCustomers.push(
      await customers.insert(orgId, { ...row, createdAt: atNoon(Math.ceil(Math.random() * 60)) }),
    );
  }
  console.log(`  customers  ${createdCustomers.length}`);

  const createdLeads = [];
  for (const { age, ...row } of LEADS) {
    const owner = pick(createdLeads.length);
    createdLeads.push(
      await leads.insert(orgId, {
        ...row,
        ownerId: owner.id,
        assignedRep: owner.name,
        createdDate: daysAgo(age),
      }),
    );
  }
  console.log(`  leads      ${createdLeads.length}`);

  const createdDeals = [];
  for (const { close, age, ...row } of DEALS) {
    const owner = pick(createdDeals.length + 1);
    createdDeals.push(
      await deals.insert(orgId, {
        ...row,
        ownerId: owner.id,
        owner: owner.name,
        createdDate: daysAgo(age),
        expectedClose: daysAhead(close),
      }),
    );
  }
  console.log(`  deals      ${createdDeals.length}`);

  // Notes, so the activity timelines are not empty.
  let noteCount = 0;
  for (const [index, customer] of createdCustomers.slice(0, 5).entries()) {
    await notesRepo.insert(orgId, {
      entityType: "customer",
      entityId: customer.id,
      body: "Introductory call completed. Sending the overview deck.",
      authorId: pick(index).id,
      authorName: pick(index).name,
    });
    await notesRepo.insert(orgId, {
      entityType: "customer",
      entityId: customer.id,
      body: "Confirmed the primary contact and their decision timeline.",
      authorId: admin.id,
      authorName: admin.name,
    });
    noteCount += 2;
  }
  for (const [index, deal] of createdDeals.slice(0, 4).entries()) {
    await notesRepo.insert(orgId, {
      entityType: "deal",
      entityId: deal.id,
      body: `Moved to ${deal.stage}. Pricing shared with the client.`,
      authorId: pick(index + 1).id,
      authorName: pick(index + 1).name,
    });
    noteCount += 1;
  }
  console.log(`  notes      ${noteCount}`);

  // Follow-ups spanning overdue, due today, this week, later and completed.
  const followUpPlan = [
    ...createdCustomers.slice(0, 4).map((customer, index) => ({
      entityType: "customer",
      entityId: customer.id,
      title: "Send the revised quote",
      type: "email",
      dueAt: daysAhead(index - 1),
      details: "Include the two-year pricing tier.",
      status: "pending",
    })),
    ...createdDeals.slice(0, 5).map((deal, index) => ({
      entityType: "deal",
      entityId: deal.id,
      title: `Check in on ${deal.title}`,
      type: index % 2 === 0 ? "call" : "meeting",
      dueAt: daysAhead(index === 0 ? 0 : index - 1),
      details: "Confirm the decision maker is still available.",
      status: "pending",
    })),
    {
      entityType: "customer",
      entityId: createdCustomers[5].id,
      title: "Renewal paperwork",
      type: "task",
      dueAt: daysAhead(14),
      details: "Signed copy needed before month end.",
      status: "pending",
    },
    {
      entityType: "deal",
      entityId: createdDeals[5].id,
      title: "Send the contract",
      type: "email",
      dueAt: daysAhead(-4),
      details: "Overdue: no reply to the last two emails.",
      status: "pending",
    },
    {
      entityType: "customer",
      entityId: createdCustomers[6].id,
      title: "Kickoff call",
      type: "meeting",
      dueAt: daysAhead(-6),
      details: "Completed and logged.",
      status: "done",
    },
  ];

  for (const [index, plan] of followUpPlan.entries()) {
    const owner = pick(index);

    const created = await followUpsRepo.insert(orgId, {
      ...plan,
      createdBy: owner.id,
      createdByName: owner.name,
    });

    if (plan.status === "done") {
      await followUpsRepo.update(orgId, created.id, {
        status: "done",
        completedAt: daysAgo(1),
      });
    }
  }
  console.log(`  follow-ups ${followUpPlan.length}`);

  const final = await countRows(orgId);
  console.log(
    `\nDone. "${organization.name}" now has ` +
      `${final.customers} customers, ${final.leads} leads, ${final.deals} deals, ` +
      `${final.notes} notes and ${final.followups} follow-ups.\n`,
  );

  console.log("Sales logins created (password for all three):");
  for (const rep of REPS) console.log(`  ${rep.email}  /  ${DEMO_PASSWORD}`);
  console.log("");
}

main()
  .then(() => closePool())
  .catch(async (error) => {
    console.error(`\nSeed failed: ${error.message}`);
    await closePool().catch(() => {});
    process.exit(1);
  });
