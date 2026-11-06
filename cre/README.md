# Chainlink CRE: setup attestor

A Chainlink CRE workflow that keeps Setup Terminal's setup history on-chain. On each cron tick it:

1. **Fetches** every accepted setup version from the app, `GET /api/setups/attestations`, using HTTP with DON identical consensus.
2. **Reads** the Chainlink ETH/USD Data Feed on Base Sepolia.
3. **Checks** which versions `SetupAttestations` already records, with one `attestedMask` call.
4. **Writes** one signed report for the new versions through the CRE forwarder. For each version, the report contains:
   - a hash of its terms
   - the X post it came from
   - the 0G Private Computer request ID that extracted it
   - the 0G TEE verification status
   - the ETH/USD price at that moment

The contract only adds records and never overwrites one. A creator revision is a new version with a new ID. So anyone can check that the version a follower's order was signed against was never rewritten, which is the app's core promise.

The workflow coordinates an external API (our app, which carries X and 0G data), a Chainlink Data Feed, and an on-chain write. That covers the "Best workflow with CRE" requirements; the track says simulation is enough.

## Layout

| Path | What it is |
| --- | --- |
| `project.yaml`, `secrets.yaml` | CRE project settings (Base Sepolia RPC). No secrets are needed. |
| `setup-attestor/workflow.ts` | The workflow: cron trigger, HTTP fetch, EVM read, report and EVM write |
| `setup-attestor/workflow.test.ts` | Handler tests against CRE SDK capability mocks |
| `setup-attestor/config.*.json` | App URL, contract address, ETH/USD feed, gas limit |
| `contracts/src/SetupAttestations.sol` | Receiver contract, built on Chainlink's MIT `ReceiverTemplate` (vendored) |
| `contracts/SetupAttestations.test.ts` | Contract tests on an in-process EVM, including workflow-encoded reports |

The ETH/USD feed `0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1` on Base Sepolia was checked on-chain: `description()` returns `ETH / USD` with 8 decimals, and it was updating on Nov 6, 2026.

## Run it

You need [Bun](https://bun.sh) 1.2.21 or later and the [CRE CLI](https://github.com/smartcontractkit/cre-cli/blob/main/install/README.md).

```bash
cd cre/contracts && bun install && bun compile.ts && bun test       # compile and test the contract
cd ../setup-attestor && bun install && bun test                     # workflow tests (prints the run log)
bun x cre-compile main.ts dist/workflow.wasm                         # check it compiles to WASM
```

To simulate with the CLI (needs a free Chainlink account):

```bash
cre login
# Set appUrl in setup-attestor/config.staging.json to the deployed app.
cd cre && cre workflow simulate ./setup-attestor --target staging-settings
```

You don't have to deploy the contract for a dry run. While no contract exists at `attestationsAddress`, the workflow treats every version as new.

Broadcasting needs more setup:
1. Deploy `SetupAttestations(forwarder)` to Base Sepolia, using the CRE forwarder address for Base Sepolia from Chainlink's forwarder directory.
2. Set `attestationsAddress` in the config.
3. Add `--broadcast`.

The owner can change the forwarder later with `setForwarderAddress`.

## Expected run log

This is from `bun test`, with live data from the app:

```
Fetched 2 accepted setup versions
Chainlink ETH/USD = 2239.59 (updatedAt 1793961458)
0 already attested, attesting 2
  v1 initial setup=5b3f... entry=2400 0G=0852f405-... (verified) hash=0x4634...
  v2 revision setup=5b3f... entry=2350 0G=1f7c2a90-... (verified) hash=0x911b...
Attested 2 versions, tx 0xabab...
```
