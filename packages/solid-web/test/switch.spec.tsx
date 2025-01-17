/**
 * @jsxImportSource solid-js
 * @vitest-environment jsdom
 */
import { describe, expect, test } from "vitest";
import { render } from "../src/index.js";
import { createRoot, createSignal, Switch, Match, For, createStore, flushSync } from "solid-js";

describe("Testing a single match switch control flow", () => {
  let div!: HTMLDivElement, disposer: () => void;
  const [count, setCount] = createSignal(0);
  const Component = () => (
    <div ref={div}>
      <Switch fallback={"fallback"}>
        <Match when={Boolean(count()) && count() < 2}>1</Match>
      </Switch>
    </div>
  );

  test("Create Switch control flow", () => {
    createRoot(dispose => {
      disposer = dispose;
      <Component />;
    });

    expect(div.innerHTML).toBe("fallback");
  });

  test("Toggle Switch control flow", () => {
    setCount(1);
    flushSync();
    expect(div.innerHTML).toBe("1");
    setCount(3);
    flushSync();
    expect(div.innerHTML).toBe("fallback");
  });

  test("dispose", () => disposer());
});

describe("Testing an only child Switch control flow", () => {
  let div!: HTMLDivElement, disposer: () => void;
  const [count, setCount] = createSignal(0);
  const Component = () => (
    <div ref={div}>
      <Switch fallback={"fallback"}>
        <Match when={Boolean(count()) && count() < 2}>1</Match>
        <Match when={Boolean(count()) && count() < 5}>2</Match>
        <Match when={Boolean(count()) && count() < 8}>3</Match>
      </Switch>
    </div>
  );

  test("Create Switch control flow", () => {
    createRoot(dispose => {
      disposer = dispose;
      <Component />;
    });

    expect(div.innerHTML).toBe("fallback");
  });

  test("Toggle Switch control flow", () => {
    setCount(1);
    flushSync();
    expect(div.innerHTML).toBe("1");
    setCount(4);
    flushSync();
    expect(div.innerHTML).toBe("2");
    setCount(7);
    flushSync();
    expect(div.innerHTML).toBe("3");
    setCount(9);
    flushSync();
    expect(div.innerHTML).toBe("fallback");
  });

  test("doesn't re-render on same option", () => {
    setCount(4);
    flushSync();
    expect(div.innerHTML).toBe("2");
    const c = div.firstChild;
    setCount(4);
    flushSync();
    expect(div.innerHTML).toBe("2");
    expect(div.firstChild).toBe(c);
  });

  test("dispose", () => disposer());
});

describe("Testing keyed Switch control flow", () => {
  let div!: HTMLDivElement, disposer: () => void;
  const [a, setA] = createSignal(0),
    [b, setB] = createSignal(0),
    [c, setC] = createSignal(0);
  const Component = () => (
    <div ref={div}>
      <Switch fallback={"fallback"}>
        <Match when={a()} keyed>
          {a()}
        </Match>
        <Match when={b()} keyed>
          {b()}
        </Match>
        <Match when={c()} keyed>
          {c()}
        </Match>
      </Switch>
    </div>
  );

  test("Create Switch control flow", () => {
    createRoot(dispose => {
      disposer = dispose;
      <Component />;
    });

    expect(div.innerHTML).toBe("fallback");
  });

  test("Toggle Switch control flow", () => {
    setC(1);
    flushSync();
    expect(div.innerHTML).toBe("1");
    setB(2);
    flushSync();
    expect(div.innerHTML).toBe("2");
    setA(3);
    flushSync();
    expect(div.innerHTML).toBe("3");
    setA(0);
    flushSync();
    expect(div.innerHTML).toBe("2");
  });

  test("dispose", () => disposer());
});

describe("Testing keyed function handler Switch control flow", () => {
  let div!: HTMLDivElement, disposer: () => void;
  const [a, setA] = createSignal(0),
    [b, setB] = createSignal(0),
    [c, setC] = createSignal(0);
  const Component = () => (
    <div ref={div}>
      <Switch fallback={"fallback"}>
        <Match when={a()} keyed>
          {a => a()}
        </Match>
        <Match when={b()} keyed>
          {b => b()}
        </Match>
        <Match when={c()} keyed>
          {c => c()}
        </Match>
      </Switch>
    </div>
  );

  test("Create Switch control flow", () => {
    createRoot(dispose => {
      disposer = dispose;
      <Component />;
    });

    expect(div.innerHTML).toBe("fallback");
  });

  test("Toggle Switch control flow", () => {
    setC(1);
    flushSync();
    expect(div.innerHTML).toBe("1");
    setB(2);
    flushSync();
    expect(div.innerHTML).toBe("2");
    setA(3);
    flushSync();
    expect(div.innerHTML).toBe("3");
    setA(0);
    flushSync();
    expect(div.innerHTML).toBe("2");
  });

  test("dispose", () => disposer());
});

