// All on-screen words live here so both renderers stay in sync.
// Swap these to describe your own pipeline.

export const copy = {
  header: { live: 'LIVE', subtitle: 'RUNNING TONIGHT', clock: '1 hour, sped up' },
  builders: { title: 'builders', caption: 'own branch + worktree' },
  handoff: {
    title: 'hand-off',
    sub: 'dev submit',
    notes: ['fast proof: landing, gate, cleanup', 'full touched cone: the rest', 'then tasks submit'],
  },
  integrator: {
    title: 'integrator',
    sub: 'one branch at a time',
    stats: '1-7 min a landing · 50 earlier today',
  },
  main: { title: 'main', green: 'green', red: 'red, main-red task filed' },
  gate: { title: 'full gate', sub: 'on a schedule', note: 'red → task, fix forward' },
  review: {
    title: 'Opus review',
    notes: ['after landing', 'risky or retried', 'fixes → its builder'],
  },
  rail: 'back to the builder that wrote it',
  next: {
    eyebrow: 'NEXT',
    id: 'B4017, BUILT',
    steps: ['merge', 'compile', 'fmt', 'guard', 'push'],
    beforeTitle: 'before push · ~1-2 min',
    beforeNotes: ['fmt applied + committed', 'guard <1 s: markers, ast-grep'],
    afterTitle: 'after.sh',
    afterSub: 'after the push, all at once',
    checks: ['docs', 'clippy', 'rustdoc', 'static', 'tests'],
    afterNote: 'red → task naming the culprit · never blocks',
    culprit: 'culprit',
  },
  coming: {
    eyebrow: 'COMING',
    sub: 'IN ORDER',
    items: [
      {
        id: 'b4077',
        title: 'auto-revert',
        note: 'old reds never reverted',
        steps: ['red on main', 'rerun failing tests since green', 'revert the culprit merge', 'reopen task → its builder'],
      },
      {
        id: 'b4032',
        title: 'one red list',
        steps: ['main-reds list', 'origin/main-green', 'new branches start here'],
        tail: { crosses: 6, label: '6 main reruns gone' },
      },
      {
        id: 'b4078',
        title: 'prechecks',
        note: 'every branch at once',
        steps: ['merge · compile · tests, each on a free Linux box', 'merge checked ones, in order', 'push'],
        stackedFirst: true,
      },
    ],
  },
  footer: 'one loop ≈ an hour of work',
  lanes: {
    normal: { title: 'normal lane', steps: ['compile on Linux', 'clippy + tests', 'static', 'push'] },
    fast: { title: 'fast lane · no tests', steps: ['merge'] },
    conflict: { title: 'conflict', sub: 'to its builder' },
  },
  packets: { conflict: 'conflict', fixes: 'fixes', mainRed: 'main-red' },
} as const

export type Copy = typeof copy
