/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateJobDto } from '../models/CreateJobDto';
import type { JobResponseDto } from '../models/JobResponseDto';
import type { ParsedJobRequirementsSwaggerDto } from '../models/ParsedJobRequirementsSwaggerDto';
import type { ParseJdResponseDto } from '../models/ParseJdResponseDto';
import type { ParseJobDescriptionDto } from '../models/ParseJobDescriptionDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class JobsService {
    /**
     * Browse open jobs (Public)
     * Returns a list of published jobs with filtering and pagination.
     * @param search Search in job title and description
     * @param roleType Role type required for the job
     * @param seniority Seniority level required
     * @param isWeb3 Filter Web3 jobs
     * @param page Page number (default: 1)
     * @param limit Items per page (max: 50)
     * @returns any
     * @throws ApiError
     */
    public static jobsControllerGetPublicJobs(
        search?: string,
        roleType?: 'BACKEND' | 'FRONTEND' | 'FULLSTACK' | 'INFRASTRUCTURE' | 'DATA_ML' | 'SMART_CONTRACT' | 'WEB3_BACKEND' | 'WEB3_FRONTEND' | 'WEB3_FULLSTACK' | 'DEFI_PROTOCOL' | 'SECURITY_WEB3' | 'SECURITY' | 'GENERALIST',
        seniority?: 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD',
        isWeb3?: boolean,
        page?: number,
        limit?: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/jobs',
            query: {
                'search': search,
                'roleType': roleType,
                'seniority': seniority,
                'isWeb3': isWeb3,
                'page': page,
                'limit': limit,
            },
        });
    }
    /**
     * Get all jobs created by the authenticated company
     * Returns all job posts owned by the authenticated company, ordered by newest first.
     *
     * Useful for dashboards and job management views.
     * @returns JobResponseDto List of jobs
     * @throws ApiError
     */
    public static jobsControllerGetMyJobs(): CancelablePromise<Array<JobResponseDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/jobs/me',
            errors: {
                401: `Unauthorized`,
            },
        });
    }
    /**
     * Get job details (Public)
     * Returns detailed information about a published job.
     * @param id
     * @returns any
     * @throws ApiError
     */
    public static jobsControllerGetPublicJobById(
        id: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/jobs/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Create a new job post draft
     * Creates a job in DRAFT status for the authenticated company.
     *
     * Use this endpoint when a company wants to start drafting a job listing before publishing it.
     * @param requestBody
     * @returns JobResponseDto Job created successfully
     * @throws ApiError
     */
    public static jobsControllerCreate(
        requestBody: CreateJobDto,
    ): CancelablePromise<JobResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/jobs/draft',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid job payload`,
                401: `Missing or invalid JWT token`,
            },
        });
    }
    /**
     * Parse job description into structured requirements
     * Uses AI to extract structured requirements (skills, seniority, weights).
     *
     * Frontend should use this for preview before confirming requirements.
     * @param id Job ID
     * @param requestBody
     * @returns ParseJdResponseDto Parsed job requirements preview
     * @throws ApiError
     */
    public static jobsControllerParseJd(
        id: string,
        requestBody: ParseJobDescriptionDto,
    ): CancelablePromise<ParseJdResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/jobs/{id}/parse-jd',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Confirm parsed job requirements
     * Persists AI-parsed requirements into the job.
     *
     * This step finalizes the structured scoring configuration.
     * @param id Job ID
     * @param requestBody
     * @returns JobResponseDto Requirements confirmed and saved
     * @throws ApiError
     */
    public static jobsControllerConfirmRequirements(
        id: string,
        requestBody: ParsedJobRequirementsSwaggerDto,
    ): CancelablePromise<JobResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/jobs/{id}/confirm-requirements',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Validation failed`,
            },
        });
    }
    /**
     * Publish a job
     * Changes job status from DRAFT to ACTIVE.
     *
     * Once published, the job becomes visible to candidates.
     * @param id Job ID
     * @returns JobResponseDto Job published
     * @throws ApiError
     */
    public static jobsControllerPublish(
        id: string,
    ): CancelablePromise<JobResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/jobs/{id}/publish',
            path: {
                'id': id,
            },
            errors: {
                403: `Forbidden`,
                404: `Job not found or does not belong to user`,
            },
        });
    }
    /**
     * Close a job
     * Marks the job as CLOSED.
     *
     * Closed jobs are no longer visible or accepting applications.
     * @param id Job ID
     * @returns JobResponseDto Job closed
     * @throws ApiError
     */
    public static jobsControllerClose(
        id: string,
    ): CancelablePromise<JobResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/jobs/{id}/close',
            path: {
                'id': id,
            },
            errors: {
                404: `Job not found`,
            },
        });
    }
}
