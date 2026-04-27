import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GapAnalysisService } from '../scoring/gap-analysis/gap-analysis.service';
import { DecisionCardService } from '../scoring/decision-card/decision-card.service';
import { InterviewQuestionService } from './interview-question.service';
import { JobStatus, PipelineStage, ShortlistStatus, FitTier, Prisma } from '@prisma/client';
import { AnalysisResult } from '../scoring/types/result.types';

@Injectable()
export class ApplicantsService {
  private readonly logger = new Logger(ApplicantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gapAnalysisService: GapAnalysisService,
    private readonly decisionCardService: DecisionCardService,
    private readonly interviewQuestionService: InterviewQuestionService,
  ) {}

  async findByJob(jobId: string, companyId: string, filters: { fitTier?: FitTier, minScore?: number, pipelineStage?: PipelineStage }) {
    const applications = await this.prisma.shortlist.findMany({
      where: {
        jobPostId: jobId,
        jobPost: { companyId },
        ...(filters.fitTier && { fitTier: filters.fitTier }),
        ...(filters.minScore && { roleFitScore: { gte: Number(filters.minScore) } }),
        ...(filters.pipelineStage && { pipelineStage: filters.pipelineStage }),
      },
      orderBy: { roleFitScore: 'desc' },
      include: {
        candidate: {
          include: {
            user: {
              select: { firstName: true, lastName: true, username: true }
            }
          }
        }
      }
    });

    return applications.map(app => {
      const decisionCard = app.decisionCard as any;
      return {
        id: app.id,
        hrView: {
          verdict: decisionCard.verdict,
          hrSummary: decisionCard.hrSummary,
          reputationNote: decisionCard.reputationNote,
          appliedAt: app.createdAt,
          pipelineStage: app.pipelineStage,
          candidate: {
            name: `${app.candidate.user.firstName} ${app.candidate.user.lastName}`,
            username: app.candidate.user.username
          }
        },
        technicalView: {
          technicalSummary: decisionCard.technicalSummary,
          strengths: decisionCard.strengths,
          risks: decisionCard.risks,
          roleFitScore: app.roleFitScore,
          fitTier: app.fitTier
        }
      };
    });
  }

  async findById(appId: string, companyId: string) {
    const app = await this.prisma.shortlist.findUnique({
      where: { id: appId },
      include: {
        candidate: {
          include: {
            user: {
              select: { firstName: true, lastName: true, username: true, email: true }
            },
            devProfile: {
              include: {
                githubProfile: true,
                web3Profile: true
              }
            } as any
          }
        },
        jobPost: {
          include: {
            company: { select: { name: true } }
          }
        }
      }
    });

    if (!app || app.jobPost.companyId !== companyId) {
      throw new BadRequestException('Application not found or access denied');
    }

    const { decisionCard, gapReport, interviewQuestions, pipelineStageHistory } = app as any;

    // Build embedded gap detail
    const gapDetail = gapReport ? {
      overallVerdict: gapReport.overallVerdict,
      technologyFitScore: gapReport.technologyFitScore,
      missingTechnologies: gapReport.missingTechnologies,
      matchedTechnologies: gapReport.matchedTechnologies,
      gaps: gapReport.gaps
    } : null;

    // Determine interview questions
    let activeQuestions = null;
    if (interviewQuestions && Array.isArray(interviewQuestions) && interviewQuestions.length > 0) {
      activeQuestions = interviewQuestions[interviewQuestions.length - 1];
    }

    const githubProfile = (app as any).candidate?.devProfile?.githubProfile || null;
    const web3Profile = (app as any).candidate?.devProfile?.web3Profile || null;

    return {
      application: {
        id: app.id,
        pipelineStage: (app as any).pipelineStage,
        pipelineStageHistory: pipelineStageHistory || [],
        status: app.status,
        appliedAt: (app as any).appliedAt || app.createdAt,
        candidate: {
          name: `${app.candidate.user.firstName || ''} ${app.candidate.user.lastName || ''}`.trim(),
          username: app.candidate.user.username,
          githubProfile,
          web3Profile
        },
        job: {
          title: app.jobPost.title,
          company: app.jobPost.company?.name
        }
      },
      decisionCard: decisionCard ? {
        verdict: decisionCard.verdict,
        hrSummary: decisionCard.hrSummary,
        technicalSummary: decisionCard.technicalSummary,
        strengths: decisionCard.strengths || [],
        risks: decisionCard.risks || [],
        reputationNote: decisionCard.reputationNote || null,
        gapDetail
      } : null,
      notObservable: [
        "Communication quality",
        "System design thinking (PRs are a proxy)",
        "Management capability",
        "Cultural fit",
        "Interview performance"
      ],
      interviewQuestions: activeQuestions
    };
  }

