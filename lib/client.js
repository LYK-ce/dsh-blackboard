window.__ModuleLoader__.load({ id: "dsh-blackboard", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;

"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// shared/protocol.ts
var SCENE_PATH = "/api/blackboard.scene";
var OPS_PATH = "/api/blackboard.ops";
var SNAPSHOT_PATH = "/api/blackboard.snapshot";

// client/locale.ts
var NS = "blackboard";
var zh = {
  "view.board": "\u753B\u677F",
  "guide.description": "\u5728\u8FD9\u4E00\u680F\u91CC\u548C agent \u4E00\u8D77\u753B\u753B",
  "tool.pen": "\u624B\u7ED8",
  "tool.line": "\u76F4\u7EBF",
  "tool.arrow": "\u7BAD\u5934",
  "tool.rect": "\u77E9\u5F62",
  "tool.circle": "\u5706",
  "tool.text": "\u6587\u5B57",
  "tool.textPrompt": "\u6587\u5B57\u5185\u5BB9",
  "action.undo": "\u64A4\u9500\u4E0A\u4E00\u7B14",
  "action.clear": "\u6E05\u7A7A",
  "action.send": "\u53D1\u7ED9 agent",
  "send.message": "\u8FD9\u662F\u6211\u753B\u7684\u9ED1\u677F\u3002",
  "send.sent": "\u5DF2\u53D1\u7ED9 agent\u3002",
  "send.leftAttachments": "\u5DF2\u53D1\u7ED9 agent\uFF1B\u8F93\u5165\u680F\u91CC\u7684 {count} \u4E2A\u9644\u4EF6\u6CA1\u6709\u88AB\u5E26\u4E0A\u3002",
  "send.failed": "\u53D1\u9001\u5931\u8D25\uFF1A{reason}",
  "status.failed": "\u64CD\u4F5C\u5931\u8D25\uFF1A{reason}",
  "status.elements": "\u753B\u677F\u4E0A\u6709 {count} \u4E2A\u5143\u7D20"
};
var en = {
  "view.board": "Blackboard",
  "guide.description": "Draw on a board shared with the agent",
  "tool.pen": "Freehand",
  "tool.line": "Line",
  "tool.arrow": "Arrow",
  "tool.rect": "Rectangle",
  "tool.circle": "Circle",
  "tool.text": "Text",
  "tool.textPrompt": "Text to place",
  "action.undo": "Undo last stroke",
  "action.clear": "Clear",
  "action.send": "Send to agent",
  "send.message": "This is what I drew on the blackboard.",
  "send.sent": "Sent to the agent.",
  "send.leftAttachments": "Sent to the agent; {count} attachment(s) in the composer were not included.",
  "send.failed": "Send failed: {reason}",
  "status.failed": "Failed: {reason}",
  "status.elements": "The board has {count} element(s)"
};

// client/panel.tsx
var import_react = require("react");

// core/assert.ts
function assertNever(value) {
  throw new Error(`unreachable variant: ${JSON.stringify(value)}`);
}

// core/commands.ts
var PALETTE = ["#1e1e1e", "#e03131", "#2f9e44", "#1971c2", "#f08c00"];
var DEFAULT_COLOR = "#1e1e1e";
var DEFAULT_WIDTH = 4;
var DEFAULT_FONT_SIZE = 32;

// node_modules/.pnpm/perfect-freehand@1.2.3/node_modules/perfect-freehand/dist/esm/index.mjs
var { PI: e } = Math;
var t = e + 1e-4;
var n = 0.5;
var r = [1, 1];
function i(e2, t2, n2, r2 = (e3) => e3) {
  return e2 * r2(0.5 - t2 * (0.5 - n2));
}
var { min: a } = Math;
function o(e2, t2, n2) {
  let r2 = a(1, t2 / n2);
  return a(1, e2 + (a(1, 1 - r2) - e2) * (r2 * 0.275));
}
function s(e2) {
  return [-e2[0], -e2[1]];
}
function c(e2, t2) {
  return [e2[0] + t2[0], e2[1] + t2[1]];
}
function l(e2, t2, n2) {
  return e2[0] = t2[0] + n2[0], e2[1] = t2[1] + n2[1], e2;
}
function u(e2, t2) {
  return [e2[0] - t2[0], e2[1] - t2[1]];
}
function d(e2, t2, n2) {
  return e2[0] = t2[0] - n2[0], e2[1] = t2[1] - n2[1], e2;
}
function f(e2, t2) {
  return [e2[0] * t2, e2[1] * t2];
}
function p(e2, t2, n2) {
  return e2[0] = t2[0] * n2, e2[1] = t2[1] * n2, e2;
}
function m(e2, t2) {
  return [e2[0] / t2, e2[1] / t2];
}
function h(e2) {
  return [e2[1], -e2[0]];
}
function g(e2, t2) {
  let n2 = t2[0];
  return e2[0] = t2[1], e2[1] = -n2, e2;
}
function ee(e2, t2) {
  return e2[0] * t2[0] + e2[1] * t2[1];
}
function _(e2, t2) {
  return e2[0] === t2[0] && e2[1] === t2[1];
}
function v(e2) {
  return Math.hypot(e2[0], e2[1]);
}
function y(e2, t2) {
  let n2 = e2[0] - t2[0], r2 = e2[1] - t2[1];
  return n2 * n2 + r2 * r2;
}
function b(e2) {
  return m(e2, v(e2));
}
function x(e2, t2) {
  return Math.hypot(e2[1] - t2[1], e2[0] - t2[0]);
}
function S(e2, t2, n2) {
  let r2 = Math.sin(n2), i2 = Math.cos(n2), a2 = e2[0] - t2[0], o2 = e2[1] - t2[1], s2 = a2 * i2 - o2 * r2, c2 = a2 * r2 + o2 * i2;
  return [s2 + t2[0], c2 + t2[1]];
}
function C(e2, t2, n2, r2) {
  let i2 = Math.sin(r2), a2 = Math.cos(r2), o2 = t2[0] - n2[0], s2 = t2[1] - n2[1], c2 = o2 * a2 - s2 * i2, l2 = o2 * i2 + s2 * a2;
  return e2[0] = c2 + n2[0], e2[1] = l2 + n2[1], e2;
}
function w(e2, t2, n2) {
  return c(e2, f(u(t2, e2), n2));
}
function te(e2, t2, n2, r2) {
  let i2 = n2[0] - t2[0], a2 = n2[1] - t2[1];
  return e2[0] = t2[0] + i2 * r2, e2[1] = t2[1] + a2 * r2, e2;
}
function T(e2, t2, n2) {
  return c(e2, f(t2, n2));
}
var E = [0, 0];
var D = [0, 0];
var O = [0, 0];
function k(e2, n2) {
  let r2 = T(e2, b(h(u(e2, c(e2, [1, 1])))), -n2), i2 = [], a2 = 1 / 13;
  for (let n3 = a2; n3 <= 1; n3 += a2) i2.push(S(r2, e2, t * 2 * n3));
  return i2;
}
function A(e2, n2, r2) {
  let i2 = [], a2 = 1 / r2;
  for (let r3 = a2; r3 <= 1; r3 += a2) i2.push(S(n2, e2, t * r3));
  return i2;
}
function j(e2, t2, n2) {
  let r2 = u(t2, n2), i2 = f(r2, 0.5), a2 = f(r2, 0.51);
  return [u(e2, i2), u(e2, a2), c(e2, a2), c(e2, i2)];
}
function M(e2, n2, r2, i2) {
  let a2 = [], o2 = T(e2, n2, r2), s2 = 1 / i2;
  for (let n3 = s2; n3 < 1; n3 += s2) a2.push(S(o2, e2, t * 3 * n3));
  return a2;
}
function ne(e2, t2, n2) {
  return [c(e2, f(t2, n2)), c(e2, f(t2, n2 * 0.99)), u(e2, f(t2, n2 * 0.99)), u(e2, f(t2, n2))];
}
function N(e2, t2, n2) {
  return e2 === false || e2 === void 0 ? 0 : e2 === true ? Math.max(t2, n2) : e2;
}
function re(e2, t2, n2) {
  return e2.slice(0, 10).reduce((e3, r2) => {
    let i2 = r2.pressure;
    return t2 && (i2 = o(e3, r2.distance, n2)), (e3 + i2) / 2;
  }, e2[0].pressure);
}
function P(e2, n2 = {}) {
  let { size: r2 = 16, smoothing: a2 = 0.5, thinning: f2 = 0.5, simulatePressure: m2 = true, easing: _2 = (e3) => e3, start: v2 = {}, end: b2 = {}, last: x2 = false } = n2, { cap: S2 = true, easing: w2 = (e3) => e3 * (2 - e3) } = v2, { cap: T2 = true, easing: P2 = (e3) => --e3 * e3 * e3 + 1 } = b2;
  if (e2.length === 0 || r2 <= 0) return [];
  let F2 = e2[e2.length - 1].runningLength, I2 = N(v2.taper, r2, F2), L2 = N(b2.taper, r2, F2), R2 = (r2 * a2) ** 2, z = [], B = [], V = re(e2, m2, r2), H = i(r2, f2, e2[e2.length - 1].pressure, _2), U, W = e2[0].vector, G = e2[0].point, K = G, q = G, J = K, Y = false;
  for (let n3 = 0; n3 < e2.length; n3++) {
    let { pressure: a3 } = e2[n3], { point: s2, vector: h2, distance: v3, runningLength: b3 } = e2[n3], x3 = n3 === e2.length - 1;
    if (!x3 && F2 - b3 < 3) continue;
    f2 ? (m2 && (a3 = o(V, v3, r2)), H = i(r2, f2, a3, _2)) : H = r2 / 2, U === void 0 && (U = H);
    let S3 = b3 < I2 ? w2(b3 / I2) : 1, T3 = F2 - b3 < L2 ? P2((F2 - b3) / L2) : 1;
    H = Math.max(0.01, H * Math.min(S3, T3));
    let k2 = (x3 ? e2[n3] : e2[n3 + 1]).vector, A2 = x3 ? 1 : ee(h2, k2), j2 = ee(h2, W) < 0 && !Y, M2 = A2 !== null && A2 < 0;
    if (j2 || M2) {
      g(E, W), p(E, E, H);
      for (let e3 = 0; e3 <= 1; e3 += 0.07692307692307693) d(D, s2, E), C(D, D, s2, t * e3), q = [D[0], D[1]], z.push(q), l(O, s2, E), C(O, O, s2, t * -e3), J = [O[0], O[1]], B.push(J);
      G = q, K = J, M2 && (Y = true);
      continue;
    }
    if (Y = false, x3) {
      g(E, h2), p(E, E, H), z.push(u(s2, E)), B.push(c(s2, E));
      continue;
    }
    te(E, k2, h2, A2), g(E, E), p(E, E, H), d(D, s2, E), q = [D[0], D[1]], (n3 <= 1 || y(G, q) > R2) && (z.push(q), G = q), l(O, s2, E), J = [O[0], O[1]], (n3 <= 1 || y(K, J) > R2) && (B.push(J), K = J), V = a3, W = h2;
  }
  let X = [e2[0].point[0], e2[0].point[1]], Z = e2.length > 1 ? [e2[e2.length - 1].point[0], e2[e2.length - 1].point[1]] : c(e2[0].point, [1, 1]), Q = [], $ = [];
  if (e2.length === 1) {
    if (!(I2 || L2) || x2) return k(X, U || H);
  } else {
    I2 || L2 && e2.length === 1 || (S2 ? Q.push(...A(X, B[0], 13)) : Q.push(...j(X, z[0], B[0])));
    let t2 = h(s(e2[e2.length - 1].vector));
    L2 || I2 && e2.length === 1 ? $.push(Z) : T2 ? $.push(...M(Z, t2, H, 29)) : $.push(...ne(Z, t2, H));
  }
  return z.concat($, B.reverse(), Q);
}
var F = [0, 0];
function I(e2) {
  return e2 != null && e2 >= 0;
}
function L(e2, t2 = {}) {
  let { streamline: i2 = 0.5, size: a2 = 16, last: o2 = false } = t2;
  if (e2.length === 0) return [];
  let s2 = 0.15 + (1 - i2) * 0.85, l2 = Array.isArray(e2[0]) ? e2 : e2.map(({ x: e3, y: t3, pressure: r2 = n }) => [e3, t3, r2]);
  if (l2.length === 2) {
    let e3 = l2[1];
    l2 = l2.slice(0, -1);
    for (let t3 = 1; t3 < 5; t3++) l2.push(w(l2[0], e3, t3 / 4));
  }
  l2.length === 1 && (l2 = [...l2, [...c(l2[0], r), ...l2[0].slice(2)]]);
  let u2 = [{ point: [l2[0][0], l2[0][1]], pressure: I(l2[0][2]) ? l2[0][2] : 0.25, vector: [...r], distance: 0, runningLength: 0 }], f2 = false, p2 = 0, m2 = u2[0], h2 = l2.length - 1;
  for (let e3 = 1; e3 < l2.length; e3++) {
    let t3 = o2 && e3 === h2 ? [l2[e3][0], l2[e3][1]] : w(m2.point, l2[e3], s2);
    if (_(m2.point, t3)) continue;
    let r2 = x(t3, m2.point);
    if (p2 += r2, e3 < h2 && !f2) {
      if (p2 < a2) continue;
      f2 = true;
    }
    d(F, m2.point, t3), m2 = { point: t3, pressure: I(l2[e3][2]) ? l2[e3][2] : n, vector: b(F), distance: r2, runningLength: p2 }, u2.push(m2);
  }
  return u2[0].vector = u2[1]?.vector || [0, 0], u2;
}
function R(e2, t2 = {}) {
  return P(L(e2, t2), t2);
}

// core/render.ts
var STROKE_STYLE = {
  sizeFactor: 2,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5
};
var ARROW_MIN_LENGTH = 8;
var ARROW_LENGTH_PER_WIDTH = 4;
var ARROW_HALF_ANGLE = Math.PI / 7;
function render(ctx, scene, viewport) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(viewport.scale, 0, 0, viewport.scale, viewport.offsetX, viewport.offsetY);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const element of scene.elements) {
    if (element.isDeleted) continue;
    switch (element.type) {
      case "line":
      case "arrow":
        drawLinear(ctx, element);
        break;
      case "rect":
        drawRect(ctx, element);
        break;
      case "ellipse":
        drawEllipse(ctx, element);
        break;
      case "text":
        drawText(ctx, element);
        break;
      case "stroke":
        drawStroke(ctx, element);
        break;
      default:
        assertNever(element);
    }
  }
}
function drawLinear(ctx, element) {
  const points = element.points;
  const start = points[0];
  if (start === void 0) return;
  ctx.strokeStyle = element.strokeColor;
  ctx.lineWidth = element.strokeWidth;
  ctx.beginPath();
  ctx.moveTo(element.x + start.x, element.y + start.y);
  for (const point of points) ctx.lineTo(element.x + point.x, element.y + point.y);
  ctx.stroke();
  if (element.type === "arrow") drawArrowHead(ctx, element);
}
function drawArrowHead(ctx, element) {
  const tip = element.points[element.points.length - 1];
  const before = element.points[element.points.length - 2];
  if (tip === void 0 || before === void 0) return;
  const tipX = element.x + tip.x;
  const tipY = element.y + tip.y;
  const angle = Math.atan2(tip.y - before.y, tip.x - before.x);
  const length = Math.max(ARROW_MIN_LENGTH, element.strokeWidth * ARROW_LENGTH_PER_WIDTH);
  ctx.fillStyle = element.strokeColor;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - length * Math.cos(angle - ARROW_HALF_ANGLE), tipY - length * Math.sin(angle - ARROW_HALF_ANGLE));
  ctx.lineTo(tipX - length * Math.cos(angle + ARROW_HALF_ANGLE), tipY - length * Math.sin(angle + ARROW_HALF_ANGLE));
  ctx.closePath();
  ctx.fill();
}
function drawRect(ctx, element) {
  if (element.fill !== void 0) {
    ctx.fillStyle = element.fill;
    ctx.fillRect(element.x, element.y, element.width, element.height);
  }
  ctx.strokeStyle = element.strokeColor;
  ctx.lineWidth = element.strokeWidth;
  ctx.strokeRect(element.x, element.y, element.width, element.height);
}
function drawEllipse(ctx, element) {
  ctx.beginPath();
  ctx.ellipse(element.x + element.width / 2, element.y + element.height / 2, element.width / 2, element.height / 2, 0, 0, 2 * Math.PI);
  if (element.fill !== void 0) {
    ctx.fillStyle = element.fill;
    ctx.fill();
  }
  ctx.strokeStyle = element.strokeColor;
  ctx.lineWidth = element.strokeWidth;
  ctx.stroke();
}
function drawText(ctx, element) {
  ctx.font = `${element.fontSize}px sans-serif`;
  ctx.textAlign = element.align === "middle" ? "center" : element.align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = element.strokeColor;
  ctx.fillText(element.text, element.x, element.y);
}
function drawStroke(ctx, element) {
  const outline = R(
    element.points.map((point) => [element.x + point.x, element.y + point.y]),
    {
      size: element.strokeWidth * STROKE_STYLE.sizeFactor,
      thinning: STROKE_STYLE.thinning,
      smoothing: STROKE_STYLE.smoothing,
      streamline: STROKE_STYLE.streamline,
      simulatePressure: true,
      last: true
    }
  );
  const start = outline[0];
  if (start === void 0) return;
  ctx.beginPath();
  ctx.moveTo(start[0], start[1]);
  for (const point of outline) ctx.lineTo(point[0], point[1]);
  ctx.closePath();
  ctx.fillStyle = element.strokeColor;
  ctx.fill();
}

