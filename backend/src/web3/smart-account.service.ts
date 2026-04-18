import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createLightAccount } from '@alchemy/aa-accounts';
import { createSmartAccountClient, LocalAccountSigner } from '@alchemy/aa-core';
import { createPublicClient, http, hexToBytes, keccak256, stringToHex } from 'viem';
import { sepolia } from 'viem/chains';

@Injectable()
export class SmartAccountService {
  constructor(private configService: ConfigService) {}

  async predictSmartAccountAddress(privyId: string): Promise<string> {
    const rpcUrl = this.configService.get<string>('RPC_URL');
    
    // We use a dummy signer for prediction (counterfactual address)
    // The salt will be derived from the privyId
    const dummyPrivateKey = keccak256(stringToHex('playground-dummy-signer'));
    const signer = LocalAccountSigner.privateKeyToAccountSigner(dummyPrivateKey);

    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(rpcUrl),
    });

    // Hash privyId to use as salt (bigint)
    const salt = keccak256(stringToHex(privyId));

    const account = await createLightAccount({
      transport: http(rpcUrl) as any,
      chain: sepolia as any,
      signer,
      salt: BigInt(salt),
    });

    return account.address;
  }
}
