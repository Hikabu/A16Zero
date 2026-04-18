import { SignalKey } from '../signal-engine/types';

export interface CapabilityStatement {
  key: string;
  text: string;
  confidence: number;
  supportingSignals: SignalKey[];
}

export interface GapStatement {
  key: string;
  text: string;
  severity: 'MINOR' | 'SIGNIFICANT' | 'DEALBREAKER';
}

export interface CapabilityTranslationResult {
  capabilityStatements: CapabilityStatement[];
  gapStatements: GapStatement[];
}
