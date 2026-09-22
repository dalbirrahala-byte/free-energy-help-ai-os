# FEH Loop Engineering Standard

Status: proposed engineering standard for all new FEH CRM construction.

## Purpose

FEH engineering work must separate making a change from deciding whether the change is good enough to keep. The default loop is:

**Hypothesis -> Maker -> Independent verifier -> Evidence -> Keep or reject -> Learn -> Repeat**

This standard extends the existing Factory gates; it does not weaken or replace them.

## Roles

### Maker

The maker may change application code inside the approved scope. The maker must not weaken the verifier, delete failing tests, lower acceptance criteria, or treat its own assessment as proof of success.

### Independent verifier

The verifier runs from GitHub Actions and is intentionally separate from the maker's implementation work. It executes the repository's accepted test, typecheck and lint commands. A passing maker statement is never a substitute for a green verifier run.

Verifier definitions, CODEOWNERS, tests and security boundaries are reviewer-controlled files. Changes to those files require attributable review.

## The loop

1. State one bounded hypothesis for the change.
2. Make the smallest implementation that can prove or disprove it.
3. Run focused local tests where available.
4. Push to a feature branch and let `FEH Loop Engineering / independent verifier` run.
5. If verification fails, do not promote the change. Record the failure and lesson, amend or discard the attempt, and run the loop again.
6. If verification passes, record evidence and the lesson in the PR.
7. Only a verified change may move to normal review and promotion.

## Ratchet rule

The accepted baseline only moves forward. A change must not be kept if it makes an agreed invariant worse, including:

- previously passing automated tests;
- TypeScript correctness;
- lint quality;
- Factory 041/044/045 acceptance behaviour;
- authentication behaviour;
- execution-dispatch safety;
- protected migration or application-security boundaries.

A regression is a rejected experiment unless there is explicit approval to change the acceptance criterion itself.

## Experiment memory

Every PR using this standard must record:

- hypothesis;
- files/scope changed;
- verifier result;
- failed attempts and what was learned;
- accepted evidence;
- remaining gaps or risks.

This prevents repeated blind attempts and gives the next loop the history of what has already been tried.

## Human-control boundary

Automation may iterate on branches and test environments. It must not autonomously perform or approve actions involving live production credentials, destructive database changes, production deployment, customer communications, paid advertising spend, supplier/provider activation, contracts, authority grants, or other irreversible commercial/security actions.

Those remain explicit human gates.

## Definition of done

A change is not done because the maker says it is done. It is eligible for review only when:

1. the independent verifier passes on the final commit;
2. required existing Factory gates pass;
3. evidence and lessons are recorded in the PR;
4. required CODEOWNER/human approvals are present;
5. any production action is handled as a separate approval.
