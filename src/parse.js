import { readFile } from "node:fs/promises";

export async function readPlan(file) {
  const text = await readFile(file, "utf8");
  return parsePlanText(text, file);
}

export function parsePlanText(text, label = "input") {
  const trimmed = text.trim();
  if (!trimmed) return { actions: [] };
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);
    return normalizePlan(parsed);
  }
  return normalizePlan(parseTinyYaml(trimmed, label));
}

export function normalizePlan(plan) {
  if (Array.isArray(plan)) return { actions: plan };
  if (Array.isArray(plan.actions)) return plan;
  if (plan.action || plan.connector) return { actions: [plan] };
  return { ...plan, actions: [] };
}

function parseTinyYaml(text, label) {
  const lines = text.split(/\r?\n/);
  const root = {};
  let currentKey = null;
  let currentItem = null;
  for (const raw of lines) {
    const line = raw.replace(/\s+#.*$/, "");
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

function scalar(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed.replace(/^['"]|['"]$/g, "");
}
