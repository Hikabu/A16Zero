/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class GitHubSyncService {
    /**
     * Start GitHub connection
     * Generates a GitHub OAuth URL for the authenticated user and redirects them to GitHub authorization.
     * @returns any Redirects user to GitHub OAuth consent screen
     * @throws ApiError
     */
    public static githubSyncControllerStartConnect(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/sync/github/connect',
        });
    }
    /**
     * GitHub OAuth callback (connect flow)
     * Handles GitHub OAuth callback and links GitHub account to the user profile, then triggers initial sync.
     * @param state OAuth state parameter used for CSRF protection
     * @returns any Redirects user to frontend sync progress page
     * @throws ApiError
     */
    public static githubSyncControllerConnectCallback(
        state: string,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/sync/github/connect/callback',
            query: {
                'state': state,
            },
            errors: {
                401: `Invalid or expired OAuth state`,
            },
        });
    }
    /**
     * Sync Github before scorecard generation
     * Manually triggers a sync of GitHub data for the authenticated user. Requires GitHub to be connected. This step is required before generating a scorecard for a signed in user
     * @returns any Sync job successfully queued or executed
     * @throws ApiError
     */
    public static githubSyncControllerTriggerSync(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/sync/github',
            errors: {
                401: `Invalid or missing JWT token`,
                409: `GitHub account not connected. Frontend should redirect to connect flow.`,
            },
        });
    }
    /**
     * Get GitHub sync status
     * Returns current sync state including progress, errors, and last sync timestamp.
     * @returns any Current sync status retrieved successfully
     * @throws ApiError
     */
    public static githubSyncControllerGetSyncStatus(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/sync/github/status',
        });
    }
}
