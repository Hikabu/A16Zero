/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RegisterDto = {
    /**
     * Valid email address
     */
    email?: string;
    /**
     * Unique username
     */
    username?: string;
    /**
     * Secure password with complexity requirements
     */
    password: ;
    firstName?: string;
    lastName?: string;
    /**
     * User role in the system
     */
    role: RegisterDto.role;
};
export namespace RegisterDto {
    /**
     * User role in the system
     */
    export enum role {
        CANDIDATE = 'CANDIDATE',
        RECRUITER = 'RECRUITER',
    }
}

