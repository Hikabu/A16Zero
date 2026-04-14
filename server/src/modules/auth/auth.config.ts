export default () => ({
  app: {
    url: process.env.SERVER_URL || 'http://localhost:8000',
  },
  auth: {
    githubCallback: '/auth/github/callback',
    githubLinkCallback: '/auth/github/link/callback',
    googleCallback: '/auth/google/callback',
    googleLinkCallback: '/auth/google/link/callback',
  },
});