// core/scene.ts
function relativeBox(points) {
  const first = points[0] ?? { x: 0, y: 0 };
  let minX = first.x;
  let minY = first.y;
  let maxX = first.x;
  let maxY = first.y;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    points: points.map((point) => ({ x: point.x - minX, y: point.y - minY }))
  };
}
function linearElement(id, type, box, color, width) {
  const common = {
    id,
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    points: box.points,
    strokeColor: color,
    strokeWidth: width,
    isDeleted: false
  };
  return type === "stroke" ? { ...common, type: "stroke" } : { ...common, type };
}
function createScene() {
  return { elements: [], nextId: 0 };
}
function applyCommands(scene, commands) {
  const elements = [...scene.elements];
  let nextId = scene.nextId;
  const add = (create) => {
    elements.push(create(`e${nextId}`));
    nextId += 1;
  };
  for (const command of commands) {
    switch (command.op) {
      case "line":
      case "arrow": {
        const box = relativeBox([command.from, command.to]);
        add((id) => linearElement(id, command.op, box, command.color, command.width));
        break;
      }
      case "stroke": {
        const box = relativeBox(command.points);
        add((id) => linearElement(id, "stroke", box, command.color, command.width));
        break;
      }
      case "rect": {
        const x2 = Math.min(command.at.x, command.at.x + command.size.x);
        const y2 = Math.min(command.at.y, command.at.y + command.size.y);
        add((id) => ({
          id,
          type: "rect",
          x: x2,
          y: y2,
          width: Math.abs(command.size.x),
          height: Math.abs(command.size.y),
          strokeColor: command.color,
          strokeWidth: command.width,
          isDeleted: false,
          ...command.fill === void 0 ? {} : { fill: command.fill }
        }));
        break;
      }
      case "circle": {
        const radius = Math.abs(command.radius);
        add((id) => ({
          id,
          type: "ellipse",
          x: command.center.x - radius,
          y: command.center.y - radius,
          width: radius * 2,
          height: radius * 2,
          strokeColor: command.color,
          strokeWidth: command.width,
          isDeleted: false,
          ...command.fill === void 0 ? {} : { fill: command.fill }
        }));
        break;
      }
      case "text":
        add((id) => ({
          id,
          type: "text",
          x: command.at.x,
          y: command.at.y,
          // 文字外接框是渲染期派生数据：这里没有 canvas 可测，所以留 0，真实尺寸由渲染层按字体算。
          width: 0,
          height: 0,
          text: command.text,
          fontSize: command.size,
          align: command.align ?? "start",
          strokeColor: command.color,
          // 文字用填充绘制，没有描边宽度可言。
          strokeWidth: 0,
          isDeleted: false
        }));
        break;
      case "erase": {
        const erased = new Set(command.ids);
        for (let index = 0; index < elements.length; index += 1) {
          const element = elements[index];
          if (element === void 0 || !erased.has(element.id)) continue;
          elements[index] = { ...element, isDeleted: true };
        }
        break;
      }
      case "clear":
        elements.length = 0;
        break;
      default:
        assertNever(command);
    }
  }
  return { elements, nextId };
}

