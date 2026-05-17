/**
 * Full Bulk Seed Script
 *
 * Creates a realistic dataset:
 *   - 10 parent goals  (categories spread across learning, career, health, etc.)
 *   - 12 subgoals per parent  (120 subgoals total — first 2 per parent are MISSED/overdue)
 *   - 10 tasks per goal node  (1300 tasks total — mix of PENDING, COMPLETED; last task per
 *     node is soft-deleted with scheduledFor set, exercising the deletedAt: null capacity fix)
 *   - 2 habits per parent goal (20 habits total — daily + specific_days)
 *   - Past occurrences (30 days) with realistic COMPLETED / MISSED / SKIPPED distribution
 *
 * Usage:
 *   node scripts/seed-full.mjs --userId=<uuid>
 *   node scripts/seed-full.mjs --userId=<uuid> --drop
 *
 * Reads MONGO_URL and MONGO_DB_NAME from .env at the project root.
 * Requires Node.js 18+.
 */

import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { randomUUID } from 'crypto';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Config ───────────────────────────────────────────────────────────────────

const PARENT_GOALS        = 10;
const SUBGOALS_PER_PARENT = 12;
const TASKS_PER_NODE      = 10;
const HABITS_PER_PARENT   = 2;   // 1 daily + 1 specific_days
const OCCURRENCE_DAYS     = 30;  // days of past occurrences to generate

// Spread pending tasks across this many future days so no single day exceeds the
// 24-hour capacity cap enforced by CreateTaskService / UpdateTaskService.
// With ~520 planned tasks across 130 nodes and avg 45 min each, 30 days keeps
// each day under ~18h (leaving room for daily habits).
const TASK_SCHEDULE_SPREAD = 30;
const SESSION_SPREAD_DAYS  = 90;   // 3 months of session history for weekly/monthly testing

// ─── Reference Data ───────────────────────────────────────────────────────────

const GOAL_TITLES = [
  { title: 'Master System Design',         category: 'LEARNING',          description: 'Study distributed systems, databases, and API design patterns.' },
  { title: 'Build a SaaS Product',          category: 'CAREER',            description: 'Take an idea from 0 to paying customers.' },
  { title: 'Run a Half Marathon',           category: 'HEALTH_FITNESS',    description: 'Train consistently and complete a 21km race.' },
  { title: 'Reach €50k Net Worth',          category: 'FINANCE',           description: 'Cut expenses, increase income, and invest consistently.' },
  { title: 'Learn Spanish (B2 Level)',      category: 'PERSONAL_GROWTH',   description: 'Achieve conversational fluency by end of year.' },
  { title: 'Ship an Open-Source Library',  category: 'CAREER',            description: 'Design, document, and publish a useful npm package.' },
  { title: 'Read 24 Books This Year',       category: 'PERSONAL_GROWTH',   description: '2 books per month — a mix of fiction and non-fiction.' },
  { title: 'Launch a YouTube Channel',      category: 'CREATIVITY',        description: 'Publish 12 quality technical videos and reach 1000 subs.' },
  { title: 'Improve Sleep to 8h Average',  category: 'HEALTH_FITNESS',    description: 'Wind-down routine, no screens after 10 PM, track via app.' },
  { title: 'Travel to 3 New Countries',    category: 'TRAVEL',            description: 'Plan and execute international trips with meaningful experiences.' },
];

const SUBGOAL_TEMPLATES = [
  ['Research & Planning', 'Deep-dive research and create a structured plan.'],
  ['Foundation Work',     'Build the core foundation and tooling.'],
  ['First Milestone',     'Reach the first concrete, measurable milestone.'],
  ['Core Implementation', 'Implement the core features or habits.'],
  ['Mid-point Review',    'Evaluate progress and adjust strategy.'],
  ['Phase 2 Execution',   'Execute the second phase with lessons learned.'],
  ['Refinement',          'Polish, optimize, and fix issues found.'],
  ['Documentation',       'Document learnings, decisions, and next steps.'],
  ['Accountability Check','Weekly check-in — are we on track?'],
  ['Stretch Goal A',      'Push beyond the baseline target.'],
  ['Stretch Goal B',      'Additional stretch that compounds the main goal.'],
  ['Final Review',        'Retrospective and handoff / completion.'],
];

