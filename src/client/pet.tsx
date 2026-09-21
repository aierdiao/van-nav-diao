import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import ColaPet from "../pet";
class Boundary extends React.Component<
  React.PropsWithChildren,
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
function PetWidget() {
  const [mobile, setMobile] = useState(
    matchMedia("(max-width: 1100px)").matches,
  );
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("diaopicks-cola-collapsed") === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const query = matchMedia("(max-width: 1100px)");
    const update = () => setMobile(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const zone = document.querySelector("#pet-zone")!;
    const update = () =>
      zone.classList.toggle(
        "pet-input-active",
        mobile &&
          !!document.activeElement?.matches(
            "input, textarea, select, [contenteditable=true]",
          ),
      );
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    update();
    return () => {
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
      zone.classList.remove("pet-input-active");
    };
  }, [mobile]);
  function toggle() {
    setCollapsed((value) => {
      const next = !value;
      try {
        localStorage.setItem("diaopicks-cola-collapsed", next ? "1" : "0");
      } catch {}
      return next;
    });
  }
  return (
    <>
      {(!mobile || !collapsed) && <ColaPet />}
      {mobile && (
        <button
          className="pet-toggle"
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "展开可乐" : "收起可乐"}
        >
          {collapsed ? "可乐" : "收起"}
        </button>
      )}
    </>
  );
}
let mounted = false;
export function mountPet() {
  const el = document.querySelector("#pet-root");
  if (mounted || !el) return;
  mounted = true;
  createRoot(el).render(
    <Boundary>
      <PetWidget />
    </Boundary>,
  );
}
