import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Redis from 'ioredis';

export interface PercentileResult {
  ecosystemPercentile: number;
  ecosystemPercentileLabel: string;
  crossEcosystemPercentile: number;
  cohortSize: number;
}

@Injectable()
export class PercentileCalculatorService {
  private readonly logger = new Logger(PercentileCalculatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS') private readonly redis: Redis,
  ) {}

  /**
   * Calculates percentiles for a developer based on their cohort and normalized signals.
   */
  async calculate(cohortKey: string, normalisedSignals: Record<string, number>): Promise<PercentileResult> {
    // 1. Ecosystem Percentile (within cohort)
    const ecosystemPercentile = await this.calculateEcosystemPercentile(cohortKey, normalisedSignals);
    
    // 2. Cross-Ecosystem Percentile (global)
    const crossEcosystemPercentile = await this.calculateCrossEcosystemPercentile(normalisedSignals);

    // 3. Label generation
    const cohortName = this.formatCohortName(cohortKey);
    const topX = 100 - ecosystemPercentile;
    const label = topX <= 0 ? `Middle of ${cohortName} distribution` : `Top ${topX.toFixed(0)}% of ${cohortName} developers`;

    return {
      ecosystemPercentile,
      ecosystemPercentileLabel: label,
      crossEcosystemPercentile,
      cohortSize: 0 // Placeholder for MVP
    };
  }

  private async calculateEcosystemPercentile(cohortKey: string, signals: Record<string, number>): Promise<number> {
    if (cohortKey === 'UNCATEGORISED') return 50;

    try {
        // Option A: Redis sorted set (signal-level accuracy)
        // Key: percentile:{cohortKey}:{signalKey}
        // In theory, we'd average the percentiles of key signals.
        // For MVP, if no Redis data, we fall back to BenchmarkCohort DB.
        
        // Option B: BenchmarkCohort DB (pillar-level)
        const benchmark = await this.prisma.benchmarkCohort.findUnique({
            where: { cohortKey }
        });

        if (!benchmark) {
            return 50; // Middle of distribution if no benchmark exists
        }

        // Simulating percentile lookup against DB distributions
        // In a real implementation, we'd compare the developer's aggregate pillar score 
        // to the p25, p50, p75, p90 values in benchmark.pillarDistributions.
        
        return 50; // Default for now until Step 12/13 populates benchmarks
    } catch (error) {
        this.logger.warn(`Failed to calculate ecosystem percentile for ${cohortKey}: ${error.message}`);
        return 50;
    }
  }

  private async calculateCrossEcosystemPercentile(signals: Record<string, number>): Promise<number> {
    // Across all developers - requires a global sorted set or global benchmark
    return 50; 
  }

  private formatCohortName(key: string): string {
    if (key === 'UNCATEGORISED') return 'General';
    return key.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('/');
  }
}