const TASK_TEMPLATES = [
  ['Research best practices',    'PLANNED',   'HIGH',   45],
  ['Write a summary doc',        'PLANNED',   'MEDIUM', 30],
  ['Set up environment',         'PLANNED',   'HIGH',   60],
  ['Implement first draft',      'PLANNED',   'HIGH',   90],
  ['Code review & iterate',      'PLANNED',   'MEDIUM', 45],
  ['Write tests',                'PLANNED',   'MEDIUM', 60],
  ['Fix failing tests',          'PLANNED',   'HIGH',   30],
  ['Update documentation',       'PLANNED',   'LOW',    20],
  ['Quick sync / standup notes', 'UNPLANNED', 'LOW',    15],
  ['Handle urgent blocker',      'UNPLANNED', 'HIGH',   30],
];

const HABIT_TEMPLATES = [
  // [title, description, frequency, daysOfWeek, targetDuration]
  ['Daily deep-work block',   '60 min focused work session — no distractions.', 'daily',         [],          60],
  ['Weekly planning session', 'Review goals, plan the week ahead.',              'specific_days', [1],         45],  // Mon
  ['Morning workout',         '30 min strength or cardio before work.',           'daily',         [],          30],
  ['Evening reading',         'Read for 20 min before sleep.',                    'specific_days', [1,2,3,4,5], 20],  // Weekdays
  ['Journaling',              'Reflect on the day — gratitude + one win.',        'daily',         [],          10],
  ['Language study',          'Duolingo + grammar exercises.',                    'specific_days', [1,3,5],     20],  // MWF
  ['Meditation',              '10 min mindfulness — box breathing or body scan.', 'daily',         [],          10],
  ['Weekly review',           'Review metrics, habits, goals for the week.',      'specific_days', [0],         60],  // Sun
  ['Cold shower',             'Builds discipline and alertness.',                 'daily',         [],           5],
  ['Cardio run',              '5km outdoor run at moderate pace.',                'specific_days', [2,4,6],     35],  // Tue/Thu/Sat
];

// ─── Env / Args ────────────────────────────────────────────────────────────────

function loadEnv() {
  try {
    const raw = readFileSync(resolve(ROOT, '.env'), 'utf8');
    const env = {};
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      env[key] = val;
    }
    return env;
  } catch {
    console.error('Could not read .env at project root.');
    process.exit(1);
  }
}

function parseArgs() {
  const userIdArg = process.argv.find(
    (a) => a.startsWith('--userId=') || a.startsWith('--userid=') || a.startsWith('--user-id='),
  );
  const userId = userIdArg
    ? userIdArg.slice(userIdArg.indexOf('=') + 1)
    : process.env.SEED_USER_ID;

  if (!userId) {
    console.error('Usage:');
    console.error('  node scripts/seed-full.mjs --userId=<uuid>');
    console.error('  node scripts/seed-full.mjs --userId=<uuid> --drop');
    console.error('  SEED_USER_ID=<uuid> node scripts/seed-full.mjs');
    process.exit(1);
  }

  const drop = process.argv.includes('--drop') || process.env.SEED_DROP === 'true';
  return { userId, drop };
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function daysAgo(n, hour = 0, min = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, min, 0, 0);
  return d;
}

function daysAhead(n, hour = 23, min = 59) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  d.setUTCHours(hour, min, 0, 0);
  return d;
}

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

function pick(arr, i) {
  return arr[Math.abs(i) % arr.length];
}

function toMs(minutes) {
  return minutes * 60 * 1000;
}

// ─── Builders ─────────────────────────────────────────────────────────────────

function buildGoal({ id, userId, parentGoalId, level, title, description, category, priority, status, estimatedEndDate, createdAt }) {
  return {
    _id: id,
    userId,
    parentGoalId,
    title,
    description,
    category,
    status,
    priority,
    estimatedEndDate,
    estimatedStartDate: null,
    estimatedDuration: toMs(120 + Math.floor(Math.random() * 240)),
    actualStartDate: null,
    actualEndDate: null,
    level,
    progress: {
      totalTasks: 0,
      completedTasks: 0,
      totalLoggedMs: 0,
      score: 0,
      lastComputedAt: new Date(0),
    },
    deletedAt: null,
    createdAt,
    updatedAt: new Date(),
  };
}

