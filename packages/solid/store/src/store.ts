import { getListener, batch, DEV, $PROXY, Accessor, createSignal } from "solid-js";
export const $RAW = Symbol("store-raw"),
  $NODE = Symbol("store-node"),
  $NAME = Symbol("store-name");

export type StoreNode = Record<keyof any, any>;
export type NotWrappable =
  | string
  | number
  | bigint
  | symbol
  | boolean
  | Function
  | null
  | undefined;

function wrap<T extends StoreNode>(value: T, name?: string): Store<T> {
  let p = value[$PROXY];
  if (!p) {
    Object.defineProperty(value, $PROXY, { value: (p = new Proxy(value, proxyTraps)) });
    const keys = Object.keys(value),
      desc = Object.getOwnPropertyDescriptors(value);
    for (let i = 0, l = keys.length; i < l; i++) {
      const prop = keys[i];
      if (desc[prop].get) {
        const get = desc[prop].get!.bind(p);
        Object.defineProperty(value, prop, {
          get
        });
      }
    }
    if ("_SOLID_DEV_" && name) Object.defineProperty(value, $NAME, { value: name });
  }
  return p;
}

export function isWrappable(obj: any) {
  return (
    obj != null &&
    typeof obj === "object" &&
    (obj[$PROXY] || !obj.__proto__ || obj.__proto__ === Object.prototype || Array.isArray(obj))
  );
}

export function unwrap<T extends StoreNode>(item: any, set = new Set()): T {
  let result, unwrapped, v, prop;
  if ((result = item != null && item[$RAW])) return result;
  if (!isWrappable(item) || set.has(item)) return item;

  if (Array.isArray(item)) {
    if (Object.isFrozen(item)) item = item.slice(0);
    else set.add(item);
    for (let i = 0, l = item.length; i < l; i++) {
      v = item[i];
      if ((unwrapped = unwrap(v, set)) !== v) item[i] = unwrapped;
    }
  } else {
    if (Object.isFrozen(item)) item = Object.assign({}, item);
    else set.add(item);
    const keys = Object.keys(item),
      desc = Object.getOwnPropertyDescriptors(item);
    for (let i = 0, l = keys.length; i < l; i++) {
      prop = keys[i];
      if ((desc as any)[prop].get) continue;
      v = item[prop];
      if ((unwrapped = unwrap(v, set)) !== v) item[prop] = unwrapped;
    }
  }
  return item;
}

export function getDataNodes(target: StoreNode) {
  let nodes = target[$NODE];
  if (!nodes) Object.defineProperty(target, $NODE, { value: (nodes = {}) });
  return nodes;
}

export function proxyDescriptor(target: StoreNode, property: keyof any) {
  const desc = Reflect.getOwnPropertyDescriptor(target, property);
  if (
    !desc ||
    desc.get ||
    !desc.configurable ||
    property === $PROXY ||
    property === $NODE ||
    property === $NAME
  )
    return desc;
  delete desc.value;
  delete desc.writable;
  desc.get = () => target[$PROXY][property];
  return desc;
}

export function ownKeys(target: StoreNode) {
  if (getListener()) {
    const nodes = getDataNodes(target);
    (nodes._ || (nodes._ = createDataNode()))();
  }
  return Reflect.ownKeys(target);
}

export function createDataNode() {
  const [s, set] = createSignal<void>(undefined, { equals: false, internal: true });
  (s as Accessor<void> & { $: () => void }).$ = set;
  return s as Accessor<void> & { $: () => void };
}

const proxyTraps: ProxyHandler<StoreNode> = {
  get(target, property, receiver) {
    if (property === $RAW) return target;
    if (property === $PROXY) return receiver;
    const value = target[property];
    if (property === $NODE || property === "__proto__") return value;

    const wrappable = isWrappable(value);
    if (getListener() && (typeof value !== "function" || target.hasOwnProperty(property))) {
      let nodes, node;
      if (wrappable && (nodes = getDataNodes(value))) {
        node = nodes._ || (nodes._ = createDataNode());
        node();
      }
      nodes = getDataNodes(target);
      node = nodes[property] || (nodes[property] = createDataNode());
      node();
    }
    return wrappable
      ? wrap(value, "_SOLID_DEV_" && target[$NAME] && `${target[$NAME]}:${property.toString()}`)
      : value;
  },

  set() {
    if ("_SOLID_DEV_") console.warn("Cannot mutate a Store directly");
    return true;
  },

  deleteProperty() {
    if ("_SOLID_DEV_") console.warn("Cannot mutate a Store directly");
    return true;
  },

  ownKeys: ownKeys,

  getOwnPropertyDescriptor: proxyDescriptor
};

