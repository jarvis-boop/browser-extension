import { shouldRevokeDelegation as sdkShouldRevokeDelegation } from '@rainbow-me/delegation';
import { Address } from 'viem';

import { ChainId } from '~/core/types/chains';
import {
  canUseDelegation,
  getViemWalletClient,
} from '~/core/viem/walletClient';
import { RainbowError, logger } from '~/logger';

import { walletOs } from '../os';

const EMPTY_RESULT = { shouldRevoke: false as const, revokes: [] };

export const shouldRevokeDelegationHandler =
  walletOs.shouldRevokeDelegation.handler(
    async ({ input: { userAddress } }) => {
      try {
        // Dev-only mock for testing the proactive revoke banner
        if (
          process.env.IS_DEV === 'true' &&
          (globalThis as Record<string, unknown>).__MOCK_SHOULD_REVOKE__
        ) {
          return {
            shouldRevoke: true,
            revokes: [
              { address: userAddress as Address, chainId: ChainId.mainnet },
            ],
          };
        }

        // HW and read-only wallets can't use delegation
        const canUse = await canUseDelegation(userAddress);
        if (!canUse) {
          return EMPTY_RESULT;
        }

        // shouldRevokeDelegation needs a walletClient to extract the address; this will change in the future and I will simplify the sdks api
        const walletClient = await getViemWalletClient({
          address: userAddress,
          chainId: ChainId.mainnet,
        });

        if (!walletClient) {
          return EMPTY_RESULT;
        }

        const result = await sdkShouldRevokeDelegation({ walletClient });
        return {
          shouldRevoke: result.shouldRevoke,
          revokes: result.revokes.map((r) => ({
            address: r.address as Address,
            chainId: r.chainId,
          })),
        };
      } catch (e) {
        logger.error(new RainbowError('shouldRevokeDelegation: check failed'), {
          message: e instanceof Error ? e.message : String(e),
        });
        return EMPTY_RESULT;
      }
    },
  );
