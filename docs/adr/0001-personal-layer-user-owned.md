# Personal-layer models are user-owned, not workspace-scoped

`Course` and `Assignment` belong directly to a `User` via a `userId` foreign key, unlike `Project`/`Task`/`Epic`/`Sprint` which are scoped to a `Workspace`. We chose direct user ownership because a Course is inherently personal — a semester class has no team to share it with — so there's nothing to gain from routing it through Workspace membership.

## Considered Options

- Auto-create a hidden "personal workspace" per user and reuse Workspace-scoped models for Course/Assignment. Rejected: `Workspace` means "team of collaborating users" ([[CONTEXT.md]]); a single-member workspace misuses that concept and adds a join with no benefit.
