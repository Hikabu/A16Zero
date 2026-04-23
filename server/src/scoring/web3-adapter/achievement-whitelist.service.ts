import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface WhitelistEntry {
  mintAuthority: string;
  label: string;
  year: number;
}

@Injectable()
export class AchievementWhitelistService implements OnModuleInit {
  private superteamMints: WhitelistEntry[] = [];
  private readonly logger = new Logger(AchievementWhitelistService.name);

  onModuleInit() {
	try {
	  const superteamPath = path.join(
		process.cwd(),
		'src/scoring/web3-adapter/whitelists/superteam-mints.json',
	  );
  
	  this.logger.log(`Loading whitelist from: ${superteamPath}`);
  
	  const superteamData = JSON.parse(
		fs.readFileSync(superteamPath, 'utf8'),
	  );
  
	  this.superteamMints = Array.isArray(superteamData)
		? superteamData
		: superteamData.mints || [];
	} catch (error) {
	  this.logger.warn(
		`Failed to load mint whitelists: ${(error as Error).message}`,
	  );
	}
  }

  matchSuperteam(mintAuthority: string): WhitelistEntry | null {
    return (
      this.superteamMints.find(
        (entry) => entry.mintAuthority === mintAuthority,
      ) || null
    );
  }
}