// core/simplify.ts
var MIN_POINT_DISTANCE = 2;
var RDP_EPSILON = 2;
function filterByMinDistance(points, minDistance) {
  const kept = [];
  for (const point of points) {
    const previous = kept[kept.length - 1];
    if (previous === void 0 || Math.hypot(point.x - previous.x, point.y - previous.y) >= minDistance) kept.push(point);
  }
  return kept;
}
function reduce(points, epsilon) {
  const first = points[0];
  const last = points[points.length - 1];
  if (first === void 0 || last === void 0 || points.length <= 2) return points;
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const chord = Math.hypot(dx, dy);
  if (chord === 0) return points;
  let farthest = -1;
  let index = 0;
  for (let cursor = 1; cursor < points.length - 1; cursor += 1) {
    const point = points[cursor];
    if (point === void 0) continue;
    const distance = Math.abs(dy * (point.x - first.x) - dx * (point.y - first.y)) / chord;
    if (distance > farthest) {
      farthest = distance;
      index = cursor;
    }
  }
  if (farthest <= epsilon) return [first, last];
  const head = reduce(points.slice(0, index + 1), epsilon);
  const tail = reduce(points.slice(index), epsilon);
  return [...head.slice(0, -1), ...tail];
}
function simplifyRdp(points, epsilon) {
  return reduce([...points], epsilon);
}

