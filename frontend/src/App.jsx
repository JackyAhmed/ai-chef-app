import React, { useEffect, useMemo, useState } from "react";
import CookingAssistant from "./CookingAssistant";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProfilePage from "./pages/ProfilePage";
import RecipesPage from "./pages/RecipesPage";
import GeneratePage from "./pages/GeneratePage";

const STORAGE_KEY = "cooking-assistant-shell";

export default function App() {
  const [page, setPage] = useState("login");
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved?.user) {
        setUser(saved.user);
        setPage(saved.page && saved.page !== "login" && saved.page !== "signup" ? saved.page : "recipes");
      }
    } catch {
      // ignore broken storage
    }
  }, []);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ user, page: page === "login" || page === "signup" ? "recipes" : page }),
        );
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore storage write failures
    }
  }, [page, user]);

  const shellActions = useMemo(
    () => ({
      goRecipes: () => setPage("recipes"),
      goGenerate: () => setPage("generate"),
      goProfile: () => setPage("profile"),
      goApp: () => setPage("app"),
      logout: () => {
        setUser(null);
        setPage("login");
      },
    }),
    [],
  );

  const handleLogin = (userData) => {
    setUser(userData);
    setPage("recipes");
  };

  const handleSignup = (userData) => {
    setUser(userData);
    setPage("recipes");
  };

  const handleUpdateUser = (updated) => {
    setUser(updated);
  };

  if (!user) {
    if (page === "signup") {
      return <SignupPage onSignup={handleSignup} onGoLogin={() => setPage("login")} />;
    }
    return <LoginPage onLogin={handleLogin} onGoSignup={() => setPage("signup")} />;
  }

  if (page === "recipes") {
    return (
      <RecipesPage
        user={user}
        onLogout={shellActions.logout}
        onGoProfile={shellActions.goProfile}
        onGoGenerate={shellActions.goGenerate}
        onStartRecipe={shellActions.goApp}
      />
    );
  }

  if (page === "generate") {
    return (
      <GeneratePage
        user={user}
        onLogout={shellActions.logout}
        onGoRecipes={shellActions.goRecipes}
        onGoProfile={shellActions.goProfile}
      />
    );
  }

  if (page === "profile") {
    return (
      <ProfilePage
        user={user}
        onUpdateUser={handleUpdateUser}
        onLogout={shellActions.logout}
        onGoRecipes={shellActions.goRecipes}
        onGoGenerate={shellActions.goGenerate}
      />
    );
  }

  return (
    <div>
      <div
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 999,
          display: "flex",
          gap: "0.5rem",
          flexDirection: "column",
          alignItems: "flex-end",
        }}
      >
        <button
          onClick={shellActions.goRecipes}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.75rem 1rem",
            borderRadius: 999,
            background: "rgba(245,158,11,0.92)",
            backdropFilter: "blur(10px)",
            border: "none",
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.85rem",
            cursor: "pointer",
            fontFamily: "Georgia, serif",
            boxShadow: "0 12px 30px rgba(0,0,0,0.28)",
          }}
        >
          ← Dashboard
        </button>
      </div>
      <CookingAssistant />
    </div>
  );
}
