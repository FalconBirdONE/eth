// Setup attestor: a Chainlink CRE workflow that anchors Setup Terminal's
// setup history on-chain.
//
// On each cron tick it:
//   1. fetches accepted setup versions from the app (HTTP, DON consensus),
//   2. reads the Chainlink ETH/USD Data Feed on Base Sepolia,
//   3. asks SetupAttestations which versions are already recorded,
//   4. writes one signed report attesting the new ones: a hash of each
//      version's terms, its X source post, the 0G Private Computer request
//      that extracted it, its TEE verification status, and the price.
//
// The record is append-only, so anyone can check that a creator revision
// never rewrote the version an order was signed against.

import {
  bytesToHex,
  consensusIdenticalAggregation,
  cre,
  encodeCallMsg,
  getNetwork,
  LATEST_BLOCK_NUMBER,
  prepareReportRequest,
  TxStatus,
  type EVMClient,
  type HTTPSendRequester,
  type Runtime,
} from '@chainlink/cre-sdk'
import {
  type Address,
  type Hex,
  decodeFunctionResult,
  encodeAbiParameters,
  encodeFunctionData,
  keccak256,
  parseAbi,
  zeroAddress,
} from 'viem'
import { z } from 'zod'
import { SetupAttestationsABI } from './abi'

// ─── Config ──────────────────────────────────────────────────

export const configSchema = z.object({
  schedule: z.string(),
  // Base URL of the deployed Setup Terminal app.
  appUrl: z.string().url(),
  // Most versions attested in one report, to bound gas.
  maxPerReport: z.number().int().min(1).max(50).default(20),
  evm: z.object({
    chainSelectorName: z.string(),
    attestationsAddress: z.string(),
    ethUsdFeedAddress: z.string(),
    gasLimit: z.string().default('1500000'),
  }),
})
export type Config = z.infer<typeof configSchema>

// ─── Types (mirror lib/setups/attestations.ts in the app) ───

const versionSchema = z.object({
  setupId: z.string().uuid(),
  versionId: z.string().uuid(),
  versionNumber: z.number().int().positive(),
  kind: z.enum(['initial', 'revision', 'withdrawal']),
  asset: z.string().nullable(),
  side: z.string().nullable(),
  entryCondition: z.string().nullable(),
  entryPrice: z.string().nullable(),
  referenceCurrency: z.string().nullable(),
  target: z.string().nullable(),
  invalidation: z.string().nullable(),
  sourcePostId: z.string(),
  zeroGRequestId: z.string(),
  verificationStatus: z.enum(['verified', 'unverified', 'failed']),
})
export type AttestableVersion = z.infer<typeof versionSchema>

const KIND = { initial: 0, revision: 1, withdrawal: 2 } as const
const VERIFICATION = { verified: 0, unverified: 1, failed: 2 } as const

// Must match SetupAttestations.Attestation field order.
const ATTESTATIONS_PARAMS = [
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

const AGGREGATOR_ABI = parseAbi([
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
])

// ─── Pure helpers (unit tested) ──────────────────────────────

/** A UUID as bytes32: its 16 bytes, left-aligned and zero-padded. */
export const uuidToBytes32 = (uuid: string): Hex =>
  `0x${uuid.replace(/-/g, '').toLowerCase().padEnd(64, '0')}` as Hex

/**
 * Commits to the terms a follower would see. Anyone holding the version can
 * recompute it: keccak256 of the ABI-encoded fields, nulls as empty strings.
 */
export const termsHash = (v: AttestableVersion): Hex =>
  keccak256(
    encodeAbiParameters(
      [
        { type: 'bytes32' },
        { type: 'bytes32' },
        { type: 'uint32' },
        { type: 'string' },
        { type: 'string' },
        { type: 'string' },
        { type: 'string' },
        { type: 'string' },
        { type: 'string' },
        { type: 'string' },
        { type: 'string' },
        { type: 'string' },
      ],
      [
        uuidToBytes32(v.setupId),
        uuidToBytes32(v.versionId),
        v.versionNumber,
        v.kind,
        v.asset ?? '',
        v.side ?? '',
        v.entryCondition ?? '',
        v.entryPrice ?? '',
        v.referenceCurrency ?? '',
        v.target ?? '',
        v.invalidation ?? '',
        v.sourcePostId,
      ],
    ),
  )

export const encodeAttestations = (
  versions: AttestableVersion[],
  price: { answer: bigint; updatedAt: bigint },
): Hex =>
  encodeAbiParameters(ATTESTATIONS_PARAMS, [
    versions.map((v) => ({
      setupId: uuidToBytes32(v.setupId),
      versionId: uuidToBytes32(v.versionId),
      versionNumber: v.versionNumber,
      kind: KIND[v.kind],
      verification: VERIFICATION[v.verificationStatus],
      termsHash: termsHash(v),
      sourcePostId: v.sourcePostId,
      zeroGRequestId: v.zeroGRequestId,
      ethUsdPrice: price.answer,
      priceUpdatedAt: price.updatedAt,
    })),
  ])

export const parseVersions = (body: string): AttestableVersion[] =>
  z.object({ versions: z.array(versionSchema) }).parse(JSON.parse(body)).versions

// ─── Capability calls ────────────────────────────────────────

/**
 * Runs on every node. Returns the raw body so identical-consensus compares
 * exact bytes; the app orders the list deterministically.
 */
export const fetchVersionsBody = (sendRequester: HTTPSendRequester, config: Config): string => {
  const response = sendRequester
    .sendRequest({ url: `${config.appUrl.replace(/\/$/, '')}/api/setups/attestations`, method: 'GET' })
    .result()
  if (response.statusCode !== 200) {
    throw new Error(`Setup Terminal returned HTTP ${response.statusCode}`)
  }
  return new TextDecoder().decode(response.body)
}

const readEthUsd = (runtime: Runtime<Config>, evm: EVMClient) => {
  const result = evm
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: runtime.config.evm.ethUsdFeedAddress as Address,
        data: encodeFunctionData({ abi: AGGREGATOR_ABI, functionName: 'latestRoundData' }),
      }),
      blockNumber: LATEST_BLOCK_NUMBER,
    })
    .result()
  const [, answer, , updatedAt] = decodeFunctionResult({
    abi: AGGREGATOR_ABI,
    functionName: 'latestRoundData',
    data: bytesToHex(result.data),
  })
  return { answer, updatedAt }
}

