import EventEmitter from 'events';
import { ControllerMessenger } from '@metamask/base-controller';
import { InternalAccount } from '@metamask/keyring-api';
import { BlockTracker, Provider } from '@metamask/network-controller';

import { flushPromises } from '../../../test/lib/timer-helpers';
import { createTestProviderTools } from '../../../test/stub/provider';
import PreferencesController from './preferences-controller';
import type {
  AccountTrackerControllerOptions,
  AllowedActions,
  AllowedEvents,
} from './account-tracker-controller';
import AccountTrackerController, {
  getDefaultAccountTrackerControllerState,
} from './account-tracker-controller';

const noop = () => true;
const currentNetworkId = '5';
const currentChainId = '0x5';
const VALID_ADDRESS = '0x0000000000000000000000000000000000000000';
const VALID_ADDRESS_TWO = '0x0000000000000000000000000000000000000001';

const SELECTED_ADDRESS = '0x123';

const INITIAL_BALANCE_1 = '0x1';
const INITIAL_BALANCE_2 = '0x2';
const UPDATE_BALANCE = '0xabc';
const UPDATE_BALANCE_HOOK = '0xabcd';

const GAS_LIMIT = '0x111111';
const GAS_LIMIT_HOOK = '0x222222';

// The below three values were generated by running MetaMask in the browser
// The response to eth_call, which is called via `ethContract.balances`
// in `_updateAccountsViaBalanceChecker` of account-tracker.js, needs to be properly
// formatted or else ethers will throw an error.
const ETHERS_CONTRACT_BALANCES_ETH_CALL_RETURN =
  '0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000038d7ea4c6800600000000000000000000000000000000000000000000000000000000000186a0';
const EXPECTED_CONTRACT_BALANCE_1 = '0x038d7ea4c68006';
const EXPECTED_CONTRACT_BALANCE_2 = '0x0186a0';

const mockAccounts = {
  [VALID_ADDRESS]: { address: VALID_ADDRESS, balance: INITIAL_BALANCE_1 },
  [VALID_ADDRESS_TWO]: {
    address: VALID_ADDRESS_TWO,
    balance: INITIAL_BALANCE_2,
  },
};

class MockBlockTracker extends EventEmitter {
  getCurrentBlock = noop;

  getLatestBlock = noop;
}

function buildMockBlockTracker({ shouldStubListeners = true } = {}) {
  const blockTrackerStub = new MockBlockTracker();
  if (shouldStubListeners) {
    jest.spyOn(blockTrackerStub, 'addListener').mockImplementation();
    jest.spyOn(blockTrackerStub, 'removeListener').mockImplementation();
  }
  return blockTrackerStub;
}

type WithControllerOptions = {
  completedOnboarding?: boolean;
  useMultiAccountBalanceChecker?: boolean;
  getNetworkClientById?: jest.Mock;
  getSelectedAccount?: jest.Mock;
} & Partial<AccountTrackerControllerOptions>;

type WithControllerCallback<ReturnValue> = ({
  controller,
  blockTrackerFromHookStub,
  blockTrackerStub,
  triggerAccountRemoved,
}: {
  controller: AccountTrackerController;
  blockTrackerFromHookStub: MockBlockTracker;
  blockTrackerStub: MockBlockTracker;
  triggerAccountRemoved: (address: string) => void;
}) => ReturnValue;

type WithControllerArgs<ReturnValue> =
  | [WithControllerCallback<ReturnValue>]
  | [WithControllerOptions, WithControllerCallback<ReturnValue>];

