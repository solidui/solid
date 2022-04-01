export * from "./reactive/signal";
export * from "./reactive/observable";
export * from "./reactive/scheduler";
export * from "./reactive/array";
export * from "./render";

import type { JSX } from "./jsx";
type JSXElement = JSX.Element;
export type { JSXElement, JSX };

// dev
import { writeSignal, serializeGraph, registerGraph, hashValue } from "./reactive/signal";
let DEV: {
  writeSignal: typeof writeSignal;
  serializeGraph: typeof serializeGraph;
  registerGraph: typeof registerGraph;
  hashValue: typeof hashValue;
};
if ("_SOLID_DEV_") {
  DEV = { writeSignal, serializeGraph, registerGraph, hashValue };
}
export { DEV };

// handle multiple instance check
declare global {
  var Solid$$: boolean;
}

if ("_SOLID_DEV_" && globalThis) {
  if (!globalThis.Solid$$) globalThis.Solid$$ = true;
  else
    console.warn(
      "You appear to have multiple instances of Solid. This can lead to unexpected behavior."
    );
}
