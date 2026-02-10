// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MRZTest is ERC721 {
    uint256 public totalSupply;
    uint256 public constant MAX_SUPPLY = 100;
    address public immutable owner;

    constructor() ERC721("MRZ Test", "MRZT") {
        owner = msg.sender;
    }

    function mint(uint256 quantity) external {
        require(totalSupply + quantity <= MAX_SUPPLY, "Max supply");
        require(quantity <= 5, "Max 5 per tx");

        for (uint256 i = 0; i < quantity;) {
            _mint(msg.sender, totalSupply++);
            unchecked { ++i; }
        }
    }

    function withdraw() external {
        require(msg.sender == owner, "Not owner");
        payable(owner).transfer(address(this).balance);
    }
}
