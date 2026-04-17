import { GithubGraphQLData } from '../types';

export const GITHUB_GRAPHQL_FIXTURE: GithubGraphQLData = {
  pullRequests: [
    { id: 'pr1', state: 'MERGED', title: 'Feature: Authentication', createdAt: '2023-01-01T10:00:00Z', mergedAt: '2023-01-02T10:00:00Z' },
    { id: 'pr2', state: 'MERGED', title: 'Bugfix: Session leak', createdAt: '2023-01-05T10:00:00Z', mergedAt: '2023-01-06T10:00:00Z' },
    { id: 'pr3', state: 'MERGED', title: 'Docs: API Reference', createdAt: '2023-02-01T10:00:00Z', mergedAt: '2023-02-02T10:00:00Z' },
    { id: 'pr4', state: 'MERGED', title: 'Refactor: Database', createdAt: '2023-03-01T10:00:00Z', mergedAt: '2023-03-02T10:00:00Z' },
    { id: 'pr5', state: 'MERGED', title: 'Feat: Multi-tenancy', createdAt: '2023-04-01T10:00:00Z', mergedAt: '2023-04-02T10:00:00Z' },
    { id: 'pr6', state: 'MERGED', title: 'Fix: Race condition', createdAt: '2023-05-01T10:00:00Z', mergedAt: '2023-05-02T10:00:00Z' },
    { id: 'pr7', state: 'MERGED', title: 'Feat: Webhooks', createdAt: '2023-06-01T10:00:00Z', mergedAt: '2023-06-02T10:00:00Z' },
    { id: 'pr8', state: 'MERGED', title: 'Fix: Memory leak', createdAt: '2023-07-01T10:00:00Z', mergedAt: '2023-07-02T10:00:00Z' },
    { id: 'pr9', state: 'OPEN', title: 'WIP: Dashboard', createdAt: '2024-01-01T10:00:00Z' },
    { id: 'pr10', state: 'OPEN', title: 'Feat: Analytics', createdAt: '2024-01-05T10:00:00Z' },
    { id: 'pr11', state: 'OPEN', title: 'Fix: CSS alignment', createdAt: '2024-01-10T10:00:00Z' },
    { id: 'pr12', state: 'CLOSED', title: 'Old Feature Draft', createdAt: '2022-12-01T10:00:00Z', closedAt: '2022-12-05T10:00:00Z' },
  ],
  reviewsGiven: [
    { name: 'repo-1', owner: { login: 'other' } },
    { name: 'repo-2', owner: { login: 'other' } },
    { name: 'repo-3', owner: { login: 'other' } },
    { name: 'repo-4', owner: { login: 'other' } },
    { name: 'repo-5', owner: { login: 'other' } },
    { name: 'repo-6', owner: { login: 'other' } },
  ],
  contributionCalendar: {
    totalContributions: 1500,
    weeks: Array.from({ length: 52 }, (_, i) => ({
      contributionDays: Array.from({ length: 7 }, (_, j) => ({
        contributionCount: Math.floor(Math.random() * 5),
        date: new Date(Date.now() - (52 - i) * 7 * 24 * 60 * 60 * 1000 + j * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      })),
    })),
  },
};
