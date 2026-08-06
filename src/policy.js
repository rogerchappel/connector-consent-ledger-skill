export const defaultPolicy = {
  states: ["read-only", "draft", "ask-first", "approved", "blocked"],
  blockedEffects: ["delete", "destructive", "credential-export", "secret-read"],
  askFirstEffects: ["external-send", "crm-write", "ticket-write", "browser-submit", "payment", "credentialed-write"],
  draftEffects: ["draft", "local-write", "file-write", "dry-run"],
  readOnlyEffects: ["read", "search", "inspect", "list", "fetch"],
  approvalEvidence: ["approval", "ticket", "slack", "email", "meeting-note"]
};

export function mergePolicy(policy = {}) {
  validatePolicy(policy);
  return { ...defaultPolicy, ...policy };
}

export function validatePolicy(policy) {
  if (policy === null || typeof policy !== "object" || Array.isArray(policy)) {
    throw new Error("policy must be an object");
  }

  for (const property of Object.keys(policy)) {
    if (!Object.hasOwn(defaultPolicy, property)) {
      throw new Error(`Unknown policy property: ${property}`);
    }

    const values = policy[property];
    if (!Array.isArray(values)) {
      throw new Error(`policy.${property} must be an array`);
    }
    values.forEach((value, index) => {
      if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`policy.${property}[${index}] must be a non-empty string`);
      }
    });
  }
}

export function initialPolicyJson() {
  return JSON.stringify(defaultPolicy, null, 2) + "\n";
}