// core/viewport.ts
var VIRTUAL_SIZE = 1e3;
var MAX_SCALE_FACTOR = 8;
function fitViewport(canvasWidthPx, canvasHeightPx) {
  const scale = Math.min(canvasWidthPx, canvasHeightPx) / VIRTUAL_SIZE;
  return {
    scale,
    offsetX: (canvasWidthPx - VIRTUAL_SIZE * scale) / 2,
    offsetY: (canvasHeightPx - VIRTUAL_SIZE * scale) / 2
  };
}
function screenToVirtual(x2, y2, viewport) {
  return {
    x: (x2 - viewport.offsetX) / viewport.scale,
    y: (y2 - viewport.offsetY) / viewport.scale
  };
}
function panBy(viewport, dx, dy) {
  return { scale: viewport.scale, offsetX: viewport.offsetX + dx, offsetY: viewport.offsetY + dy };
}
function zoomAt(viewport, factor, at, fitScale) {
  const scale = Math.min(Math.max(viewport.scale * factor, fitScale), fitScale * MAX_SCALE_FACTOR);
  const ratio = scale / viewport.scale;
  return {
    scale,
    offsetX: at.x - (at.x - viewport.offsetX) * ratio,
    offsetY: at.y - (at.y - viewport.offsetY) * ratio
  };
}
function clampViewport(viewport, fit, canvasWidthPx, canvasHeightPx) {
  if (viewport.scale <= fit.scale) return fit;
  const board = VIRTUAL_SIZE * viewport.scale;
  const clampAxis = (offset, canvasPx) => Math.min(Math.max(offset, canvasPx / 2 - board), canvasPx / 2);
  return {
    scale: viewport.scale,
    offsetX: clampAxis(viewport.offsetX, canvasWidthPx),
    offsetY: clampAxis(viewport.offsetY, canvasHeightPx)
  };
}

