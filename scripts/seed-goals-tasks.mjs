/**
 * Bulk Seed Script
 * - Creates 10 parent goals
 * - Creates 10 subgoals per parent (100 subgoals total)
 * - Creates 20 tasks for every goal node (parent + subgoal)
 *
 * Totals:
 * - Goals: 110
 * - Tasks: 2200
 *
 * A subset of subgoals are intentionally overdue and marked MISSED.
 *
 * Usage:
 *   node scripts/seed-goals-tasks.mjs --userId=<your-user-uuid>
 *   node scripts/seed-goals-tasks.mjs --userId=<your-user-uuid> --drop
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

const PARENT_GOALS = 10;
const SUBGOALS_PER_PARENT = 10;
const TASKS_PER_GOAL_NODE = 20;

const GOAL_CATEGORIES = [
  'LEARNING',
  'CAREER',
  'HEALTH_FITNESS',
  'FINANCE',
  'PERSONAL_DEVELOPMENT',
];
const GOAL_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'];
const TASK_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'];

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
        .replace(/^['\"]|['\"]$/g, '');

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
    (a) =>
      a.startsWith('--userId=') ||
      a.startsWith('--userid=') ||
      a.startsWith('--user-id='),
  );

  const userId = userIdArg
    ? userIdArg.slice(userIdArg.indexOf('=') + 1)
    : process.env.SEED_USER_ID;

  if (!userId) {
    console.error('Usage:');
    console.error('  node scripts/seed-goals-tasks.mjs --userId=<uuid>');
    console.error('  node scripts/seed-goals-tasks.mjs --userid=<uuid>');
    console.error('  node scripts/seed-goals-tasks.mjs --userId=<uuid> --drop');
    console.error('  SEED_USER_ID=<uuid> node scripts/seed-goals-tasks.mjs');
    process.exit(1);
  }

  const drop = process.argv.includes('--drop') || process.env.SEED_DROP === 'true';
  return { userId, drop };
}

function daysAgo(n, hour = 0, min = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, min, 0, 0);
  return d;
}

function daysAhead(n, hour = 0, min = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  d.setUTCHours(hour, min, 0, 0);
  return d;
}

function pick(arr, index) {
  return arr[index % arr.length];
}

function toMs(minutes) {
  return minutes * 60 * 1000;
}

function buildGoal({
  id,
  userId,
  parentGoalId,
  level,
  title,
  description,
  category,
  priority,
  status,
  estimatedEndDate,
  estimatedDuration,
  createdAt,
}) {
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
    estimatedDuration,
    estimatedStartDate: null,
    actualStartDate: null,
    actualEndDate: null,
    level,
    progress: {
      totalTasks: TASKS_PER_GOAL_NODE,
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

function buildTask({
  userId,
  goalId,
  parentIndex,
  subIndex,
  taskIndex,
  createdAt,
}) {
  const planned = taskIndex % 4 !== 0;
  const scheduledFor = planned
    ? daysAhead((taskIndex % 14) + (parentIndex % 3), 9 + (taskIndex % 5), 0)
    : null;

  const durationMinutes = 25 + ((taskIndex + parentIndex + (subIndex ?? 0)) % 7) * 10;
  const estimatedDuration = toMs(durationMinutes);

  const parentLabel = parentIndex.toString().padStart(2, '0');
  const scopeLabel = subIndex
    ? `Sub ${subIndex.toString().padStart(2, '0')}`
    : 'Parent';

  return {
    _id: randomUUID(),
    userId,
    goalId,
    title: `Goal ${parentLabel} ${scopeLabel} - Task ${taskIndex.toString().padStart(2, '0')}`,
    description: `Auto-seeded task ${taskIndex} for goal node ${goalId}.`,
    status: 'PENDING',
    priority: pick(TASK_PRIORITIES, parentIndex + taskIndex + (subIndex ?? 0)),
    type: planned ? 'PLANNED' : 'UNPLANNED',
    scheduledFor,
    estimatedEndDate: planned ? daysAhead((taskIndex % 21) + 3, 23, 0) : null,
    startDate: null,
    actualEndDate: null,
    estimatedDuration,
    actualDuration: null,
    efficiencyScore: null,
    completedAt: null,
    deletedAt: null,
    habitId: null,
    createdAt,
    updatedAt: createdAt,
  };
}

async function main() {
  const env = loadEnv();
  const { userId, drop } = parseArgs();

  const require = createRequire(import.meta.url);
  const { MongoClient } = require('mongodb');

  const client = new MongoClient(`${env.MONGO_URL}`);
  await client.connect();
  const db = client.db(env.MONGO_DB_NAME);

  const totalGoals = PARENT_GOALS + PARENT_GOALS * SUBGOALS_PER_PARENT;
  const totalTasks = totalGoals * TASKS_PER_GOAL_NODE;
  console.log(`Seeding ${totalGoals} goals + ${totalTasks} tasks for userId=${userId}`);

  if (drop) {
    console.log('--drop enabled: removing existing goals/tasks for this user');
    await db.collection('tasks').deleteMany({ userId });
    await db.collection('goals').deleteMany({ userId });
  }

  const goals = [];
  const tasks = [];
  let missedSubgoals = 0;

  // Build parent goals and subgoals.
  for (let parentIndex = 1; parentIndex <= PARENT_GOALS; parentIndex++) {
    const parentId = randomUUID();
    const parentCreatedAt = daysAgo(30 + parentIndex, 8, 0);
    const parentDeadline = daysAhead(90 + parentIndex, 23, 59);

    const parentGoal = buildGoal({
      id: parentId,
      userId,
      parentGoalId: null,
      level: 1,
      title: `Goal ${parentIndex.toString().padStart(2, '0')}`,
      description: `Auto-seeded parent goal ${parentIndex}.`,
      category: pick(GOAL_CATEGORIES, parentIndex),
      priority: pick(GOAL_PRIORITIES, parentIndex),
      status: 'ACTIVE',
      estimatedEndDate: parentDeadline,
      estimatedDuration: toMs(90 + parentIndex * 3),
      createdAt: parentCreatedAt,
    });

    goals.push(parentGoal);

    for (let taskIndex = 1; taskIndex <= TASKS_PER_GOAL_NODE; taskIndex++) {
      const taskCreatedAt = daysAgo(15 + (taskIndex % 7), 7, 30);
      tasks.push(
        buildTask({
          userId,
          goalId: parentId,
          parentIndex,
          subIndex: null,
          taskIndex,
          createdAt: taskCreatedAt,
        }),
      );
    }

    for (let subIndex = 1; subIndex <= SUBGOALS_PER_PARENT; subIndex++) {
      const subgoalId = randomUUID();
      const subCreatedAt = daysAgo(20 + parentIndex + subIndex, 9, 0);

      // First 3 subgoals under each parent are overdue and marked MISSED.
      const isMissed = subIndex <= 3;
      const subDeadline = isMissed
        ? daysAgo(3 + (subIndex % 2), 23, 59)
        : daysAhead(20 + subIndex + (parentIndex % 4), 23, 59);

      if (isMissed) missedSubgoals += 1;

      const subgoal = buildGoal({
        id: subgoalId,
        userId,
        parentGoalId: parentId,
        level: 2,
        title: `Goal ${parentIndex.toString().padStart(2, '0')} - Subgoal ${subIndex.toString().padStart(2, '0')}`,
        description: `Auto-seeded subgoal ${subIndex} under goal ${parentIndex}.`,
        category: pick(GOAL_CATEGORIES, parentIndex + subIndex),
        priority: pick(GOAL_PRIORITIES, parentIndex + subIndex),
        status: isMissed ? 'MISSED' : 'ACTIVE',
        estimatedEndDate: subDeadline,
        estimatedDuration: toMs(60 + subIndex * 2),
        createdAt: subCreatedAt,
      });

      goals.push(subgoal);

      for (let taskIndex = 1; taskIndex <= TASKS_PER_GOAL_NODE; taskIndex++) {
        const taskCreatedAt = daysAgo(10 + (taskIndex % 6), 8, 15);
        tasks.push(
          buildTask({
            userId,
            goalId: subgoalId,
            parentIndex,
            subIndex,
            taskIndex,
            createdAt: taskCreatedAt,
          }),
        );
      }
    }
  }

  await db.collection('goals').insertMany(goals);
  await db.collection('tasks').insertMany(tasks);

  console.log(`Inserted goals: ${goals.length}`);
  console.log(`Inserted tasks: ${tasks.length}`);
  console.log(`Subgoals marked MISSED: ${missedSubgoals}`);
  console.log('Done.');

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
