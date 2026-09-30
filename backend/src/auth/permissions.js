/**
 * Per-user permissions.
 *
 * A user has a role (`admin` or `rep`) and, if they are a rep, a permissions
 * object. Admins bypass this entirely and always have full access.
 *
 * Each resource has:
 *   view    — false (no access), "own" (records they own), or "all"
 *   create  — may add records
 *   edit    — may change records they can view
 *   delete  — may remove records they can view
 *
 * `scope: true` on a resource means its `view` is a plain boolean rather than
 * own/all. Customers have no owner, so "own" would be meaningless there.
 */

export const PERMISSION_RESOURCES = {
  customers: { scope: false, actions: ["create", "edit", "delete"] },
  leads: { scope: true, actions: ["create", "edit", "delete"] },
  deals: { scope: true, actions: ["create", "edit", "delete"] },
  // Reports has no records of its own; it is a read-only aggregate over the
  // other three, so the only question is whether to show the page.
  reports: { scope: false, actions: [] },
};

/** What a brand-new Sales account gets: a working salesperson, nothing more. */
export const DEFAULT_PERMISSIONS = {
  customers: { view: true, create: true, edit: true, delete: false },
  leads: { view: "own", create: true, edit: true, delete: true },
  deals: { view: "own", create: true, edit: true, delete: true },
  reports: false,
};

/**
 * What an admin is reported as having. Admins bypass every check in `can`, so
 * this describes no stored state — it is the honest answer to "what may this user
 * do", and it is what the client needs in order to render unrestricted controls.
 * Scoped resources report `view: "all"` because "all records" is the scope an
 * admin actually sees.
 */
export const UNRESTRICTED_PERMISSIONS = {
  customers: { view: true, create: true, edit: true, delete: true },
  leads: { view: "all", create: true, edit: true, delete: true },
  deals: { view: "all", create: true, edit: true, delete: true },
  reports: { view: true },
};

const VIEW_OFF = false;

function normalizeView(value, spec) {
  if (spec.scope) {
    return value === "all" || value === "own" ? value : VIEW_OFF;
  }

  return value === true;
}

function normalizeActions(value, spec) {
  const result = {};

  for (const action of spec.actions) {
    // Within a resource that was named, anything not explicitly granted is
    // denied, so a partial or tampered object fails closed rather than open.
    result[action] = value?.[action] === true;
  }

  return result;
}

/**
 * Fills in anything missing with the defaults, and coerces bad values.
 * Existing accounts created before permissions existed get the default set.
 *
 * Two levels of "missing", treated differently on purpose:
 *
 *   resource absent -> the whole default entry for it. Sending
 *                      `{ customers: {...} }` used to produce leads with a
 *                      default `view` but every action denied, because view
 *                      read the fallback and the actions did not. That is
 *                      neither fail-open nor cleanly fail-closed — it silently
 *                      created a user who could see their leads but not touch
 *                      them.
 *
 *   action absent   -> denied, because the resource was named and omitting an
 *                      action inside it is a deliberate tightening.
 */
export function normalizePermissions(raw) {
  const out = {};

  for (const [name, spec] of Object.entries(PERMISSION_RESOURCES)) {
    const value = raw?.[name];

    // The resource was not named at all: take the defaults wholesale.
    if (value === undefined || value === null) {
      const fallback = DEFAULT_PERMISSIONS[name];

      out[name] = {
        view: normalizeView(fallback?.view, spec),
        ...normalizeActions(fallback, spec),
      };

      continue;
    }

    out[name] = {
      view: normalizeView(value?.view, spec),
      ...normalizeActions(value, spec),
    };
  }

  return out;
}

export function isAdmin(user) {
  return user?.role === "admin";
}

/** Can this user perform `action` on this resource? Admins always can. */
export function can(user, resource, action) {
  if (isAdmin(user)) return true;

  const permission = user?.permissions?.[resource];
  if (!permission) return false;

  // `view` is not always a boolean: a scoped resource uses "own" or "all".
  // Treat any of the three as access granted, and anything else as off.
  if (action === "view") {
    return (
      permission.view === true || permission.view === "own" || permission.view === "all"
    );
  }

  return permission[action] === true;
}

/**
 * Whether a specific row is within the user's visibility scope.
 *
 * `true` and "all" both mean everything is visible. `true` is what a
 * non-scoped resource like customers uses, since there is no owner to match on.
 */
export function canViewRow(user, resource, row) {
  if (isAdmin(user)) return true;

  const view = user?.permissions?.[resource]?.view;

  if (view === true || view === "all") return true;
  if (view === "own") return row?.ownerId === user.id;

  return false;
}

export function validatePermissions(raw) {
  const errors = {};

  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { value: null, errors: { _: "permissions must be an object" } };
  }

  const unknown = Object.keys(raw).filter(
    (name) => !PERMISSION_RESOURCES[name],
  );
  if (unknown.length > 0) {
    errors._ = `Unknown resource(s): ${unknown.join(", ")}`;
  }

  for (const [name, spec] of Object.entries(PERMISSION_RESOURCES)) {
    const value = raw[name];
    if (value === undefined) continue;

    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      errors[name] = "must be an object";
      continue;
    }

    if (value.view !== undefined) {
      if (spec.scope) {
        // Scoped resources accept own/all as well as true/false.
        if (![true, false, "own", "all"].includes(value.view)) {
          errors[name] = 'view must be one of: true, false, "own", "all"';
        }
      } else if (typeof value.view !== "boolean") {
        errors[name] = "view must be true or false";
      }
    }

    // Actions are always plain booleans. `view` is deliberately excluded: it
    // was already checked above, and re-checking it as a boolean would reject
    // a valid "own" or "all".
    for (const action of spec.actions) {
      if (value[action] === undefined) continue;
      if (typeof value[action] !== "boolean") {
        errors[name] = `${action} must be true or false`;
      }
    }
  }

  return { value: raw, errors };
}
