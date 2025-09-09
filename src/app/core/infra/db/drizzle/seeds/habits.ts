import { goals } from './goals';
import { tasks } from './tasks';
import { users } from './users';
import { DateTime } from 'luxon';
import { randomUUID } from 'crypto';

const now = DateTime.now().toUTC().toJSDate();

export const habits = [
  {
    id: randomUUID(),
    userId: users[0].id,
    goalId: goals[0].id,
    taskId: tasks[0].id,
    title: 'Read every night',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    userId: users[1].id,
    goalId: goals[1].id,
    taskId: tasks[2].id,
    title: 'Morning run',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    userId: users[2].id,
    goalId: goals[2].id,
    taskId: tasks[3].id,
    title: 'Write blog post',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    userId: users[3].id,
    goalId: goals[3].id,
    taskId: tasks[4].id,
    title: 'Daily TypeScript lesson',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    userId: users[4].id,
    goalId: goals[4].id,
    taskId: tasks[5].id,
    title: 'Meal prep Sundays',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    userId: users[5].id,
    goalId: goals[5].id,
    taskId: tasks[6].id,
    title: 'Build app features',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    userId: users[6].id,
    goalId: goals[6].id,
    taskId: tasks[7].id,
    title: 'Meditate before breakfast',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    userId: users[7].id,
    goalId: goals[7].id,
    taskId: tasks[8].id,
    title: 'Guitar practice',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    userId: users[8].id,
    goalId: goals[8].id,
    taskId: tasks[9].id,
    title: 'Code daily',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    userId: users[9].id,
    goalId: goals[9].id,
    taskId: null, // No task associated
    title: 'Write a paragraph',
    createdAt: now,
    updatedAt: now,
  },
];