// client/canvas.ts
var DEFAULT_STYLE = { tool: "pen", color: DEFAULT_COLOR, width: DEFAULT_WIDTH };
var ZOOM_STEP = 1.15;
function context2d(canvas) {
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("blackboard: the browser returned no 2D context");
  return ctx;
}
function mountCanvas(host, options) {
  const stage = document.createElement("div");
  stage.style.cssText = "position:absolute;inset:0;touch-action:none;cursor:crosshair;background:#ffffff";
  const sceneCanvas = document.createElement("canvas");
  const liveCanvas = document.createElement("canvas");
  for (const canvas of [sceneCanvas, liveCanvas]) {
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
    stage.append(canvas);
  }
  host.append(stage);
  const sceneCtx = context2d(sceneCanvas);
  const liveCtx = context2d(liveCanvas);
  let scene = createScene();
  let fit = fitViewport(1, 1);
  let viewport = fit;
  let size = { width: 1, height: 1 };
  let gesture;
  let pan;
  const toVirtual = (event) => {
    const rect = stage.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    return screenToVirtual((event.clientX - rect.left) * dpr, (event.clientY - rect.top) * dpr, viewport);
  };
  const penPoints = (raw) => simplifyRdp(filterByMinDistance(raw, MIN_POINT_DISTANCE), RDP_EPSILON);
  const commandOf = (current) => {
    switch (current.tool) {
      case "pen":
        return { op: "stroke", points: penPoints(current.raw), color: current.color, width: current.width };
      case "line":
        return { op: "line", from: current.origin, to: current.current, color: current.color, width: current.width };
      case "arrow":
        return { op: "arrow", from: current.origin, to: current.current, color: current.color, width: current.width };
      case "rect":
        return {
          op: "rect",
          at: {
            x: Math.min(current.origin.x, current.current.x),
            y: Math.min(current.origin.y, current.current.y)
          },
          size: {
            x: Math.abs(current.current.x - current.origin.x),
            y: Math.abs(current.current.y - current.origin.y)
          },
          color: current.color,
          width: current.width
        };
      case "circle":
        return {
          op: "circle",
          center: current.origin,
          radius: Math.hypot(current.current.x - current.origin.x, current.current.y - current.origin.y),
          color: current.color,
          width: current.width
        };
      default:
        assertNever(current.tool);
    }
  };
  const drawLive = () => {
    const preview = gesture === void 0 ? createScene() : applyCommands(createScene(), [commandOf(gesture)]);
    render(liveCtx, preview, viewport);
  };
  const redraw = () => {
    render(sceneCtx, scene, viewport);
    drawLive();
  };
  const onPointerDown = (event) => {
    if (event.button === 1) {
      if (gesture !== void 0) return;
      event.preventDefault();
      pan = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      stage.setPointerCapture(event.pointerId);
      stage.style.cursor = "grabbing";
      return;
    }
    if (event.button !== 0) return;
    const point = toVirtual(event);
    const style = options.style();
    if (style.tool === "text") {
      const text = options.askText();
      if (text === null || text === "") return;
      options.onCommand({ op: "text", at: point, text, size: DEFAULT_FONT_SIZE, color: style.color });
      return;
    }
    stage.setPointerCapture(event.pointerId);
    gesture = {
      pointerId: event.pointerId,
      tool: style.tool,
      color: style.color,
      width: style.width,
      origin: point,
      current: point,
      raw: [point]
    };
    drawLive();
  };
  const onPointerMove = (event) => {
    if (pan !== void 0) {
      if (event.pointerId !== pan.pointerId) return;
      const dpr = window.devicePixelRatio;
      viewport = clampViewport(
        panBy(viewport, (event.clientX - pan.x) * dpr, (event.clientY - pan.y) * dpr),
        fit,
        size.width,
        size.height
      );
      pan.x = event.clientX;
      pan.y = event.clientY;
      redraw();
      return;
    }
    if (gesture === void 0 || event.pointerId !== gesture.pointerId) return;
    const point = toVirtual(event);
    gesture.current = point;
    if (gesture.tool === "pen") gesture.raw.push(point);
    drawLive();
  };
  const onPointerUp = (event) => {
    if (pan !== void 0 && event.pointerId === pan.pointerId) {
      pan = void 0;
      stage.style.cursor = "crosshair";
      return;
    }
    if (gesture === void 0 || event.pointerId !== gesture.pointerId) return;
    const point = toVirtual(event);
    gesture.current = point;
    if (gesture.tool === "pen") gesture.raw.push(point);
    const command = commandOf(gesture);
    gesture = void 0;
    drawLive();
    options.onCommand(command);
  };
  const onPointerCancel = (event) => {
    if (pan !== void 0 && event.pointerId === pan.pointerId) {
      pan = void 0;
      stage.style.cursor = "crosshair";
      return;
    }
    if (gesture === void 0 || event.pointerId !== gesture.pointerId) return;
    gesture = void 0;
    drawLive();
  };
  const onWheel = (event) => {
    event.preventDefault();
    const rect = stage.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    const at = { x: (event.clientX - rect.left) * dpr, y: (event.clientY - rect.top) * dpr };
    const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    viewport = clampViewport(zoomAt(viewport, factor, at, fit.scale), fit, size.width, size.height);
    redraw();
  };
  const swallowMiddle = (event) => {
    if (event.button === 1) event.preventDefault();
  };
  const resize = () => {
    const rect = stage.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    for (const canvas of [sceneCanvas, liveCanvas]) {
      canvas.width = width;
      canvas.height = height;
    }
    const center = screenToVirtual(size.width / 2, size.height / 2, viewport);
    const factor = Math.min(viewport.scale / fit.scale, MAX_SCALE_FACTOR);
    size = { width, height };
    fit = fitViewport(width, height);
    const scale = fit.scale * factor;
    viewport = clampViewport(
      { scale, offsetX: width / 2 - center.x * scale, offsetY: height / 2 - center.y * scale },
      fit,
      width,
      height
    );
    redraw();
  };
  stage.addEventListener("pointerdown", onPointerDown);
  stage.addEventListener("pointermove", onPointerMove);
  stage.addEventListener("pointerup", onPointerUp);
  stage.addEventListener("pointercancel", onPointerCancel);
  stage.addEventListener("wheel", onWheel, { passive: false });
  stage.addEventListener("mousedown", swallowMiddle);
  stage.addEventListener("auxclick", swallowMiddle);
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  resize();
  return {
    update: (next) => {
      scene = next;
      render(sceneCtx, scene, viewport);
    },
    // 只导场景层：实时层是还没提交的手势，不该进图。
    // `view` 导人当前看到的画面；`board` 另开一张方图按 1:1 渲染整块板，与缩放/平移无关。
    toPng: (scope = "view") => new Promise((resolve, reject) => {
      const sheet = document.createElement("canvas");
      if (scope === "board") {
        const px = 1024;
        const layer = document.createElement("canvas");
        layer.width = px;
        layer.height = px;
        render(context2d(layer), scene, { scale: px / 1e3, offsetX: 0, offsetY: 0 });
        sheet.width = px;
        sheet.height = px;
        const ctx = context2d(sheet);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, px, px);
        ctx.drawImage(layer, 0, 0);
      } else {
        sheet.width = sceneCanvas.width;
        sheet.height = sceneCanvas.height;
        const ctx = context2d(sheet);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, sheet.width, sheet.height);
        ctx.drawImage(sceneCanvas, 0, 0);
      }
      sheet.toBlob((blob) => {
        if (blob === null) reject(new Error("blackboard: the canvas produced no PNG"));
        else resolve(blob);
      }, "image/png");
    }),
    dispose: () => {
      observer.disconnect();
      stage.removeEventListener("pointerdown", onPointerDown);
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerup", onPointerUp);
      stage.removeEventListener("pointercancel", onPointerCancel);
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("mousedown", swallowMiddle);
      stage.removeEventListener("auxclick", swallowMiddle);
      stage.remove();
    }
  };
}

