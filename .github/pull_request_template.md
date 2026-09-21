## Scope

- [ ] The change is bounded to the approved construction scope.
- [ ] Factory 041 security invariants remain fail-closed.

## FEH Loop Engineering

### Hypothesis

State the single bounded improvement this change is intended to prove.

### Experiment memory

Record failed attempts, verifier results, and the lesson learned so the next iteration does not repeat blind work.

- Attempt(s):
- Result(s):
- Lesson(s):

### Independent verifier

- [ ] `FEH Loop Engineering / independent verifier` passes on the final commit.
- [ ] The maker did not weaken or delete acceptance tests/verifier criteria to obtain a pass.
- [ ] Any verifier, CODEOWNERS, test-boundary, security-boundary, migration, or authentication change has attributable reviewer approval.

## Factory 041 reviewer gate

- [ ] `Factory 041 / deterministic gate` passes on the final commit.
- [ ] A CODEOWNER has reviewed the final diff.
- [ ] Any migration or application-security change has separate explicit approval and a deliberately updated drift baseline.
- [ ] No production secrets, Supabase production access, provider credentials, provider activation, real execution, deployment, STOP/RELEASE, or authority grant is introduced.
- [ ] Commit, push, PR, merge, deployment, migration, and activation approvals are treated as separate gates.

## Evidence

Describe focused tests, full execution-dispatch tests, typecheck, lint, security review, independent-verifier evidence, and any genuine gaps.

## Human-control boundary

- [ ] Any production deployment, destructive database action, customer communication, paid advertising spend, provider/supplier activation, contract/authority change, or irreversible commercial/security action remains a separate explicit human approval.
