import { query, transaction } from "../pool.js";

/**
 * Creating a company.
 *
 * Registration calls this, so a new signup gets its own organization and is its
 * admin. That is what lets several companies use one database without seeing
 * each other's records.
 */
export async function createOrganizationWithOwner({ organizationName, name, email, passwordHash, permissions }) {
  return transaction(async (client) => {
    const org = await client.query(
      "INSERT INTO organizations (name) VALUES ($1) RETURNING id, name",
      [organizationName],
    );

    const organization = org.rows[0];

    const user = await client.query(
      `INSERT INTO users (organization_id, name, email, password_hash, role, permissions)
       VALUES ($1, $2, $3, $4, 'admin', $5)
       RETURNING id, organization_id, name, email, role, permissions, created_at`,
      [organization.id, name, email, passwordHash, JSON.stringify(permissions)],
    );

    return { organization, user: user.rows[0] };
  });
}

export async function findOrganizationById(id) {
  const { rows } = await query("SELECT id, name, created_at FROM organizations WHERE id = $1", [id]);
  return rows[0] ?? null;
}

/** Every user in an organization, oldest first. */
export async function listUsers(organizationId) {
  const { rows } = await query(
    `SELECT id, organization_id, name, email, role, permissions, created_at
       FROM users
      WHERE organization_id = $1
      ORDER BY id`,
    [organizationId],
  );
  return rows;
}

export async function findUserByEmail(email) {
  const { rows } = await query(
    `SELECT id, organization_id, name, email, role, permissions, password_hash, created_at
       FROM users
      WHERE lower(email) = lower($1)`,
    [email],
  );
  return rows[0] ?? null;
}

/**
 * Looked up by id alone, across all organizations.
 *
 * Only for the authentication step, which has to find the user *before* it
 * knows which organization they belong to. The organization is then taken from
 * the row itself, so a token can never point at another company's data.
 */
export async function findUserByIdGlobal(id) {
  const { rows } = await query(
    `SELECT id, organization_id, name, email, role, permissions, password_hash, created_at
       FROM users
      WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/** Looked up within one organization, never globally. */
export async function findUserById(organizationId, id) {
  const { rows } = await query(
    `SELECT id, organization_id, name, email, role, permissions, created_at
       FROM users
      WHERE organization_id = $1 AND id = $2`,
    [organizationId, id],
  );
  return rows[0] ?? null;
}

export async function insertUser(organizationId, { name, email, passwordHash, role, permissions }) {
  const { rows } = await query(
    `INSERT INTO users (organization_id, name, email, password_hash, role, permissions)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, organization_id, name, email, role, permissions, created_at`,
    [organizationId, name, email, passwordHash, role, JSON.stringify(permissions)],
  );
  return rows[0];
}

export async function updateUser(organizationId, id, changes) {
  const sets = [];
  const values = [];
  let index = 3; // $1 and $2 are the scoping columns

  if (changes.role !== undefined) {
    sets.push(`role = $${index++}`);
    values.push(changes.role);
  }

  if (changes.permissions !== undefined) {
    sets.push(`permissions = $${index++}`);
    values.push(JSON.stringify(changes.permissions));
  }

  if (changes.name !== undefined) {
    sets.push(`name = $${index++}`);
    values.push(changes.name);
  }

  if (sets.length === 0) return findUserById(organizationId, id);

  const { rows } = await query(
    `UPDATE users SET ${sets.join(", ")}
      WHERE organization_id = $1 AND id = $2
      RETURNING id, organization_id, name, email, role, permissions, created_at`,
    [organizationId, id, ...values],
  );

  return rows[0] ?? null;
}

/**
 * Replaces a password hash.
 *
 * Separate from `updateUser` on purpose. That function takes an organization id
 * and a whitelist of ordinary profile fields; a password reset is not scoped to
 * an organization in the same way — the caller arrives from a token, not from a
 * session, and may not know which organization it is acting within yet. Folding
 * `password_hash` into the whitelist would mean either weakening that scoping or
 * passing a throwaway organization id, and both are worse than one small function.
 *
 * Takes a bare user id because `users.email` is unique across the whole install,
 * so a user id identifies exactly one account with no ambiguity.
 *
 * Returns the user without the hash, like every other read here.
 */
export async function setUserPassword(userId, passwordHash) {
  const { rows } = await query(
    `UPDATE users SET password_hash = $2
      WHERE id = $1
      RETURNING id, organization_id, name, email, role, permissions, created_at`,
    [userId, passwordHash],
  );

  return rows[0] ?? null;
}

export async function deleteUser(organizationId, id) {
  const { rows } = await query(
    `DELETE FROM users WHERE organization_id = $1 AND id = $2
     RETURNING id, name, email, role, permissions`,
    [organizationId, id],
  );
  return rows[0] ?? null;
}
