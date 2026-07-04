import { mergePolicy } from "./policy.js";

export function reviewPlan(plan, policyInput = {}) {
  const policy = mergePolicy(policyInput);
  const actions = (plan.actions || []).map((action, index) => classifyAction(action, index, policy));
  const counts = actions.reduce((acc, action) => {
    acc[action.state] = (acc[action.state] || 0) + 1;
    return acc;
  }, {});
  return {
    generatedAt: new Date().toISOString(),
    source: plan.name || plan.source || "connector-action-plan",
    summary: { total: actions.length, counts, highestState: highestState(actions) },
    actions
  };
}

export function classifyAction(action, index, policy) {
  const sideEffect = String(action.sideEffect || action.side_effect || action.effect || action.risk || "").toLowerCase();
  const evidence = evidenceList(action.evidence);
  let state = "ask-first";
  let reason = "External or ambiguous connector side effect requires confirmation.";
  if (matches(sideEffect, policy.blockedEffects)) {
    state = "blocked";
    reason = "Policy marks this side effect as blocked.";
  } else if (matches(sideEffect, policy.readOnlyEffects)) {
    state = "read-only";
    reason = "Plan only inspects or reads existing state.";
  } else if (matches(sideEffect, policy.draftEffects)) {
    state = "draft";
    reason = "Plan creates local or draft output without a live external write.";
  } else if (matches(sideEffect, policy.askFirstEffects)) {
    state = hasApproval(evidence, policy) ? "approved" : "ask-first";
    reason = state === "approved" ? "Approval evidence is attached for this external side effect." : "External side effect needs explicit approval evidence.";
  }
  if (action.state === "blocked") state = "blocked";
  return {
    id: action.id || `${action.connector || "connector"}-${index + 1}`,
    connector: action.connector || "unknown",
    action: action.action || action.operation || "unspecified",
    target: action.target || "unspecified",
    sideEffect: sideEffect || "unspecified",
    state,
    reason,
    evidence
  };
}

function evidenceList(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.map(String) : [String(value)];
}

function matches(value, patterns) {
  return patterns.some((pattern) => value.includes(pattern));
}

function hasApproval(evidence, policy) {
  const haystack = evidence.join(" ").toLowerCase();
  return policy.approvalEvidence.some((marker) => haystack.includes(marker));
}

function highestState(actions) {
  const rank = ["read-only", "draft", "approved", "ask-first", "blocked"];
  return actions.map((a) => a.state).sort((a, b) => rank.indexOf(b) - rank.indexOf(a))[0] || "read-only";
}
