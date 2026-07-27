export function renderMarkdown(report) {
  const lines = [
    `# Connector Consent Report`,
    "",
    `Source: ${report.source}`,
    `Generated: ${report.generatedAt}`,
    `Total actions: ${report.summary.total}`,
    `Highest state: ${report.summary.highestState}`,
    "",
    "| State | Connector | Action | Target | Reason | Evidence |",
    "| --- | --- | --- | --- | --- | --- |"
  ];
  for (const action of report.actions) {
    const fields = [
      action.state,
      action.connector,
      action.action,
      action.target,
      action.reason,
      action.evidence.join("; ") || "none"
    ].map(markdownTableField);
    lines.push(`| ${fields.join(" | ")} |`);
  }
  return lines.join("\n") + "\n";
}

function markdownTableField(value) {
  return String(value).replaceAll("|", "\\|").replace(/\r?\n|\r/g, "<br>");
}

export function renderJson(report) {
  return JSON.stringify(report, null, 2) + "\n";
}

export function renderReport(report, format = "markdown") {
  if (format === "markdown") return renderMarkdown(report);
  if (format === "json") return renderJson(report);
  throw new Error("--format requires one of: markdown, json");
}
