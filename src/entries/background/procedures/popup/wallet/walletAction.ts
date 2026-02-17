import { executeRap, signTypedData } from '~/core/keychain';
import { WalletExecuteRapProps } from '~/core/raps/references';
import { getProvider } from '~/core/viem/clientToProvider';
import { SignTypedDataArguments } from '~/entries/background/handlers/handleWallets';
import { logger } from '~/logger';

import { walletOs } from '../os';

export const walletActionHandler = walletOs.walletAction.handler(
  async ({ input }) => {
    const { action, payload } = input;

    switch (action) {
      case 'execute_rap': {
        const p = payload as WalletExecuteRapProps;
        const provider = getProvider({
          chainId: p.rapActionParameters.chainId,
        });
        const result = await executeRap({
          ...p,
          provider,
        });
        return { action, result };
      }

      case 'sign_typed_data': {
        const result = await signTypedData(payload as SignTypedDataArguments);
        return { action, result };
      }

      default: {
        logger.warn(`Unknown wallet action: ${action}`);
        throw new Error(`Unknown action: ${action}`);
      }
    }
  },
);
