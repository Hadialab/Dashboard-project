import { useEffect, useState } from "react";
import { UserCheck } from "lucide-react";
import type { ChangeEventHandler, ReactNode } from "react";

import Select from "./Select";
import { listUsers } from "../../services/teamService";
import usePermissions from "../../hooks/usePermissions";
import type { User } from "../../types";

/**
 * Picks which team member owns a record.
 *
 * Admins get a list of their own company's users, because they can reassign
 * anything. Everyone else owns whatever they create, so they get a read-only
 * note instead of a control that would be rejected — the API ignores `ownerId`
 * from a sales user, so showing them a picker would be misleading.
 *
 * The user list is scoped to the caller's organization by the API, so this never
 * offers someone from another company.
 */
type OwnerSelectProps = {
  /** A user's id, or absent for unassigned. */
  value?: string | null;
  /**
   * Receives the change event rather than the value, because it is handed
   * straight to Select. A value-taking callback here would need a wrapper at
   * every call site for no benefit — the form layer owns the change event.
   */
  onChange?: ChangeEventHandler<HTMLSelectElement>;
  label?: ReactNode;
  disabled?: boolean;
  error?: string;
  containerClassName?: string;
};

function OwnerSelect({
  value,
  onChange,
  label,
  disabled,
  error,
  containerClassName,
}: OwnerSelectProps) {
  const { isAdmin, user } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;

    // Guards the setState after an await. Without it, navigating away mid-request
    // sets state on an unmounted component and React logs a warning that hides
    // the real one.
    let cancelled = false;

    // Only admins can list users, so only admins ask. This also avoids a 403 in
    // the console every time a sales user opens a form.
    (async () => {
      try {
        setLoading(true);
        const team = await listUsers();
        if (!cancelled) setUsers(team);
      } catch {
        // Fall back to the read-only note rather than an empty picker.
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className={containerClassName}>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>

        <div className="mt-1 flex min-h-11 items-center gap-2 rounded-lg bg-slate-50 px-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
          <UserCheck size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
          {user?.name ?? "You"}
        </div>

        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Records you create are assigned to you.
        </p>
      </div>
    );
  }

  return (
    <Select
      label={label}
      name="ownerId"
      value={value ?? ""}
      onChange={onChange}
      disabled={disabled || loading}
      error={error}
      containerClassName={containerClassName}
    >
      <option value="">{loading ? "Loading team..." : "Unassigned"}</option>

      {users.map((member) => (
        <option key={member.id} value={member.id}>
          {member.name} {member.id === user?.id ? "(you)" : ""}
        </option>
      ))}
    </Select>
  );
}

export default OwnerSelect;