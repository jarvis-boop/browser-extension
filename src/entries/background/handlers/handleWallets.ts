import { Address } from 'viem';

import {
  PersonalSignMessage,
  TypedDataMessage,
} from '~/core/types/messageSigning';

export type SignMessageArguments = {
  address: Address;
  message: PersonalSignMessage;
};
export type SignTypedDataArguments = {
  address: Address;
  message: TypedDataMessage;
};

/**
 * Handles wallet related requests
 *
 * NOTE: This handler is no longer needed as wallet actions are now
 * handled via oRPC in the walletActionHandler.
 * Kept for backwards compatibility - does nothing.
 */
export const handleWallets = () => {
  // Wallet actions are now handled via oRPC
  // This function is kept for backwards compatibility
};
