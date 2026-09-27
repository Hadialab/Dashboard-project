#!/usr/bin/env node
// Grants a role to an account without going through the UI.
//
//   npm run promote -- you@example.com admin
//   npm run promote -- you@example.com rep
//   npm run promote --                  (no args: list every account)
//
// Useful when the only person in a company is the seeded sign-up and they need
// to be an admin to reach the Team page. It edits the database directly, so
// stop the API first — two writers to the same file are how the old JSON store
// lost data.
import "dotenv/config";
import { migrate } from "../src/db/migrate.js";
import { closePool, pool } from "../src/db/pool.js";
import { DEFAULT_PERMISSIONS } from "../src/auth/permissions.js";
import { ROLES } from "../src/auth/roles.js";

const [email, role] = process.argv.slice(2);

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function main() {
  await migrate();

  const client = await pool.connect();

  try {
    const { rows } = await client.query(
      `SELECT u.id, u.name, u.email, u.role, u.organization_id, o.name AS organization
         FROM users u
         JOIN organizations o ON o.id = u.organization_id
        ORDER BY o.id, u.id`,
    );

    if (!email) {
      if (rows.length === 0) {
        console.log("No accounts yet. Register through the app first.");
        return;
      }

      console.log("Accounts:\n");
      for (const user of rows) {
        console.log(
          `  ${user.email.padEnd(32)} ${user.role.padEnd(6)} ${user.organization} (#${user.organization_id})`,
        );
      }
      return;
    }

    if (!role) {
      fail(`Missing role. Expected one of: ${ROLES.join(", ")}`);
    }

    if (!ROLES.includes(role)) {
      fail(`Unknown role "${role}". Expected one of: ${ROLES.join(", ")}`);
    }

    const target = rows.find(
      (user) => user.email.toLowerCase() === email.trim().toLowerCase(),
    );

    if (!target) {
      console.error(`No account with email ${email}. Accounts that exist:\n`);
      for (const user of rows) console.log(`  ${user.email}  (${user.role})`);
      process.exit(1);
    }

    if (target.role === role) {
      console.log(`${target.email} is already ${role}. Nothing to do.`);
      return;
    }

    await client.query("BEGIN");

    await client.query("UPDATE users SET role = $1 WHERE id = $2", [role, target.id]);

    // Demoting out of admin leaves whatever permissions behind in place, so
    // grant the standard set rather than stranding them with nothing.
    if (role === "rep") {
      await client.query("UPDATE users SET permissions = $1 WHERE id = $2", [
        JSON.stringify(DEFAULT_PERMISSIONS),
        target.id,
      ]);
    }

    await client.query("COMMIT");

    console.log(`${target.email} is now ${role} in "${target.organization}".`);
    if (role === "admin") {
      console.log("Sign out and back in so the new role takes effect.");
    }
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
    await closePool();
  }
}

main().catch(async (error) => {
  console.error(error.message);
  await closePool().catch(() => {});
  process.exit(1);
});
