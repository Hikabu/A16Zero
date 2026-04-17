import { Injectable } from '@nestjs/common';
import { GithubEventsData } from '../github-adapter/types';
import { PrivacyAdjustmentResult } from './types';

@Injectable()
export class PrivacyAdjustmentEngineService {
  /**
   * Scans GitHub events to identify sustained private organization activity.
   */
  compute(eventsData: GithubEventsData): PrivacyAdjustmentResult {
    const events = eventsData?.events || [];

    // Filter for PushEvents in private organization repositories
    const privateOrgPushEvents = events.filter((event) => {
      return (
        event.type === 'PushEvent' &&
        event.public === false &&
        !!event.org
      );
    });

    // Extract unique months (YYYY-MM)
    const uniqueMonths = new Set<string>();
    privateOrgPushEvents.forEach((event) => {
      const createdAt = event.created_at;
      if (createdAt) {
        const month = createdAt.substring(0, 7); // "YYYY-MM"
        uniqueMonths.add(month);
      }
    });

    const verifiedPrivateMonths = uniqueMonths.size;

    let privateWorkNote: string | null = null;
    if (verifiedPrivateMonths >= 3) {
      privateWorkNote =
        'Profile shows evidence of private or confidential work — public signals may underrepresent full capability.';
    }

    return {
      verifiedPrivateMonths,
      privateWorkNote,
    };
  }
}
