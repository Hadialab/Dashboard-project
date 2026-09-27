import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { RotateCcw, Trash2, UserPlus } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import EmptyState from "../components/ui/EmptyState";
import useAuthStore from "../store/authStore";
import {
  createUser,
  deleteUser,
  listUsers,
  resetUserPermissions,
  updateUserPermissions,
  updateUserRole,
} from "../services/teamService";

const emptyForm = { name: "", email: "", password: "", role: "rep" };

// Matches the server's defaults. Used to show the user what a new account gets.
const DEFAULT_PERMISSIONS = {
  customers: { view: true, create: true, edit: true, delete: false },
  leads: { view: "own", create: true, edit: true, delete: true },
  deals: { view: "own", create: true, edit: true, delete: true },
  reports: { view: false },
};

// Which visibility options each resource offers. Customers have no owner, so
// "own records" would be meaningless for them.
const VIEW_OPTIONS = {
  customers: [
    { value: "true", label: "Can view" },
    { value: "false", label: "No access" },
  ],
  leads: [
    { value: "own", label: "Own records only" },
    { value: "all", label: "All records" },
    { value: "false", label: "No access" },
  ],
  deals: [
    { value: "own", label: "Own records only" },
    { value: "all", label: "All records" },
    { value: "false", label: "No access" },
  ],
  reports: [
    { value: "true", label: "Can view" },
    { value: "false", label: "No access" },
  ],
};

const ACTIONS = {
  customers: ["create", "edit", "delete"],
  leads: ["create", "edit", "delete"],
  deals: ["create", "edit", "delete"],
  reports: [],
};

const ACTION_LABELS = {
  create: "Create",
  edit: "Edit",
  delete: "Delete",
};

const RESOURCE_LABELS = {
  customers: "Customers",
  leads: "Leads",
  deals: "Deals",
  reports: "Reports",
};

// The wire format uses booleans for view on unscoped resources and the strings
// "own"/"all"/false for scoped ones. This is the inverse, for the <select>.
const viewValue = (resource, value) => String(value);
const parseView = (resource, value) =>
  value === "true" ? true : value === "false" ? false : value;

/**
 * Admin-only. Adds sales users and controls exactly what each of them can see
 * and do. The API enforces the same rules, so hiding a control here is a
 * convenience rather than the protection.
 */