  async updateDecision(appId: string, companyId: string, status: string) {
    const app = await this.prisma.shortlist.findUnique({ 
      where: { id: appId },
      include: { jobPost: { select: { companyId: true } } }
    });
    if (!app || app.jobPost.companyId !== companyId) {
      throw new BadRequestException('Application not found or access denied');
    }

    const updated = await this.prisma.shortlist.update({
      where: { id: appId },
      data: {
        status: status as ShortlistStatus,
        pipelineStageHistory: [
          ...(app.pipelineStageHistory as any[] || []),
          { stage: status, changedAt: new Date(), changedBy: `HR:${companyId}` }
        ] as any
      }
    });

    this.logger.log(`AUDIT_LOG: { entityType: 'Application', entityId: '${appId}', action: 'STATUS_UPDATED', actorId: 'HR:${companyId}', after: '${status}' }`);

    return updated;
  }

  async advanceStage(appId: string, companyId: string, nextStage: PipelineStage, note?: string) {
    const app = await this.prisma.shortlist.findUnique({
      where: { id: appId },
      include: { 
        jobPost: { select: { companyId: true } },
        candidate: { include: { user: true } }
      }
    });

    if (!app || app.jobPost.companyId !== companyId) {
      throw new BadRequestException('Application not found or access denied');
    }

    const currentStage = app.pipelineStage;
    
    // Validate transition
    const validTransitions: Record<PipelineStage, PipelineStage[]> = {
      APPLIED: [PipelineStage.REVIEWED],
      REVIEWED: [PipelineStage.INTERVIEW_HR, PipelineStage.REJECTED],
      INTERVIEW_HR: [PipelineStage.INTERVIEW_TECHNICAL, PipelineStage.INTERVIEW_FINAL, PipelineStage.REJECTED],
      INTERVIEW_TECHNICAL: [PipelineStage.INTERVIEW_FINAL, PipelineStage.REJECTED],
      INTERVIEW_FINAL: [PipelineStage.OFFER, PipelineStage.REJECTED],
      OFFER: [PipelineStage.HIRED, PipelineStage.REJECTED],
      HIRED: [],
      REJECTED: []
    };

    const allowed = validTransitions[currentStage as PipelineStage] || [];
    if (!allowed.includes(nextStage)) {
      throw new BadRequestException(`Invalid pipeline transition: cannot move from ${currentStage} to ${nextStage}`);
    }

    let updatedQuestions = (app as any).interviewQuestions || [];
    let payloadResponse: any = undefined;

    if ([PipelineStage.INTERVIEW_HR, PipelineStage.INTERVIEW_TECHNICAL, PipelineStage.INTERVIEW_FINAL].includes(nextStage)) {
      const generatedSet = await this.interviewQuestionService.generate(app, nextStage);
      updatedQuestions = [...updatedQuestions, generatedSet];
      payloadResponse = generatedSet;
    }

    const updated = await this.prisma.shortlist.update({
      where: { id: appId },
      data: {
        pipelineStage: nextStage,
        interviewQuestions: updatedQuestions,
        pipelineStageHistory: [
          ...(((app as any).pipelineStageHistory as any[]) || []),
          { stage: nextStage, changedAt: new Date(), changedBy: `HR:${companyId}`, note: note ?? null }
        ] as any
      }
    });

    this.logger.log(`AUDIT_LOG: { entityType: 'Application', entityId: '${appId}', action: 'STAGE_UPDATED', actorId: 'HR:${companyId}', after: '${nextStage}' }`);
    
    return payloadResponse ? payloadResponse : updated;
  }

