// All hardware feeds the same semantic actions. Game rules never read key codes.
export const DIRECTIONS = ["up", "down", "right", "left"];
export const KEY_ACTIONS = {
  q: "up",
  ArrowUp: "up",
  a: "down",
  ArrowDown: "down",
  o: "left",
  ArrowLeft: "left",
  p: "right",
  ArrowRight: "right",
  " ": "interact",
  Enter: "interact",
  Escape: "cancel",
  1: "viewTop",
  2: "viewBottom",
  f: "fart",
  i: "inventory",
  5: "start",
  6: "start",
  Pause: "pause",
  r: "restart",
  v: "camera",
  m: "style",
};
export const STANDARD_BUTTONS = {
  0: "interact",
  1: "cancel",
  2: "inventory",
  3: "fart",
  4: "viewTop",
  5: "viewBottom",
  6: "sound",
  8: "restart",
  9: "pause",
  10: "camera",
  11: "style",
  12: "up",
  13: "down",
  14: "left",
  15: "right",
};

export function mapGamepad(pad, previousAxis = null) {
  const actions = new Set();
  for (const [button, action] of Object.entries(STANDARD_BUTTONS)) {
    const value = pad.buttons?.[button];
    if (value && (value.pressed || value.value > 0.55)) actions.add(action);
  }
  const x = Number(pad.axes?.[0]) || 0,
    y = Number(pad.axes?.[1]) || 0;
  const magnitude = Math.max(Math.abs(x), Math.abs(y));
  const threshold = previousAxis ? 0.22 : 0.32;
  let axis = null;
  if (magnitude > threshold) {
    axis =
      Math.abs(x) > Math.abs(y)
        ? x < 0
          ? "left"
          : "right"
        : y < 0
          ? "up"
          : "down";
    if (Math.abs(x) > 0.22) actions.add(x < 0 ? "left" : "right");
    if (Math.abs(y) > 0.22) actions.add(y < 0 ? "up" : "down");
  }
  return { actions, axis };
}