function withController<ReturnValue>(
  ...args: WithControllerArgs<ReturnValue>
): ReturnValue {
  const [{ ...rest }, fn] = args.length === 2 ? args : [{}, args[0]];
  const {
    completedOnboarding = false,
    useMultiAccountBalanceChecker = false,
    getNetworkClientById,
    getSelectedAccount,
    ...accountTrackerOptions
  } = rest;
  const { provider } = createTestProviderTools({
    scaffold: {
      eth_getBalance: UPDATE_BALANCE,
      eth_call: ETHERS_CONTRACT_BALANCES_ETH_CALL_RETURN,
      eth_getBlockByNumber: { gasLimit: GAS_LIMIT },
    },
    networkId: currentNetworkId,
    chainId: currentNetworkId,
  });
  const blockTrackerStub = buildMockBlockTracker();

  const controllerMessenger = new ControllerMessenger<
    AllowedActions,
    AllowedEvents
  >();
  const getSelectedAccountStub = () =>
    ({
      id: 'accountId',
      address: SELECTED_ADDRESS,
    } as InternalAccount);
  controllerMessenger.registerActionHandler(
    'AccountsController:getSelectedAccount',
    getSelectedAccount || getSelectedAccountStub,
  );

  const { provider: providerFromHook } = createTestProviderTools({
    scaffold: {
      eth_getBalance: UPDATE_BALANCE_HOOK,
      eth_call: ETHERS_CONTRACT_BALANCES_ETH_CALL_RETURN,
      eth_getBlockByNumber: { gasLimit: GAS_LIMIT_HOOK },
    },
    networkId: '0x1',
    chainId: '0x1',
  });

  const getNetworkStateStub = jest.fn().mockReturnValue({
    selectedNetworkClientId: 'selectedNetworkClientId',
  });
  controllerMessenger.registerActionHandler(
    'NetworkController:getState',
    getNetworkStateStub,
  );

  const blockTrackerFromHookStub = buildMockBlockTracker();
  const getNetworkClientByIdStub = jest.fn().mockReturnValue({
    configuration: {
      chainId: currentChainId,
    },
    blockTracker: blockTrackerFromHookStub,
    provider: providerFromHook,
  });
  controllerMessenger.registerActionHandler(
    'NetworkController:getNetworkClientById',
    getNetworkClientById || getNetworkClientByIdStub,
  );

  const getOnboardingControllerState = jest.fn().mockReturnValue({
    completedOnboarding,
  });
  controllerMessenger.registerActionHandler(
    'OnboardingController:getState',
    getOnboardingControllerState,
  );

  const controller = new AccountTrackerController({
    state: getDefaultAccountTrackerControllerState(),
    provider: provider as Provider,
    blockTracker: blockTrackerStub as unknown as BlockTracker,
    getNetworkIdentifier: jest.fn(),
    preferencesController: {
      store: {
        getState: () => ({
          useMultiAccountBalanceChecker,
        }),
      },
    } as PreferencesController,
    messenger: controllerMessenger.getRestricted({
      name: 'AccountTrackerController',
      allowedActions: [
        'AccountsController:getSelectedAccount',
        'NetworkController:getState',
        'NetworkController:getNetworkClientById',
        'OnboardingController:getState',
      ],
      allowedEvents: [
        'AccountsController:selectedEvmAccountChange',
        'OnboardingController:stateChange',
        'KeyringController:accountRemoved',
      ],
    }),
    ...accountTrackerOptions,
  });

  return fn({
    controller,
    blockTrackerFromHookStub,
    blockTrackerStub,
    triggerAccountRemoved: (address: string) => {
      controllerMessenger.publish('KeyringController:accountRemoved', address);
    },
  });
}

