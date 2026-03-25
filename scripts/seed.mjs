/**
 * Seed Script — populates 4 weeks of realistic historical data for a given user.
 *
 * Usage:
 *   node scripts/seed.mjs --userId=<your-user-uuid>
 *
 * Reads MONGO_URL and MONGO_DB_NAME from .env at the project root.
 * Requires Node.js 18+ (uses crypto.randomUUID() and native fetch — no extra deps).
 *
 * What it inserts:
 *   goals          — 1 top-level + 1 sub-goal + 1 sub-sub-goal
 *   tasks          — 12 COMPLETED (past) + 3 PENDING (today / future)
 *   sessions       — 18 COMPLETED, spread over 4 weeks
 *                    (some same-day pairs with >30 min gaps → triggers time leaks)
 *   habits         — 2 habits (DAILY + SPECIFIC_DAYS)
 *   habit_occurrences — past occurrences for streak data
 *   daily_analytics   — pre-computed for the past 14 active days
 *   goal_analytics    — pre-computed for all 3 goals
 *   weekly_analytics  — pre-computed for the past 4 weeks
 *   estimation_profiles — rolling accuracy for 12 completed tasks
 *
 * After seeding, run the server and open endpoints/all-features.http
 * to test every endpoint.
 */

import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { randomUUID } from 'crypto';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Parse .env ──────────────────────────────────────────────────────────────

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
      const val = trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^['"]|['"]$/g, '');
      env[key] = val;
    }
    return env;
  } catch {
    console.error(
      'Could not read .env — ensure it exists at the project root.',
    );
    process.exit(1);
  }
}

// ─── Parse CLI args ───────────────────────────────────────────────────────────

function parseArgs() {
  // Accept via CLI flag or environment variable (npm swallows --camelCase flags)
  const userId =
    process.argv.find((a) => a.startsWith('--userId='))?.slice('--userId='.length) ??
    process.env.SEED_USER_ID;
  if (!userId) {
    console.error('Usage:');
    console.error('  node scripts/seed.mjs --userId=<uuid>');
    console.error('  SEED_USER_ID=<uuid> node scripts/seed.mjs');
    process.exit(1);
  }
  const drop = process.argv.includes('--drop') || process.env.SEED_DROP === 'true';
  return { userId, drop };
}

// ─── Date helpers (UTC) ───────────────────────────────────────────────────────

/** Returns a Date N days before now (UTC midnight) */
function daysAgo(n, hour = 0, min = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, min, 0, 0);
  return d;
}

/** YYYY-MM-DD string */
function ymd(date) {
  return date.toISOString().slice(0, 10);
}