export class InputHub {
  constructor({
    onAction,
    onController = () => {},
    onDisconnect = () => {},
    getGamepads = () => navigator.getGamepads?.() || [],
  }) {
    this.onAction = onAction;
    this.onController = onController;
    this.onDisconnect = onDisconnect;
    this.getGamepads = getGamepads;
    this.sources = new Map();
    this.held = new Set();
    this.repeatAt = new Map();
    this.blockedPad = new Set();
    this.axisByPad = new Map();
    this.activePad = null;
    this.controllerText = "";
    this.generation = 0;
    this.padVector = { x: 0, y: 0 };
  }
  setSource(source, actions, now = performance.now()) {
    if (actions.size) this.sources.set(source, new Set(actions));
    else this.sources.delete(source);
    const next = new Set([...this.sources.values()].flatMap((set) => [...set]));
    const rising = [...next].filter((action) => !this.held.has(action));
    for (const action of this.held)
      if (!next.has(action)) this.repeatAt.delete(action);
    this.held = next;
    const generation = this.generation;
    for (const action of rising) {
      if (DIRECTIONS.includes(action)) this.repeatAt.set(action, now + 350);
      this.onAction(action, { repeat: false, source });
      if (generation !== this.generation) break;
    }
  }
  pulse(action) {
    this.setSource("button", new Set([action]));
    this.setSource("button", new Set());
  }
  direction() {
    return DIRECTIONS.find((action) => this.held.has(action)) || null;
  }
  vector() {
    const held = new Set(
      [...this.sources.entries()]
        .filter(([name]) => name !== "gamepad")
        .flatMap(([, actions]) => [...actions]),
    );
    return {
      x: Math.max(
        -1,
        Math.min(
          1,
          this.padVector.x +
            Number(held.has("right")) -
            Number(held.has("left")),
        ),
      ),
      y: Math.max(
        -1,
        Math.min(
          1,
          this.padVector.y + Number(held.has("down")) - Number(held.has("up")),
        ),
      ),
    };
  }
  clear() {
    // A held controller button must be released before it can trigger after reset/pause.
    this.blockedPad = new Set(this.held);
    this.sources.clear();
    this.held.clear();
    this.repeatAt.clear();
    this.padVector = { x: 0, y: 0 };
    this.generation++;
  }
  report(text) {
    if (text !== this.controllerText) {
      this.controllerText = text;
      this.onController(text);
    }
  }
  poll(now = performance.now()) {
    let pads;
    try {
      pads = [...this.getGamepads()].filter(
        (pad) => pad?.connected !== false && pad,
      );
    } catch {
      this.report(
        "Controller access unavailable in this browser; touch controls work.",
      );
      pads = [];
    }
    const previous = this.activePad;
    let active = pads.find((pad) => pad.index === previous);
    if (!active && previous !== null) {
      this.activePad = null;
      this.axisByPad.delete(previous);
      this.padVector = { x: 0, y: 0 };
      this.setSource("gamepad", new Set(), now);
      this.onDisconnect();
    }
    if (!active) active = pads[0];
    if (active) {
      this.activePad = active.index;
      const mapped = mapGamepad(active, this.axisByPad.get(active.index));
      this.axisByPad.set(active.index, mapped.axis);
      for (const action of this.blockedPad)
        if (!mapped.actions.has(action)) this.blockedPad.delete(action);
      const filtered = new Set(
        [...mapped.actions].filter((action) => !this.blockedPad.has(action)),
      );
      const pressed = (i) =>
        active.buttons?.[i]?.pressed || active.buttons?.[i]?.value > 0.55;
      const dpadX = Number(!!pressed(15)) - Number(!!pressed(14)),
        dpadY = Number(!!pressed(13)) - Number(!!pressed(12));
      const rawX = dpadX || dpadY ? dpadX : Number(active.axes?.[0]) || 0,
        rawY = dpadX || dpadY ? dpadY : Number(active.axes?.[1]) || 0;
      this.padVector = {
        x: filtered.has(rawX < 0 ? "left" : "right") ? rawX : 0,
        y: filtered.has(rawY < 0 ? "up" : "down") ? rawY : 0,
      };
      this.setSource("gamepad", filtered, now);
      const name = active.id?.replace(/\s*\(.*$/, "").slice(0, 55) || "Gamepad";
      this.report(
        `Controller: ${name}${active.mapping === "standard" ? " · standard" : " · browser mapping"}`,
      );
    } else {
      this.padVector = { x: 0, y: 0 };
      this.setSource("gamepad", new Set(), now);
      this.report(
        "Controller: press a pad button to connect. Touch controls also work.",
      );
    }
    for (const [action, deadline] of this.repeatAt)
      if (now >= deadline && this.held.has(action)) {
        this.repeatAt.set(action, now + 120);
        this.onAction(action, { repeat: true, source: "held" });
      }
  }
}

export function bindBrowserInputs(hub, { onBlur = () => {} } = {}) {
  const keyFor = (event) =>
    KEY_ACTIONS[event.key] || KEY_ACTIONS[event.key.toLowerCase()];
  window.addEventListener("keydown", (event) => {
    const action = keyFor(event);
    if (
      !action ||
      event.repeat ||
      /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)
    )
      return;
    // Leave Space/Enter on focused native buttons to their normal click activation.
    if (
      event.target.closest?.("button,summary,a") &&
      [" ", "Enter"].includes(event.key)
    )
      return;
    event.preventDefault();
    hub.setSource(`key:${event.code}`, new Set([action]));
  });
  window.addEventListener("keyup", (event) =>
    hub.setSource(`key:${event.code}`, new Set()),
  );
  const pointers = new Map();
  for (const button of document.querySelectorAll("[data-action]")) {
    button.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, button);
      button.classList.add("pressed");
      hub.setSource(
        `pointer:${event.pointerId}`,
        new Set([button.dataset.action]),
      );
    });
    const release = (event) => {
      pointers.delete(event.pointerId);
      if (![...pointers.values()].includes(button))
        button.classList.remove("pressed");
      hub.setSource(`pointer:${event.pointerId}`, new Set());
    };
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      button.addEventListener(type, release);
    // Keyboard and assistive-technology clicks have no pointerdown event.
    button.addEventListener("click", (event) => {
      if (event.detail === 0) hub.pulse(button.dataset.action);
    });
  }
  const suspend = () => {
    hub.clear();
    for (const button of pointers.values()) button.classList.remove("pressed");
    pointers.clear();
    onBlur();
  };
  window.addEventListener("blur", suspend);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) suspend();
  });
}
