/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class MockDevReferenceService {
    /**
     * [MOCK] GitHub + Solana wallet result
     * Returns a fully populated AnalysisResult including deployedPrograms with upgradeCount and Superteam achievements. Use this to develop wallet-related UI.
     * @returns any
     * @throws ApiError
     */
    public static mockControllerGetWallet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/mock/analysis/wallet',
        });
    }
    /**
     * [MOCK] GitHub-only result (web3: null)
     * Returns an AnalysisResult where web3 is null. Use to verify UI renders correctly without wallet data.
     * @returns any
     * @throws ApiError
     */
    public static mockControllerGetGithubOnly(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/mock/analysis/github-only',
        });
    }
    /**
     * [MOCK] Wallet-only result (no GitHub)
     * Returns an AnalysisResult with low-confidence GitHub signals and on-chain wallet data only.
     * @returns any
     * @throws ApiError
     */
    public static mockControllerGetWalletOnly(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/mock/analysis/wallet-only',
        });
    }
    /**
     * [MOCK] All AnalysisResult fixtures
     * Returns all three mock AnalysisResult variants in one response. Useful for component story setup.
     * @returns any
     * @throws ApiError
     */
    public static mockControllerGetAll(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/mock/analysis',
        });
    }
    /**
     * [MOCK] API Viewer — interactive reference page
     * Serves a standalone HTML page that renders all mock API responses for frontend developers.
     * @returns any
     * @throws ApiError
     */
    public static mockControllerGetViewer(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/mock/viewer',
        });
    }
}
