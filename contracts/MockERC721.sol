// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MockERC721 is ERC721, ERC721URIStorage, AccessControl, Ownable {
    using Counters for Counters.Counter;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    Counters.Counter public totalSupply;
    string public baseURI;

    constructor(string memory baseURI_) ERC721("MockERC721", "MERC721") {
        baseURI = baseURI_;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    event UpdateBaseURI(string uri);
    event UpdateTokenURI(uint256 tokenId, string uri);

    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    function setBaseURI(string memory baseURI_) public onlyOwner {
        baseURI = baseURI_;
        emit UpdateBaseURI(baseURI_);
    }

    function setTokenURI(uint256 tokenId, string memory uri) public onlyOwner {
        _setTokenURI(tokenId, uri);
        emit UpdateTokenURI(tokenId, uri);
    }

    function safeMint(address to, string memory uri)
        public
        onlyRole(MINTER_ROLE)
    {
        uint256 tokenId = totalSupply.current();
        totalSupply.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function batchMint(
        uint256 count,
        address to,
        string[] memory tokenURIs
    ) public onlyRole(MINTER_ROLE) {
        require(count == tokenURIs.length, "Count deosn't match uris length");
        for (uint256 i = 0; i < count; i++) {
            string memory uri = tokenURIs[i];
            safeMint(to, uri);
        }
    }

    // The following functions are overrides required by Solidity.

    function _burn(uint256 tokenId)
        internal
        override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
