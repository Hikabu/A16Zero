/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateAnalysisDto } from '../models/CreateAnalysisDto';
import type { JobQueueResponseDto } from '../models/JobQueueResponseDto';
import type { JobResponseDto } from '../models/JobResponseDto';
import type { JobResultResponseDto } from '../models/JobResultResponseDto';
import type { JobStatusResponseDto } from '../models/JobStatusResponseDto';
import type { RecomputeAnalysisDto } from '../models/RecomputeAnalysisDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ProofOfTalentService {
    /**
     * Trigger developer analysis
     *
     * Creates or retrieves an analysis job for a developer.
     *
     * Modes:
     * 1. Authenticated: Reads linked GitHub/Wallet from profile.
     * 2. Anonymous: Takes identifiers from body.
     *
     * Features:
     * - Cache check (skip if force=true)
     * - GitHub snapshot reuse (<24h)
     * - Async execution via BullMQ
     *
     * @param requestBody
     * Optional if authenticated.
     *
     * - If JWT is provided → body is ignored (uses linked accounts)
     * - If no JWT → must provide githubUsername or walletAddress
     *
     * @returns JobQueueResponseDto
     * @throws ApiError
     */
    public static analysisControllerCreateAnalysis(
        requestBody?: CreateAnalysisDto,
    ): CancelablePromise<JobQueueResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/analysis',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Recompute analysis
     *
     * Triggers a fresh analysis.
     *
     * - If force=true → cache is invalidated
     * - Requires internal API key (Bearer token)
     *
     * Use this for admin/system reprocessing.
     *
     * @param xInternalKey Internal API key
     * @param requestBody
     * @returns JobResponseDto Recompute job created
     * @throws ApiError
     */
    public static analysisControllerRecompute(
        xInternalKey: string,
        requestBody: RecomputeAnalysisDto,
    ): CancelablePromise<JobResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/analysis/recompute',
            headers: {
                'x-internal-key': xInternalKey,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid internal API key`,
                404: `Profile not found`,
            },
        });
    }
    /**
     * Get job status
     * Returns current job state, stage, and progress percentage.
     * @param jobId BullMQ job ID returned when creating analysis
     * @returns JobStatusResponseDto Job status retrieved
     * @throws ApiError
     */
    public static analysisControllerGetStatus(
        jobId: string,
    ): CancelablePromise<JobStatusResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/analysis/{jobId}/status',
            path: {
                'jobId': jobId,
            },
            errors: {
                404: `Job not found`,
            },
        });
    }
    /**
     * Get job result
     * Returns final analysis result if completed.
     * @param jobId
     * @returns JobResultResponseDto Job result response
     * @throws ApiError
     */
    public static analysisControllerGetResult(
        jobId: string,
    ): CancelablePromise<JobResultResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/analysis/{jobId}/result',
            path: {
                'jobId': jobId,
            },
            errors: {
                404: `Job not found`,
            },
        });
    }
}
