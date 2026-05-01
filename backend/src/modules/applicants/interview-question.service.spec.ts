import { Test, TestingModule } from '@nestjs/testing';
import { InterviewQuestionService } from './interview-question.service';
import { PipelineStage } from '@prisma/client';
import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Mock Google AI
jest.mock('@google/generative-ai', () => {
  return jest.fn().mockImplementation(() => {
    return {
      messages: {
        create: jest.fn()
      }
    };
  });
});

describe('InterviewQuestionService', () => {
  let service: InterviewQuestionService;
  let anthropicMock: any;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue('fake-key'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewQuestionService,
        { provide: ConfigService, useValue: mockConfigService }
      ],
    }).compile();

    service = module.get<InterviewQuestionService>(InterviewQuestionService);
    // Grab instance to mock return values
    anthropicMock = (service as any).anthropic.messages;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('case 40: Returns InterviewQuestionSet with correct audienceType for INTERVIEW_HR', async () => {
    anthropicMock.create.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify([]) }]
    });

    const result = await service.generate({} as any, PipelineStage.INTERVIEW_HR);
    expect(result.audienceType).toBe('hr');
  });

  it('case 41: Returns 5 questions for hr audience, 6 for technical audience (simulated by prompt config)', async () => {
    // Generate for HR
    anthropicMock.create.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(Array(5).fill({ question: 'Q', priority: 'SHOULD_ASK' })) }]
    });
    const resultHr = await service.generate({} as any, PipelineStage.INTERVIEW_HR);
    expect(resultHr.questions).toHaveLength(5);
    expect(resultHr.audienceType).toBe('hr');

    // Generate for Tech
    anthropicMock.create.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(Array(6).fill({ question: 'Q', priority: 'MUST_ASK' })) }]
    });
    const resultTech = await service.generate({} as any, PipelineStage.INTERVIEW_TECHNICAL);
    expect(resultTech.questions).toHaveLength(6);
    expect(resultTech.audienceType).toBe('technical');
  });

  it('case 42: Each question has priority field: MUST_ASK | SHOULD_ASK | NICE_TO_HAVE', async () => {
    anthropicMock.create.mockResolvedValue({
      content: [{ 
        type: 'text', 
        text: JSON.stringify([
            { question: 'A', priority: 'MUST_ASK' },
            { question: 'B', priority: 'SHOULD_ASK' },
            { question: 'C', priority: 'NICE_TO_HAVE' },
        ]) 
      }]
    });

    const result = await service.generate({} as any, PipelineStage.INTERVIEW_FINAL);
    for (const q of result.questions) {
      expect(['MUST_ASK', 'SHOULD_ASK', 'NICE_TO_HAVE']).toContain(q.priority);
    }
  });

  it('case 43: API error → throws InternalServerErrorException (no silent fallback)', async () => {
    anthropicMock.create.mockRejectedValue(new Error('Anthropic API Outage'));

    await expect(service.generate({} as any, PipelineStage.INTERVIEW_HR))
      .rejects.toThrow(InternalServerErrorException);
  });
});
