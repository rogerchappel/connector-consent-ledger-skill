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
    lines.push(`| ${action.state} | ${action.connector} | ${action.action} | ${action.target} | ${action.reason} | ${action.evidence.join("; ") || "none"} |`);
  }
  return lines.join("\n") + "\n";
}

export function renderJson(report) {
  return JSON.stringify(report, null, 2) + "\n";
}

export function renderReport(report, format = "markdown") {
  return format === "json" ? renderJson(report) : renderMarkdown(report);
}
