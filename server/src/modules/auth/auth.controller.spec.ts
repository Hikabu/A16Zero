import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    completeOnboarding: jest.fn(),
    oauthLogin: jest.fn(),
    linkOAuth: jest.fn(),
    generateLinkState: jest.fn().mockResolvedValue('mock_state'),
    verifyEmail: jest.fn(),
    setupMfa: jest.fn(),
    activateMfa: jest.fn(),
    verifyMfa: jest.fn(),
    githubLink: jest.fn(),
    googleLink: jest.fn()
  };

  const mockConfigService = {
    get: jest.fn((key) => {
      if (key === 'app.url') return 'http://localhost:3000';
      if (key === 'auth.githubLinkCallback') return '/auth/github/link/callback';
      if (key === 'github.clientID') return 'client_id';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  describe('Secure Linking', () => {
  it('should generate secure state for link', async () => {
  const req = { user: { id: 'user_1' } };

  const result = await controller.linkGithub(req);

  expect(mockAuthService.githubLink).toHaveBeenCalledWith('user_1');
});

  it('should verify state in callback', async () => {
    const req = {
      authUser: { id: 'user_1' },
      user: { id: 'user_1' }, // IMPORTANT: callback uses BOTH
    };

    await controller.linkGithubCallback(req, 'mock_state');

    expect(authService.linkOAuth).toHaveBeenCalledWith(
      'user_1',        // authUser.id
      req.user,        // profile
      'GITHUB',
      'mock_state',
    );
  });
});

  describe('MFA & Verification', () => {
    it('should call verifyEmail', async () => {
      await controller.verifyEmail('123456');
      expect(authService.verifyEmail).toHaveBeenCalledWith('123456');
    });

    it('should call setupMfa', async () => {
      const req = { user: { id: 'user_1' } };
      await controller.setupMfa(req);
      expect(authService.setupMfa).toHaveBeenCalledWith('user_1');
    });
  });
});