// client/panel.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var BUTTON = {
  minWidth: 28,
  height: 26,
  padding: "0 8px",
  cursor: "pointer",
  border: "1px solid var(--dsw-alias-border-l2, #d0d0d0)",
  borderRadius: 6,
  background: "var(--dsw-alias-bg-layer-2, #f7f7f7)",
  color: "inherit",
  font: "inherit"
};
var TOOLS = [
  { tool: "pen", glyph: "\u270E", key: "tool.pen" },
  { tool: "line", glyph: "\u2571", key: "tool.line" },
  { tool: "arrow", glyph: "\u2197", key: "tool.arrow" },
  { tool: "rect", glyph: "\u25AD", key: "tool.rect" },
  { tool: "circle", glyph: "\u25EF", key: "tool.circle" },
  { tool: "text", glyph: "T", key: "tool.text" }
];
var WIDTHS = [2, 4, 8];
function describe(error) {
  return error instanceof Error ? error.message : String(error);
}
function BlackboardPanel({ t: t2, useScene, useSnapshotRequest, draw, ask, snapshot }) {
  const [style, setStyle] = (0, import_react.useState)(DEFAULT_STYLE);
  const [status, setStatus] = (0, import_react.useState)("");
  const scene = useScene((snapshot2) => snapshot2);
  const host = (0, import_react.useRef)(null);
  const canvas = (0, import_react.useRef)(null);
  const lastAdded = (0, import_react.useRef)(void 0);
  const submit = (commands) => {
    void draw(commands).then(
      (added) => {
        lastAdded.current = added[added.length - 1];
      },
      (error) => {
        setStatus(t2("status.failed", { reason: describe(error) }));
      }
    );
  };
  const latest = (0, import_react.useRef)({ style, submit, prompt: t2("tool.textPrompt") });
  (0, import_react.useEffect)(() => {
    latest.current = { style, submit, prompt: t2("tool.textPrompt") };
  });
  (0, import_react.useEffect)(() => {
    const container = host.current;
    if (container === null) return void 0;
    const handle = mountCanvas(container, {
      style: () => latest.current.style,
      askText: () => window.prompt(latest.current.prompt),
      onCommand: (command) => {
        latest.current.submit([command]);
      }
    });
    canvas.current = handle;
    return () => {
      canvas.current = null;
      handle.dispose();
    };
  }, []);
  (0, import_react.useEffect)(() => {
    canvas.current?.update(scene);
  }, [scene]);
  const want = useSnapshotRequest((value) => value);
  (0, import_react.useEffect)(() => {
    if (want === null) return;
    const handle = canvas.current;
    if (handle === null) return;
    void handle.toPng("board").then(
      (png) => snapshot(want, png),
      (error) => {
        setStatus(t2("status.failed", { reason: describe(error) }));
      }
    );
  }, [want, snapshot, t2]);
  const elements = scene.elements.reduce((count, element) => element.isDeleted ? count : count + 1, 0);
  const undo = () => {
    const id = lastAdded.current;
    if (id === void 0) return;
    lastAdded.current = void 0;
    submit([{ op: "erase", ids: [id] }]);
  };
  const clear = () => {
    lastAdded.current = void 0;
    submit([{ op: "clear" }]);
  };
  const send = async () => {
    const handle = canvas.current;
    if (handle === null) return;
    try {
      const result = await ask(await handle.toPng(), t2("send.message"));
      setStatus(result.ok ? result.left === 0 ? t2("send.sent") : t2("send.leftAttachments", { count: result.left }) : t2("send.failed", { reason: result.reason }));
    } catch (error) {
      setStatus(t2("send.failed", { reason: describe(error) }));
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      style: {
        display: "flex",
        // 侧栏的 panelBody 是 row 方向的 flex 容器，根节点得自己撑开宽高（终端同理）。
        flex: "1 1 auto",
        flexDirection: "column",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        background: "var(--dsw-alias-bg-base, #ffffff)",
        color: "var(--dsw-alias-label-primary, #1e1e1e)",
        font: "inherit"
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "div",
          {
            style: {
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 4,
              padding: "6px 8px",
              borderBottom: "1px solid var(--dsw-alias-border-l1, #e5e5e5)"
            },
            children: [
              TOOLS.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  type: "button",
                  title: t2(entry.key),
                  "aria-pressed": style.tool === entry.tool,
                  onClick: () => {
                    setStyle({ ...style, tool: entry.tool });
                  },
                  style: BUTTON,
                  children: entry.glyph
                },
                entry.tool
              )),
              PALETTE.map((color) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  type: "button",
                  title: color,
                  "aria-pressed": style.color === color,
                  onClick: () => {
                    setStyle({ ...style, color });
                  },
                  style: { ...BUTTON, background: color, padding: 0 }
                },
                color
              )),
              WIDTHS.map((width) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  type: "button",
                  "aria-pressed": style.width === width,
                  onClick: () => {
                    setStyle({ ...style, width });
                  },
                  style: BUTTON,
                  children: String(width)
                },
                width
              )),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: undo, style: BUTTON, children: t2("action.undo") }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: clear, style: BUTTON, children: t2("action.clear") }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => {
                void send();
              }, style: BUTTON, children: t2("action.send") }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { marginLeft: "auto", opacity: 0.7 }, children: t2("status.elements", { count: elements }) })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: host, style: { position: "relative", flex: "1 1 auto", minHeight: 0 } }),
        status === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: "4px 8px", opacity: 0.8 }, children: status })
      ]
    }
  );
}