function buildTask({ userId, goalId, taskIndex, parentIndex, subIndex, createdAt }) {
  const [titleBase, type, priority, durationMin] = pick(TASK_TEMPLATES, parentIndex * 31 + (subIndex ?? 0) * 7 + taskIndex);
  const label = subIndex != null ? `Sub ${subIndex + 1}` : 'Parent';
  const title = `Goal ${parentIndex + 1} ${label} — ${titleBase}`;

  // Spread completion: first 4 tasks per node are COMPLETED (past), rest PENDING.
  const isCompleted = taskIndex < 4;
  const daysBack    = isCompleted ? 5 + taskIndex * 3 + (parentIndex % 4) : 0;
  const completedAt = isCompleted ? daysAgo(daysBack, 10 + (taskIndex % 4), 0) : null;

  // Last task per node is soft-deleted. It still has scheduledFor set so it
  // would have inflated the daily capacity sum before the deletedAt: null fix
  // in sumDailyDuration. Useful for manually verifying the fix is working.
  const isSoftDeleted = !isCompleted && taskIndex === TASKS_PER_NODE - 1;
  const deletedAt     = isSoftDeleted ? daysAgo(1 + (parentIndex % 5), 18, 0) : null;

  const estimatedDuration = toMs(durationMin);
  const actualDuration    = isCompleted ? toMs(Math.round(durationMin * (0.8 + Math.random() * 0.5))) : null;
  const efficiencyScore   = isCompleted && actualDuration
    ? Math.min(150, Math.round((estimatedDuration / actualDuration) * 100))
    : null;

  // Spread pending planned tasks across TASK_SCHEDULE_SPREAD days so no single
  // day accumulates more than the 24h capacity cap.
  const scheduledFor = type === 'PLANNED' && !isCompleted
    ? daysAhead(1 + ((parentIndex + taskIndex) % TASK_SCHEDULE_SPREAD), 9, 0)
    : null;

  return {
    _id: randomUUID(),
    userId,
    goalId,
    title,
    description: `Auto-seeded task for testing — ${type.toLowerCase()} task.`,
    status:   isCompleted ? 'COMPLETED' : 'PENDING',
    priority,
    type,
    scheduledFor,
    estimatedEndDate: type === 'PLANNED' && !isCompleted ? daysAhead(3 + ((parentIndex + taskIndex) % 21)) : null,
    startDate:    null,
    actualEndDate: completedAt,
    estimatedDuration,
    actualDuration,
    efficiencyScore,
    completedAt,
    deletedAt,
    habitId:   null,
    createdAt,
    updatedAt: deletedAt ?? completedAt ?? createdAt,
  };
}

function buildHabit({ id, userId, goalId, parentIndex, habitSlot, createdAt }) {
  const [title, description, frequency, daysOfWeek, targetDuration] = pick(HABIT_TEMPLATES, parentIndex * 2 + habitSlot);

  // Give each habit a plausible streak
  const currentStreak = Math.floor(Math.random() * 12);
  const longestStreak = currentStreak + Math.floor(Math.random() * 15);

  return {
    _id: id,
    userId,
    goalId,
    title,
    description,
    frequency,
    daysOfWeek,
    targetDuration,
    status: 'active',
    currentStreak,
    longestStreak,
    deletedAt: null,
    createdAt,
    updatedAt: new Date(),
  };
}

