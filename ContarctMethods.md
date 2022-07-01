# LPY DISPUTE

A Repo responsible for creating Dispute on chain

[TestCase Sheet](https://docs.google.com/spreadsheets/d/1Dzt3BeL2CGE3RBusBb9S_nm6sqAwg2tqP8Ck2LIOw1U/edit#gid=0)

## CONTRACTS

ERC20: <https://bscscan.com/address/0xa001862ba0866ee3e3a2613fab5954861452b9bf>

ERC721: <https://bscscan.com/address/0x42981d0bfbAf196529376EE702F2a9Eb9092fcB5>

IterableArbiters: <https://bscscan.com/address/0x2E6BbcaB5C55E51Fc1aac89b63Df0DaE270da39f>

Dispute: <https://bscscan.com/address/0xD4A210030B71Bb03FA85F8c72918078f1C185773>

## METHODS

1. `addArbiter(unint256 index, address _arbiter)`
    * Adds `arbiter` to to the list of arbiters for dispute with id `index`.
    * Can only be called by someone with the `SERVER_ROLE`.

2. `castVote(uint256 index, bool _agree)`
    * Adds a vote to the dispute with id `index`.
    * Can only be called by an arbiter of that specific dispute.
    * Arbiter can't vote more than once.

3. `castVotesWithSignatures(uint256 index, bytes[] memory _sigs, string[] memory _msgs)`
    * After users sign a vote, ONLY server can submit the vote via this function
    * `index` is the dispute index the vote belongs to
    * `_sigs` are the signatures
    * `_msgs` are the vote way signed

4. `function createDisputeByServer(address _sideA, address _sideB, bool _hasClaim, address _nftAddr, uint256 txID, uint256 usdValue, address[] memory _arbiters)`
    * ONLY server can create a dispute
    * `hasClaim` determines if dispute fund is claimable

5. `function createDisputeByServer(address _sideA, address _sideB, bool _hasClaim, address _nftAddr, uint256 txID, uint256 usdValue, address[] memory _arbiters)`
    * ONLY server can create a dispute
    * `hasClaim` determines if dispute fund is claimable