// shared/ops.ts
var ID_SUFFIX = /^e(\d+)$/;
function nextIdAfter(nextId, id) {
  const match = ID_SUFFIX.exec(id);
  const value = match === null ? Number.NaN : Number(match[1]);
  return Number.isSafeInteger(value) && value + 1 > nextId ? value + 1 : nextId;
}
function applyOps(scene, ops) {
  const elements = [...scene.elements];
  let nextId = scene.nextId;
  for (const op of ops) {
    switch (op.op) {
      case "add":
        elements.push(op.element);
        nextId = nextIdAfter(nextId, op.element.id);
        break;
      case "patch": {
        const index = elements.findIndex((element2) => element2.id === op.id);
        const element = elements[index];
        if (element === void 0) break;
        elements[index] = { ...element, isDeleted: op.isDeleted };
        break;
      }
      case "clear":
        elements.length = 0;
        break;
      default:
        assertNever(op);
    }
  }
  return { elements, nextId };
}

// client/source.ts
function createSceneSource(options) {
  let scene = createScene();
  let revision = 0;
  let snapshotRequest = null;
  let timer;
  let sending = Promise.resolve();
  const listeners = /* @__PURE__ */ new Set();
  const notify = () => {
    for (const listener of listeners) listener();
  };
  const applyDelta = (delta) => {
    const want = delta.snapshotRequest ?? null;
    const wantMoved = want !== snapshotRequest;
    snapshotRequest = want;
    if (delta.revision <= revision) {
      if (wantMoved) notify();
      return;
    }
    const start = delta.revision - delta.ops.length;
    if (start > revision) {
      revision = 0;
      scene = createScene();
      void poll();
      return;
    }
    scene = applyOps(scene, delta.ops.slice(revision - start));
    revision = delta.revision;
    notify();
  };
  const poll = async () => {
    await options.load(revision).then(applyDelta, () => void 0);
  };
  const subscribe = (listener) => {
    listeners.add(listener);
    if (timer === void 0) {
      void poll();
      timer = setInterval(() => {
        void poll();
      }, options.pollMs);
    }
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && timer !== void 0) {
        clearInterval(timer);
        timer = void 0;
      }
    };
  };
  return {
    getSnapshot: () => scene,
    subscribe,
    snapshotRequest: { getSnapshot: () => snapshotRequest, subscribe },
    send: (commands) => {
      const run = sending.then(async () => {
        const delta = await options.append(commands);
        applyDelta(delta);
        return delta.ops.flatMap((op) => op.op === "add" ? [op.element.id] : []);
      });
      sending = run.then(() => void 0, () => void 0);
      return run;
    }
  };
}

