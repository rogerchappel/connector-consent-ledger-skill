import assert from "node:assert/strict";
import { test } from "node:test";
import { renderJson, renderMarkdown } from "../src/render.js";

test("Markdown table fields escape pipes and line breaks", () => {
  const report = {
    source: "fixture",
    generatedAt: "2026-07-27T00:00:00.000Z",
    summary: { total: 1, highestState: "ask-first" },
    actions: [{
      state: "ask-first",
      connector: "crm|prod",
      action: "update|lead",
      target: "A|B",
      reason: "needs\napproval",
      evidence: ["ticket|42", "line\r\nbreak"]
    }]
  };

  const markdown = renderMarkdown(report);
  assert.match(markdown, /\| crm\\\|prod \| update\\\|lead \| A\\\|B \| needs<br>approval \| ticket\\\|42; line<br>break \|/);
  assert.deepEqual(JSON.parse(renderJson(report)), report);
});
