import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PipelineStage } from '@prisma/client';

export interface InterviewQuestion {
  question: string;
  rationale: string;
  dimension: string;
  priority: 'MUST_ASK' | 'SHOULD_ASK' | 'NICE_TO_HAVE';
}

export interface InterviewQuestionSet {
  stage: PipelineStage;
  audienceType: 'hr' | 'technical' | 'final';
  questions: InterviewQuestion[];
  generatedAt: Date;
}

@Injectable()
export class InterviewQuestionService {
  private readonly anthropic: Anthropic;
  private readonly logger = new Logger(InterviewQuestionService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
  }

  async generate(application: any, targetStage: PipelineStage): Promise<InterviewQuestionSet> {
    let audienceType: 'hr' | 'technical' | 'final';
    let systemPrompt = '';

    if (targetStage === PipelineStage.INTERVIEW_HR) {
      audienceType = 'hr';
      systemPrompt = "You are an HR interviewer preparing for a screening call. Generate 5 interview questions focused on: motivation and culture fit, career trajectory, communication and collaboration indicators, and verifying the candidate's self-reported background. Questions must be answerable by any developer — avoid deep technical specifics. Return ONLY a JSON array.";
    } else if (targetStage === PipelineStage.INTERVIEW_FINAL) {
      audienceType = 'final';
      systemPrompt = "You are preparing a final-round interview for a senior decision-maker. Generate 5 questions that assess leadership potential, system-level thinking, past decision-making in ambiguous situations, and long-term motivation. Questions should be appropriate for an experienced candidate who has already passed technical screening. Return ONLY a JSON array.";
    } else if (targetStage === PipelineStage.INTERVIEW_TECHNICAL) {
      audienceType = 'technical';
      systemPrompt = "You are a senior engineer preparing a technical interview. Generate 6 interview questions based on the candidate's actual GitHub data and gap analysis. Questions must probe specific gaps identified, validate claimed strengths with concrete scenarios, and test depth of knowledge in their stated technologies. Reference real numbers from the data. Return ONLY a JSON array.";
    } else {
      // Fallback
      audienceType = 'technical';
      systemPrompt = "You are preparing a technical interview. Generate 5 relevant interview questions. Return ONLY a JSON array.";
    }

    const { decisionCard = {}, gapReport = {} } = application;
    const analysisResult = await this.getAnalysisResult(application); // Helper logic if needed, but the prompt says to extract from application

    // Structure prompt payload
    const payload = JSON.stringify({
      verdict: decisionCard.verdict,
      hrSummary: decisionCard.hrSummary,
      gaps: (gapReport.gaps || []).map((g: any) => ({
        dimension: g.dimension,
        severity: g.severity,
        actual: g.actual,
        expected: g.expected
      })),
      strengths: decisionCard.strengths || [],
      risks: decisionCard.risks || [],
      verifiedVouchCount: application.candidate?.user?.vouchesReceived?.length || 0 // approximate or passed explicitly
    }, null, 2);

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514', // Claude 3.5 Sonnet
        max_tokens: 1200,
        system: systemPrompt + '\nJSON schema for each object in array: { "question": string, "rationale": string, "dimension": string, "priority": "MUST_ASK"|"SHOULD_ASK"|"NICE_TO_HAVE" }',
        messages: [
          { role: 'user', content: `Generate questions based on this raw application scoring profile:\n\n${payload}` }
        ]
      });

      let responseText = '';
      if (response.content[0].type === 'text') {
        responseText = response.content[0].text;
      }
      
      const jsonStart = responseText.indexOf('[');
      const jsonEnd = responseText.lastIndexOf(']') + 1;
      
      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error('Failed to find JSON array in response');
      }
      
      const cleanJson = responseText.substring(jsonStart, jsonEnd);
      const parsedQuestions: InterviewQuestion[] = JSON.parse(cleanJson);

      return {
        stage: targetStage,
        audienceType,
        questions: parsedQuestions,
        generatedAt: new Date()
      };
    } catch (e: any) {
      this.logger.error(`Anthropic API or parse error: ${e.message}`);
      throw new InternalServerErrorException('Failed to generate interview questions. Please try again or construct manual questions.');
    }
  }

  // Fallback to fetch if the analysisResult wasn't fully preloaded on the application scope.
  private async getAnalysisResult(app: any) {
    return app.analysisResult || {}; 
  }
}
