import { appendFile, readFile } from "node:fs/promises";

export async function appendLedger(file, report, metadata = {}) {
  const entries = report.actions.map((action) => ({
    recordedAt: new Date().toISOString(),
    source: report.source,
    ...metadata,
    ...action
  }));
  if (entries.length) await appendFile(file, entries.map((entry) => JSON.stringify(entry)).join("\n") + "\n");
  return entries;
}

export async function summarizeLedger(file) {
  const text = await readFile(file, "utf8").catch((error) => {
    if (error.code === "ENOENT") return "";
    throw error;
  });
  const entries = text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const counts = entries.reduce((acc, entry) => {
    acc[entry.state] = (acc[entry.state] || 0) + 1;
    return acc;
  }, {});
  return { file, total: entries.length, counts, entries };
}
