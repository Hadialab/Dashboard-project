import useAuthStore from "../../store/authStore";
import Card from "../ui/Card";

function WelcomeHeader() {
  const user = useAuthStore((state) => state.user);

  return (
    <Card className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
        Welcome back{user ? `, ${user.name}` : ""} 👋
      </h1>

      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Here's what's happening with your dashboard today.
      </p>
    </Card>
  );
}

export default WelcomeHeader;
