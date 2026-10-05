import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const directory = mkdtempSync(join(tmpdir(), "connector-consent-ledger-package-"));

try {
  const packOutput = execFileSync("npm", ["pack", "--json", "--pack-destination", directory], { encoding: "utf8" });
  const [{ filename, files }] = JSON.parse(packOutput);
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

  const consumer = join(directory, "consumer");
  mkdirSync(consumer);
  execFileSync("npm", ["init", "--yes"], { cwd: consumer, stdio: "ignore" });
  execFileSync("npm", ["install", "--ignore-scripts", join(directory, filename)], { cwd: consumer, stdio: "inherit" });

  const installedPackage = join(consumer, "node_modules", "connector-consent-ledger-skill");
  const packageJson = JSON.parse(readFileSync(join(installedPackage, "package.json"), "utf8"));
  if (packageJson.main || packageJson.exports) {
    throw new Error("Package must remain CLI-only and must not advertise a JavaScript import entry point");
  }
  const importAttempt = spawnSync(process.execPath, ["--input-type=module", "-e", "import('connector-consent-ledger-skill')"], {
    cwd: consumer,
    encoding: "utf8",
  });
  if (importAttempt.status === 0 || !importAttempt.stderr.includes("ERR_MODULE_NOT_FOUND")) {
    throw new Error("Installed package unexpectedly exposes a package-root JavaScript import entry point");
  }

  const cli = join(consumer, "node_modules", ".bin", "connector-consent-ledger");
  const help = execFileSync(cli, ["--help"], { cwd: consumer, encoding: "utf8" });
  if (!help.includes("Commands: review, record, summarize, init-policy")) {
    throw new Error("Installed CLI help did not list the expected commands");
  }

  const fixture = join(consumer, "node_modules", "connector-consent-ledger-skill", "fixtures", "mixed-actions.json");
  const review = execFileSync(cli, ["review", fixture, "--format", "json"], { cwd: consumer, encoding: "utf8" });
  if (JSON.parse(review).summary.total !== 5) {
    throw new Error("Installed CLI review did not process the packaged fixture");
  }

  const invalid = spawnSync(cli, ["unknown-command"], { cwd: consumer, encoding: "utf8" });
  if (invalid.status !== 1 || !invalid.stderr.includes("Unknown command: unknown-command")) {
    throw new Error("Installed CLI did not preserve representative error behavior");
  }
} finally {
  rmSync(directory, { recursive: true, force: true });
}
