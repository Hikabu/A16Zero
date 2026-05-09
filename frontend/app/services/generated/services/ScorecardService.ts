/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PreviewScorecardRequestDto } from '../models/PreviewScorecardRequestDto';
import type { ScorecardRawResponseDto } from '../models/ScorecardRawResponseDto';
import type { ScorecardUiDto } from '../models/ScorecardUiDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ScorecardService {
    /**
     * Preview scorecard (UI model)
     * Generates a mock scorecard for a given GitHub username and returns a frontend-ready UI model. Requires internal API key.
     * @param xInternalKey Internal API key (required)
     * @param requestBody
     * @returns ScorecardUiDto Successfully generated UI scorecard
     * @throws ApiError
     */
    public static scorecardControllerPreview(
        xInternalKey: string,
        requestBody: PreviewScorecardRequestDto,
    ): CancelablePromise<ScorecardUiDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/scorecard/mock/preview',
            headers: {
                'X-Internal-Key': xInternalKey,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid internal API key`,
            },
        });
    }
    /**
     * Preview scorecard (raw model)
     * Returns full raw scoring data for debugging and internal analysis. Not intended for frontend usage.
     * @param xInternalKey Internal API key (required)
     * @param requestBody
     * @returns ScorecardRawResponseDto Raw scorecard data
     * @throws ApiError
     */
    public static scorecardControllerPreviewRaw(
        xInternalKey: string,
        requestBody: PreviewScorecardRequestDto,
    ): CancelablePromise<ScorecardRawResponseDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/scorecard/mock/preview/raw',
            headers: {
                'X-Internal-Key': xInternalKey,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Get my scorecard (UI)
     * Returns the authenticated user’s scorecard formatted for frontend display.
     * @returns ScorecardUiDto User scorecard
     * @throws ApiError
     */
    public static scorecardControllerGetMyScorecard(): CancelablePromise<ScorecardUiDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/scorecard/me',
            errors: {
                404: `No scorecard found. User must trigger GitHub sync first.`,
            },
        });
    }
    /**
     * Get public scorecard (UI)
     * Fetch a cached scorecard for a GitHub username. Returns frontend-ready UI model.
     * @param username GitHub username
     * @returns ScorecardUiDto Public scorecard
     * @throws ApiError
     */
    public static scorecardControllerGetPublicScorecard(
        username: string,
    ): CancelablePromise<ScorecardUiDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/scorecard/{username}',
            path: {
                'username': username,
            },
            errors: {
                404: `No cached scorecard found. Must trigger analysis first.`,
            },
        });
    }
    /**
     * Get my scorecard (raw)
     * Returns raw internal scorecard data for the authenticated user.
     * @returns ScorecardRawResponseDto Raw scorecard
     * @throws ApiError
     */
    public static scorecardControllerGetMyScorecardRaw(): CancelablePromise<ScorecardRawResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/scorecard/me/raw',
        });
    }
    /**
     * Get public scorecard (raw)
     * Returns raw cached scorecard for debugging or internal usage.
     * @param username
     * @returns ScorecardRawResponseDto Raw scorecard
     * @throws ApiError
     */
    public static scorecardControllerGetPublicScorecardRaw(
        username: string,
    ): CancelablePromise<ScorecardRawResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/scorecard/{username}/raw',
            path: {
                'username': username,
            },
        });
    }
}
