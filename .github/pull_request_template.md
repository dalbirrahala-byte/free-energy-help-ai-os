## Scope

- [ ] The change is bounded to the approved construction scope.
- [ ] Factory 041 security invariants remain fail-closed.

## Factory 041 reviewer gate

- [ ] `Factory 041 / deterministic gate` passes on the final commit.
- [ ] A CODEOWNER has reviewed the final diff.
- [ ] Any migration or application-security change has separate explicit approval and a deliberately updated drift baseline.
- [ ] No production secrets, Supabase production access, provider credentials, provider activation, real execution, deployment, STOP/RELEASE, or authority grant is introduced.
- [ ] Commit, push, PR, merge, deployment, migration, and activation approvals are treated as separate gates.

## Evidence

Describe focused tests, full execution-dispatch tests, typecheck, lint, security review, and any genuine gaps.
