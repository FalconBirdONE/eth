// Runs the attestor's cron handler against CRE SDK capability mocks: the
// app's HTTP response, the Chainlink ETH/USD feed, SetupAttestations reads
// and the report write.  bun test

import { describe, expect } from 'bun:test'
import { getNetwork, hexToBase64 } from '@chainlink/cre-sdk'
import {
  EvmMock,
  HttpActionsMock,
  newTestRuntime,
  REPORT_METADATA_HEADER_LENGTH,
  test,
} from '@chainlink/cre-sdk/test'
import { type Hex, bytesToHex, decodeAbiParameters, encodeAbiParameters, encodeFunctionResult } from 'viem'
import { SetupAttestationsABI } from './abi'
import {
  type AttestableVersion,
  type Config,
  onCronTrigger,
  termsHash,
  uuidToBytes32,
} from './workflow'

const ATTESTATIONS = '0x00000000000000000000000000000000000a77e5'
const FEED = '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1'

const config: Config = {
  schedule: '0 */10 * * * *',
  appUrl: 'https://setup-terminal.example',
  maxPerReport: 20,
  evm: {
    chainSelectorName: 'ethereum-testnet-sepolia-base-1',
    attestationsAddress: ATTESTATIONS,
    ethUsdFeedAddress: FEED,
    gasLimit: '1500000',
  },
}
const selector = getNetwork({ chainFamily: 'evm', chainSelectorName: config.evm.chainSelectorName })!
  .chainSelector.selector

// The revision demo: v1 at $2,400, then the creator's reply moving it to $2,350.
const v1: AttestableVersion = {
  setupId: '5b3f8f9e-1a2b-4c3d-8e9f-000000000001',
  versionId: 'a1000000-0000-4000-8000-000000000001',
  versionNumber: 1,
  kind: 'initial',
  asset: 'ETH',
  side: 'buy',
  entryCondition: 'at_or_below',
  entryPrice: '2400',
  referenceCurrency: 'USD',
  target: '2800',
  invalidation: '2250',
  sourcePostId: '1855000000000000001',
  zeroGRequestId: '0852f405-6c56-40c2-a800-e6fd70785065',
  verificationStatus: 'verified',
}
const v2: AttestableVersion = {
  ...v1,
  versionId: 'a1000000-0000-4000-8000-000000000002',
  versionNumber: 2,
  kind: 'revision',
  entryPrice: '2350',
  sourcePostId: '1855000000000000002',
  zeroGRequestId: '1f7c2a90-3b4d-4e5f-9a0b-c1d2e3f40002',
}

const ATTESTATION_TUPLE = [
  {
    type: 'tuple[]',
    components: [
      { name: 'setupId', type: 'bytes32' },
      { name: 'versionId', type: 'bytes32' },
      { name: 'versionNumber', type: 'uint32' },
      { name: 'kind', type: 'uint8' },
      { name: 'verification', type: 'uint8' },
      { name: 'termsHash', type: 'bytes32' },
      { name: 'sourcePostId', type: 'string' },
      { name: 'zeroGRequestId', type: 'string' },
      { name: 'ethUsdPrice', type: 'int256' },
      { name: 'priceUpdatedAt', type: 'uint64' },
    ],
  },
] as const

const PRICE = 223959000000n // $2,239.59, 8 decimals
const UPDATED_AT = 1793961458n

/** Wires the mocks; `attested` is what SetupAttestations already holds. */
function setup(versions: AttestableVersion[], attested: string[] | 'no-contract') {
  const http = HttpActionsMock.testInstance()
  http.sendRequest = (req) => {
    expect(req.url).toBe('https://setup-terminal.example/api/setups/attestations')
    return { statusCode: 200, headers: {}, body: new TextEncoder().encode(JSON.stringify({ versions })) }
  }

  const evm = EvmMock.testInstance(selector)
  evm.callContract = (req) => {
    const to = bytesToHex(req.call!.to).toLowerCase()
    if (to === FEED.toLowerCase()) {
      const data = encodeAbiParameters(
        [{ type: 'uint80' }, { type: 'int256' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint80' }],
        [1n, PRICE, UPDATED_AT, UPDATED_AT, 1n],
      )
      return { data: hexToBase64(data) }
    }
    if (to === ATTESTATIONS) {
      if (attested === 'no-contract') return { data: '' }
      const mask = versions.map((v) => attested.includes(v.versionId))
      return {
        data: hexToBase64(encodeFunctionResult({ abi: SetupAttestationsABI, functionName: 'attestedMask', result: mask })),
      }
    }
    throw new Error(`unexpected call to ${to}`)
  }

  const writes: { receiver: Hex; payload: Hex; gasLimit?: bigint }[] = []
  evm.writeReport = (req) => {
    const raw = req.report!.rawReport
    writes.push({
      receiver: bytesToHex(req.receiver),
      payload: bytesToHex(raw.slice(REPORT_METADATA_HEADER_LENGTH)),
      gasLimit: req.gasConfig?.gasLimit,
    })
    return { txStatus: 'TX_STATUS_SUCCESS', txHash: hexToBase64(`0x${'ab'.repeat(32)}`) }
  }
  return writes
}

const decode = (payload: Hex) => decodeAbiParameters(ATTESTATION_TUPLE, payload)[0]

describe('setup-attestor', () => {
  test('attests every new version in one signed report', () => {
    const writes = setup([v1, v2], 'no-contract')
    const runtime = newTestRuntime<Config>(null, undefined, config)

    const result = JSON.parse(onCronTrigger(runtime))
    console.log(runtime.getLogs().join('\n'))

    expect(result.status).toBe('attested')
    expect(result.attested).toBe(2)
    expect(writes).toHaveLength(1)
    expect(writes[0].receiver).toBe(ATTESTATIONS)

    const batch = decode(writes[0].payload)
    expect(batch.map((a) => a.versionNumber)).toEqual([1, 2])
    expect(batch[0].versionId).toBe(uuidToBytes32(v1.versionId))
    expect(batch[1].zeroGRequestId).toBe(v2.zeroGRequestId)
    expect(batch[1].kind).toBe(1)
    expect(batch[0].ethUsdPrice).toBe(PRICE)
    expect(batch[0].priceUpdatedAt).toBe(UPDATED_AT)
    expect(batch[1].termsHash).toBe(termsHash(v2))
  })

  test('skips versions SetupAttestations already holds', () => {
    const writes = setup([v1, v2], [v1.versionId])
    const runtime = newTestRuntime<Config>(null, undefined, config)

    const result = JSON.parse(onCronTrigger(runtime))
    expect(result.attested).toBe(1)
    expect(decode(writes[0].payload).map((a) => a.versionNumber)).toEqual([2])
  })

  test('writes nothing when everything is already attested', () => {
    const writes = setup([v1, v2], [v1.versionId, v2.versionId])
    const runtime = newTestRuntime<Config>(null, undefined, config)

    expect(JSON.parse(onCronTrigger(runtime)).status).toBe('up_to_date')
    expect(writes).toHaveLength(0)
  })

  test('a revision changes the terms hash; identical terms do not', () => {
    expect(termsHash(v2)).not.toBe(termsHash(v1))
    expect(termsHash({ ...v1 })).toBe(termsHash(v1))
    expect(termsHash({ ...v1, target: null })).not.toBe(termsHash(v1))
  })

  test('uuidToBytes32 is the 16 UUID bytes, zero padded', () => {
    expect(uuidToBytes32('A1000000-0000-4000-8000-000000000001')).toBe(
      '0xa1000000000040008000000000000001' + '0'.repeat(32),
    )
  })
})