function Team() {
  const currentUser = useAuthStore((state) => state.user);
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [openEditor, setOpenEditor] = useState(null);

  const load = useCallback(async () => {
    // A sales user is never going to be allowed to list users, so don't ask.
    if (currentUser && currentUser.role !== "admin") {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setUsers(await listUsers());
      setError("");
    } catch (err) {
      setError(
        err.response?.status === 403
          ? "Only administrators can manage the team."
          : (err.response?.data?.error ?? "Could not load the team."),
      );
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(event) {
    event.preventDefault();

    try {
      setSaving(true);
      const created = await createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });

      setUsers((prev) => [...prev, created]);
      setForm(emptyForm);
      setShowForm(false);
      setError("");
      toast.success(`${created.name} added with default access.`);
    } catch (err) {
      const detail = err.response?.data?.details;
      setError(
        detail
          ? Object.values(detail)[0]
          : (err.response?.data?.error ?? "Could not add that user."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(user, role) {
    try {
      const updated = await updateUserRole(user.id, role);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      toast.success(
        `${updated.name} is now ${updated.role === "admin" ? "an admin" : "in Sales"}.`,
      );

      // Changing your own role leaves the sidebar working off a stale copy.
      if (updated.id === currentUser?.id) {
        await refreshUser();
      }
    } catch (err) {
      setError(err.response?.data?.error ?? "Could not change that role.");
      load();
    }
  }

  async function handleSavePermissions(user, permissions) {
    try {
      const updated = await updateUserPermissions(user.id, permissions);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setOpenEditor(null);
      toast.success(`Access updated for ${updated.name}.`);

      if (updated.id === currentUser?.id) {
        await refreshUser();
      }
    } catch (err) {
      const detail = err.response?.data?.details;
      setError(
        detail
          ? Object.values(detail)[0]
          : (err.response?.data?.error ?? "Could not update access."),
      );
    }
  }

  async function handleResetPermissions(user) {
    try {
      const updated = await resetUserPermissions(user.id);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setOpenEditor(null);
      toast.success(`${updated.name} reset to default access.`);
    } catch (err) {
      setError(err.response?.data?.error ?? "Could not reset access.");
    }
  }

  async function handleDelete(user) {
    if (!window.confirm(`Remove ${user.name}? Their records become unassigned.`)) {
      return;
    }

    try {
      await deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toast.success(`${user.name} removed.`);
    } catch (err) {
      setError(err.response?.data?.error ?? "Could not remove that user.");
    }
  }

  if (currentUser && currentUser.role !== "admin") {
    return (
      <div className="space-y-6">
        <PageHeader title="Team" description="Manage your team and permissions." />

        <EmptyState
          title="Administrators only"
          description="Team management is limited to administrators."
        />

        <Card className="p-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Need this access?
          </h2>

          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            New accounts are always created in Sales with default access. An
            administrator can change what you can see from this page.
          </p>

          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            If you are the only person using this install, promote yourself from
            the backend folder:
          </p>

          <code className="mt-2 block overflow-x-auto rounded-lg bg-slate-100 p-3 text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-200">
            npm run promote -- {currentUser?.email ?? "your@email.com"} admin
          </code>

          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Then reload the page so the new role is picked up.
          </p>
        </Card>
      </div>
    );
  }

  const salesCount = users.filter((u) => u.role !== "admin").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Add people to Sales and decide what each of them can see and do."
        action={
          <Button
            onClick={() => setShowForm((prev) => !prev)}
            icon={UserPlus}
            className="w-full sm:w-auto"
          >
            {showForm ? "Cancel" : "Add member"}
          </Button>
        }
      />

      {showForm && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            New team member
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            New accounts start with default Sales access. You can fine-tune it
            straight after.
          </p>

          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Full name"
                name="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Full name"
                autoComplete="off"
              />

              <Input
                label="Email"
                type="email"
                name="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="sarah@company.com"
                autoComplete="off"
              />

              <Input
                label="Temporary password"
                type="password"
                name="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                hint="They sign in with this. Passwords are stored hashed."
              />

              <Select
                label="Role"
                name="role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="rep">Sales — default access</option>
                <option value="admin">Admin — full access to everything</option>
              </Select>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? "Adding..." : "Add team member"}
            </Button>
          </form>
        </Card>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading team...</p>
      ) : users.length === 0 ? (
        <EmptyState
          title="No team members"
          description="Add someone to Sales to start assigning leads and deals."
          buttonText="Add member"
          onClick={() => setShowForm(true)}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {users.map((user) => {
            const isSelf = user.id === currentUser?.id;
            const isAdminUser = user.role === "admin";
            const isOpen = openEditor === user.id;

            return (
              <li key={user.id}>
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                      {user.name?.charAt(0)?.toUpperCase() ?? "U"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900 dark:text-white">
                        {user.name}
                        {isSelf && (
                          <span className="ml-2 text-xs text-slate-400">(you)</span>
                        )}
                      </p>
                      <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Select
                      name={`role-${user.id}`}
                      value={user.role}
                      onChange={(e) => handleRoleChange(user, e.target.value)}
                      aria-label={`Role for ${user.name}`}
                      className="min-h-11"
                    >
                      <option value="rep">Sales</option>
                      <option value="admin">Admin</option>
                    </Select>

                    {!isAdminUser && (
                      <Button
                        size="sm"
                        variant={isOpen ? "primary" : "secondary"}
                        onClick={() => setOpenEditor(isOpen ? null : user.id)}
                      >
                        {isOpen ? "Done" : "Access"}
                      </Button>
                    )}

                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => handleDelete(user)}
                        aria-label={`Remove ${user.name}`}
                        className="ml-auto inline-flex min-h-11 shrink-0 items-center rounded-lg border border-red-200 px-3 text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {isAdminUser && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Admins always have full access, so there is nothing to
                      configure.
                    </p>
                  )}

                  {isOpen && !isAdminUser && (
                    <PermissionsEditor
                      user={user}
                      onSave={(permissions) => handleSavePermissions(user, permissions)}
                      onReset={() => handleResetPermissions(user)}
                      onCancel={() => setOpenEditor(null)}
                    />
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {salesCount > 0 && !loading && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {salesCount} {salesCount === 1 ? "person is" : "people are"} in Sales.
          Each has their own access settings.
        </p>
      )}
    </div>
  );
}

// The per-resource access editor. One row per resource: a visibility dropdown
// plus a checkbox per action that resource supports.
function PermissionsEditor({ user, onSave, onReset, onCancel }) {
  const [draft, setDraft] = useState(() => structuredClone(user.permissions));

  const isDirty = JSON.stringify(draft) !== JSON.stringify(user.permissions);

  function setView(resource, value) {
    setDraft((prev) => ({
      ...prev,
      [resource]: { ...prev[resource], view: parseView(resource, value) },
    }));
  }

  function setAction(resource, action, value) {
    setDraft((prev) => ({
      ...prev,
      [resource]: { ...prev[resource], [action]: value },
    }));
  }

  return (
    <div className="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
      {Object.keys(VIEW_OPTIONS).map((resource) => {
        const permission = draft[resource];
        const viewOn = viewValue(resource, permission.view) !== "false";
        const actions = ACTIONS[resource];

        return (
          <div key={resource}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {RESOURCE_LABELS[resource]}
              </p>

              <select
                aria-label={`${RESOURCE_LABELS[resource]} access`}
                value={viewValue(resource, permission.view)}
                onChange={(e) => setView(resource, e.target.value)}
                className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              >
                {VIEW_OPTIONS[resource].map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {actions.length > 0 && viewOn && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 pl-0 sm:pl-1">
                {actions.map((action) => (
                  <label
                    key={action}
                    className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={permission[action] === true}
                      onChange={(e) => setAction(resource, action, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800"
                    />
                    {ACTION_LABELS[action]}
                  </label>
                ))}
              </div>
            )}

            {!viewOn && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                No access, so create/edit/delete are ignored.
              </p>
            )}
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
        <Button size="sm" onClick={() => onSave(draft)} disabled={!isDirty}>
          Save access
        </Button>

        <Button size="sm" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>

        <Button
          size="sm"
          variant="ghost"
          icon={RotateCcw}
          onClick={() => {
            setDraft(structuredClone(DEFAULT_PERMISSIONS));
            onReset();
          }}
        >
          Reset to default
        </Button>
      </div>
    </div>
  );
}

export default Team;