  async findCandidateApplications(candidateUserId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { userId: candidateUserId }
    });

    if (!candidate) return [];

    const applications = await this.prisma.shortlist.findMany({
      where: { candidateId: candidate.id },
      include: {
        jobPost: {
          select: { title: true, company: { select: { name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return applications.map(app => ({
      id: app.id,
      jobTitle: app.jobPost.title,
      companyName: app.jobPost.company?.name || 'Unknown Company',
      pipelineStage: app.pipelineStage,
      appliedAt: app.appliedAt,
      fitTier: app.fitTier
    }));
  }

  async getGapPreview(jobId: string, candidateUserId: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { userId: candidateUserId },
    });
    if (!candidate) throw new BadRequestException('Candidate profile not found');

    const job = await this.prisma.jobPost.findUnique({ where: { id: jobId } });
    if (!job || job.status !== JobStatus.ACTIVE) {
      throw new NotFoundException('Job not found or not open for applications');
    }

    const latestAnalysis = await this.prisma.analysisJob.findFirst({
      where: { userId: candidateUserId, status: 'completed' },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestAnalysis || !latestAnalysis.result) {
      return { analysisRequired: true };
    }

    const analysisResult = latestAnalysis.result as unknown as AnalysisResult;
    const gapReport = this.gapAnalysisService.compute(analysisResult, job);

    const safeGaps = gapReport.gaps.map(g => {
      const { probeQuestion, ...rest } = g;
      return rest;
    });

    return {
      overallVerdict: gapReport.overallVerdict,
      technologyFitScore: gapReport.technologyFitScore,
      missingTechnologies: gapReport.missingTechnologies,
      matchedTechnologies: gapReport.matchedTechnologies,
      gaps: safeGaps,
      hrSummary: null // explicitly hide from candidate
    };
  }

  async apply(jobId: string, candidateUserId: string) {
    // 1. Resolve candidate from user ID
    const candidate = await this.prisma.candidate.findUnique({
      where: { userId: candidateUserId },
    });
    if (!candidate) throw new BadRequestException('Candidate profile not found');

    const candidateId = candidate.id;

    // 2. Load job
    const job = await this.prisma.jobPost.findUnique({ where: { id: jobId } });
    if (!job || job.status !== JobStatus.ACTIVE) {
      throw new BadRequestException('Job not found or not open for applications');
    }

    // 3. Duplicate check
    const existing = await this.prisma.shortlist.findFirst({
      where: { jobPostId: jobId, candidateId },
    });
    if (existing) throw new BadRequestException('Already applied');

    // 4. Load candidate's latest completed AnalysisJob
    const latestAnalysis = await this.prisma.analysisJob.findFirst({
      where: { userId: candidateUserId, status: 'completed' },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestAnalysis || !latestAnalysis.result) {
      throw new BadRequestException('No completed analysis found. Run an analysis first.');
    }

    const analysisResult = latestAnalysis.result as unknown as AnalysisResult;

    // 5. Gap Analysis
    const gapReport = this.gapAnalysisService.compute(analysisResult, job);

    // 6. Decision Card
    const decisionCard = this.decisionCardService.generate(gapReport, analysisResult);

    // 7. Map verdict → FitTier
    const verdictMap: Record<string, FitTier> = {
      PROCEED: FitTier.STRONG,
      REVIEW: FitTier.PROBE,
      REJECT: FitTier.PASS,
    };
    const fitTier = verdictMap[decisionCard.verdict] || FitTier.PASS;

    // 8. roleFitScore
    const roleFitScore = this.computeRoleFitScore(gapReport);

    // 9. Create application (Shortlist model)
    return this.prisma.shortlist.create({
      data: {
        jobPostId: jobId,
        candidateId,
        roleFitScore,
        fitTier,
        decisionCard: decisionCard as unknown as Prisma.JsonObject,
        gapReport: gapReport as unknown as Prisma.JsonObject,
        pipelineStage: PipelineStage.APPLIED,
        pipelineStageHistory: [
          { stage: 'APPLIED', changedAt: new Date(), changedBy: 'system' },
        ] as any,
        status: ShortlistStatus.PENDING,
      },
    });
  }

  private computeRoleFitScore(gapReport: any): number {
    const counts = {
      DEALBREAKER: 0,
      SIGNIFICANT: 0,
      MINOR: 0,
    };

    gapReport.gaps.forEach((g: any) => {
      if (counts.hasOwnProperty(g.severity)) {
        counts[g.severity as keyof typeof counts]++;
      }
    });

    const score = 100 - counts.DEALBREAKER * 30 - counts.SIGNIFICANT * 10 - counts.MINOR * 3;
    return Math.max(0, score);
  }
}
