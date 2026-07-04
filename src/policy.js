export const defaultPolicy = {
  states: ["read-only", "draft", "ask-first", "approved", "blocked"],
  blockedEffects: ["delete", "destructive", "credential-export", "secret-read"],
  askFirstEffects: ["external-send", "crm-write", "ticket-write", "browser-submit", "payment", "credentialed-write"],
  draftEffects: ["draft", "local-write", "file-write", "dry-run"],
  readOnlyEffects: ["read", "search", "inspect", "list", "fetch"],
  approvalEvidence: ["approval", "ticket", "slack", "email", "meeting-note"]
};

export function mergePolicy(policy = {}) {
  return { ...defaultPolicy, ...policy };
}

export function initialPolicyJson() {
  return JSON.stringify(defaultPolicy, null, 2) + "\n";
}
