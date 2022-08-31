# Solidity API

## DisputeContract

Dispute Contract for the Leisure Pay Ecosystem

### State

```solidity
enum State {
  Open,
  Closed,
  Canceled
}
```

### PARTIES

```solidity
enum PARTIES {
  NULL,
  A,
  B
}
```

### NFT

```solidity
struct NFT {
  address _nft;
  uint256 _id;
}
```

### Dispute

```solidity
struct Dispute {
  uint256 disputeID;
  struct DisputeContract.NFT _nft;
  uint256 usdValue;
  uint256 tokenValue;
  address sideA;
  address sideB;
  bool hasClaim;
  uint256 voteCount;
  uint256 support;
  uint256 against;
  struct IterableArbiters.Map arbiters;
  bool claimed;
  enum DisputeContract.PARTIES winner;
  enum DisputeContract.State state;
}
```

### DisputeView

```solidity
struct DisputeView {
  uint256 disputeID;
  struct DisputeContract.NFT _nft;
  uint256 usdValue;
  uint256 tokenValue;
  address sideA;
  address sideB;
  bool hasClaim;
  uint256 voteCount;
  uint256 support;
  uint256 against;
  struct IterableArbiters.UserVote[] arbiters;
  bool claimed;
  enum DisputeContract.PARTIES winner;
  enum DisputeContract.State state;
}
```

### numOfdisputes

```solidity
uint256 numOfdisputes
```

Total number of disputes on chain

_This includes cancelled disputes as well_

### disputes

```solidity
mapping(uint256 => struct DisputeContract.Dispute) disputes
```

mapping to get dispute by ID where `uint256` key is the dispute ID

### disputeIndexesAsSideA

```solidity
mapping(address => uint256[]) disputeIndexesAsSideA
```

Easily get a user's created disputes IDs

### disputeIndexesAsSideB

```solidity
mapping(address => uint256[]) disputeIndexesAsSideB
```

Easily get a user's attached disputes iDs

### lpy

```solidity
contract IERC20 lpy
```

Address that points to the LPY contract - used for settling disputes

### SERVER_ROLE

```solidity
bytes32 SERVER_ROLE
```

SERVER_ROLE bytes

### constructor

```solidity
constructor(contract IERC20 _lpy, address _server) public
```

Default initializer for the dispute contract

| Name | Type | Description |
| ---- | ---- | ----------- |
| _lpy | contract IERC20 | Address of the LPY contract |
| _server | address | Address of the Server |

### DisputeCreated

```solidity
event DisputeCreated(uint256 disputeIndex, struct DisputeContract.NFT _nft, uint256 usdValue, address sideA, address sideB, address[] arbiters)
```

Event emitted when a dispute is created

| Name | Type | Description |
| ---- | ---- | ----------- |
| disputeIndex | uint256 | Created dispute ID |
| _nft | struct DisputeContract.NFT | A struct containing the NFT address and its ID |
| usdValue | uint256 | Dispute's USD at stake |
| sideA | address | Creator of the dispute |
| sideB | address | Attached user to the dispute |
| arbiters | address[] | An array of users responsible for voting |

### DisputeVoted

```solidity
event DisputeVoted(uint256 disputeIndex, address voter, bool agree)
```

Event emitted when an arbiter votes on a dispute

| Name | Type | Description |
| ---- | ---- | ----------- |
| disputeIndex | uint256 | Dispute ID |
| voter | address | The Voter |
| agree | bool | If user votes YES or NO to the dispute |

### DisputeClosed

```solidity
event DisputeClosed(uint256 disputeIndex, uint256 usdValue, uint256 tokenValue, uint256 rate, uint256 sideAVotes, uint256 sideBVotes, enum DisputeContract.PARTIES winner)
```

Event emitted when a dispute is closed

| Name | Type | Description |
| ---- | ---- | ----------- |
| disputeIndex | uint256 | Dispute ID |
| usdValue | uint256 | Dispute's USD at stake |
| tokenValue | uint256 | LPY Token worth `usdValue` |
| rate | uint256 | The present lpy rate per usd |
| sideAVotes | uint256 | Total Votes `sideA` received |
| sideBVotes | uint256 | Total Votes `sideB` received |
| winner | enum DisputeContract.PARTIES | Winner of the dispute |

### DisputeCanceled

```solidity
event DisputeCanceled(uint256 disputeIndex)
```

Event emitted when a dispute is caqncelled