function buildOccurrences(habit, userId, daysBack) {
  const occs = [];
  for (let d = daysBack; d >= 1; d--) {
    const date     = daysAgo(d);
    const dateStr  = ymd(date);
    const dow      = date.getUTCDay();

    // Skip if specific_days habit and today isn't a scheduled day
    if (habit.frequency === 'specific_days' && !habit.daysOfWeek.includes(dow)) continue;

    // Randomise status: recent days skew towards COMPLETED
    const rand        = Math.random();
    const recentBoost = d <= 5 ? 0.2 : 0;
    let status, completedAt, durationMinutes;

    if (rand < 0.65 + recentBoost) {
      status          = 'completed';
      durationMinutes = Math.round(habit.targetDuration * (0.85 + Math.random() * 0.35));
      completedAt     = daysAgo(d, 8 + (habit.targetDuration % 3), 30);
    } else if (rand < 0.80 + recentBoost) {
      status          = 'skipped';
      durationMinutes = null;
      completedAt     = null;
    } else {
      status          = 'missed';
      durationMinutes = null;
      completedAt     = null;
    }

    occs.push({
      _id: randomUUID(),
      habitId: habit._id,
      userId,
      date: dateStr,
      status,
      completedAt,
      sessionId: null,
      durationMinutes,
      note: null,
      createdAt: daysAgo(d, 0, 1),
    });
  }

  // Today's occurrence — always PENDING
  occs.push({
    _id: randomUUID(),
    habitId: habit._id,
    userId,
    date: ymd(new Date()),
    status: 'pending',
    completedAt: null,
    sessionId: null,
    durationMinutes: null,
    note: null,
    createdAt: daysAgo(0, 0, 1),
  });

  return occs;
}

const DISTRACTION_REASONS = [
  'Checked phone', 'Colleague interruption', 'Email notification',
  'Slack message', 'Ambient noise', 'Side research rabbit-hole',
];
const SESSION_DURATIONS = [25, 30, 45, 50, 60, 90]; // minutes — Pomodoro-ish spread

