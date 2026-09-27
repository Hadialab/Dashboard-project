import useAuthStore from "../store/authStore";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import { DetailRow } from "../components/ui/DataCard";

// Shows the signed-in user. The name and email come from the auth store, which
// populates them from GET /auth/me after the token is verified.
function Profile() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Your account details."
      />

      <Card className="p-4">
        <div className="flex flex-col items-center gap-3 pb-4 text-center sm:flex-row sm:items-center sm:gap-4 sm:pb-0 sm:text-left">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>

          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-slate-900 dark:text-white">
              {user?.name ?? "Unknown user"}
            </p>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">
              {user?.email ?? "—"}
            </p>
          </div>
        </div>

        <dl className="mt-2 border-t border-slate-200 pt-1 dark:border-slate-800">
          <DetailRow label="User ID" value={user?.id ?? "—"} />
          <DetailRow label="Email" value={user?.email ?? "—"} />
          <DetailRow
            label="Role"
            value={user?.role ? user.role : "user"}
          />
        </dl>
      </Card>
    </div>
  );
}

export default Profile;
