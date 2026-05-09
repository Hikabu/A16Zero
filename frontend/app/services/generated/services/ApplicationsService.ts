/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AdvanceStageDto } from '../models/AdvanceStageDto';
import type { ApplyDecisionDto } from '../models/ApplyDecisionDto';
import type { ApplyResponseDto } from '../models/ApplyResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ApplicationsService {
    /**
     * Preview gap analysis
     * Returns gap analysis BEFORE applying.
     *
     * Does not persist data.
     * @param jobId Job to preview gap analysis against
     * @returns void
     * @throws ApiError
     */
    public static applicantsControllerGetGapPreview(
        jobId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/applications/me/gap-preview',
            query: {
                'jobId': jobId,
            },
            errors: {
                400: `Missing jobId`,
            },
        });
    }
    /**
     * Apply for a job
     * Allows an authenticated candidate to apply for an ACTIVE job.
     *
     * This triggers:
     * - Gap analysis
     * - Decision card generation
     * - Initial pipeline stage = APPLIED
     * @param jobId Job ID
     * @returns ApplyResponseDto Application submitted successfully
     * @throws ApiError
     */
    public static applicantsControllerApply(
        jobId: string,
    ): CancelablePromise<ApplyResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/applications/me/{jobId}',
            path: {
                'jobId': jobId,
            },
            errors: {
                400: `Already applied OR missing analysis`,
                401: `Missing or invalid JWT token`,
            },
        });
    }
    /**
     * Get my applications
     * Returns candidate applications with human-readable pipeline stages.
     * @returns any
     * @throws ApiError
     */
    public static applicantsControllerGetMyApplications(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/applications/me',
        });
    }
    /**
     * List job applications (HR)
     * Returns all applications for a job including:
     * - HR decision view
     * - Technical evaluation
     * - Candidate info
     *
     * Supports filtering.
     * @param jobId
     * @param fitTier Filter by fit tier
     * @param minScore Minimum role fit score
     * @param pipelineStage Filter by pipeline stage
     * @returns any Applications retrieved successfully
     * @throws ApiError
     */
    public static applicantsControllerGetJobApplications(
        jobId: string,
        fitTier?: 'STRONG' | 'PROBE' | 'PASS',
        minScore?: number,
        pipelineStage?: 'APPLIED' | 'REVIEWED' | 'SHORTLISTED' | 'INTERVIEW_HR' | 'INTERVIEW_TECHNICAL' | 'INTERVIEW_FINAL' | 'OFFER' | 'HIRED' | 'REJECTED',
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/applications/hr/jobs/{jobId}',
            path: {
                'jobId': jobId,
            },
            query: {
                'fitTier': fitTier,
                'minScore': minScore,
                'pipelineStage': pipelineStage,
            },
        });
    }
    /**
     * Get application FULL details
     * Returns full application data including:
     * - Decision card
     * - Gap report
     * - Candidate profiles
     * - Interview questions
     * @param appId
     * @returns any Returns application detail with dual-view shape (HR vs CTO)
     * @throws ApiError
     */
    public static applicantsControllerGetApplicationDetail(
        appId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/applications/hr/{appId}',
            path: {
                'appId': appId,
            },
            errors: {
                404: `Application not found`,
            },
        });
    }
    /**
     * Apply review decision
     * Marks an application as SHORTLISTED, REJECTED, or REVIEWED.
     * @param appId
     * @param requestBody
     * @returns any Decision applied successfully
     * @throws ApiError
     */
    public static applicantsControllerApplyDecision(
        appId: string,
        requestBody: ApplyDecisionDto,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/applications/hr/{appId}/decision',
            path: {
                'appId': appId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Export candidate scorecard (HTML)
     * Generates a printable HTML scorecard for external sharing.
     * @param appId
     * @returns any HTML scorecard generated
     * @throws ApiError
     */
    public static applicantsControllerGetScorecard(
        appId: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/applications/hr/{appId}/scorecard',
            path: {
                'appId': appId,
            },
        });
    }
    /**
     * Advance pipeline stage
     * Moves candidate forward in hiring pipeline.
     *
     * Validates transitions and may generate interview questions.
     * @param appId
     * @param requestBody
     * @returns any Stage updated successfully
     * @throws ApiError
     */
    public static applicantsControllerAdvanceApplicationStage(
        appId: string,
        requestBody: AdvanceStageDto,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/applications/hr/{appId}/stage',
            path: {
                'appId': appId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get interview questions
     * Returns generated interview questions.
     *
     * Optional:
     * - Filter by stage
     * - Defaults to latest set
     * @param appId
     * @param stage
     * @returns any
     * @throws ApiError
     */
    public static applicantsControllerGetInterviewQuestions(
        appId: string,
        stage?: 'APPLIED' | 'REVIEWED' | 'SHORTLISTED' | 'INTERVIEW_HR' | 'INTERVIEW_TECHNICAL' | 'INTERVIEW_FINAL' | 'OFFER' | 'HIRED' | 'REJECTED',
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/applications/hr/{appId}/interview-questions',
            path: {
                'appId': appId,
            },
            query: {
                'stage': stage,
            },
        });
    }
}