function buildSession({ id, userId, taskId, daysAgoVal, slot }) {
  const seed = (daysAgoVal * 17 + slot * 31) >>> 0;
  const source = seed % 4 === 0 ? 'MANUAL' : 'AUTO';          // ~25% MANUAL
  const durationMin = SESSION_DURATIONS[seed % SESSION_DURATIONS.length];
  const durationMs  = durationMin * 60_000;

  // Build 0–2 distractions deterministically
  const distractions = [];
  if (seed % 3 !== 0) { // ~67% have at least one distraction
    distractions.push({
      reason:      DISTRACTION_REASONS[seed % DISTRACTION_REASONS.length],
      estimatedMs: ((seed % 10) + 3) * 60_000,
      loggedAt:    daysAgo(daysAgoVal, 10 + slot, 20 + (seed % 30)),
    });
  }
  if (seed % 9 === 0) { // ~11% get a second distraction
    distractions.push({
      reason:      DISTRACTION_REASONS[(seed + 3) % DISTRACTION_REASONS.length],
      estimatedMs: ((seed % 5) + 2) * 60_000,
      loggedAt:    daysAgo(daysAgoVal, 10 + slot, 45 + (seed % 10)),
    });
  }

  const totalDistractionMs = distractions.reduce((s, d) => s + d.estimatedMs, 0);
  const netFocusMs  = Math.max(0, durationMs - totalDistractionMs);

  const distractionCount = distractions.length;
  const plantStatus =
    distractionCount >= 3 || totalDistractionMs >= 30 * 60_000 ? 'WILTED' :
    distractionCount >= 1 || totalDistractionMs >= 15 * 60_000 ? 'WILTING' :
    'HEALTHY';

  const startHour  = 8 + (slot * 2) % 10;  // sessions between 08:00–18:00
  const startMin   = (seed % 60);
  const startedAt  = daysAgo(daysAgoVal, startHour, startMin);
  const endedAt    = new Date(startedAt.getTime() + durationMs);

  return {
    _id: id,
    userId,
    taskId,
    status: 'COMPLETED',
    source,
    startedAt,
    endedAt,
    durationMs,
    netFocusMs,
    distractions,
    plantStatus,
    plantGrowthPercent: Math.min(100, Math.round((netFocusMs / durationMs) * 100)),
    createdAt: startedAt,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const env = loadEnv();
  const { userId, drop } = parseArgs();

  const require = createRequire(import.meta.url);
  const { MongoClient } = require('mongodb');

  const client = new MongoClient(env.MONGO_URL);
  await client.connect();
  const db = client.db(env.MONGO_DB_NAME);

  const totalGoalNodes = PARENT_GOALS + PARENT_GOALS * SUBGOALS_PER_PARENT;
  const totalTasks     = totalGoalNodes * TASKS_PER_NODE;
  const totalHabits    = PARENT_GOALS * HABITS_PER_PARENT;

  console.log(`\n🌱  Seeding "${env.MONGO_DB_NAME}" for userId=${userId}`);
  console.log(`   Goals: ${PARENT_GOALS} parents + ${PARENT_GOALS * SUBGOALS_PER_PARENT} subgoals = ${totalGoalNodes}`);
  console.log(`   Tasks: ${totalTasks}`);
  console.log(`   Habits: ${totalHabits} (with ${OCCURRENCE_DAYS} days of occurrences each)`);
  console.log(`   Sessions: ~${SESSION_SPREAD_DAYS * 1.5 | 0} focus sessions spanning ${SESSION_SPREAD_DAYS} days\n`);

  if (drop) {
    console.log('  ⚠  --drop: removing existing data for this user...');
    for (const col of ['goals', 'tasks', 'habits', 'habitoccurrences', 'sessions']) {
      const { deletedCount } = await db.collection(col).deleteMany({ userId });
      console.log(`     cleared ${deletedCount.toLocaleString()} from ${col}`);
    }
    console.log();
  }

  const goals       = [];
  const tasks       = [];
  const habits      = [];
  const occurrences = [];
  const sessions    = [];

  for (let pi = 0; pi < PARENT_GOALS; pi++) {
    const parentId      = randomUUID();
    const parentCreated = daysAgo(60 + pi * 3, 8, 0);
    const parentSpec    = GOAL_TITLES[pi];

    // ── Parent goal ──────────────────────────────────────────────────────────
    goals.push(buildGoal({
      id:              parentId,
      userId,
      parentGoalId:    null,
      level:           1,
      title:           parentSpec.title,
      description:     parentSpec.description,
      category:        parentSpec.category,
      priority:        pick(['HIGH', 'MEDIUM', 'LOW'], pi),
      status:          'ACTIVE',
      estimatedEndDate: daysAhead(120 + pi * 15),
      createdAt:       parentCreated,
    }));

    // ── Tasks for parent goal ────────────────────────────────────────────────
    for (let ti = 0; ti < TASKS_PER_NODE; ti++) {
      tasks.push(buildTask({
        userId,
        goalId:      parentId,
        taskIndex:   ti,
        parentIndex: pi,
        subIndex:    null,
        createdAt:   daysAgo(50 + pi * 2, 7, 0),
      }));
    }

    // ── Habits for parent goal ───────────────────────────────────────────────
    for (let hi = 0; hi < HABITS_PER_PARENT; hi++) {
      const habitId = randomUUID();
      const habit   = buildHabit({
        id:          habitId,
        userId,
        goalId:      parentId,
        parentIndex: pi,
        habitSlot:   hi,
        createdAt:   daysAgo(45 + pi * 2, 9, 0),
      });
      habits.push(habit);
      occurrences.push(...buildOccurrences(habit, userId, OCCURRENCE_DAYS));
    }

    // ── Subgoals ─────────────────────────────────────────────────────────────
    for (let si = 0; si < SUBGOALS_PER_PARENT; si++) {
      const subId      = randomUUID();
      const subCreated = daysAgo(45 + pi * 2 + si, 9, 0);

      // First 2 subgoals per parent are overdue / MISSED
      const isMissed = si < 2;

      const [subTitle, subDesc] = SUBGOAL_TEMPLATES[si];

      goals.push(buildGoal({
        id:              subId,
        userId,
        parentGoalId:    parentId,
        level:           2,
        title:           `${parentSpec.title} — ${subTitle}`,
        description:     subDesc,
        category:        parentSpec.category,
        priority:        pick(['HIGH', 'MEDIUM', 'LOW'], pi + si + 1),
        status:          isMissed ? 'MISSED' : 'ACTIVE',
        estimatedEndDate: isMissed
          ? daysAgo(2 + (si % 3))        // already past
          : daysAhead(30 + si * 5 + pi),
        createdAt:       subCreated,
      }));

      // ── Tasks for subgoal ────────────────────────────────────────────────
      for (let ti = 0; ti < TASKS_PER_NODE; ti++) {
        tasks.push(buildTask({
          userId,
          goalId:      subId,
          taskIndex:   ti,
          parentIndex: pi,
          subIndex:    si,
          createdAt:   daysAgo(40 + si + (ti % 5), 7, 30),
        }));
      }
    }
  }

  // ── Focus sessions — 90 days spread for weekly / monthly analytics testing ─
  // Use non-deleted task IDs as the pool that sessions can reference.
  const sessionTaskPool = tasks.filter((t) => t.deletedAt === null).map((t) => t._id);

  for (let d = SESSION_SPREAD_DAYS; d >= 0; d--) {
    const dow        = daysAgo(d).getUTCDay();           // 0 = Sun, 6 = Sat
    const isWeekend  = dow === 0 || dow === 6;
    const seedDay    = (d * 13 + 5) >>> 0;
    // Weekdays: 1-3 sessions; weekends: 0-1 sessions
    const maxSlots   = isWeekend ? 2 : 3;
    const slotCount  = d === 0
      ? 2
      : isWeekend
        ? (seedDay % 3 === 0 ? 1 : 0)
        : 1 + (seedDay % maxSlots);

    for (let sl = 0; sl < slotCount; sl++) {
      const taskIdx = (d * 7 + sl * 11) % sessionTaskPool.length;
      sessions.push(buildSession({
        id:         randomUUID(),
        userId,
        taskId:     sessionTaskPool[taskIdx],
        daysAgoVal: d,
        slot:       sl,
      }));
    }
  }

  // ── Insert all ────────────────────────────────────────────────────────────

  await db.collection('goals').insertMany(goals);
  console.log(`  ✓  goals            — ${goals.length.toLocaleString()} documents (${PARENT_GOALS} parents, ${goals.length - PARENT_GOALS} subgoals; ${PARENT_GOALS * 2} marked MISSED)`);

  await db.collection('tasks').insertMany(tasks);
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  const deletedTasks   = tasks.filter((t) => t.deletedAt !== null).length;
  const activePending  = tasks.length - completedTasks - deletedTasks;
  console.log(`  ✓  tasks            — ${tasks.length.toLocaleString()} documents (${completedTasks} COMPLETED, ${activePending} PENDING, ${deletedTasks} soft-deleted — excluded from capacity sums)`);

  await db.collection('habits').insertMany(habits);
  console.log(`  ✓  habits           — ${habits.length.toLocaleString()} documents`);

  await db.collection('habitoccurrences').insertMany(occurrences);
  const completedOccs = occurrences.filter((o) => o.status === 'completed').length;
  const skippedOccs   = occurrences.filter((o) => o.status === 'skipped').length;
  const missedOccs    = occurrences.filter((o) => o.status === 'missed').length;
  const pendingOccs   = occurrences.filter((o) => o.status === 'pending').length;
  console.log(`  ✓  habit_occurrences — ${occurrences.length.toLocaleString()} documents (${completedOccs} completed, ${skippedOccs} skipped, ${missedOccs} missed, ${pendingOccs} pending today)`);

  await db.collection('sessions').insertMany(sessions);
  const autoSessions    = sessions.filter((s) => s.source === 'AUTO').length;
  const manualSessions  = sessions.filter((s) => s.source === 'MANUAL').length;
  const healthySessions = sessions.filter((s) => s.plantStatus === 'HEALTHY').length;
  const wiltingSessions = sessions.filter((s) => s.plantStatus === 'WILTING').length;
  const wiltedSessions  = sessions.filter((s) => s.plantStatus === 'WILTED').length;
  const totalFocusMs    = sessions.reduce((s, x) => s + (x.netFocusMs ?? 0), 0);
  const totalFocusHrs   = (totalFocusMs / 3_600_000).toFixed(1);
  console.log(
    `  ✓  sessions         — ${sessions.length.toLocaleString()} documents` +
    ` (${autoSessions} AUTO, ${manualSessions} MANUAL | ` +
    `🌱 ${healthySessions} healthy, 🌿 ${wiltingSessions} wilting, 🍂 ${wiltedSessions} wilted | ` +
    `${totalFocusHrs}h net focus across ${SESSION_SPREAD_DAYS} days)`
  );

  console.log('\n✅  Done!\n');
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
