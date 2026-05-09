/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DashboardStatsResponseDto } from '../models/DashboardStatsResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AnalyticsService {
    /**
     * Get dashboard statistics
     *
     * Returns aggregated analytics data for the authenticated company.
     *
     * This endpoint is typically used to power dashboard views in frontend applications.
     *
     * Includes:
     * - Total number of jobs posted
     * - Number of active jobs
     * - Total number of shortlisted candidates across all jobs
     *
     * Requires a valid Bearer token.
     *
     * Authorization header format:
     * Authorization: Bearer <token>
     *
     * @returns DashboardStatsResponseDto Dashboard statistics retrieved successfully
     * @throws ApiError
     */
    public static analyticsControllerGetDashboard(): CancelablePromise<DashboardStatsResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/analytics/dashboard',
            errors: {
                401: `Unauthorized - Missing or invalid token`,
                500: `Unexpected server error`,
            },
        });
    }
}
