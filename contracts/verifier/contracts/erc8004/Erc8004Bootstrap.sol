// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @dev Minimal UUPS bootstrap used to initialize the ERC-8004 registry proxy.
/// The official IdentityRegistryUpgradeable's initialize() is `reinitializer(2)
/// onlyOwner`, so a fresh proxy needs a v1 implementation that sets the owner
/// first (same pattern the 8004 team uses, but with a configurable owner).
contract Erc8004Bootstrap is OwnableUpgradeable, UUPSUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address owner_) public initializer {
        __Ownable_init(owner_);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}

/// @dev Re-export so Hardhat compiles OZ's ERC1967Proxy artifact for deployment.
contract Erc8004Proxy is ERC1967Proxy {
    constructor(address implementation, bytes memory data) ERC1967Proxy(implementation, data) {}
}