describe('AccountTrackerController', () => {
  describe('start', () => {
    it('restarts the subscription to the block tracker and update accounts', async () => {
      withController(({ controller, blockTrackerStub }) => {
        const updateAccountsSpy = jest
          .spyOn(controller, 'updateAccounts')
          .mockResolvedValue();

        controller.start();

        expect(blockTrackerStub.removeListener).toHaveBeenNthCalledWith(
          1,
          'latest',
          expect.any(Function),
        );
        expect(blockTrackerStub.addListener).toHaveBeenNthCalledWith(
          1,
          'latest',
          expect.any(Function),
        );
        expect(updateAccountsSpy).toHaveBeenNthCalledWith(1); // called first time with no args

        controller.start();

        expect(blockTrackerStub.removeListener).toHaveBeenNthCalledWith(
          2,
          'latest',
          expect.any(Function),
        );
        expect(blockTrackerStub.addListener).toHaveBeenNthCalledWith(
          2,
          'latest',
          expect.any(Function),
        );
        expect(updateAccountsSpy).toHaveBeenNthCalledWith(2); // called second time with no args

        controller.stop();
      });
    });
  });

  describe('stop', () => {
    it('ends the subscription to the block tracker', async () => {
      withController(({ controller, blockTrackerStub }) => {
        controller.stop();

        expect(blockTrackerStub.removeListener).toHaveBeenNthCalledWith(
          1,
          'latest',
          expect.any(Function),
        );
      });
    });
  });

  describe('startPollingByNetworkClientId', () => {
    it('should subscribe to the block tracker and update accounts if not already using the networkClientId', async () => {
      withController(({ controller, blockTrackerFromHookStub }) => {
        const updateAccountsSpy = jest
          .spyOn(controller, 'updateAccounts')
          .mockResolvedValue();

        controller.startPollingByNetworkClientId('mainnet');

        expect(blockTrackerFromHookStub.addListener).toHaveBeenCalledWith(
          'latest',
          expect.any(Function),
        );
        expect(updateAccountsSpy).toHaveBeenCalledWith('mainnet');

        controller.startPollingByNetworkClientId('mainnet');

        expect(blockTrackerFromHookStub.addListener).toHaveBeenCalledTimes(1);
        expect(updateAccountsSpy).toHaveBeenCalledTimes(1);

        controller.stopAllPolling();
      });
    });

    it('should subscribe to the block tracker and update accounts for each networkClientId', async () => {
      const blockTrackerFromHookStub1 = buildMockBlockTracker();
      const blockTrackerFromHookStub2 = buildMockBlockTracker();
      const blockTrackerFromHookStub3 = buildMockBlockTracker();
      withController(
        {
          getNetworkClientById: jest
            .fn()
            .mockImplementation((networkClientId) => {
              switch (networkClientId) {
                case 'mainnet':
                  return {
                    configuration: {
                      chainId: '0x1',
                    },
                    blockTracker: blockTrackerFromHookStub1,
                  };
                case 'goerli':
                  return {
                    configuration: {
                      chainId: '0x5',
                    },
                    blockTracker: blockTrackerFromHookStub2,
                  };
                case 'networkClientId1':
                  return {
                    configuration: {
                      chainId: '0xa',
                    },
                    blockTracker: blockTrackerFromHookStub3,
                  };
                default:
                  throw new Error('unexpected networkClientId');
              }
            }),
        },
        ({ controller }) => {
          const updateAccountsSpy = jest
            .spyOn(controller, 'updateAccounts')
            .mockResolvedValue();

          controller.startPollingByNetworkClientId('mainnet');

          expect(blockTrackerFromHookStub1.addListener).toHaveBeenCalledWith(
            'latest',
            expect.any(Function),
          );
          expect(updateAccountsSpy).toHaveBeenCalledWith('mainnet');

          controller.startPollingByNetworkClientId('goerli');

          expect(blockTrackerFromHookStub2.addListener).toHaveBeenCalledWith(
            'latest',
            expect.any(Function),
          );
          expect(updateAccountsSpy).toHaveBeenCalledWith('goerli');

          controller.startPollingByNetworkClientId('networkClientId1');

          expect(blockTrackerFromHookStub3.addListener).toHaveBeenCalledWith(
            'latest',
            expect.any(Function),
          );
          expect(updateAccountsSpy).toHaveBeenCalledWith('networkClientId1');

          controller.stopAllPolling();
        },
      );
    });
  });

  describe('stopPollingByPollingToken', () => {
    it('should unsubscribe from the block tracker when called with a valid polling that was the only active pollingToken for a given networkClient', async () => {
      withController(({ controller, blockTrackerFromHookStub }) => {
        jest.spyOn(controller, 'updateAccounts').mockResolvedValue();

        const pollingToken =
          controller.startPollingByNetworkClientId('mainnet');

        controller.stopPollingByPollingToken(pollingToken);

        expect(blockTrackerFromHookStub.removeListener).toHaveBeenCalledWith(
          'latest',
          expect.any(Function),
        );
      });
    });

    it('should not unsubscribe from the block tracker if called with one of multiple active polling tokens for a given networkClient', async () => {
      withController(({ controller, blockTrackerFromHookStub }) => {
        jest.spyOn(controller, 'updateAccounts').mockResolvedValue();

        const pollingToken1 =
          controller.startPollingByNetworkClientId('mainnet');
        controller.startPollingByNetworkClientId('mainnet');

        controller.stopPollingByPollingToken(pollingToken1);

        expect(blockTrackerFromHookStub.removeListener).not.toHaveBeenCalled();

        controller.stopAllPolling();
      });
    });

    it('should error if no pollingToken is passed', () => {
      withController(({ controller }) => {
        expect(() => {
          controller.stopPollingByPollingToken(undefined);
        }).toThrow('pollingToken required');
      });
    });

    it('should error if no matching pollingToken is found', () => {
      withController(({ controller }) => {
        expect(() => {
          controller.stopPollingByPollingToken('potato');
        }).toThrow('pollingToken not found');
      });
    });
  });

  describe('stopAll', () => {
    it('should end all subscriptions', async () => {
      const blockTrackerFromHookStub1 = buildMockBlockTracker();
      const blockTrackerFromHookStub2 = buildMockBlockTracker();
      const getNetworkClientByIdStub = jest
        .fn()
        .mockImplementation((networkClientId) => {
          switch (networkClientId) {
            case 'mainnet':
              return {
                configuration: {
                  chainId: '0x1',
                },
                blockTracker: blockTrackerFromHookStub1,
              };
            case 'goerli':
              return {
                configuration: {
                  chainId: '0x5',
                },
                blockTracker: blockTrackerFromHookStub2,
              };
            default:
              throw new Error('unexpected networkClientId');
          }
        });
      withController(
        {
          getNetworkClientById: getNetworkClientByIdStub,
        },
        ({ controller, blockTrackerStub }) => {
          jest.spyOn(controller, 'updateAccounts').mockResolvedValue();

          controller.startPollingByNetworkClientId('mainnet');

          controller.startPollingByNetworkClientId('goerli');

          controller.stopAllPolling();

          expect(blockTrackerStub.removeListener).toHaveBeenCalledWith(
            'latest',
            expect.any(Function),
          );
          expect(blockTrackerFromHookStub1.removeListener).toHaveBeenCalledWith(
            'latest',
            expect.any(Function),
          );
          expect(blockTrackerFromHookStub2.removeListener).toHaveBeenCalledWith(
            'latest',
            expect.any(Function),
          );
        },
      );
    });
  });

  describe('blockTracker "latest" events', () => {
    it('updates currentBlockGasLimit, currentBlockGasLimitByChainId, and accounts when polling is initiated via `start`', async () => {
      const blockTrackerStub = buildMockBlockTracker({
        shouldStubListeners: false,
      });
      withController(
        {
          blockTracker: blockTrackerStub as unknown as BlockTracker,
        },
        async ({ controller }) => {
          const updateAccountsSpy = jest
            .spyOn(controller, 'updateAccounts')
            .mockResolvedValue();

          controller.start();
          blockTrackerStub.emit('latest', 'blockNumber');

          await flushPromises();

          expect(updateAccountsSpy).toHaveBeenCalledWith(undefined);

          expect(controller.state).toStrictEqual({
            accounts: {},
            accountsByChainId: {},
            currentBlockGasLimit: GAS_LIMIT,
            currentBlockGasLimitByChainId: {
              [currentChainId]: GAS_LIMIT,
            },
          });

          controller.stop();
        },
      );
    });

    it('updates only the currentBlockGasLimitByChainId and accounts when polling is initiated via `startPollingByNetworkClientId`', async () => {
      const blockTrackerFromHookStub = buildMockBlockTracker({
        shouldStubListeners: false,
      });
      const providerFromHook = createTestProviderTools({
        scaffold: {
          eth_getBalance: UPDATE_BALANCE_HOOK,
          eth_call: ETHERS_CONTRACT_BALANCES_ETH_CALL_RETURN,
          eth_getBlockByNumber: { gasLimit: GAS_LIMIT_HOOK },
        },
        networkId: '0x1',
        chainId: '0x1',
      }).provider;
      const getNetworkClientByIdStub = jest.fn().mockReturnValue({
        configuration: {
          chainId: '0x1',
        },
        blockTracker: blockTrackerFromHookStub,
        provider: providerFromHook,
      });
      withController(
        {
          getNetworkClientById: getNetworkClientByIdStub,
        },
        async ({ controller }) => {
          const updateAccountsSpy = jest
            .spyOn(controller, 'updateAccounts')
            .mockResolvedValue();

          controller.startPollingByNetworkClientId('mainnet');

          blockTrackerFromHookStub.emit('latest', 'blockNumber');

          await flushPromises();

          expect(updateAccountsSpy).toHaveBeenCalledWith('mainnet');

          expect(controller.state).toStrictEqual({
            accounts: {},
            accountsByChainId: {},
            currentBlockGasLimit: '',
            currentBlockGasLimitByChainId: {
              '0x1': GAS_LIMIT_HOOK,
            },
          });

          controller.stopAllPolling();
        },
      );
    });
  });

  describe('updateAccountsAllActiveNetworks', () => {
    it('updates accounts for the globally selected network and all currently polling networks', async () => {
      withController(async ({ controller }) => {
        const updateAccountsSpy = jest
          .spyOn(controller, 'updateAccounts')
          .mockResolvedValue();
        await controller.startPollingByNetworkClientId('networkClientId1');
        await controller.startPollingByNetworkClientId('networkClientId2');
        await controller.startPollingByNetworkClientId('networkClientId3');

        expect(updateAccountsSpy).toHaveBeenCalledTimes(3);

        await controller.updateAccountsAllActiveNetworks();

        expect(updateAccountsSpy).toHaveBeenCalledTimes(7);
        expect(updateAccountsSpy).toHaveBeenNthCalledWith(4); // called with no args
        expect(updateAccountsSpy).toHaveBeenNthCalledWith(
          5,
          'networkClientId1',
        );
        expect(updateAccountsSpy).toHaveBeenNthCalledWith(
          6,
          'networkClientId2',
        );
        expect(updateAccountsSpy).toHaveBeenNthCalledWith(
          7,
          'networkClientId3',
        );
      });
    });
  });

  describe('updateAccounts', () => {
    it('does not update accounts if completedOnBoarding is false', async () => {
      withController(
        {
          completedOnboarding: false,
        },
        async ({ controller }) => {
          await controller.updateAccounts();

          expect(controller.state).toStrictEqual({
            accounts: {},
            currentBlockGasLimit: '',
            accountsByChainId: {},
            currentBlockGasLimitByChainId: {},
          });
        },
      );
    });

    describe('chain does not have single call balance address', () => {
      const mockAccountsWithSelectedAddress = {
        ...mockAccounts,
        [SELECTED_ADDRESS]: {
          address: SELECTED_ADDRESS,
          balance: '0x0',
        },
      };
      const mockInitialState = {
        accounts: mockAccountsWithSelectedAddress,
        accountsByChainId: {
          '0x999': mockAccountsWithSelectedAddress,
        },
      };

      describe('when useMultiAccountBalanceChecker is true', () => {
        it('updates all accounts directly', async () => {
          withController(
            {
              completedOnboarding: true,
              useMultiAccountBalanceChecker: true,
              state: mockInitialState,
            },
            async ({ controller }) => {
              await controller.updateAccounts();

              const accounts = {
                [VALID_ADDRESS]: {
                  address: VALID_ADDRESS,
                  balance: UPDATE_BALANCE,
                },
                [VALID_ADDRESS_TWO]: {
                  address: VALID_ADDRESS_TWO,
                  balance: UPDATE_BALANCE,
                },
                [SELECTED_ADDRESS]: {
                  address: SELECTED_ADDRESS,
                  balance: UPDATE_BALANCE,
                },
              };

              expect(controller.state).toStrictEqual({
                accounts,
                accountsByChainId: {
                  '0x999': accounts,
                },
                currentBlockGasLimit: '',
                currentBlockGasLimitByChainId: {},
              });
            },
          );
        });
      });

      describe('when useMultiAccountBalanceChecker is false', () => {
        it('updates only the selectedAddress directly, setting other balances to null', async () => {
          withController(
            {
              completedOnboarding: true,
              useMultiAccountBalanceChecker: false,
              state: mockInitialState,
            },
            async ({ controller }) => {
              await controller.updateAccounts();

              const accounts = {
                [VALID_ADDRESS]: { address: VALID_ADDRESS, balance: null },
                [VALID_ADDRESS_TWO]: {
                  address: VALID_ADDRESS_TWO,
                  balance: null,
                },
                [SELECTED_ADDRESS]: {
                  address: SELECTED_ADDRESS,
                  balance: UPDATE_BALANCE,
                },
              };

              expect(controller.state).toStrictEqual({
                accounts,
                accountsByChainId: {
                  '0x999': accounts,
                },
                currentBlockGasLimit: '',
                currentBlockGasLimitByChainId: {},
              });
            },
          );
        });
      });
    });

    describe('chain does have single call balance address and network is not localhost', () => {
      describe('when useMultiAccountBalanceChecker is true', () => {
        it('updates all accounts via balance checker', async () => {
          withController(
            {
              completedOnboarding: true,
              useMultiAccountBalanceChecker: true,
              getNetworkIdentifier: jest
                .fn()
                .mockReturnValue('http://not-localhost:8545'),
              getSelectedAccount: jest.fn().mockReturnValue({
                id: 'accountId',
                address: VALID_ADDRESS,
              } as InternalAccount),
              state: {
                accounts: { ...mockAccounts },
                accountsByChainId: {
                  '0x1': { ...mockAccounts },
                },
              },
            },
            async ({ controller }) => {
              await controller.updateAccounts('mainnet');

              const accounts = {
                [VALID_ADDRESS]: {
                  address: VALID_ADDRESS,
                  balance: EXPECTED_CONTRACT_BALANCE_1,
                },
                [VALID_ADDRESS_TWO]: {
                  address: VALID_ADDRESS_TWO,
                  balance: EXPECTED_CONTRACT_BALANCE_2,
                },
              };

              expect(controller.state).toStrictEqual({
                accounts,
                accountsByChainId: {
                  '0x1': accounts,
                },
                currentBlockGasLimit: '',
                currentBlockGasLimitByChainId: {},
              });
            },
          );
        });
      });
    });
  });

  describe('onAccountRemoved', () => {
    it('should remove an account from state', () => {
      withController(
        {
          state: {
            accounts: { ...mockAccounts },
            accountsByChainId: {
              [currentChainId]: {
                ...mockAccounts,
              },
              '0x1': {
                ...mockAccounts,
              },
              '0x2': {
                ...mockAccounts,
              },
            },
          },
        },
        ({ controller, triggerAccountRemoved }) => {
          triggerAccountRemoved(VALID_ADDRESS);

          const accounts = {
            [VALID_ADDRESS_TWO]: mockAccounts[VALID_ADDRESS_TWO],
          };

          expect(controller.state).toStrictEqual({
            accounts,
            accountsByChainId: {
              [currentChainId]: accounts,
              '0x1': accounts,
              '0x2': accounts,
            },
            currentBlockGasLimit: '',
            currentBlockGasLimitByChainId: {},
          });
        },
      );
    });
  });

  describe('clearAccounts', () => {
    it('should reset state', () => {
      withController(
        {
          state: {
            accounts: { ...mockAccounts },
            accountsByChainId: {
              [currentChainId]: {
                ...mockAccounts,
              },
              '0x1': {
                ...mockAccounts,
              },
              '0x2': {
                ...mockAccounts,
              },
            },
          },
        },
        ({ controller }) => {
          controller.clearAccounts();

          expect(controller.state).toStrictEqual({
            accounts: {},
            accountsByChainId: {
              [currentChainId]: {},
            },
            currentBlockGasLimit: '',
            currentBlockGasLimitByChainId: {},
          });
        },
      );
    });
  });
});
