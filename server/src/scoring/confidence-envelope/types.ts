import { ConfidenceTier, RiskLevel } from '@prisma/client';
import { ExcludedSignal, PillarKey } from '../signal-engine/types';
import { FraudTier } from '../firewall/types';
import { VisibilityTier } from '../data-completeness-engine/types';

export interface ConfidenceCaveat {
  signalKey: string;
  hrReadable: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface ConfidenceEnvelopeInput {
  dataCoveragePercent: number;
  visibilityTier: VisibilityTier;
  overallConfidenceCap: number | null;
  fraudTier: FraudTier;
  fraudScore: number;
  excludedSignals: ExcludedSignal[];
  consistencyNotes: string[];
  privateWorkNote: string | null;
  signalCount: number;
}

export interface ConfidenceEnvelope {
  overallConfidence: number;
  confidenceTier: ConfidenceTier;
  riskLevel: RiskLevel;
  hrLabel: string;
  hrGuidance: string;
  caveats: ConfidenceCaveat[];
  scoreWithheld: boolean;
}
