import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { ParsedJobRequirements } from './parsed-job-requirements.inteface';

@Injectable()
export class JobDescriptionParserService {
  private readonly ai: GoogleGenAI;
  private readonly logger = new Logger(JobDescriptionParserService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GOOGLE_AI_API_KEY');

    if (!apiKey) {
      throw new Error('Missing GOOGLE_AI_API_KEY');
    }

    this.ai = new GoogleGenAI({ apiKey });
  }

  async parse(jdText: string): Promise<ParsedJobRequirements> {
    try {
      const prompt = `
Extract structured job requirements from this job description.

Return ONLY valid JSON with this exact shape:
{
  "requiredTechnologies": string[],
  "requiredRoleType": string,
  "requiredSeniority": string,
  "parserConfidence": number
}

Rules:
- requiredTechnologies: list all technologies mentioned
- requiredRoleType: one of [BACKEND, FRONTEND, FULLSTACK, DEVOPS, MOBILE, DATA]
- requiredSeniority: one of [JUNIOR, MID, SENIOR]
- parserConfidence: number between 0 and 1

Job Description:
${jdText}
`;

      const result = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

const raw = result.text ?? '';
      // 🔥 CLEAN RESPONSE (Gemini sometimes wraps JSON)
     const cleaned = raw
  .replace(/```json/g, '')
  .replace(/```/g, '')
  .trim();

if (!cleaned) {
  throw new Error('Empty response from Gemini');
}

const parsed = JSON.parse(cleaned);


      // ✅ Normalize (prevents DB crashes later)
      parsed.requiredRoleType = this.normalizeRole(parsed.requiredRoleType);
      parsed.requiredSeniority = this.normalizeSeniority(parsed.requiredSeniority);

      if (parsed.parserConfidence < 0.75) {
        this.logger.warn(`Low confidence score: ${parsed.parserConfidence}`);
      }

      return parsed;

    } catch (error) {
      this.logger.error(`Gemini Parsing Error: ${error.message}`);
      throw new InternalServerErrorException('Failed to parse JD');
    }
  }

  private normalizeRole(role: string): string {
    const r = role?.toUpperCase();

    if (r?.includes('BACK')) return 'BACKEND';
    if (r?.includes('FRONT')) return 'FRONTEND';
    if (r?.includes('FULL')) return 'FULLSTACK';
    if (r?.includes('DEVOPS')) return 'DEVOPS';
    if (r?.includes('DATA')) return 'DATA';
    if (r?.includes('MOBILE')) return 'MOBILE';

    return 'BACKEND'; // fallback
  }

  private normalizeSeniority(level: string): string {
    const l = level?.toUpperCase();

    if (l?.includes('JUNIOR')) return 'JUNIOR';
    if (l?.includes('MID')) return 'MID';
    if (l?.includes('SENIOR')) return 'SENIOR';

    return 'MID'; // fallback
  }
}