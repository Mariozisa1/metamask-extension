import { validateResponse } from '../../../../ui/pages/bridge/bridge.util';
import { StatusResponse } from './types';
import { validators } from './validators';

const BridgeTxStatusResponses = {
  STATUS_PENDING_VALID: {
    status: 'PENDING',
    bridge: 'across',
    srcChain: {
      chainId: 42161,
      txHash:
        '0x76a65e4cea35d8732f0e3250faed00ba764ad5a0e7c51cb1bafbc9d76ac0b325',
      amount: '991250000000000',
      token: {
        address: '0x0000000000000000000000000000000000000000',
        chainId: 42161,
        symbol: 'ETH',
        decimals: 18,
        name: 'ETH',
        coinKey: 'ETH',
        logoURI:
          'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
        priceUSD: '2550.12',
        icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
      },
    },
    destChain: {
      chainId: '10',
      token: {},
    },
  },
  STATUS_PENDING_INVALID_MISSING_FIELDS: {
    status: 'PENDING',
    bridge: 'across',
    srcChain: {
      chainId: 42161,
      txHash:
        '0x76a65e4cea35d8732f0e3250faed00ba764ad5a0e7c51cb1bafbc9d76ac0b325',
      amount: '991250000000000',
      token: {
        address: '0x0000000000000000000000000000000000000000',
        chainId: 42161,
        symbol: 'ETH',
        decimals: 18,
        name: 'ETH',
        coinKey: 'ETH',
        logoURI:
          'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
        priceUSD: '2550.12',
        icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
      },
    },
    destChain: {
      token: {},
    },
  },
  STATUS_COMPLETE_VALID: {
    status: 'COMPLETE',
    isExpectedToken: true,
    bridge: 'across',
    srcChain: {
      chainId: 10,
      txHash:
        '0x9fdc426692aba1f81e145834602ed59ed331054e5b91a09a673cb12d4b4f6a33',
      amount: '4956250000000000',
      token: {
        address: '0x0000000000000000000000000000000000000000',
        chainId: 10,
        symbol: 'ETH',
        decimals: 18,
        name: 'ETH',
        coinKey: 'ETH',
        logoURI:
          'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
        priceUSD: '2649.21',
        icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
      },
    },
    destChain: {
      chainId: '42161',
      txHash:
        '0x3a494e672717f9b1f2b64a48a19985842d82d0747400fccebebc7a4e99c8eaab',
      amount: '4926701727965948',
      token: {
        address: '0x0000000000000000000000000000000000000000',
        chainId: 42161,
        symbol: 'ETH',
        decimals: 18,
        name: 'ETH',
        coinKey: 'ETH',
        logoURI:
          'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
        priceUSD: '2648.72',
        icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
      },
    },
  },
  STATUS_COMPLETE_VALID_MISSING_FIELDS: {
    status: 'COMPLETE',
    bridge: 'across',
    srcChain: {
      chainId: 10,
      txHash:
        '0x9fdc426692aba1f81e145834602ed59ed331054e5b91a09a673cb12d4b4f6a33',
      amount: '4956250000000000',
      token: {
        address: '0x0000000000000000000000000000000000000000',
        chainId: 10,
        symbol: 'ETH',
        decimals: 18,
        name: 'ETH',
        coinKey: 'ETH',
        logoURI:
          'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
        priceUSD: '2649.21',
        icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
      },
    },
    destChain: {
      chainId: '42161',
      txHash:
        '0x3a494e672717f9b1f2b64a48a19985842d82d0747400fccebebc7a4e99c8eaab',
      amount: '4926701727965948',
      token: {
        address: '0x0000000000000000000000000000000000000000',
        chainId: 42161,
        symbol: 'ETH',
        decimals: 18,
        name: 'ETH',
        coinKey: 'ETH',
        logoURI:
          'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
        priceUSD: '2648.72',
        icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
      },
    },
  },
  STATUS_COMPLETE_INVALID_MISSING_FIELDS: {
    status: 'COMPLETE',
    isExpectedToken: true,
    bridge: 'across',
  },
};

describe('validators', () => {
  describe('bridgeStatusValidator', () => {
    // @ts-expect-error - it.each is a function
    it.each([
      {
        input: BridgeTxStatusResponses.STATUS_PENDING_VALID,
        expected: true,
        description: 'valid pending bridge status',
      },
      {
        input: BridgeTxStatusResponses.STATUS_PENDING_INVALID_MISSING_FIELDS,
        expected: false,
        description: 'pending bridge status with missing fields',
      },
      {
        input: BridgeTxStatusResponses.STATUS_COMPLETE_VALID,
        expected: true,
        description: 'valid complete bridge status',
      },
      {
        input: BridgeTxStatusResponses.STATUS_COMPLETE_INVALID_MISSING_FIELDS,
        expected: false,
        description: 'complete bridge status with missing fields',
      },
      {
        input: BridgeTxStatusResponses.STATUS_COMPLETE_VALID_MISSING_FIELDS,
        expected: true,
        description: 'complete bridge status with missing fields',
      },
      {
        input: undefined,
        expected: false,
        description: 'undefined',
      },
      {
        input: null,
        expected: false,
        description: 'null',
      },
      {
        input: {},
        expected: false,
        description: 'empty object',
      },
    ])(
      'should return $expected for $description',
      ({ input, expected }: { input: unknown; expected: boolean }) => {
        const res = validateResponse<StatusResponse, unknown>(
          validators,
          input,
          'dummyurl.com',
        );
        expect(res).toBe(expected);
      },
    );
  });
});
