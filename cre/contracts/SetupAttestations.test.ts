// Runs the compiled SetupAttestations bytecode in an in-process EVM.
//   bun compile.ts && bun test

import { beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createAddressFromString } from "@ethereumjs/util";
import { createVM, type VM } from "@ethereumjs/vm";
import {
  type Hex,
  decodeFunctionResult,
  encodeAbiParameters,
  encodeDeployData,
  encodeFunctionData,
  hexToBytes,
  keccak256,
  bytesToHex,
  toHex,
} from "viem";
import { encodeAttestations, termsHash, uuidToBytes32 } from "../setup-attestor/workflow";

const { abi, bytecode } = JSON.parse(
  readFileSync(join(import.meta.dir, "out", "SetupAttestations.json"), "utf8"),
) as { abi: readonly unknown[]; bytecode: Hex };

const FORWARDER = "0x15fC6ae953E024d975e77382eEeC56A9101f9F88";
const STRANGER = "0x000000000000000000000000000000000000bEEF";

// Must match SetupAttestations.Attestation and the workflow's encoder.
const ATTESTATIONS_ABI = [
  {
    type: "tuple[]",
    components: [
      { name: "setupId", type: "bytes32" },
      { name: "versionId", type: "bytes32" },
      { name: "versionNumber", type: "uint32" },
      { name: "kind", type: "uint8" },
      { name: "verification", type: "uint8" },
      { name: "termsHash", type: "bytes32" },
      { name: "sourcePostId", type: "string" },
      { name: "zeroGRequestId", type: "string" },
      { name: "ethUsdPrice", type: "int256" },
      { name: "priceUpdatedAt", type: "uint64" },
    ],
  },
] as const;

const setupId = `0x${"5b3f8f9e1a2b4c3d8e9f000000000001".padEnd(64, "0")}` as Hex;
const v1 = `0x${"a1000000000040008000000000000001".padEnd(64, "0")}` as Hex;
const v2 = `0x${"a1000000000040008000000000000002".padEnd(64, "0")}` as Hex;

const attestation = (versionId: Hex, versionNumber: number, requestId: string) => ({
  setupId,
  versionId,
  versionNumber,
  kind: versionNumber === 1 ? 0 : 1,
  verification: 0,
  termsHash: keccak256(toHex(`terms-${versionNumber}`)),
  sourcePostId: `185500000000000000${versionNumber}`,
  zeroGRequestId: requestId,
  ethUsdPrice: 223959000000n,
  priceUpdatedAt: 1793961458n,
});

let vm: VM;
let contract: ReturnType<typeof createAddressFromString>;

async function call(from: string, data: Hex) {
  const res = await vm.evm.runCall({
    caller: createAddressFromString(from),
    to: contract,
    data: hexToBytes(data),
    gasLimit: 10_000_000n,
  });
  return res.execResult;
}

async function read<T>(functionName: string, args: unknown[] = []): Promise<T> {
  const r = await call(STRANGER, encodeFunctionData({ abi, functionName, args } as never));
  if (r.exceptionError) throw new Error(`${functionName} reverted`);
  return decodeFunctionResult({ abi, functionName, data: bytesToHex(r.returnValue) } as never) as T;
}

const onReport = (from: string, batch: ReturnType<typeof attestation>[]) =>
  call(
    from,
    encodeFunctionData({
      abi,
      functionName: "onReport",
      args: ["0x", encodeAbiParameters(ATTESTATIONS_ABI, [batch])],
    } as never),
  );

beforeAll(async () => {
  vm = await createVM();
  const res = await vm.evm.runCall({
    caller: createAddressFromString(STRANGER),
    data: hexToBytes(encodeDeployData({ abi, bytecode, args: [FORWARDER] } as never)),
    gasLimit: 10_000_000n,
  });
  if (!res.createdAddress) throw new Error("deploy failed");
  contract = res.createdAddress;
});

describe("SetupAttestations", () => {
  test("only the Chainlink forwarder can submit reports", async () => {
    const r = await onReport(STRANGER, [attestation(v1, 1, "req-1")]);
    expect(r.exceptionError).toBeDefined();
    expect(await read<bigint>("attestationCount")).toBe(0n);
  });

  test("stores a batch and reports which versions are attested", async () => {
    const r = await onReport(FORWARDER, [attestation(v1, 1, "req-1")]);
    expect(r.exceptionError).toBeUndefined();
    expect(r.logs?.length).toBe(1);

    const stored = await read<{ versionNumber: number; zeroGRequestId: string; ethUsdPrice: bigint }>(
      "getAttestation",
      [v1],
    );
    expect(stored.versionNumber).toBe(1);
    expect(stored.zeroGRequestId).toBe("req-1");
    expect(stored.ethUsdPrice).toBe(223959000000n);
    expect(await read<boolean[]>("attestedMask", [[v1, v2]])).toEqual([true, false]);
  });

  test("a revision is a new version and never overwrites the first", async () => {
    // v1 is replayed with different data alongside a new v2.
    const tampered = { ...attestation(v1, 1, "req-forged"), termsHash: keccak256(toHex("forged")) };
    const r = await onReport(FORWARDER, [tampered, attestation(v2, 2, "req-2")]);
    expect(r.exceptionError).toBeUndefined();

    expect((await read<{ zeroGRequestId: string }>("getAttestation", [v1])).zeroGRequestId).toBe("req-1");
    expect(await read<Hex[]>("getSetupVersions", [setupId])).toEqual([v1, v2]);
    expect(await read<bigint>("attestationCount")).toBe(2n);
  });

  test("supports the IReceiver interface for the forwarder's ERC165 check", async () => {
    // IReceiver.onReport selector
    expect(await read<boolean>("supportsInterface", ["0x805f2132"])).toBe(true);
  });
});

describe("workflow -> contract", () => {
  test("a report encoded by the setup-attestor workflow is accepted and readable", async () => {
    const version = {
      setupId: "5b3f8f9e-1a2b-4c3d-8e9f-0000000000ff",
      versionId: "a1000000-0000-4000-8000-0000000000ff",
      versionNumber: 1,
      kind: "initial" as const,
      asset: "ETH",
      side: "buy",
      entryCondition: "at_or_below",
      entryPrice: "2400",
      referenceCurrency: "USD",
      target: "2800",
      invalidation: "2250",
      sourcePostId: "1855000000000000001",
      zeroGRequestId: "0852f405-6c56-40c2-a800-e6fd70785065",
      verificationStatus: "unverified" as const,
    };
    const payload = encodeAttestations([version], { answer: 223959000000n, updatedAt: 1793961458n });
    const r = await call(
      FORWARDER,
      encodeFunctionData({ abi, functionName: "onReport", args: ["0x", payload] } as never),
    );
    expect(r.exceptionError).toBeUndefined();

    const stored = await read<{ termsHash: Hex; verification: number; sourcePostId: string }>(
      "getAttestation",
      [uuidToBytes32(version.versionId)],
    );
    expect(stored.termsHash).toBe(termsHash(version));
    expect(stored.verification).toBe(1);
    expect(stored.sourcePostId).toBe("1855000000000000001");
  });
});
