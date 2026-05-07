import { Test, TestingModule } from '@nestjs/testing';
import { ScorecardRendererService } from './scorecard-renderer.service';

describe('ScorecardRendererService', () => {
  let service: ScorecardRendererService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScorecardRendererService],
    }).compile();

    service = module.get<ScorecardRendererService>(ScorecardRendererService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const generateMockApp = () => ({
    candidate: {
      user: { firstName: 'John', lastName: 'Doe', username: 'johndoe' },
    },
    jobPost: { title: 'Backend' },
    decisionCard: {
      verdict: 'REVIEW',
      hrSummary: 'Candidate has good baseline skills.',
      technicalSummary: 'Scored 80% on tech matching.',
      strengths: ['NestJS'],
      risks: [],
    },
    gapReport: {
      missingTechnologies: ['Docker'],
      matchedTechnologies: ['Typescript'],
      gaps: [
        {
          dimension: 'Docker',
          severity: 'SIGNIFICANT',
          probeQuestion: 'How would you containerize Node?',
        },
      ],
    },
  });

  it('case 44: render() returns a string containing text/html doctype markers', () => {
    const html = service.render(generateMockApp());
    expect(typeof html).toBe('string');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
  });

  it('case 45: render() output contains all probe questions from gaps', () => {
    const html = service.render(generateMockApp());
    expect(html).toContain('How would you containerize Node?');
  });

  it('case 46: render() output contains both hrSummary and technicalSummary', () => {
    const html = service.render(generateMockApp());
    expect(html).toContain('Candidate has good baseline skills.');
    expect(html).toContain('Scored 80% on tech matching.');
  });

  it('case 47: render() contains @media print CSS rule', () => {
    const html = service.render(generateMockApp());
    expect(html).toContain('@media print');
  });
});
