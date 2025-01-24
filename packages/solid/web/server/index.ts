import { ssrElement } from "./server.js";
import { splitProps, type Component, type JSX } from "solid-js";

export * from "./server";

export {
  For,
  Show,
  Suspense,
  SuspenseList,
  Switch,
  Match,
  Index,
  ErrorBoundary,
  // This overrides mergeProps from dom-expressions/src/server.js
  mergeProps
} from "solid-js";

export const isServer: boolean = true;
export const isDev: boolean = false;

export function Dynamic<T>(
  props: T & { children?: any; component?: Component<T> | string | keyof JSX.IntrinsicElements }
) {
  const [p, others] = splitProps(props, ["component"]);
  const comp = p.component,
    t = typeof comp;

  if (comp) {
    if (t === "function") return (comp as Function)(others);
    if (t === "string") {
      return ssrElement(comp as string, others, undefined, true);
    }
  }
}

export function Portal(props: { mount?: Node; useShadow?: boolean; children: JSX.Element }) {
  return "";
}
