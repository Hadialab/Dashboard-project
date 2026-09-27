import useAuthStore from "../../store/authStore";

function WelcomeHeader() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
        Welcome back{user ? `, ${user.name}` : ""} 👋
      </h1>

      <p className="mt-2 text-slate-500">
        Here's what's happening with your dashboard today.
      </p>
    </div>
  );
}

export default WelcomeHeader;