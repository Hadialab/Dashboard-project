import { create } from "zustand";
import Cookies from "js-cookie";

const useAuthStore = create((set) => ({
  isLoggedIn: !!Cookies.get("auth"),
  user: Cookies.get("user")
    ? JSON.parse(Cookies.get("user"))
    : null,

  login: (user) => {
    Cookies.set("auth", "true", {
      expires: 7,
      sameSite: "strict",
    });

    Cookies.set("user", JSON.stringify(user), {
      expires: 7,
      sameSite: "strict",
    });

    set({
      isLoggedIn: true,
      user,
    });
  },

  logout: () => {
    Cookies.remove("auth");
    Cookies.remove("user");

    set({
      isLoggedIn: false,
      user: null,
    });
  },
}));

export default useAuthStore;