# Solidity API

## MockERC721

### MINTER_ROLE

```solidity
bytes32 MINTER_ROLE
```

### totalSupply

```solidity
struct Counters.Counter totalSupply
```

### baseURI

```solidity
string baseURI
```

### constructor

```solidity
constructor(string baseURI_) public
```

### UpdateBaseURI

```solidity
event UpdateBaseURI(string uri)
```

### UpdateTokenURI

```solidity
event UpdateTokenURI(uint256 tokenId, string uri)
```

### _baseURI

```solidity
function _baseURI() internal view virtual returns (string)
```

_Base URI for computing {tokenURI}. If set, the resulting URI for each
token will be the concatenation of the `baseURI` and the `tokenId`. Empty
by default, can be overridden in child contracts._

### setBaseURI

```solidity
function setBaseURI(string baseURI_) public
```

### setTokenURI

```solidity
function setTokenURI(uint256 tokenId, string uri) public
```

### safeMint

```solidity
function safeMint(address to, string uri) public
```

### batchMint

```solidity
function batchMint(uint256 count, address to, string[] tokenURIs) public
```

### _burn

```solidity
function _burn(uint256 tokenId) internal
```

### tokenURI

```solidity
function tokenURI(uint256 tokenId) public view returns (string)
```

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```

