export default () => ({
	app: {
	  url: process.env.SERVER_URL || 'http://localhost:8000',
	},
	auth: {
	  githubCallback: '/auth/candidate/github/callback',
	  githubLinkCallback: '/auth/candidate/github/link/callback',
	  githubSyncConnectCallback: '/me/github/sync/connect/callback',
	  googleCallback: '/auth/candidate/google/callback',
	  googleLinkCallback: '/auth/candidate/google/link/callback',
	  encryptionKey: process.env.AUTH_ENCRYPTION_KEY,
	},
	jwt_secret: {
	  access: process.env.JWT_ACCESS_SECRET,
	  refresh: process.env.JWT_REFRESH_SECRET,
	  mfa: process.env.JWT_MFA_SECRET,
	  onboarding: process.env.JWT_ONBOARDING_SECRET,
	},
  });
  