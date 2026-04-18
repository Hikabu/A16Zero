import { Injectable, Inject, Logger } from '@nestjs/common';
import { Octokit } from 'octokit';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { decrypt } from '../../shared/crypto.utils';
import { 
  GithubRestData, 
  GithubGraphQLData, 
  GithubEventsData, 
  GithubRawDataSnapshot 
} from './types';
import { SyncStatus } from '@prisma/client';

@Injectable()
export class GithubAdapterService {
  private readonly logger = new Logger(GithubAdapterService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS') private readonly redis: Redis,
  ) {}

  /**
   * Fetches raw data for any GitHub username using a provided token.
   * This is used for the headless preview endpoint.
   */
  async fetchRawDataByUsername(githubUsername: string, token: string): Promise<GithubRawDataSnapshot & { accountCreatedAt: string }> {
    const user = await this.fetchUserProfile(githubUsername, token);
    
    const [rest, graphqlData, events] = await Promise.all([
      this.fetchRestData(user.id.toString(), githubUsername, token),
      this.fetchGraphQLData(user.id.toString(), githubUsername, token),
      this.fetchEventsData(user.id.toString(), githubUsername, token),
    ]);

    return {
      rest,
      graphql: graphqlData,
      events,
      fetchedAt: new Date().toISOString(),
      accountCreatedAt: user.created_at,
    };
  }

  async fetchUserProfile(githubUsername: string, token: string): Promise<any> {
    const octokit = new Octokit({ auth: token });
    const res = await this.withRetry(() => octokit.rest.users.getByUsername({ username: githubUsername }));
    return res.data;
  }

