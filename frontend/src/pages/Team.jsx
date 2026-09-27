import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Trash2, UserPlus } from "lucide-react";
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
  updateUserRole,
} from "../services/teamService";

const emptyForm = { name: "", email: "", password: "", role: "rep" };

// Admin-only. Sales reps have no team management at all, and the API rejects
// these calls with a 403 regardless.
function Team() {
  const currentUser = useAuthStore((state) => state.user);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    // A rep is never going to be allowed to list users, so don't ask. This
    // avoids a pointless 403 in the console on every visit.
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
      toast.success(`${created.name} added.`);
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
      toast.success(`${updated.name} is now ${updated.role === "admin" ? "an admin" : "a sales rep"}.`);
    } catch (err) {
      setError(err.response?.data?.error ?? "Could not change that role.");
      load();
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
          description="Ask an administrator if you need a team member added or a role changed."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Add sales reps and control who can see all records."
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

          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Full name"
                name="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Sarah Wilson"
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
                hint="They can sign in with this. Passwords are stored hashed."
              />

              <Select
                label="Role"
                name="role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="rep">Sales rep — own leads and deals only</option>
                <option value="admin">Admin — sees everything</option>
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
          description="Add a sales rep to start assigning leads and deals."
          buttonText="Add member"
          onClick={() => setShowForm(true)}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {users.map((user) => {
            const isSelf = user.id === currentUser?.id;

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

                  <div className="mt-3 flex items-center gap-2">
                    <Select
                      name={`role-${user.id}`}
                      value={user.role}
                      onChange={(e) => handleRoleChange(user, e.target.value)}
                      aria-label={`Role for ${user.name}`}
                      className="min-h-11"
                    >
                      <option value="rep">Sales rep</option>
                      <option value="admin">Admin</option>
                    </Select>

                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => handleDelete(user)}
                        aria-label={`Remove ${user.name}`}
                        className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-red-200 px-3 text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default Team;
