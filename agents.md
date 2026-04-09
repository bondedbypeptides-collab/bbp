# Workspace Rules

## Git Safety

- Use this local workspace by default instead of StackBlitz.
- GitHub target repo: `https://github.com/bondedbypeptides-collab/bbp`.
- Do not push, open PRs, merge, release, publish, or trigger any GitHub or Netlify build activity unless the user explicitly says `deploy to github`.
- Batch changes locally and wait for approval before any remote action.

## Default Approach

- For feature, bug, cleanup, and improvement requests, make the code change unless the user asks for discussion only.
- Inspect the existing implementation before editing.
- Preserve current product patterns unless the user asks for a redesign.
- Prefer small focused changes over broad refactors.
- Never overwrite or revert user changes you did not make.

## Implementation Expectations

- Handle nearby UX and logic details when relevant, including state, loading, empty, and error cases.
- Consider adjacent regressions, not just the edited component.
- Make the safest reasonable assumption when ambiguity is minor, and note it in the final response.
- Pause and ask before taking a riskier path with meaningful product or technical tradeoffs.

## Verification

- Run the strongest practical local verification before finishing.
- Prefer `npm run lint` and `npm run build` when they fit the change.
- Use local preview and testing in this environment whenever practical.
- Do not claim verification that was not run.

## Final Response

- Summarize what changed, what was verified, and any remaining risks, assumptions, or follow-ups.
- Mention unrelated issues briefly without expanding scope unless the user asks.

## External Services

- Prefer local verification over remote deploys.
- Avoid unnecessary Netlify deploys because build credits are limited.
- Do not deploy or change external environments unless the user explicitly says `deploy to github`.