/** ISO week Monday for a given date */
function weekStart(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const offset = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - offset);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const env = loadEnv();
  const { userId, drop } = parseArgs();

  const require = createRequire(import.meta.url);
  const { MongoClient } = require('mongodb');

  const client = new MongoClient(`${env.MONGO_URL}`);
  await client.connect();
  const db = client.db(env.MONGO_DB_NAME);

  console.log(
    `\n🌱  Seeding database "${env.MONGO_DB_NAME}" for userId=${userId}\n`,
  );

  if (drop) {
    console.log('  ⚠  --drop flag set: clearing existing seed collections...');
    for (const col of [
      'goals',
      'tasks',
      'sessiondocs',
      'habits',
      'habitoccurrences',
      'dailyanalyticsdocs',
      'goalanalyticsdocs',
      'weeklyanalyticsdocs',
      'estimationprofiledocs',
    ]) {
      await db.collection(col).deleteMany({ userId });
    }
    console.log('  ✓  Cleared existing data for this user\n');
  }

  // ─── IDs ──────────────────────────────────────────────────────────────────

  const g1Id = randomUUID(); // Top-level goal
  const g2Id = randomUUID(); // Sub-goal
  const g3Id = randomUUID(); // Sub-sub-goal (health)
  const g4Id = randomUUID(); // Standalone health goal (level 1)

  // 12 past tasks (COMPLETED)
  const t = Array.from({ length: 12 }, () => randomUUID());
  // 3 upcoming tasks (PENDING — today + this week)
  const tPending = Array.from({ length: 3 }, () => randomUUID());
  // Habit IDs
  const h1Id = randomUUID(); // DAILY habit
  const h2Id = randomUUID(); // SPECIFIC_DAYS habit

  // ─── Goals ────────────────────────────────────────────────────────────────

  const now = new Date();
  const goals = [
    {
      _id: g1Id,
      userId,
      parentGoalId: null,
      title: 'Master TypeScript & NestJS',
      description: 'Become proficient in backend development with NestJS.',
      category: 'LEARNING',
      status: 'ACTIVE',
      priority: 'HIGH',
      deadline: new Date('2026-09-30T23:59:59.000Z'),
      estimatedHours: 200,
      level: 1,
      progress: {
        totalTasks: 0,
        completedTasks: 0,
        completionPercent: 0,
        totalLoggedMinutes: 0,
        estimatedMinutes: 12000,
        lastComputedAt: new Date(0),
      },
      deletedAt: null,
      createdAt: daysAgo(60),
      updatedAt: now,
    },
    {
      _id: g2Id,
      userId,
      parentGoalId: g1Id,
      title: 'Complete the Official NestJS Docs',
      description: 'Read every section, build all examples.',
      category: 'LEARNING',
      status: 'ACTIVE',
      priority: 'HIGH',
      deadline: new Date('2026-04-30T23:59:59.000Z'),
      estimatedHours: 40,
      level: 2,
      progress: {
        totalTasks: 0,
        completedTasks: 0,
        completionPercent: 0,
        totalLoggedMinutes: 0,
        estimatedMinutes: 2400,
        lastComputedAt: new Date(0),
      },
      deletedAt: null,
      createdAt: daysAgo(55),
      updatedAt: now,
    },
    {
      _id: g3Id,
      userId,
      parentGoalId: g2Id,
      title: 'Finish Modules & Guards chapters',
      description: null,
      category: 'LEARNING',
      status: 'ACTIVE',
      priority: 'MEDIUM',
      deadline: new Date('2026-03-15T23:59:59.000Z'),
      estimatedHours: 8,
      level: 3,
      progress: {
        totalTasks: 0,
        completedTasks: 0,
        completionPercent: 0,
        totalLoggedMinutes: 0,
        estimatedMinutes: 480,
        lastComputedAt: new Date(0),
      },
      deletedAt: null,
      createdAt: daysAgo(50),
      updatedAt: now,
    },
    {
      _id: g4Id,
      userId,
      parentGoalId: null,
      title: 'Build a Healthy Routine',
      description: 'Morning runs + consistent sleep schedule.',
      category: 'HEALTH_FITNESS',
      status: 'ACTIVE',
      priority: 'MEDIUM',
      deadline: new Date('2026-12-31T23:59:59.000Z'),
      estimatedHours: 120,
      level: 1,
      progress: {
        totalTasks: 0,
        completedTasks: 0,
        completionPercent: 0,
        totalLoggedMinutes: 0,
        estimatedMinutes: 7200,
        lastComputedAt: new Date(0),
      },
      deletedAt: null,
      createdAt: daysAgo(45),
      updatedAt: now,
    },
  ];

  await db.collection('goals').insertMany(goals);
  console.log(`  ✓  goals         — ${goals.length} documents`);

  // ─── Tasks (completed, spread over past 4 weeks) ──────────────────────────

  // [taskIndex, daysBack, estimatedMinutes, actualMinutes, goalId, title]
  const completedTaskSpec = [
    [0, 28, 60, 55, g2Id, 'Read NestJS Overview'],
    [1, 26, 45, 50, g2Id, 'Study Dependency Injection'],
    [2, 24, 90, 80, g2Id, 'Implement first Module + Controller'],
    [3, 21, 60, 70, g3Id, 'Read Modules chapter'],
    [4, 19, 45, 40, g3Id, 'Read Guards chapter'],
    [5, 17, 30, 35, g4Id, 'Morning jog — week 2'],
    [6, 14, 60, 55, g2Id, 'Study Pipes & Validation'],
    [7, 12, 90, 100, g2Id, 'Build custom Zod pipe'],
    [8, 10, 45, 45, g4Id, 'Morning jog — week 3'],
    [9, 7, 60, 65, g2Id, 'Study Interceptors'],
    [10, 5, 75, 60, g2Id, 'Implement JWT Auth module'],
    [11, 3, 45, 50, g4Id, 'Evening run + stretch'],
  ];

  const completedTasks = completedTaskSpec.map(
    ([i, d, est, actual, gId, title]) => {
      const completedAt = daysAgo(d, 10, 30);
      const efficiency = Math.round((est / actual) * 100);
      return {
        _id: t[i],
        userId,
        goalId: gId,
        title,
        description: null,
        status: 'COMPLETED',
        priority: 'HIGH',
        type: 'PLANNED',
        scheduledFor: daysAgo(d, 9, 0),
        estimatedDuration: est,
        actualDuration: actual,
        efficiencyScore: efficiency,
        completedAt,
        deletedAt: null,
        habitId: null,
        createdAt: daysAgo(d + 2),
        updatedAt: completedAt,
      };
    },
  );

  // Pending tasks (today + this week)
  const today9am = daysAgo(0, 9, 0);
  const pendingTasks = [
    {
      _id: tPending[0],
      userId,
      goalId: g2Id,
      title: 'Study Exception Filters',
      description: 'Cover the built-in HttpException hierarchy.',
      status: 'PENDING',
      priority: 'HIGH',
      type: 'PLANNED',
      scheduledFor: today9am,
      estimatedDuration: 60,
      actualDuration: null,
      efficiencyScore: null,
      completedAt: null,
      deletedAt: null,
      habitId: h1Id, // linked to daily habit
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
    {
      _id: tPending[1],
      userId,
      goalId: g4Id,
      title: 'Morning run',
      description: '5km before work.',
      status: 'PENDING',
      priority: 'MEDIUM',
      type: 'PLANNED',
      scheduledFor: today9am,
      estimatedDuration: 35,
      actualDuration: null,
      efficiencyScore: null,
      completedAt: null,
      deletedAt: null,
      habitId: h2Id,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
    {
      _id: tPending[2],
      userId,
      goalId: null,
      title: 'Review PR #42',
      description: null,
      status: 'PENDING',
      priority: 'HIGH',
      type: 'UNPLANNED',
      scheduledFor: null,
      estimatedDuration: 30,
      actualDuration: null,
      efficiencyScore: null,
      completedAt: null,
      deletedAt: null,
      habitId: null,
      createdAt: now,
      updatedAt: now,
    },
  ];

  await db.collection('tasks').insertMany([...completedTasks, ...pendingTasks]);
  console.log(
    `  ✓  tasks         — ${completedTasks.length + pendingTasks.length} documents (${completedTasks.length} completed, ${pendingTasks.length} pending)`,
  );

  // ─── Sessions ─────────────────────────────────────────────────────────────
  // Two sessions on the same day (daysBack=14, daysBack=7) with >30 min gap
  // → those days get time-leak entries in daily analytics

  function makeSession(
    taskIdx,
    daysBack,
    startHour,
    startMin,
    dur,
    net,
    distracts,
  ) {
    const startedAt = daysAgo(daysBack, startHour, startMin);
    const endedAt = new Date(startedAt.getTime() + dur * 60_000);
    const distractionList = Array.from({ length: distracts }, (_, k) => ({
      reason: ['Email', 'Slack', 'Phone'][k % 3],
      estimatedMinutes: 5,
      loggedAt: new Date(startedAt.getTime() + (k + 1) * 10 * 60_000),
    }));
    return {
      _id: randomUUID(),
      userId,
      taskId: t[taskIdx],
      status: 'COMPLETED',
      source: 'TIMER',
      startedAt,
      endedAt,
      durationMinutes: dur,
      netFocusMinutes: net,
      distractions: distractionList,
      plantStatus:
        distracts === 0 ? 'HEALTHY' : distracts <= 1 ? 'WILTING' : 'DEAD',
      plantGrowthPercent: Math.min(100, Math.round((net / 90) * 100)),
      note: null,
      lastHeartbeatAt: endedAt,
    };
  }

  const sessions = [
    // Week 4 (days 28-22 ago)
    makeSession(0, 28, 9, 0, 55, 55, 0),
    makeSession(1, 26, 10, 0, 50, 45, 1),
    makeSession(2, 24, 9, 0, 40, 40, 0),
    makeSession(2, 24, 14, 0, 40, 35, 1), // Same day as above → time leak on day-24
    // Week 3 (days 21-15 ago)
    makeSession(3, 21, 9, 0, 70, 65, 1),
    makeSession(4, 19, 10, 0, 40, 40, 0),
    makeSession(5, 17, 7, 0, 35, 35, 0),
    // Week 2 (days 14-8 ago)
    makeSession(6, 14, 9, 0, 30, 30, 0),
    makeSession(6, 14, 13, 30, 25, 22, 1), // Same day → time leak on day-14
    makeSession(7, 12, 9, 0, 55, 50, 1),
    makeSession(7, 12, 15, 0, 45, 45, 0), // Same day → time leak on day-12
    makeSession(8, 10, 7, 0, 45, 45, 0),
    // Week 1 (days 7-1 ago)
    makeSession(9, 7, 9, 0, 35, 30, 1),
    makeSession(9, 7, 14, 0, 30, 30, 0), // Same day → time leak on day-7
    makeSession(10, 5, 9, 0, 30, 28, 0),
    makeSession(10, 5, 11, 0, 30, 30, 0),
    makeSession(11, 3, 7, 0, 50, 50, 0),
    // Yesterday — to give today's daily a session if day=yesterday
    makeSession(11, 1, 10, 0, 45, 40, 1),
  ];

  await db.collection('sessiondocs').insertMany(sessions);
  console.log(`  ✓  sessions      — ${sessions.length} documents`);

  // ─── Habits ───────────────────────────────────────────────────────────────

  const habits = [
    {
      _id: h1Id,
      userId,
      goalId: g2Id,
      title: 'Daily deep-work block',
      description: '60 min focused NestJS / TS study, no distractions.',
      frequency: 'daily',
      daysOfWeek: [],
      targetDuration: 60,
      status: 'ACTIVE',
      currentStreak: 3,
      longestStreak: 7,
      deletedAt: null,
      createdAt: daysAgo(30),
      updatedAt: now,
    },
    {
      _id: h2Id,
      userId,
      goalId: g4Id,
      title: 'Morning run',
      description: '5km jog before starting work.',
      frequency: 'specific_days',
      daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
      targetDuration: 35,
      status: 'ACTIVE',
      currentStreak: 2,
      longestStreak: 5,
      deletedAt: null,
      createdAt: daysAgo(28),
      updatedAt: now,
    },
  ];

  await db.collection('habits').insertMany(habits);
  console.log(`  ✓  habits        — ${habits.length} documents`);

  // ─── Habit Occurrences ────────────────────────────────────────────────────

  const occurrences = [];
  // Past 14 days — generate daily habit occurrences (h1: every day, h2: Mon/Wed/Fri)
  for (let dBack = 14; dBack >= 1; dBack--) {
    const d = daysAgo(dBack);
    const dateStr = ymd(d);
    const dow = d.getUTCDay(); // 0=Sun,1=Mon...

    // h1 — daily, all past days = COMPLETED
    occurrences.push({
      _id: randomUUID(),
      habitId: h1Id,
      userId,
      date: dateStr,
      status:
        dBack <= 3 ? 'COMPLETED' : Math.random() > 0.3 ? 'COMPLETED' : 'MISSED',
      completedAt:
        dBack <= 3
          ? daysAgo(dBack, 10, 45)
          : Math.random() > 0.3
            ? daysAgo(dBack, 10, 45)
            : null,
      sessionId: null,
      durationMinutes: 62,
      note: null,
    });

    // h2 — Mon(1) / Wed(3) / Fri(5)
    if ([1, 3, 5].includes(dow)) {
      occurrences.push({
        _id: randomUUID(),
        habitId: h2Id,
        userId,
        date: dateStr,
        status:
          dBack <= 5
            ? 'COMPLETED'
            : Math.random() > 0.2
              ? 'COMPLETED'
              : 'MISSED',
        completedAt: dBack <= 5 ? daysAgo(dBack, 7, 35) : null,
        sessionId: null,
        durationMinutes: 33,
        note: null,
      });
    }
  }

  // Today's pending occurrences
  const todayStr = ymd(new Date());
  occurrences.push({
    _id: randomUUID(),
    habitId: h1Id,
    userId,
    date: todayStr,
    status: 'PENDING',
    completedAt: null,
    sessionId: null,
    durationMinutes: null,
    note: null,
  });
  const todayDow = new Date().getUTCDay();
  if ([1, 3, 5].includes(todayDow)) {
    occurrences.push({
      _id: randomUUID(),
      habitId: h2Id,
      userId,
      date: todayStr,
      status: 'PENDING',
      completedAt: null,
      sessionId: null,
      durationMinutes: null,
      note: null,
    });
  }

  await db.collection('habitoccurrences').insertMany(occurrences);
  console.log(`  ✓  occurrences   — ${occurrences.length} documents`);

  // ─── Pre-compute Daily Analytics ─────────────────────────────────────────
  // We group sessions by day and compute metrics so the analytics endpoints
  // return data immediately without waiting for worker runs.

  const sessionsByDay = new Map();
  for (const sess of sessions) {
    const key = ymd(sess.startedAt);
    if (!sessionsByDay.has(key)) sessionsByDay.set(key, []);
    sessionsByDay.get(key).push(sess);
  }

  const tasksByDay = new Map();
  for (const task of completedTasks) {
    if (!task.scheduledFor) continue;
    const key = ymd(task.scheduledFor);
    if (!tasksByDay.has(key)) tasksByDay.set(key, []);
    tasksByDay.get(key).push(task);
  }

  const allDailyDocs = [];
  for (const [date, daySessions] of sessionsByDay) {
    const totalLoggedMinutes = daySessions.reduce(
      (s, x) => s + x.durationMinutes,
      0,
    );
    const netFocusMinutes = daySessions.reduce(
      (s, x) => s + x.netFocusMinutes,
      0,
    );
    const deepWorkMinutes = daySessions
      .filter((x) => x.plantStatus === 'HEALTHY')
      .reduce((s, x) => s + x.durationMinutes, 0);
    const dayTasks = tasksByDay.get(date) ?? [];

    // Time leaks
    const sorted = [...daySessions].sort((a, b) => a.startedAt - b.startedAt);
    const timeLeaks = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = Math.round(
        (sorted[i + 1].startedAt - sorted[i].endedAt) / 60_000,
      );
      if (gap > 30) {
        const fmt = (d) =>
          `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
        timeLeaks.push({
          startTime: fmt(sorted[i].endedAt),
          endTime: fmt(sorted[i + 1].startedAt),
          gapMinutes: gap,
        });
      }
    }

    const allDistractions = daySessions.flatMap((s) => s.distractions ?? []);
    const tasksWithScore = dayTasks.filter((t) => t.efficiencyScore != null);

    allDailyDocs.push({
      _id: randomUUID(),
      userId,
      date,
      totalLoggedMinutes,
      netFocusMinutes,
      deepWorkMinutes,
      shallowWorkMinutes: totalLoggedMinutes - deepWorkMinutes,
      sessionCount: daySessions.length,
      totalDistractions: allDistractions.length,
      totalDistractionMinutes: allDistractions.reduce(
        (s, d) => s + d.estimatedMinutes,
        0,
      ),
      avgDistractionPerSession:
        daySessions.length > 0
          ? Math.round((allDistractions.length / daySessions.length) * 10) / 10
          : 0,
      totalTaskCount: dayTasks.length,
      plannedTaskCount: dayTasks.filter((t) => t.type === 'PLANNED').length,
      unplannedTaskCount: dayTasks.filter((t) => t.type === 'UNPLANNED').length,
      completedTaskCount: dayTasks.filter((t) => t.status === 'COMPLETED')
        .length,
      unplannedPercent:
        dayTasks.length > 0
          ? Math.round(
              (dayTasks.filter((t) => t.type === 'UNPLANNED').length /
                dayTasks.length) *
                100,
            )
          : 0,
      taskCompletionRate:
        dayTasks.length > 0
          ? Math.round(
              (dayTasks.filter((t) => t.status === 'COMPLETED').length /
                dayTasks.length) *
                100,
            )
          : 100,
      avgEfficiencyScore:
        tasksWithScore.length > 0
          ? Math.round(
              tasksWithScore.reduce((s, t) => s + t.efficiencyScore, 0) /
                tasksWithScore.length,
            )
          : null,
      timeLeaks,
      computedAt: new Date(),
    });
  }

  await db.collection('dailyanalyticsdocs').insertMany(allDailyDocs);
  console.log(`  ✓  daily_analytics  — ${allDailyDocs.length} documents`);

  // ─── Pre-compute Goal Analytics ───────────────────────────────────────────

  function computeGoalAnalytics(goalId, goalTitle, estimatedHours, deadline) {
    const goalTasks = completedTasks.filter((t) => t.goalId === goalId);
    const goalTaskIds = new Set(goalTasks.map((t) => t._id));
    const goalSessions = sessions.filter((s) => goalTaskIds.has(s.taskId));

    const totalLoggedMinutes = goalSessions.reduce(
      (s, x) => s + x.durationMinutes,
      0,
    );
    const taskCount = goalTasks.length;
    const completedTaskCount = goalTasks.filter(
      (t) => t.status === 'COMPLETED',
    ).length;
    const completionPercent =
      taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;
    const tasksWithScore = goalTasks.filter((t) => t.efficiencyScore != null);
    const avgEfficiencyScore =
      tasksWithScore.length > 0
        ? Math.round(
            tasksWithScore.reduce((s, t) => s + t.efficiencyScore, 0) /
              tasksWithScore.length,
          )
        : null;

    // Consistency: distinct weeks in last 84 days with ≥1 session
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - 84);
    const recentSessions = goalSessions.filter((s) => s.startedAt >= cutoff);
    const weekKeys = new Set(
      recentSessions.map((s) => ymd(weekStart(s.startedAt))),
    );
    const consistencyScore = Math.round((weekKeys.size / 12) * 100);
    const weeksActive = Math.max(weekKeys.size, 1);
    const weeklyAvgMinutes = Math.round(totalLoggedMinutes / weeksActive);

    let projectedCompletionDate = null;
    let isOnTrack = null;
    const estimatedMinutes = (estimatedHours ?? 0) * 60;
    if (estimatedMinutes > 0 && weeklyAvgMinutes > 0) {
      const remaining = Math.max(0, estimatedMinutes - totalLoggedMinutes);
      const weeksNeeded = remaining / weeklyAvgMinutes;
      const projected = new Date();
      projected.setUTCDate(
        projected.getUTCDate() + Math.round(weeksNeeded * 7),
      );
      projectedCompletionDate = projected;
      if (deadline) isOnTrack = projected <= deadline;
    }

    return {
      _id: randomUUID(),
      goalId,
      userId,
      goalTitle,
      totalLoggedMinutes,
      taskCount,
      completedTaskCount,
      completionPercent,
      avgEfficiencyScore,
      consistencyScore,
      weeklyAvgMinutes,
      projectedCompletionDate,
      isOnTrack,
      lastComputedAt: new Date(),
    };
  }

  const goalAnalyticsDocs = [
    computeGoalAnalytics(
      g1Id,
      'Master TypeScript & NestJS',
      200,
      new Date('2026-09-30'),
    ),
    computeGoalAnalytics(
      g2Id,
      'Complete the Official NestJS Docs',
      40,
      new Date('2026-04-30'),
    ),
    computeGoalAnalytics(
      g3Id,
      'Finish Modules & Guards chapters',
      8,
      new Date('2026-03-15'),
    ),
    computeGoalAnalytics(
      g4Id,
      'Build a Healthy Routine',
      120,
      new Date('2026-12-31'),
    ),
  ];

  await db.collection('goalanalyticsdocs').insertMany(goalAnalyticsDocs);
  console.log(`  ✓  goal_analytics   — ${goalAnalyticsDocs.length} documents`);

  // ─── Pre-compute Weekly Analytics ─────────────────────────────────────────

  const weeklyDocs = [];
  for (let weekOffset = 0; weekOffset <= 3; weekOffset++) {
    const ws = weekStart(daysAgo(weekOffset * 7));
    const we = new Date(ws);
    we.setUTCDate(we.getUTCDate() + 6);
    we.setUTCHours(23, 59, 59, 999);
    const wsStr = ymd(ws);

    const weekDailies = allDailyDocs.filter(
      (d) => d.date >= wsStr && d.date <= ymd(we),
    );
    if (weekDailies.length === 0) continue;

    const totalLoggedMinutes = weekDailies.reduce(
      (s, d) => s + d.totalLoggedMinutes,
      0,
    );
    const netFocusMinutes = weekDailies.reduce(
      (s, d) => s + d.netFocusMinutes,
      0,
    );
    const deepWorkMinutes = weekDailies.reduce(
      (s, d) => s + d.deepWorkMinutes,
      0,
    );
    const totalSessions = weekDailies.reduce((s, d) => s + d.sessionCount, 0);
    const totalCompletedTasks = weekDailies.reduce(
      (s, d) => s + d.completedTaskCount,
      0,
    );
    const timeLeaksIdentified = weekDailies.reduce(
      (s, d) => s + (d.timeLeaks?.length ?? 0),
      0,
    );

    const sorted = [...weekDailies].sort(
      (a, b) => b.totalLoggedMinutes - a.totalLoggedMinutes,
    );
    const bestDay = sorted[0]
      ? { date: sorted[0].date, minutes: sorted[0].totalLoggedMinutes }
      : null;
    const worstDay = sorted[sorted.length - 1]
      ? {
          date: sorted[sorted.length - 1].date,
          minutes: sorted[sorted.length - 1].totalLoggedMinutes,
        }
      : null;

    // Goal breakdown
    const weekSessions = sessions.filter(
      (s) => s.startedAt >= ws && s.startedAt <= we,
    );
    const goalMinutes = {};
    for (const sess of weekSessions) {
      const task = completedTasks.find((t) => t._id === sess.taskId);
      if (task?.goalId) {
        goalMinutes[task.goalId] =
          (goalMinutes[task.goalId] ?? 0) + sess.durationMinutes;
      }
    }
    const goalBreakdown = Object.entries(goalMinutes).map(([gId, mins]) => {
      const g = goals.find((x) => x._id === gId);
      return {
        goalId: gId,
        goalTitle: g?.title ?? 'Unknown',
        minutesLogged: mins,
      };
    });

    weeklyDocs.push({
      _id: randomUUID(),
      userId,
      weekStart: wsStr,
      totalLoggedMinutes,
      netFocusMinutes,
      deepWorkMinutes,
      totalSessions,
      totalCompletedTasks,
      avgDailyMinutes: Math.round(totalLoggedMinutes / 7),
      bestDay,
      worstDay,
      timeLeaksIdentified,
      goalBreakdown,
      computedAt: new Date(),
    });
  }

  await db.collection('weeklyanalyticsdocs').insertMany(weeklyDocs);
  console.log(`  ✓  weekly_analytics — ${weeklyDocs.length} documents`);

  // ─── Estimation Profile ───────────────────────────────────────────────────

  // Use first 12 completed tasks sorted newest-first
  const accuracyEntries = [...completedTasks]
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, 12)
    .map((t) => ({
      taskId: t._id,
      date: t.completedAt,
      estimated: t.estimatedDuration,
      actual: t.actualDuration,
      accuracy: t.efficiencyScore,
    }));

  const rollingAverage = Math.round(
    accuracyEntries.reduce((s, e) => s + e.accuracy, 0) /
      accuracyEntries.length,
  );
  const mid = Math.floor(accuracyEntries.length / 2);
  const recentAvg =
    accuracyEntries.slice(0, mid).reduce((s, e) => s + e.accuracy, 0) / mid;
  const olderAvg =
    accuracyEntries.slice(mid).reduce((s, e) => s + e.accuracy, 0) /
    (accuracyEntries.length - mid);
  const diff = recentAvg - olderAvg;
  const trend = diff > 5 ? 'IMPROVING' : diff < -5 ? 'DECLINING' : 'STABLE';

  await db.collection('estimationprofiledocs').insertOne({
    _id: randomUUID(),
    userId,
    recentAccuracies: accuracyEntries,
    rollingAverage,
    trend,
    updatedAt: new Date(),
  });
  console.log(
    `  ✓  estimation       — 1 document  (avg=${rollingAverage}, trend=${trend})`,
  );

  // ─── Summary ─────────────────────────────────────────────────────────────

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ✅  Seed complete!  Copy these IDs into your .http files:

  userId         = ${userId}

  GOALS
  g1Id (level-1) = ${g1Id}
  g2Id (level-2) = ${g2Id}
  g3Id (level-3) = ${g3Id}
  g4Id (level-1) = ${g4Id}

  PENDING TASKS (today)
  tPending[0]    = ${tPending[0]}   (linked to habit h1)
  tPending[1]    = ${tPending[1]}   (linked to habit h2)
  tPending[2]    = ${tPending[2]}   (unplanned)

  HABITS
  h1Id (DAILY)          = ${h1Id}
  h2Id (SPECIFIC_DAYS)  = ${h2Id}

  Open endpoints/all-features.http and paste these IDs.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