// client/index.tsx
var POLL_MS = 1e3;
var TAB_ID = "dsh-blackboard";
var IMAGE_NAME = "blackboard.png";
var inject = ["slots", "sessions", "locale", "sidebarRightTabs"];
function base64Of(png) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      resolve(url.slice(url.indexOf(",") + 1));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("blackboard: FileReader failed"));
    };
    reader.readAsDataURL(png);
  });
}
function apply(ctx) {
  const sources = /* @__PURE__ */ new Map();
  const loadScene = async (sessionId, since) => {
    const response = await fetch(`${SCENE_PATH}?sessionId=${encodeURIComponent(sessionId)}&since=${since}`);
    if (!response.ok) throw new Error(`blackboard: scene read failed with ${response.status}`);
    return await response.json();
  };
  const appendCommands = async (sessionId, commands) => {
    const body = { commands };
    const response = await fetch(`${OPS_PATH}?sessionId=${encodeURIComponent(sessionId)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`blackboard: append failed with ${response.status}`);
    return await response.json();
  };
  const composerDraft = (sessionId) => {
    const conversation = ctx.get("conversation");
    const scope = ctx.sessions.scope(sessionId);
    if (conversation === void 0 || scope === void 0) return { text: "", attachments: 0 };
    const state = conversation.input.for(scope).state.getSnapshot();
    return {
      text: state.phase === "plain" ? state.draft.trim() : "",
      attachments: state.attachmentIds.length
    };
  };
  const clearComposerDraft = (sessionId) => {
    const conversation = ctx.get("conversation");
    const scope = ctx.sessions.scope(sessionId);
    if (conversation === void 0 || scope === void 0) return;
    conversation.input.for(scope).setDraft("");
  };
  const askAgent = async (sessionId, png, fallbackText) => {
    const binding = ctx.sessions.binding(sessionId);
    if (binding === void 0) return { ok: false, reason: "session is not bound on this page" };
    const draft = composerDraft(sessionId);
    const result = await binding.session.prompt([
      { type: "image", mediaType: "image/png", data: await base64Of(png), name: IMAGE_NAME },
      { type: "text", text: draft.text === "" ? fallbackText : draft.text }
    ], "queue");
    if (!result.ok) return { ok: false, reason: `${result.error.code}: ${result.error.message}` };
    if (draft.text !== "") clearComposerDraft(sessionId);
    return { ok: true, left: draft.attachments };
  };
  const sendSnapshot = async (sessionId, requestId, png) => {
    const query = `sessionId=${encodeURIComponent(sessionId)}&requestId=${encodeURIComponent(requestId)}`;
    const response = await fetch(`${SNAPSHOT_PATH}?${query}`, {
      method: "POST",
      headers: { "content-type": "image/png" },
      body: png
    });
    if (!response.ok && response.status !== 409) {
      throw new Error(`blackboard: snapshot upload failed with ${response.status}`);
    }
  };
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "blackboard: dictionaries");
  const t2 = ctx.locale.bind(NS);
  const injected = (sessionId) => {
    const existing = sources.get(sessionId);
    const source = existing ?? createSceneSource({
      load: (since) => loadScene(sessionId, since),
      append: (commands) => appendCommands(sessionId, commands),
      pollMs: POLL_MS
    });
    if (existing === void 0) sources.set(sessionId, source);
    return {
      hooks: { scene: source, snapshotRequest: source.snapshotRequest },
      draw: source.send,
      ask: (png, text) => askAgent(sessionId, png, text),
      snapshot: (requestId, png) => sendSnapshot(sessionId, requestId, png)
    };
  };
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: TAB_ID,
    kind: "blackboard",
    priority: "builtin",
    title: () => t2("view.board"),
    guide: [{ id: "open", order: 20, title: () => t2("view.board"), description: () => t2("guide.description") }]
  }), "blackboard: tab type");
  ctx.effect(() => ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
    name: "sidebar.right.pane.tab",
    key: TAB_ID,
    locale: NS,
    inject: injected
  }, BlackboardPanel)), "blackboard: pane body");
}

return module.exports; } });

