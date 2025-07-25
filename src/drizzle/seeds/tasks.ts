import { randomUUID } from 'crypto';
import { goals } from './goals';
import { DateTime } from 'luxon';
import type { TaskStatus } from '../schema';

const now = DateTime.now().toUTC().toJSDate();

export const tasks = [
  {
    id: randomUUID(),
    goalId: goals[0].id,
    title: "Read 'Atomic Habits'",
    description: 'Finish reading in January',
    status: 'planned' as TaskStatus,
    estimate: DateTime.utc(2024, 1, 31).toJSDate(),
    progress: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    goalId: goals[0].id,
    title: "Read 'Deep Work'",
    description: 'February book',
    status: 'in-progress' as TaskStatus,
    estimate: DateTime.utc(2024, 2, 28).toJSDate(),
    progress: 25,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    goalId: goals[1].id,
    title: '5K training',
    description: 'Build up to running 5K.',
    status: 'planned' as TaskStatus,
    estimate: DateTime.utc(2024, 4, 15).toJSDate(),
    progress: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    goalId: goals[2].id,
    title: 'Set up blog hosting',
    description: 'Buy domain, setup hosting.',
    status: 'completed' as TaskStatus,
    estimate: DateTime.utc(2024, 2, 15).toJSDate(),
    progress: 100,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    goalId: goals[3].id,
    title: 'TypeScript course',
    description: 'Complete all lessons.',
    status: 'in-progress' as TaskStatus,
    estimate: DateTime.utc(2024, 7, 1).toJSDate(),
    progress: 70,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    goalId: goals[4].id,
    title: 'Join Gym',
    description: 'Sign up and start training.',
    status: 'completed' as TaskStatus,
    estimate: DateTime.utc(2024, 1, 15).toJSDate(),
    progress: 100,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    goalId: goals[5].id,
    title: 'App wireframes',
    description: 'Create app wireframes.',
    status: 'planned' as TaskStatus,
    estimate: DateTime.utc(2024, 2, 15).toJSDate(),
    progress: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    goalId: goals[6].id,
    title: 'Set reminder',
    description: 'Set phone reminders to meditate.',
    status: 'planned' as TaskStatus,
    estimate: DateTime.utc(2024, 1, 3).toJSDate(),
    progress: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    goalId: goals[7].id,
    title: 'Buy guitar',
    description: 'Purchase a beginner guitar.',
    status: 'planned' as TaskStatus,
    estimate: DateTime.utc(2024, 3, 15).toJSDate(),
    progress: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    goalId: goals[8].id,
    title: 'Set up coding environment',
    description: 'Install tools for coding.',
    status: 'completed' as TaskStatus,
    estimate: DateTime.utc(2024, 4, 3).toJSDate(),
    progress: 100,
    createdAt: now,
    updatedAt: now,
  },
];
