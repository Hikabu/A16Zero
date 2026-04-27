import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { ParsedJobRequirements } from './parsed-job-requirements.inteface';

@Injectable()
export class JobDescriptionParserService {
  private readonly anthropic: Anthropic;
  private readonly logger = new Logger(JobDescriptionParserService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
  }

  async parse(jdText: string): Promise<ParsedJobRequirements> {
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system:
          'You are a structured job requirements extractor. Extract requirements from the job description and return ONLY a valid JSON object. No preamble. No markdown.',
        messages: [
          {
            role: 'user',
            content: `Extract requirements from this job description: \n\n${jdText}`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response format from Anthropic');
      }

      let jsonString = content.text.trim();
      
      // Strip accidental markdown fences
      if (jsonString.startsWith('```')) {
        jsonString = jsonString.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const parsed: ParsedJobRequirements = JSON.parse(jsonString);

      // Simple validation of required fields
      if (!parsed.requiredTechnologies || !parsed.requiredRoleType || !parsed.requiredSeniority) {
        throw new Error('Missing required fields in parsed JSON');
      }

      if (parsed.parserConfidence < 0.75) {
        this.logger.warn(`Low parser confidence (${parsed.parserConfidence}) for JD parsing`);
      }

      return parsed;
    } catch (error) {
      this.logger.error(`Failed to parse job description: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Job description parsing failed: ${error.message}`);
    }
  }
}