  /**
   * Main entry point to fetch and sync all GitHub data for a profile.
   */
  async syncProfile(githubProfileId: string): Promise<void> {
    const profile = await this.prisma.githubProfile.findUnique({
      where: { id: githubProfileId },
    });

    if (!profile) {
      throw new Error(`GithubProfile ${githubProfileId} not found`);
    }

    await this.prisma.githubProfile.update({
      where: { id: githubProfileId },
      data: { syncStatus: SyncStatus.RUNNING },
    });

    try {
      const token = this.decryptToken(profile.encryptedToken);

      const [rest, graphqlData, events] = await Promise.all([
        this.fetchRestData(profile.githubUserId, profile.githubUsername, token),
        this.fetchGraphQLData(profile.githubUserId, profile.githubUsername, token),
        this.fetchEventsData(profile.githubUserId, profile.githubUsername, token),
      ]);

      const snapshot: GithubRawDataSnapshot = {
        rest,
        graphql: graphqlData,
        events,
        fetchedAt: new Date().toISOString(),
      };

      await this.prisma.githubProfile.update({
        where: { id: githubProfileId },
        data: {
          rawDataSnapshot: snapshot as any,
          syncStatus: SyncStatus.DONE,
          syncProgress: 'COMPLETE',
          lastSyncAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Sync failed for profile ${githubProfileId}: ${error.message}`);
      await this.prisma.githubProfile.update({
        where: { id: githubProfileId },
        data: { syncStatus: SyncStatus.FAILED },
      });
      throw error;
    }
  }

  async fetchRestData(githubUserId: string, githubUsername: string, token: string): Promise<GithubRestData> {
    return this.withCache(`github:${githubUserId}:rest`, async () => {
      const octokit = new Octokit({ auth: token });
      
      const repos = await this.withRetry(() => 
        octokit.rest.repos.listForAuthenticatedUser({
          sort: 'pushed',
          per_page: 100,
        })
      ) as any;

      const languages: Record<string, any> = {};
      const commits: Record<string, any> = {};

      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
      const since = twelveMonthsAgo.toISOString();

      await Promise.all(repos.data.map(async (repo: any) => {
        const [langRes, commitRes] = await Promise.all([
          this.withRetry(() => octokit.rest.repos.listLanguages({ owner: repo.owner.login, repo: repo.name })) as any,
          this.withRetry(() => octokit.rest.repos.listCommits({ owner: repo.owner.login, repo: repo.name, since, per_page: 100 })) as any,
        ]);
        languages[repo.id] = langRes.data;
        commits[repo.id] = commitRes.data;
      }));

      return { repos: repos.data, languages, commits };
    });
  }

  async fetchGraphQLData(githubUserId: string, githubUsername: string, token: string): Promise<GithubGraphQLData> {
    return this.withCache(`github:${githubUserId}:graphql`, async () => {
      const query = `
        query($login: String!) {
          user(login: $login) {
            pullRequests(last: 100, orderBy: {field: CREATED_AT, direction: DESC}) {
              nodes {
                id
                state
                title
                createdAt
                closedAt
                mergedAt
                repository {
                  name
                  owner { login }
                  stargazerCount
                }
                reviewRequests { totalCount }
                reviews(last: 10) { 
                  nodes {
                    state
                    createdAt
                    author { login }
                  }
                }
                commits(last: 100) {
                  nodes {
                    commit {
                      pushedDate
                      committedDate
                    }
                  }
                }
              }
            }
            pullRequestReviewContributions(last: 100) {
              nodes {
                pullRequest {
                  id
                  repository {
                    name
                    owner { login }
                    stargazerCount
                  }
                }
                body
                createdAt
                comments(last: 10) {
                  nodes {
                    body
                  }
                }
              }
            }
            contributionsCollection {
              contributionCalendar {
                totalContributions
                weeks {
                  contributionDays {
                    contributionCount
                    date
                  }
                }
              }
            }
          }
        }
      `;

      const octokit = new Octokit({ auth: token });
      const result: any = await this.withRetry(() => 
        octokit.graphql(query, {
          login: githubUsername,
        })
      );

      return {
        pullRequests: result.user.pullRequests.nodes,
        reviewsGiven: result.user.pullRequestReviewContributions.nodes,
        contributionCalendar: result.user.contributionsCollection.contributionCalendar,
      };
    });
  }

  async fetchEventsData(githubUserId: string, githubUsername: string, token: string): Promise<GithubEventsData> {
    return this.withCache(`github:${githubUserId}:events`, async () => {
      const octokit = new Octokit({ auth: token });
      const events: any[] = [];
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      for (let page = 1; page <= 10; page++) {
        const res = await this.withRetry(() => 
          octokit.rest.activity.listEventsForAuthenticatedUser({
            username: githubUsername,
            per_page: 100,
            page,
          })
        ) as any;

        if (res.data.length === 0) break;

        const filtered = res.data.filter(event => {
          const createdAt = new Date(event.created_at!);
          if (createdAt < ninetyDaysAgo) return false;
          // We now include private events (listEventsForAuthenticatedUser returns them if scoped)
          return event.type === 'PushEvent' || event.type === 'PullRequestEvent';
        });

        events.push(...filtered);

        const lastEventDate = new Date(res.data[res.data.length - 1].created_at!);
        if (lastEventDate < ninetyDaysAgo) break;
      }

      return { events };
    });
  }

  public decryptToken(encryptedToken: string): string {
    const key = process.env.AUTH_ENCRYPTION_KEY;
    if (!key) throw new Error('AUTH_ENCRYPTION_KEY not set');
    
    const data = encryptedToken.startsWith('v1:') 
      ? encryptedToken.substring(3) 
      : encryptedToken;

    return decrypt(data, key);
  }

  private async withCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
    const result = await fetcher();
    await this.redis.set(key, JSON.stringify(result), 'EX', 24 * 60 * 60);
    return result;
  }

  private async withRetry<T>(fn: () => Promise<T>, attempts = 3, delay = 1000): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const status = error.status || (error.response && error.response.status);
      const retryableStatuses = [429, 500, 502, 503];
      
      if (attempts > 1 && retryableStatuses.includes(status)) {
        this.logger.warn(`Retryable error ${status}. Retrying in ${delay}ms... (${attempts - 1} left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.withRetry(fn, attempts - 1, delay * 2);
      }
      throw error;
    }
  }
}
