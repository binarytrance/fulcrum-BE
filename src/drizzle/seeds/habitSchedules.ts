import { randomUUID } from 'crypto';
import { DateTime } from 'luxon';
import { habits } from './habits';
import { tasks } from './tasks';

const now = DateTime.now().toUTC().toJSDate();

export const habitSchedules = [
  {
    id: randomUUID(),
    habitId: habits[0].id,
    taskId: tasks[0].id,
    startTime: DateTime.utc(2024, 7, 4, 22, 0).toJSDate(), // e.g. 2024-07-04T22:00:00.000Z
    endTime: DateTime.utc(2024, 7, 4, 22, 30).toJSDate(),
    duration: '00:30',
    description: 'Read before sleeping',
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    habitId: habits[1].id,
    taskId: tasks[2].id,
    startTime: DateTime.utc(2024, 7, 4, 6, 30).toJSDate(),
    endTime: DateTime.utc(2024, 7, 4, 7, 0).toJSDate(),
    duration: '00:30',
    description: 'Morning jog',
    daysOfWeek: ['Mon', 'Wed', 'Fri'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    habitId: habits[2].id,
    taskId: tasks[3].id,
    startTime: DateTime.utc(2024, 7, 4, 20, 0).toJSDate(),
    endTime: DateTime.utc(2024, 7, 4, 20, 30).toJSDate(),
    duration: '00:30',
    description: 'Blog writing',
    daysOfWeek: ['Sun'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    habitId: habits[3].id,
    taskId: tasks[4].id,
    startTime: DateTime.utc(2024, 7, 4, 19, 0).toJSDate(),
    endTime: DateTime.utc(2024, 7, 4, 19, 30).toJSDate(),
    duration: '00:30',
    description: 'TS practice',
    daysOfWeek: ['Tue', 'Thu'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    habitId: habits[4].id,
    taskId: tasks[5].id,
    startTime: DateTime.utc(2024, 7, 4, 11, 0).toJSDate(),
    endTime: DateTime.utc(2024, 7, 4, 11, 30).toJSDate(),
    duration: '00:30',
    description: 'Cook healthy meals',
    daysOfWeek: ['Sun'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    habitId: habits[5].id,
    taskId: tasks[6].id,
    startTime: DateTime.utc(2024, 7, 4, 18, 0).toJSDate(),
    endTime: DateTime.utc(2024, 7, 4, 19, 0).toJSDate(),
    duration: '01:00',
    description: 'Work on app',
    daysOfWeek: ['Sat'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    habitId: habits[6].id,
    taskId: tasks[7].id,
    startTime: DateTime.utc(2024, 7, 4, 7, 15).toJSDate(),
    endTime: DateTime.utc(2024, 7, 4, 7, 30).toJSDate(),
    duration: '00:15',
    description: 'Morning meditation',
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    habitId: habits[7].id,
    taskId: tasks[8].id,
    startTime: DateTime.utc(2024, 7, 4, 17, 0).toJSDate(),
    endTime: DateTime.utc(2024, 7, 4, 17, 30).toJSDate(),
    duration: '00:30',
    description: 'Evening guitar',
    daysOfWeek: ['Wed', 'Sat'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    habitId: habits[8].id,
    taskId: tasks[9].id,
    startTime: DateTime.utc(2024, 7, 4, 20, 0).toJSDate(),
    endTime: DateTime.utc(2024, 7, 4, 21, 0).toJSDate(),
    duration: '01:00',
    description: 'Evening coding',
    daysOfWeek: ['Mon', 'Tue', 'Thu', 'Fri'],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    habitId: habits[9].id,
    taskId: null,
    startTime: DateTime.utc(2024, 7, 4, 9, 0).toJSDate(),
    endTime: DateTime.utc(2024, 7, 4, 9, 10).toJSDate(),
    duration: '00:10',
    description: 'Morning writing',
    daysOfWeek: ['Sun'],
    createdAt: now,
    updatedAt: now,
  },
];
