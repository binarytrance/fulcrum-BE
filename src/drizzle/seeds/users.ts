import { randomUUID } from 'crypto';
import { DateTime } from 'luxon';

const now = DateTime.now().toUTC().toJSDate();

export const users = [
  {
    id: randomUUID(),
    email: 'alice@example.com',
    name: 'Alice',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    email: 'bob@example.com',
    name: 'Bob',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    email: 'charlie@example.com',
    name: 'Charlie',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    email: 'dana@example.com',
    name: 'Dana',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    email: 'eve@example.com',
    name: 'Eve',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    email: 'frank@example.com',
    name: 'Frank',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    email: 'grace@example.com',
    name: 'Grace',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    email: 'henry@example.com',
    name: 'Henry',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    email: 'ivy@example.com',
    name: 'Ivy',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: randomUUID(),
    email: 'jack@example.com',
    name: 'Jack',
    createdAt: now,
    updatedDateTime: now,
  },
];