| Name | Type | Description |
| ---- | ---- | ----------- |
| disputeIndex | uint256 | Dispute ID |

### DisputeFundClaimed

```solidity
event DisputeFundClaimed(uint256 disputeIndex, uint256 tokenValue, address claimer)
```

Event emitted when a dispute fund is claimed

| Name | Type | Description |
| ---- | ---- | ----------- |
| disputeIndex | uint256 | Dispute ID |
| tokenValue | uint256 | Amount of LPY claimed |
| claimer | address | Receiver of the funds |

### SideAUpdated

```solidity
event SideAUpdated(uint256 disputeIndex, address oldSideA, address newSideA)
```

Event emitted when a sideA is modified

| Name | Type | Description |
| ---- | ---- | ----------- |
| disputeIndex | uint256 | Dispute ID |
| oldSideA | address | Previous SideA Address |
| newSideA | address | New SideA Address |

### SideBUpdated

```solidity
event SideBUpdated(uint256 disputeIndex, address oldSideB, address newSideB)
```

Event emitted when a sideB is modified

| Name | Type | Description |
| ---- | ---- | ----------- |
| disputeIndex | uint256 | Dispute ID |
| oldSideB | address | Previous SideB Address |
| newSideB | address | New SideB Address |

### _castVote

```solidity
function _castVote(uint256 index, address signer, bool agree) internal returns (struct IterableArbiters.UserVote)
```

Internal function that does the actual casting of vote, and emits `DisputeVoted` event

_Can only be called by public/external functions that have done necessary checks <br/>1. dispute is opened<br/> 2. user must be an arbiter<br/>3. user should not have already voted_

| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | ID of the dispute to vote on |
| signer | address | The user that's voting |
| agree | bool | The vote's direction where `true==YES and false==NO` |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct IterableArbiters.UserVote | UserVote struct containing the vote details |

### _getSignerAddress

```solidity
function _getSignerAddress(uint256 id, string _msg, bytes _sig) internal pure returns (address, bool)
```

Internal function that gets signer of a vote from a message `(id+msg)` and signature bytes

_Concatenate the dispute ID and MSG to get the message to sign, and uses ECDSA to get the signer of the message_

| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | ID of the dispute the message was signed on |
| _msg | string | The original message signed |
| _sig | bytes | The signed message signature |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | signer of the message, if valid, otherwise `0x0` |
| [1] | bool | vote direction of the signature, if valid, otherwise `false` |

### toggleHasClaim

```solidity
function toggleHasClaim(uint256 disputeIndex) external
```

Changes the `hasClaim` field of a dispute to the opposite

_Function can only be called by a user with the `DEFAULT_ADMIN_ROLE` or `SERVER_ROLE` role_

| Name | Type | Description |
| ---- | ---- | ----------- |
| disputeIndex | uint256 | the id or index of the dispute in memory |

### createDisputeByServer

```solidity
function createDisputeByServer(address _sideA, address _sideB, bool _hasClaim, address _nftAddr, uint256 txID, uint256 usdValue, address[] _arbiters) external returns (bool)
```

Adds a new dispute to memory

_Function can only be called by a user with the `SERVER_ROLE` roles, <br/>all fields can be changed post function call except the `_nftAddr` and `txID`_

| Name | Type | Description |
| ---- | ---- | ----------- |
| _sideA | address | Is the creator of the dispute |
| _sideB | address | Is the user the dispute is against |
| _hasClaim | bool | A field to know if settlement occurs on chain |
| _nftAddr | address | The LPY NFT contract address |
| txID | uint256 | The LPY NFT ID to confirm it's a valid transaction |
| usdValue | uint256 | Amount at stake in USD |
| _arbiters | address[] | List of users that can vote on this dispute |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | if creation was successful or not |

### castVote

```solidity
function castVote(uint256 index, bool _agree) external returns (bool)
```

Function to let a user directly vote on a dispute

_Can only be called if; <br/> 1. dispute state is `OPEN` <br/> 2. the user is an arbiter of that very dispute<br/>3. the user has not already voted on that dispute<br/>This function calls @_castVote_

| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | ID of the dispute to vote on |
| _agree | bool | The vote's direction where `true==YES and false==NO` |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | if vote was successful or not |

### cancelDispute

```solidity
function cancelDispute(uint256 index) external
```

Function to render a dispute cancelled and not interactable anymore

_Can only be called if dispute state is `OPEN` and the user the `SERVER_ROLE` role and it emits a `DisputeCanceled` event_

| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | ID of the dispute to cancel |

### castVotesWithSignatures

```solidity
function castVotesWithSignatures(uint256 index, bytes[] _sigs, string[] _msgs) external returns (bool)
```

Submits signed votes to contract

_Function can only be called by a user with the `SERVER_ROLE` roles<br/>This function calls @_castVote_

| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | ID of the dispute |
| _sigs | bytes[] | _sigs is an array of signatures` |
| _msgs | string[] | _msgs is an array of the raw messages that was signed` |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | if vote casting was successful |

### finalizeDispute

```solidity
function finalizeDispute(uint256 index, bool sideAWins, uint256 ratio) external returns (bool)
```

Finalizes and closes dispute

_Function can only be called by a user with the `SERVER_ROLE` roles<br/>The server has the final say by passing `sideAWins` to `true|false`, and emits a `DisputeClosed` event_

| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | ID of the dispute |
| sideAWins | bool | Final say of the server on the dispute votes |
| ratio | uint256 | This is the rate of LPY per USD |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | if vote finalize was succesful |

### addArbiter

```solidity
function addArbiter(uint256 index, address _arbiter) external
```

Adds a user as an arbiter to a dispute

_Function can only be called by a user with the `SERVER_ROLE` roles_

| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | ID of the dispute |
| _arbiter | address | User to add to list of dispute arbiters |

### removeArbiter

```solidity
function removeArbiter(uint256 index, address _arbiter) external
```

Removes a user as an arbiter to a dispute

_Function can only be called by a user with the `SERVER_ROLE` roles_

| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | ID of the dispute |
| _arbiter | address | User to remove from list of dispute arbiters |

### updateSideA

```solidity
function updateSideA(uint256 disputeId, address _sideA) external
```

Change sideA address (in the unlikely case of an error)

_Function can only be called by a user with the `SERVER_ROLE` roles_

| Name | Type | Description |
| ---- | ---- | ----------- |
| disputeId | uint256 | ID of the dispute |
| _sideA | address | The address of the new sideA |

### updateSideB

```solidity
function updateSideB(uint256 disputeId, address _sideB) external
```

Change sideB address (in the unlikely case of an error)

_Function can only be called by a user with the `SERVER_ROLE` roles_

| Name | Type | Description |
| ---- | ---- | ----------- |
| disputeId | uint256 | ID of the dispute |
| _sideB | address | The address of the new sideB |

### claim

```solidity
function claim(uint256 index) external returns (bool)
```

Function for user to claim the tokens

_Function can only be called by just a user with the `SERVER_ROLE` and the winner of the dispute, emits a `DisputeFundClaimed` event_

| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | ID of the dispute |

### serializeDispute

```solidity
function serializeDispute(uint256 index) internal view returns (struct DisputeContract.DisputeView)
```

Internal function to convert type @Dispute to type @DisputeView

| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | ID of the dispute |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct DisputeContract.DisputeView | DisputeView object |

### getAllDisputes

```solidity
function getAllDisputes() external view returns (struct DisputeContract.DisputeView[])
```

Get all Disputes in the contract

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct DisputeContract.DisputeView[] | Array of DisputeView object |

### getAllOpenDisputes

```solidity
function getAllOpenDisputes() external view returns (struct DisputeContract.DisputeView[])
```

Get all Open Dispute

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct DisputeContract.DisputeView[] | Array of DisputeView object |

### getAllClosedDisputes

```solidity
function getAllClosedDisputes() external view returns (struct DisputeContract.DisputeView[])
```

Get all Closed Dispute

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct DisputeContract.DisputeView[] | Array of DisputeView object |

### getAllCanceledDisputes

```solidity
function getAllCanceledDisputes() external view returns (struct DisputeContract.DisputeView[])
```

Get all Canceled Dispute

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct DisputeContract.DisputeView[] | Array of DisputeView object |

### getDisputeByIndex

```solidity
function getDisputeByIndex(uint256 index) external view returns (struct DisputeContract.DisputeView _dispute)
```

Get a specific dispute based on `disputeId`

| Name | Type | Description |
| ---- | ---- | ----------- |
| index | uint256 | ID of the dispute |

| Name | Type | Description |
| ---- | ---- | ----------- |
| _dispute | struct DisputeContract.DisputeView | DisputeView object |

### getSideAOpenDisputes

