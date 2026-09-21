try {
  document.documentElement.classList.toggle(
    "dark-mode",
    (localStorage.getItem("diaopicks-theme") ||
      localStorage.getItem("theme") ||
      (matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light")) === "dark",
  );
} catch {}
