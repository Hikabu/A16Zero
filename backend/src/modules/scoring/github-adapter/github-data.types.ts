export interface GitHubUserProfile {
  username:         string;
  accountCreatedAt: Date;
  accountAge:       number;    // months since created_at
  publicRepos:      number;
  followers:        number;
}

export interface GitHubRepo {
  name:        string;
  language:    string | null;
  stars:       number;
  forks:       number;
  topics:      string[];
  createdAt:   Date;
  pushedAt:    Date;
  isFork:      boolean;
  description: string | null;
}

export interface GitHubContributionData {
  weeklyTotals:      number[];  // exactly 52 values — one per week, most recent last
  activeWeeksCount:  number;    // pre-computed: count of weeks with total > 0
}

export interface GitHubExternalPRData {
  mergedExternalPRCount: number;
  externalRepoNames:     string[];  // repo names only, no other details
}

export interface GitHubRawData {
  profile:       GitHubUserProfile;
  repos:         GitHubRepo[];
  contributions: GitHubContributionData;
  externalPRs:   GitHubExternalPRData;
  fetchedAt:     Date;
}