/** Which versions are already on-chain. An undeployed contract means none. */
const readAttestedMask = (runtime: Runtime<Config>, evm: EVMClient, ids: Hex[]): boolean[] => {
  const result = evm
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: runtime.config.evm.attestationsAddress as Address,
        data: encodeFunctionData({ abi: SetupAttestationsABI, functionName: 'attestedMask', args: [ids] }),
      }),
      blockNumber: LATEST_BLOCK_NUMBER,
    })
    .result()
  if (result.data.length === 0) {
    runtime.log('SetupAttestations has no code at the configured address; treating every version as new')
    return ids.map(() => false)
  }
  return [
    ...decodeFunctionResult({
      abi: SetupAttestationsABI,
      functionName: 'attestedMask',
      data: bytesToHex(result.data),
    }),
  ]
}

// ─── Handler ─────────────────────────────────────────────────

export const onCronTrigger = (runtime: Runtime<Config>): string => {
  const { config } = runtime
  const network = getNetwork({ chainFamily: 'evm', chainSelectorName: config.evm.chainSelectorName })
  if (!network) throw new Error(`Network not found: ${config.evm.chainSelectorName}`)
  const evm = new cre.capabilities.EVMClient(network.chainSelector.selector)

  // 1. Accepted versions from the app, agreed on by every node.
  const body = new cre.capabilities.HTTPClient()
    .sendRequest(runtime, fetchVersionsBody, consensusIdenticalAggregation<string>())(config)
    .result()
  const versions = parseVersions(body)
  runtime.log(`Fetched ${versions.length} accepted setup versions`)
  if (versions.length === 0) return JSON.stringify({ status: 'nothing_to_attest', attested: 0 })

  // 2. Chainlink ETH/USD at attestation time.
  const price = readEthUsd(runtime, evm)
  runtime.log(`Chainlink ETH/USD = ${Number(price.answer) / 1e8} (updatedAt ${price.updatedAt})`)

  // 3. Skip versions already recorded.
  const mask = readAttestedMask(runtime, evm, versions.map((v) => uuidToBytes32(v.versionId)))
  const fresh = versions.filter((_, i) => !mask[i]).slice(0, config.maxPerReport)
  runtime.log(`${versions.length - fresh.length} already attested, attesting ${fresh.length}`)
  if (fresh.length === 0) return JSON.stringify({ status: 'up_to_date', attested: 0 })

  for (const v of fresh) {
    runtime.log(
      `  v${v.versionNumber} ${v.kind} setup=${v.setupId} entry=${v.entryPrice ?? '-'} ` +
        `0G=${v.zeroGRequestId} (${v.verificationStatus}) hash=${termsHash(v)}`,
    )
  }

  // 4. One signed report for the batch, delivered via the CRE forwarder.
  const report = runtime.report(prepareReportRequest(encodeAttestations(fresh, price))).result()
  const write = evm
    .writeReport(runtime, {
      receiver: config.evm.attestationsAddress,
      report,
      gasConfig: { gasLimit: config.evm.gasLimit },
    })
    .result()

  if (write.txStatus !== TxStatus.SUCCESS) {
    throw new Error(`Attestation write failed: ${write.errorMessage ?? write.txStatus}`)
  }
  const txHash = bytesToHex(write.txHash ?? new Uint8Array(32))
  runtime.log(`Attested ${fresh.length} versions, tx ${txHash}`)

  return JSON.stringify({
    status: 'attested',
    attested: fresh.length,
    versionIds: fresh.map((v) => v.versionId),
    ethUsd: price.answer.toString(),
    txHash,
  })
}

export function initWorkflow(config: Config) {
  const cron = new cre.capabilities.CronCapability()
  return [cre.handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)]
}