export function setProperty(state: StoreNode, property: keyof any, value: any) {
  if (state[property] === value) return;
  const array = Array.isArray(state);
  const len = state.length;
  const isUndefined = value === undefined;
  const notify = array || isUndefined === property in state;
  if (isUndefined) {
    delete state[property];
  } else state[property] = value;
  let nodes = getDataNodes(state),
    node;
  (node = nodes[property]) && node.$();
  if (array && state.length !== len) (node = nodes.length) && node.$();
  notify && (node = nodes._) && node.$();
}

function mergeStoreNode(state: StoreNode, value: Partial<StoreNode>) {
  const keys = Object.keys(value);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    setProperty(state, key, value[key]);
  }
}

export function updatePath(current: StoreNode, path: any[], traversed: (keyof any)[] = []) {
  let part,
    prev = current;
  if (path.length > 1) {
    part = path.shift();
    const partType = typeof part,
      isArray = Array.isArray(current);

    if (Array.isArray(part)) {
      // Ex. update('data', [2, 23], 'label', l => l + ' !!!');
      for (let i = 0; i < part.length; i++) {
        updatePath(current, [part[i]].concat(path), [part[i]].concat(traversed));
      }
      return;
    } else if (isArray && partType === "function") {
      // Ex. update('data', i => i.id === 42, 'label', l => l + ' !!!');
      for (let i = 0; i < current.length; i++) {
        if (part(current[i], i))
          updatePath(current, [i].concat(path), [i as keyof any].concat(traversed));
      }
      return;
    } else if (isArray && partType === "object") {
      // Ex. update('data', { from: 3, to: 12, by: 2 }, 'label', l => l + ' !!!');
      const { from = 0, to = current.length - 1, by = 1 } = part;
      for (let i = from; i <= to; i += by) {
        updatePath(current, [i].concat(path), [i as keyof any].concat(traversed));
      }
      return;
    } else if (path.length > 1) {
      updatePath(current[part], path, [part].concat(traversed));
      return;
    }
    prev = current[part];
    traversed = [part].concat(traversed);
  }
  let value = path[0];
  if (typeof value === "function") {
    value = value(prev, traversed);
    if (value === prev) return;
  }
  if (part === undefined && value == undefined) return;
  value = unwrap(value);
  if (part === undefined || (isWrappable(prev) && isWrappable(value) && !Array.isArray(value))) {
    mergeStoreNode(prev, value);
  } else setProperty(current, part, value);
}

type NoInfer<T> = T & { [K in keyof T]: T[K] };
export type DeepReadonly<T> = NoInfer<
  T extends NotWrappable
    ? T
    : {
        readonly [K in keyof T]: DeepReadonly<T[K]>;
      }
>;

export type StoreSetter<T> =
  | T
  | Partial<T>
  | ((prevState: DeepReadonly<T>, traversed?: (keyof any)[]) => Partial<T> | void);

export type StorePathRange = { from?: number; to?: number; by?: number };

export type ArrayFilterFn<T> = (item: DeepReadonly<T>, index: number) => boolean;

export type Part<T> = [T] extends [never]
  ? never
  : [keyof T] extends [never]
  ? never
  :
      | keyof T
      | (keyof T)[]
      | (number extends keyof T ? ArrayFilterFn<T[number]> | StorePathRange : never);

export type Next<T, K extends Part<T>> = [K] extends [never]
  ? never
  : K extends keyof T
  ? T[K]
  : K extends (keyof T)[]
  ? T[K[number]]
  : // since K extends Part<T> and we have excluded never,
  // we assume that K is now ArrayFilterFn or StorePathRange
  number extends keyof T
  ? T[number]
  : never;

export type WrappableNext<T, K extends Part<T>> = Exclude<Next<T, K>, NotWrappable>;

type DistributeRest<T, K extends Part<T>> = K extends K ? [K, ...Rest<Next<T, K>>] : never;
export type Rest<T> = 0 extends 1 & T
  ? [...(keyof any)[], any]
  : [StoreSetter<T>] | (T extends NotWrappable ? never : DistributeRest<T, Part<T>>);

