import { Injectable, Inject, Logger } from '@nestjs/common';
import { Octokit } from 'octokit';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { decrypt } from '../../shared/crypto.utils';
import { SyncStatus } from '@prisma/client';
import {
  GitHubRawData,
  GitHubRepo,
  GitHubUserProfile,
  GitHubContributionData,
  GitHubExternalPRData,
} from './github-data.types';

const MAX_REPOS = 30;

@Injectable()
export class GithubAdapterService {
  private readonly logger = new Logger(GithubAdapterService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS') private readonly redis: Redis,
  ) {}

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
      const rawData = await this.fetchRawData(profile.githubUsername, token);

      await this.prisma.githubProfile.update({
        where: { id: githubProfileId },
        data: {
          rawDataSnapshot: rawData as any,
          syncStatus: SyncStatus.DONE,
          syncProgress: 'COMPLETE',
          lastSyncAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Sync failed for profile ${githubProfileId}: ${error.message}`,
      );
      await this.prisma.githubProfile.update({
        where: { id: githubProfileId },
        data: { syncStatus: SyncStatus.FAILED },
      });
      throw error;
    }
  }

  /**
   * Fetches the minimal audited data required for scoring.
   */
  async fetchRawData(
    githubUsername: string,
    token: string,
  ): Promise<GitHubRawData> {
    return this.withCache(`github:v2:raw:${githubUsername}`, async () => {
      const octokit = new Octokit({ auth: token });

      // 1. Fetch Profile
      const profileData = await this.fetchProfile(octokit, githubUsername);

      // 2. Fetch Repos (limited to MAX_REPOS)
      const repos = await this.fetchRepos(octokit, githubUsername);

      const manifestKeys = await this.fetchManifests(
        octokit,
        githubUsername,
        repos,
      );

      // 3. Fetch GraphQL data (Contributions & External PRs)
      const { contributions, externalPRs } = await this.fetchGraphQLData(
        octokit,
        githubUsername,
      );

      return {
        profile: profileData,
        repos,
        contributions,
        externalPRs,
        manifestKeys,
        fetchedAt: new Date(),
      };
    });
  }

  private async fetchProfile(
    octokit: Octokit,
    username: string,
  ): Promise<GitHubUserProfile> {
    const res = await this.withRetry(() =>
      octokit.rest.users.getByUsername({ username }),
    );
    const data = res.data;

    const accountCreatedAt = new Date(data.created_at);
    const monthsDiff =
      (new Date().getTime() - accountCreatedAt.getTime()) /
      (1000 * 60 * 60 * 24 * 30.44);

    return {
      username: data.login,
      accountCreatedAt: new Date(data.created_at),
      accountAge: Math.floor(monthsDiff),
      publicRepos: data.public_repos,
      followers: data.followers,
    };
  }

  private async fetchRepos(
    octokit: Octokit,
    username: string,
  ): Promise<GitHubRepo[]> {
    const res = await this.withRetry(() =>
      octokit.rest.repos.listForUser({
        username,
        sort: 'pushed',
        per_page: 100, // We fetch 100 but only take MAX_REPOS
        headers: {
          accept: 'application/vnd.github.mercy-preview+json',
        },
      }),
    );

    const rawRepos = res.data as any[];
    return rawRepos.slice(0, MAX_REPOS).map((r) => ({
      name: r.name,
      language: r.language,
      stars: r.stargazers_count,
      forks: r.forks_count,
      topics: r.topics || [],
      createdAt: new Date(r.created_at),
      pushedAt: new Date(r.pushed_at),
      isFork: r.fork,
      description: r.description,
    }));
  }

  private async fetchManifests(
    octokit: Octokit,
    username: string,
    repos: GitHubRepo[],
  ): Promise<Record<string, string[]>> {
    const manifestKeys: Record<string, string[]> = {};
    const nonForkOwnedRepos = repos.filter((r) => !r.isFork).slice(0, 20);

    for (const repo of nonForkOwnedRepos) {
      const depKeys: string[] = [];

      // 1. Try package.json
      try {
        const pkgRes = await octokit.rest.repos.getContent({
          owner: username,
          repo: repo.name,
          path: 'package.json',
        });

        if (
          !Array.isArray(pkgRes.data) &&
          pkgRes.data.type === 'file' &&
          pkgRes.data.content
        ) {
          const contentStr = Buffer.from(
            pkgRes.data.content,
            'base64',
          ).toString('utf8');
          const parsed = JSON.parse(contentStr);
          const pkgDeps = Object.keys(parsed.dependencies || {}).concat(
            Object.keys(parsed.devDependencies || {}),
          );
          depKeys.push(...pkgDeps);
        }
      } catch (e) {
        // Skip silently on 404 or parse error
      }

      // 2. Try Cargo.toml
      try {
        const cargoRes = await octokit.rest.repos.getContent({
          owner: username,
          repo: repo.name,
          path: 'Cargo.toml',
        });

        if (
          !Array.isArray(cargoRes.data) &&
          cargoRes.data.type === 'file' &&
          cargoRes.data.content
        ) {
          const contentStr = Buffer.from(
            cargoRes.data.content,
            'base64',
          ).toString('utf8');
          const lines = contentStr.split('\n');
          let inDependencies = false;

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            if (trimmed.startsWith('[')) {
              if (
                trimmed === '[dependencies]' ||
                trimmed === '[dev-dependencies]' ||
                trimmed === '[build-dependencies]'
              ) {
                inDependencies = true;
              } else {
                inDependencies = false;
              }
              continue;
            }

            if (inDependencies) {
              const parts = trimmed.split('=');
              if (parts.length >= 2) {
                depKeys.push(parts[0].trim());
              }
            }
          }
        }
      } catch (e) {
        // Skip silently on 404 or parse error
      }

      manifestKeys[repo.name] = depKeys;
    }

    return manifestKeys;
  }

  private async fetchGraphQLData(
    octokit: Octokit,
    username: string,
  ): Promise<{
    contributions: GitHubContributionData;
    externalPRs: GitHubExternalPRData;
  }> {
    const query = `
      query($login: String!) {
        user(login: $login) {
          contributionsCollection {
            contributionCalendar {
              weeks {
                contributionDays {
                  contributionCount
                }
              }
            }
          }
          pullRequests(states: MERGED, first: 100, orderBy: {field: CREATED_AT, direction: DESC}) {
            nodes {
              repository {
                name
                owner { login }
              }
            }
          }
        }
      }
    `;

    const result: any = await this.withRetry(() =>
      octokit.graphql(query, {
        login: username,
      }),
    );

    const user = result.user;

    // Process Contributions
    const weeklyTotals: number[] = (
      user.contributionsCollection.contributionCalendar.weeks || []
    )
      .map((week: any) =>
        week.contributionDays.reduce(
          (sum: number, day: any) => sum + day.contributionCount,
          0,
        ),
      )
      .slice(-52); // Ensure exactly 52 weeks

    // Pad if fewer than 52 weeks returned
    while (weeklyTotals.length < 52) {
      weeklyTotals.unshift(0);
    }

    const activeWeeksCount = weeklyTotals.filter((total) => total > 0).length;

    // Process External PRs
    const externalPRs = user.pullRequests.nodes.filter(
      (pr: any) =>
        pr.repository.owner.login.toLowerCase() !== username.toLowerCase(),
    );

    return {
      contributions: {
        weeklyTotals,
        activeWeeksCount,
      },
      externalPRs: {
        mergedExternalPRCount: externalPRs.length,
        externalRepoNames: Array.from(
          new Set(externalPRs.map((pr: any) => pr.repository.name)),
        ),
      },
    };
  }

  public decryptToken(encryptedToken: string): string {
    const key = process.env.AUTH_ENCRYPTION_KEY;
    if (!key) throw new Error('AUTH_ENCRYPTION_KEY not set');

    const data = encryptedToken.startsWith('v1:')
      ? encryptedToken.substring(3)
      : encryptedToken;

    return decrypt(data, key);
  }

  private async withCache<T>(
    key: string,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.redis.get(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Revive dates if necessary (simplified here, but works for plain data)
      return parsed;
    }
    const result = await fetcher();
    await this.redis.set(key, JSON.stringify(result), 'EX', 24 * 60 * 60);
    return result;
  }

  private async withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const status = error.status || (error.response && error.response.status);
      const isRateLimit =
        status === 429 ||
        (status === 403 && error.message?.toLowerCase().includes('rate limit'));

      if (attempts > 1 && isRateLimit) {
        this.logger.warn(`GitHub API rate limit hit. Retrying in 2 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return this.withRetry(fn, attempts - 1);
      }

      if (isRateLimit) {
        throw new Error(
          'GitHub API rate limit exceeded — please retry in a few minutes',
        );
      }

      throw error;
    }
  }
}
