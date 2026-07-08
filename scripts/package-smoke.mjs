import { execFileSync } from "node:child_process";

const output = execFileSync("npm", ["pack", "--dry-run", "--json"], { encoding: "utf8" });
const [{ files }] = JSON.parse(output);
const names = new Set(files.map((file) => file.path));

for (const expected of [
  "package.json",
  "README.md",
  "LICENSE",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
  "SKILL.md",
  "src/cli.js",
  "src/review.js",
  "fixtures/mixed-actions.json",
  "docs/PRD.md",
]) {
  if (!names.has(expected)) {
    throw new Error(`Missing expected package file: ${expected}`);
  }
}
