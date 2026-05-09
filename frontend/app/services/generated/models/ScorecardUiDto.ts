/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ScorecardUiDto = {
    profile: {
        /**
         * GitHub username of the candidate
         */
        username: string;
        avatarUrl?: string;
        primaryCohort: string;
        seniority: ScorecardUiDto.seniority;
        summary: string;
    };
    score: {
        value: number;
        percentile: number;
        isWithheld: {
            value: boolean;
            reason?: string;
        };
    };
    trust: {
        level: string;
        risk: ScorecardUiDto.risk;
        label: string;
        guidance: string;
    };
    insights: {
        capabilities: Array<{
            key: 'backend' | 'frontend' | 'devops';
            label: string;
            score: number;
            displayScore: number;
            confidence: string;
            strength: 'strong' | 'moderate' | 'weak';
        }>;
        highlights: Array<string>;
        gaps: Array<string>;
        caveats: Array<string>;
        ownership: {
            ownedProjects: number;
            activelyMaintained: number;
            confidence: string;
        };
        impact: {
            activityLevel: string;
            consistency: string;
            externalContributions: number;
            confidence: string;
        };
    };
};
export namespace ScorecardUiDto {
    export enum seniority {
        JUNIOR = 'JUNIOR',
        MID = 'MID',
        SENIOR = 'SENIOR',
        LEAD = 'LEAD',
    }
    export enum risk {
        LOW_RISK = 'LOW_RISK',
        MEDIUM_RISK = 'MEDIUM_RISK',
        HIGH_RISK = 'HIGH_RISK',
        INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
    }
}

