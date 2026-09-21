import React from "react";
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
let mounted = false;
export function mountPet() {
  const el = document.querySelector("#pet-root");
  if (mounted || !el) return;
  mounted = true;
  createRoot(el).render(
    <Boundary>
      <ColaPet />
    </Boundary>,
  );
}