export type Store<T extends StoreNode> = T;
export interface SetStoreFunction<T extends StoreNode> {
  <
    K1 extends Part<T>,
    K2 extends Part<T1>,
    K3 extends Part<T2>,
    K4 extends Part<T3>,
    K5 extends Part<T4>,
    K6 extends Part<T5>,
    K7 extends Part<T6>,
    T1 extends WrappableNext<T, K1>,
    T2 extends WrappableNext<T1, K2>,
    T3 extends WrappableNext<T2, K3>,
    T4 extends WrappableNext<T3, K4>,
    T5 extends WrappableNext<T4, K5>,
    T6 extends WrappableNext<T5, K6>
  >(
    k1: K1,
    k2: K2,
    k3: K3,
    k4: K4,
    k5: K5,
    k6: K6,
    k7: K7,
    // this cannot infer ArrayFilterFn
    ...rest: Rest<Next<T6, K7>>
  ): void;
  <
    K1 extends Part<T>,
    K2 extends Part<T1>,
    K3 extends Part<T2>,
    K4 extends Part<T3>,
    K5 extends Part<T4>,
    K6 extends Part<T5>,
    K7 extends Part<T6>,
    T1 extends WrappableNext<T, K1>,
    T2 extends WrappableNext<T1, K2>,
    T3 extends WrappableNext<T2, K3>,
    T4 extends WrappableNext<T3, K4>,
    T5 extends WrappableNext<T4, K5>,
    T6 extends WrappableNext<T5, K6>
  >(
    k1: K1,
    k2: K2,
    k3: K3,
    k4: K4,
    k5: K5,
    k6: K6,
    k7: K7,
    setter: StoreSetter<Next<T6, K7>>
  ): void;
  <
    K1 extends Part<T>,
    K2 extends Part<T1>,
    K3 extends Part<T2>,
    K4 extends Part<T3>,
    K5 extends Part<T4>,
    K6 extends Part<T5>,
    T1 extends WrappableNext<T, K1>,
    T2 extends WrappableNext<T1, K2>,
    T3 extends WrappableNext<T2, K3>,
    T4 extends WrappableNext<T3, K4>,
    T5 extends WrappableNext<T4, K5>
  >(
    k1: K1,
    k2: K2,
    k3: K3,
    k4: K4,
    k5: K5,
    k6: K6,
    setter: StoreSetter<Next<T5, K6>>
  ): void;
  <
    K1 extends Part<T>,
    K2 extends Part<T1>,
    K3 extends Part<T2>,
    K4 extends Part<T3>,
    K5 extends Part<T4>,
    T1 extends WrappableNext<T, K1>,
    T2 extends WrappableNext<T1, K2>,
    T3 extends WrappableNext<T2, K3>,
    T4 extends WrappableNext<T3, K4>
  >(
    k1: K1,
    k2: K2,
    k3: K3,
    k4: K4,
    k5: K5,
    setter: StoreSetter<Next<T4, K5>>
  ): void;
  <
    K1 extends Part<T>,
    K2 extends Part<T1>,
    K3 extends Part<T2>,
    K4 extends Part<T3>,
    T1 extends WrappableNext<T, K1>,
    T2 extends WrappableNext<T1, K2>,
    T3 extends WrappableNext<T2, K3>
  >(
    k1: K1,
    k2: K2,
    k3: K3,
    k4: K4,
    setter: StoreSetter<Next<T3, K4>>
  ): void;
  <
    K1 extends Part<T>,
    K2 extends Part<T1>,
    K3 extends Part<T2>,
    T1 extends WrappableNext<T, K1>,
    T2 extends WrappableNext<T1, K2>
  >(
    k1: K1,
    k2: K2,
    k3: K3,
    setter: StoreSetter<Next<T2, K3>>
  ): void;
  <K1 extends Part<T>, K2 extends Part<T1>, T1 extends WrappableNext<T, K1>>(
    k1: K1,
    k2: K2,
    setter: StoreSetter<Next<T1, K2>>
  ): void;
  <K extends Part<T>>(k: K, setter: StoreSetter<Next<T, K>>): void;
  (setter: StoreSetter<T>): void;
}

/**
 * creates a reactive store that can be read through a proxy object and written with a setter function
 *
 * @description https://www.solidjs.com/docs/latest/api#createstore
 */
export function createStore<T extends StoreNode>(
  store: T | Store<T>,
  options?: { name?: string }
): [get: Store<T>, set: SetStoreFunction<T>] {
  const unwrappedStore = unwrap<T>(store || {});
  const wrappedStore = wrap(
    unwrappedStore,
    "_SOLID_DEV_" && ((options && options.name) || DEV.hashValue(unwrappedStore))
  );
  if ("_SOLID_DEV_") {
    const name = (options && options.name) || DEV.hashValue(unwrappedStore);
    DEV.registerGraph(name, { value: unwrappedStore });
  }
  function setStore(...args: any[]): void {
    batch(() => updatePath(unwrappedStore, args));
  }

  return [wrappedStore, setStore];
}
