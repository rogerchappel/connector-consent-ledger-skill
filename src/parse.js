import { readFile } from "node:fs/promises";

export async function readPlan(file) {
  const text = await readFile(file, "utf8");
  return parsePlanText(text, file);
}

export function parsePlanText(text, label = "input") {
  const trimmed = text.trim();
  if (!trimmed) throw planError(label, "plan is blank");
  if (/^(?:[\[{"\d-]|null\b|true\b|false\b)/.test(trimmed)) {
    const parsed = JSON.parse(trimmed);
    return normalizePlan(parsed, label);
  }
  return normalizePlan(parseTinyYaml(trimmed, label), label);
}

export function normalizePlan(plan, label = "input") {
  if (Array.isArray(plan)) return validatedPlan({ actions: plan }, label);
  if (!isObject(plan)) {
    throw planError(label, "plan root must be an object or array");
  }
  if (Object.hasOwn(plan, "actions")) {
    if (!Array.isArray(plan.actions)) {
      throw planError(label, "actions must be an array");
    }
    return validatedPlan(plan, label);
  }
  if (hasRecognizedActionField(plan)) {
    return validatedPlan({ actions: [plan] }, label);
  }
  throw planError(label, "unrecognized plan object; expected an actions array, an action array, or a single action object");
}

function validatedPlan(plan, label) {
  plan.actions.forEach((action, index) => {
    if (!isObject(action)) {
      throw planError(label, `actions[${index}] must be an object`);
    }
    if (!hasRecognizedActionField(action)) {
      throw planError(label, `actions[${index}] has no recognized action fields`);
    }
  });
  return plan;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasRecognizedActionField(action) {
  return [
    "id", "connector", "action", "operation", "target", "sideEffect",
    "side_effect", "effect", "risk", "state", "evidence"
  ].some((field) => Object.hasOwn(action, field));
}

function planError(label, message) {
  return new Error(`${label}: ${message}`);
}

function parseTinyYaml(text, label) {
  const lines = text.split(/\r?\n/);
  const root = {};
  let currentKey = null;
  let currentItem = null;
  for (const raw of lines) {
    const line = stripYamlComment(raw);
    if (!line.trim()) continue;
    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (keyMatch && !raw.startsWith(" ")) {
      const [, key, value] = keyMatch;
      if (value) root[key] = scalar(value);
      else {
        root[key] = [];
        currentKey = key;
      }
      continue;
    }
    const itemMatch = line.match(/^\s*-\s*([A-Za-z0-9_-]+):\s*(.*)$/);
    if (itemMatch && currentKey) {
      currentItem = { [itemMatch[1]]: scalar(itemMatch[2]) };
      root[currentKey].push(currentItem);
      continue;
    }
    const propMatch = line.match(/^\s+([A-Za-z0-9_-]+):\s*(.*)$/);
    if (propMatch && currentItem) {
      currentItem[propMatch[1]] = scalar(propMatch[2]);
      continue;
    }
    throw new Error(`Unsupported YAML shape in ${label}: ${raw}`);
  }
  return root;
}

function stripYamlComment(line) {
  let quote = null;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quote === '"' && character === "\\") {
      index += 1;
      continue;
    }
    if (character === quote) {
      if (quote === "'" && line[index + 1] === "'") {
        index += 1;
      } else {
        quote = null;
      }
      continue;
    }
    if (!quote && (character === '"' || character === "'")) {
      quote = character;
      continue;
    }
    if (!quote && character === "#" && index > 0 && /\s/.test(line[index - 1])) {
      return line.slice(0, index).trimEnd();
    }
  }
  return line;
}

function scalar(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed.replace(/^['"]|['"]$/g, "");
}