describe("Testing non-keyed function handler Switch control flow", () => {
  let div!: HTMLDivElement, disposer: () => void;
  const [a, setA] = createSignal(0),
    [b, setB] = createSignal(0),
    [c, setC] = createSignal(0);
  const Component = () => (
    <div ref={div}>
      <Switch fallback={"fallback"}>
        <Match when={a()}>{a => <>{a()}</>}</Match>
        <Match when={b()}>{b => <>{b()}</>}</Match>
        <Match when={c()}>{c => <>{c()}</>}</Match>
      </Switch>
    </div>
  );

  test("Create Switch control flow", () => {
    createRoot(dispose => {
      disposer = dispose;
      <Component />;
    });

    expect(div.innerHTML).toBe("fallback");
  });

  test("Toggle Switch control flow", () => {
    setC(1);
    flushSync();
    expect(div.innerHTML).toBe("1");
    setB(2);
    flushSync();
    expect(div.innerHTML).toBe("2");
    setA(3);
    flushSync();
    expect(div.innerHTML).toBe("3");
    setA(0);
    flushSync();
    expect(div.innerHTML).toBe("2");
  });

  test("dispose", () => disposer());
});

describe("Testing non-keyed function handler Switch control flow with dangling callback", () => {
  let div!: HTMLDivElement, disposer: () => void;
  const [a, setA] = createSignal(0),
    [b] = createSignal(2);
  let callback: () => void;
  let delayed: number;
  const Component = () => (
    <div ref={div}>
      <Switch fallback={"fallback"}>
        <Match when={a()}>{a => <>{a()}</>}</Match>
        <Match when={b()}>
          {b => {
            setTimeout(() => {
              expect(() => (delayed = b())).toThrow();
              callback();
            }, 0);
            return <>{b()}</>;
          }}
        </Match>
      </Switch>
    </div>
  );

  test("Create Switch control flow", () => {
    return new Promise<void>(c => {
      createRoot(dispose => {
        disposer = dispose;
        <Component />;
      });
      setA(1);
      flushSync();

      expect(div.innerHTML).toBe("1");
      callback = () => {
        expect(delayed).toBeUndefined();
        c();
      };
    });
  });

  test("dispose", () => disposer());
});

describe("Testing a For in a Switch control flow", () => {
  let div!: HTMLDivElement, disposer: () => void;
  const [state, setState] = createStore({
    users: [
      { firstName: "Jerry", certified: false },
      { firstName: "Janice", certified: false }
    ]
  });
  const Component = () => (
    <div ref={div}>
      <Switch fallback={"fallback"}>
        <For each={state.users}>
          {user => <Match when={user().certified}>{user().firstName}</Match>}
        </For>
      </Switch>
    </div>
  );

  test("Create Switch control flow", () => {
    createRoot(dispose => {
      disposer = dispose;
      <Component />;
    });

    expect(div.innerHTML).toBe("fallback");
  });

  test("Toggle Switch control flow", () => {
    setState(s => (s.users[1].certified = true));
    flushSync();
    expect(div.innerHTML).toBe("Janice");
    setState(s => (s.users[0].certified = true));
    flushSync();
    expect(div.innerHTML).toBe("Jerry");
    setState(s => s.users.unshift({ firstName: "Gordy", certified: true }));
    flushSync();
    expect(div.innerHTML).toBe("Gordy");
  });

  test("dispose", () => disposer());
});

describe("Test top level switch control flow", () => {
  let div = document.createElement("div"),
    disposer: () => void;
  const [count, setCount] = createSignal(0);
  const Component = () => (
    <Switch fallback={"fallback"}>
      <Match when={Boolean(count()) && count() < 2}>1</Match>
    </Switch>
  );

  test("Create switch control flow", () => {
    disposer = render(Component, div);

    expect(div.innerHTML).toBe("fallback");
    setCount(1);
    flushSync();
    expect(div.innerHTML).toBe("1");
  });

  test("dispose", () => disposer());
});