```solidity
function getSideAOpenDisputes(address _user) public view returns (struct DisputeContract.DisputeView[])
```

Get all Open Dispute where sideA is `_user`

| Name | Type | Description |
| ---- | ---- | ----------- |
| _user | address | User to get disputes for |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct DisputeContract.DisputeView[] | Array of DisputeView object |

### getSideAClosedDisputes

```solidity
function getSideAClosedDisputes(address _user) public view returns (struct DisputeContract.DisputeView[])
```

Get all Closed Dispute where sideA is `_user`

| Name | Type | Description |
| ---- | ---- | ----------- |
| _user | address | User to get disputes for |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct DisputeContract.DisputeView[] | Array of DisputeView object |

### getSideACanceledDisputes

```solidity
function getSideACanceledDisputes(address _user) public view returns (struct DisputeContract.DisputeView[])
```

Get all Canceled Dispute where sideA is `_user`

| Name | Type | Description |
| ---- | ---- | ----------- |
| _user | address | User to get disputes for |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct DisputeContract.DisputeView[] | Array of DisputeView object |

### getSideBOpenDisputes

```solidity
function getSideBOpenDisputes(address _user) public view returns (struct DisputeContract.DisputeView[])
```

Get all Open Dispute where sideB is `_user`

| Name | Type | Description |
| ---- | ---- | ----------- |
| _user | address | User to get disputes for |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct DisputeContract.DisputeView[] | Array of DisputeView object |

### getSideBClosedDisputes

```solidity
function getSideBClosedDisputes(address _user) public view returns (struct DisputeContract.DisputeView[])
```

Get all Closed Dispute where sideB is `_user`

| Name | Type | Description |
| ---- | ---- | ----------- |
| _user | address | User to get disputes for |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct DisputeContract.DisputeView[] | Array of DisputeView object |

### getSideBCanceledDisputes

```solidity
function getSideBCanceledDisputes(address _user) public view returns (struct DisputeContract.DisputeView[])
```

Get all Canceled Dispute where sideB is `_user`

| Name | Type | Description |
| ---- | ---- | ----------- |
| _user | address | User to get disputes for |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct DisputeContract.DisputeView[] | Array of DisputeView object |

### getMyOpenDisputesAsSideA

```solidity
function getMyOpenDisputesAsSideA() external view returns (struct DisputeContract.DisputeView[] _disputes)
```

Get all Open Dispute where sideA is the one calling the function

| Name | Type | Description |
| ---- | ---- | ----------- |
| _disputes | struct DisputeContract.DisputeView[] | Array of DisputeView object |

### getMyClosedDisputesAsSideA

```solidity
function getMyClosedDisputesAsSideA() external view returns (struct DisputeContract.DisputeView[] _disputes)
```

Get all Close Dispute where sideA is the one calling the function

| Name | Type | Description |
| ---- | ---- | ----------- |
| _disputes | struct DisputeContract.DisputeView[] | Array of DisputeView object |

### getMyCanceledDisputesAsSideA

```solidity
function getMyCanceledDisputesAsSideA() external view returns (struct DisputeContract.DisputeView[] _disputes)
```

Get all Canceled Dispute where sideA is the one calling the function

| Name | Type | Description |
| ---- | ---- | ----------- |
| _disputes | struct DisputeContract.DisputeView[] | Array of DisputeView object |

### getMyOpenDisputesAsSideB

```solidity
function getMyOpenDisputesAsSideB() external view returns (struct DisputeContract.DisputeView[] _disputes)
```

Get all Open Dispute where sideB is the one calling the function

| Name | Type | Description |
| ---- | ---- | ----------- |
| _disputes | struct DisputeContract.DisputeView[] | Array of DisputeView object |

### getMyClosedDisputesAsSideB

```solidity
function getMyClosedDisputesAsSideB() external view returns (struct DisputeContract.DisputeView[] _disputes)
```

Get all Closed Dispute where sideB is the one calling the function

| Name | Type | Description |
| ---- | ---- | ----------- |
| _disputes | struct DisputeContract.DisputeView[] | Array of DisputeView object |

### getMyCanceledDisputesAsSideB

```solidity
function getMyCanceledDisputesAsSideB() external view returns (struct DisputeContract.DisputeView[] _disputes)
```

Get all Canceled Dispute where sideB is the one calling the function

| Name | Type | Description |
| ---- | ---- | ----------- |
| _disputes | struct DisputeContract.DisputeView[] | Array of DisputeView object |

