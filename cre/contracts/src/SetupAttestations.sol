// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReceiverTemplate} from "./ReceiverTemplate.sol";

/// @title SetupAttestations
/// @notice Append-only, on-chain record of every accepted Setup Terminal setup
///         version, written by the Chainlink CRE "setup-attestor" workflow.
/// @dev Each attestation commits to a version's terms (termsHash), the X post
///      it came from, the 0G Private Computer request that extracted it, and
///      the Chainlink ETH/USD price when it was attested. Versions are never
///      overwritten: a creator revision is a new version with a new ID, so
///      anyone can check that history was not rewritten after orders were
///      signed against an earlier version.
contract SetupAttestations is ReceiverTemplate {
    struct Attestation {
        bytes32 setupId;
        bytes32 versionId;
        uint32 versionNumber;
        uint8 kind; // 0 initial, 1 revision, 2 withdrawal
        uint8 verification; // 0 verified, 1 unverified, 2 failed (0G TEE status)
        bytes32 termsHash;
        string sourcePostId;
        string zeroGRequestId;
        int256 ethUsdPrice; // Chainlink ETH/USD answer, 8 decimals
        uint64 priceUpdatedAt;
    }

    mapping(bytes32 versionId => Attestation) private s_attestations;
    mapping(bytes32 setupId => bytes32[] versionIds) private s_setupVersions;
    uint256 public attestationCount;

    event VersionAttested(
        bytes32 indexed setupId,
        bytes32 indexed versionId,
        uint32 versionNumber,
        bytes32 termsHash,
        string zeroGRequestId,
        int256 ethUsdPrice
    );
    event DuplicateIgnored(bytes32 indexed versionId);

    constructor(address forwarder) ReceiverTemplate(forwarder) {}

    /// @dev Report payload: abi.encode(Attestation[]).
    function _processReport(bytes calldata report) internal override {
        Attestation[] memory batch = abi.decode(report, (Attestation[]));
        for (uint256 i = 0; i < batch.length; i++) {
            Attestation memory a = batch[i];
            // Replays and overlapping batches are harmless: first write wins.
            if (s_attestations[a.versionId].termsHash != bytes32(0)) {
                emit DuplicateIgnored(a.versionId);
                continue;
            }
            s_attestations[a.versionId] = a;
            s_setupVersions[a.setupId].push(a.versionId);
            attestationCount++;
            emit VersionAttested(a.setupId, a.versionId, a.versionNumber, a.termsHash, a.zeroGRequestId, a.ethUsdPrice);
        }
    }

    function getAttestation(bytes32 versionId) external view returns (Attestation memory) {
        return s_attestations[versionId];
    }

    function getSetupVersions(bytes32 setupId) external view returns (bytes32[] memory) {
        return s_setupVersions[setupId];
    }

    /// @notice Which of `versionIds` are already attested, in one call.
    function attestedMask(bytes32[] calldata versionIds) external view returns (bool[] memory mask) {
        mask = new bool[](versionIds.length);
        for (uint256 i = 0; i < versionIds.length; i++) {
            mask[i] = s_attestations[versionIds[i]].termsHash != bytes32(0);
        }
    }
}
