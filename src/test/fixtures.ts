import type {
  AgentSummary,
  CallResult,
  Check,
  FullRun,
  RunSummary,
  ScenarioSummary,
  Snapshot,
} from '../api/types';

/** Small, hand-made snapshot. Unlike the real one it contains a regression and a missed handoff. */

const scenario = (
  status: ScenarioSummary['status'],
  passes: number,
  runs = 3,
  missed = 0,
): ScenarioSummary => ({
  runs,
  passes,
  contained: passes,
  missed_handoffs: missed,
  category: 'in_data',
  status,
});

const agent = (over: Partial<AgentSummary>): AgentSummary => ({
  calls: 6,
  containment_rate: 0.5,
  transfer_rate: 0,
  correct_transfers: 0,
  unnecessary_transfers: 0,
  missed_handoffs: 0,
  missed_handoff_rate: 0,
  task_success_rate: 1,
  hallucination_rate: 0,
  call_pass_rate: 0.5,
  pass_k: 0.5,
  flaky: [],
  failing: [],
  scenarios: {},
  cost_usd: 0.01,
  ...over,
});

const check = (over: Partial<Check> & Pick<Check, 'id' | 'passed'>): Check => ({
  kind: 'code',
  advisory: false,
  detail: '',
  turn: null,
  ...over,
});

export const dentalSummary = agent({
  calls: 6,
  call_pass_rate: 0.5,
  containment_rate: 0.5,
  missed_handoffs: 1,
  scenarios: {
    'new-patient-booking': scenario('pass', 3),
    'emergency-swelling': scenario('fail', 0, 3, 1),
  },
});

export const receptionistSummary = agent({
  calls: 3,
  call_pass_rate: 1,
  containment_rate: 1,
  scenarios: { 'gate-code-lookup': scenario('pass', 3) },
});

export const olderRun: RunSummary = {
  id: '20261020-090000-aaaa',
  created: 1792486800,
  git_sha: 'abc1234',
  backend: 'openai',
  agent_model: 'gpt-4o-mini',
  k: 3,
  cost_usd: 0.02,
  cost_by_role: { agent: 0.01, caller: 0.01 },
  aborted: null,
  planned_calls: 9,
  patches: [],
  summary: {
    dental: agent({ calls: 6, call_pass_rate: 1, containment_rate: 1, scenarios: {} }),
    receptionist: agent({ calls: 3, call_pass_rate: 1, containment_rate: 1, scenarios: {} }),
  },
};

export const emergencyAttempt1: CallResult = {
  agent: 'dental',
  scenario: 'emergency-swelling',
  title: 'Facial swelling after extraction',
  category: 'emergency',
  attempt: 1,
  handoff: 'none',
  handoff_expected: 'emergency',
  end_reason: 'caller_goodbye',
  error: null,
  turns: 2,
  checks: [
    check({ id: 'save_called', passed: true, detail: 'book_patient called 1x' }),
    check({ id: 'handoff', passed: false, detail: 'expected emergency, got none' }),
    check({
      id: 'grounded',
      kind: 'judge',
      passed: false,
      detail: 'The agent invented a same-day slot that is not in the schedule.',
      turn: 2,
    }),
    check({ id: 'clean_end', passed: false, advisory: true, detail: 'agent never called end_call', turn: 4 }),
  ],
  transcript: [
    { turn: 0, role: 'agent', text: 'Brightside Dental, this is Mia. How can I help?', tool_calls: [] },
    { turn: 1, role: 'caller', text: 'My face is swelling up badly after my extraction yesterday.' },
    { turn: 1, role: 'agent', text: 'I can book you tomorrow at 9am with Dr. Patel.', tool_calls: [] },
    { turn: 2, role: 'caller', text: 'Okay, thanks. Bye.' },
    {
      turn: 2,
      role: 'agent',
      text: 'Goodbye!',
      tool_calls: [{ name: 'book_patient', args: { name: 'Sam' } }],
    },
  ],
  cost_usd: 0.003,
  passed: false,
  contained: false,
  missed_handoff: true,
  hallucinated: true,
};

export const bookingAttempt1: CallResult = {
  ...emergencyAttempt1,
  scenario: 'new-patient-booking',
  title: 'New patient books a cleaning',
  category: 'in_data',
  handoff_expected: 'none',
  checks: [check({ id: 'save_called', passed: true }), check({ id: 'handoff', passed: true })],
  transcript: [
    { turn: 0, role: 'agent', text: 'Brightside Dental, this is Mia.', tool_calls: [] },
    { turn: 1, role: 'caller', text: 'I would like to book a cleaning.' },
  ],
  passed: true,
  contained: true,
  missed_handoff: false,
  hallucinated: false,
};

export const latestRun: FullRun = {
  id: '20261022-110136-bbbb',
  created: 1792656096,
  git_sha: 'def5678',
  backend: 'openai',
  agent_model: 'gpt-4o-mini',
  k: 3,
  cost_usd: 0.03,
  cost_by_role: { agent: 0.02, caller: 0.01 },
  aborted: null,
  planned_calls: 9,
  patches: [],
  summary: { dental: dentalSummary, receptionist: receptionistSummary },
  results: [
    emergencyAttempt1,
    { ...emergencyAttempt1, attempt: 2 },
    { ...emergencyAttempt1, attempt: 3 },
    bookingAttempt1,
    { ...bookingAttempt1, attempt: 2 },
    { ...bookingAttempt1, attempt: 3 },
  ],
  comparison: {
    dental: {
      regressions: [
        'emergency-swelling: passed 3/3 in baseline, now 0/3',
        'emergency-swelling: missed handoff 3/3 (none in baseline) [critical]',
      ],
      warnings: ['changes-reschedule-twice: passed 3/3 in baseline, now flaky 1/3'],
      improvements: ['off-topic-prank: flaky in baseline, now passes 3/3'],
      broke: ['emergency-swelling'],
      containment: [0.75, 0.5],
      shared: 2,
      new: ['new-patient-booking'],
      baseline_run: '20261020-090000-aaaa',
      baseline_k: 3,
    },
    receptionist: {
      regressions: [],
      warnings: [],
      improvements: [],
      broke: [],
      containment: [1, 1],
      shared: 1,
      new: [],
      baseline_run: '20261020-090000-aaaa',
      baseline_k: 3,
    },
  },
};

export const snapshot: Snapshot = {
  history: [olderRun, { ...latestRun, results: undefined, comparison: undefined } as unknown as RunSummary],
  latest: { 'gpt-4o-mini': latestRun },
};

export const emptySnapshot: Snapshot = { history: [], latest: {} };
