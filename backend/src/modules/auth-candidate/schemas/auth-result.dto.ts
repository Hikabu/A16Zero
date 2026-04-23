export enum AuthState {
	SUCCESS = 'SUCCESS',
	NEEDS_VERIFICATION = 'NEEDS_VERIFICATION',
	MFA_REQUIRED = 'MFA_REQUIRED',
	NEEDS_ONBOARDING = 'NEEDS_ONBOARDING',
  }
  
  export type AuthSuccessData = {
	accessToken: string;
	refreshToken: string;
  };
  
  export type AuthNeedsVerificationData = {
	email: string;
  };
  
  export type AuthMfaRequiredData = {
	mfaToken: string;
  };
  
  export type AuthOnboardingData = {
	tempToken: string;
  };
  
  export type AuthResponse =
	| { type: AuthState.SUCCESS; data: AuthSuccessData }
	| { type: AuthState.NEEDS_VERIFICATION; data: AuthNeedsVerificationData }
	| { type: AuthState.MFA_REQUIRED; data: AuthMfaRequiredData }
	| { type: AuthState.NEEDS_ONBOARDING; data: AuthOnboardingData };