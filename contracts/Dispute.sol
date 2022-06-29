// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IERC721.sol";
import "./IterableArbiters.sol";

/// @title LPY Dispute Contract
/// @author Leisure Pay
/// @notice Dispute Contract for the Leisure Pay Ecosystem
/// @dev Dispute Contract for the Leisure Pay Ecosystem
contract DisputeContract is AccessControlEnumerable {
    using IterableArbiters for IterableArbiters.Map;
    using ECDSA for bytes32;
    using Strings for uint256;

    enum State {
        Open,
        Closed,
        Canceled
    }

    enum PARTIES {
        NULL,
        A,
        B
    }

    struct NFT {
        address _nft;
        uint256 _id;
    }

    struct Dispute {
        uint256 disputeID;
        NFT _nft;
        uint256 usdValue;
        uint256 tokenValue;
        address sideA;
        address sideB;
        bool hasClaim;
        uint256 voteCount;
        uint256 support;
        uint256 against;
        IterableArbiters.Map arbiters;
        bool claimed;
        PARTIES winner;
        State state;
    }

    struct DisputeView {
        uint256 disputeID;
        NFT _nft;
        uint256 usdValue;
        uint256 tokenValue;
        address sideA;
        address sideB;
        bool hasClaim;
        uint256 voteCount;
        uint256 support;
        uint256 against;
        IterableArbiters.UserVote[] arbiters;
        bool claimed;
        PARTIES winner;
        State state;
    }

    uint8 public numOfdisputes;
    mapping(uint256 => Dispute) private disputes;

    mapping(address => uint256[]) public disputeIndexesAsSideA;
    mapping(address => uint256[]) public disputeIndexesAsSideB;

    IERC20 private lpy;

    // ROLES
    bytes32 public constant SERVER_ROLE = bytes32("SERVER_ROLE");

    // CONSTRUCTOR
    constructor(
        IERC20 _lpy,
        address _server
    ) {
        lpy = _lpy;

        _grantRole(SERVER_ROLE, _server);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // EVENTS
    event DisputeCreated(
        uint256 indexed disputeIndex,
        NFT _nft,
        uint256 usdValue,
        address indexed sideA,
        address indexed sideB,
        address[] arbiters
    );

    event DisputeVoted(
        uint256 indexed disputeIndex,
        address indexed voter,
        bool agree
    );

    event DisputeClosed(
        uint256 indexed disputeIndex,
        uint256 usdValue,
        uint256 tokenValue,
        uint256 rate,
        uint256 sideAVotes,
        uint256 sideBVotes,
        PARTIES winner
    );


    event DisputeCancelled(uint256 indexed disputeIndex);

    event DisputeFundClaimed(
        uint256 indexed disputeIndex,
        uint256 tokenValue,
        address indexed claimer
    );

    // INTERNAL FUNCTIONS
    function _createDispute(
        address _sideA,
        address _sideB,
        bool _hasClaim,
        address _nftAddr,
        uint256 txID,
        uint256 usdValue,
        address[] memory _arbiters
    ) internal returns (bool) {
        require(_sideA != _sideB, "sideA == sideB");

        uint256 disputeID = numOfdisputes++;

        Dispute storage dispute = disputes[disputeID];

        // Confirm tokenID is already minted
        IERC721Extended(_nftAddr).tokenURI(txID);

        dispute.disputeID = disputeID;
        dispute.sideA = _sideA;
        dispute.sideB = _sideB;
        dispute.hasClaim = _hasClaim;

        for (uint256 i = 0; i < _arbiters.length; i++) {
            require(!dispute.arbiters.contains(_arbiters[i]), "Duplicate Keys");
            dispute.arbiters.set(_arbiters[i], IterableArbiters.UserVote(_arbiters[i], false, false));
        }
        dispute.state = State.Open;
        dispute.usdValue = usdValue;

        disputeIndexesAsSideA[_sideA].push(disputeID);
        disputeIndexesAsSideB[_sideB].push(disputeID);

        emit DisputeCreated(
            disputeID,
            dispute._nft,
            usdValue,
            _sideA,
            _sideB,
            dispute.arbiters.keysAsArray()
        );

        return true;
    }

    // vote on a dispute
    function _castVote(
        uint256 index,
        address signer,
        bool agree
    ) internal returns (IterableArbiters.UserVote memory) {
        IterableArbiters.UserVote memory vote = IterableArbiters.UserVote(signer, agree, true);

        emit DisputeVoted(index, signer, agree);

        return vote;
    }

    function _finalizeDispute(
        uint256 index,
        bool sideAWins,
        uint256 ratioValue
    ) internal returns (bool) {
        Dispute storage dispute = disputes[index];
        require(dispute.voteCount == dispute.arbiters.size(), "Votes not completed");

        require(dispute.state == State.Open, "dispute is closed");

        dispute.tokenValue = dispute.usdValue * ratioValue;

        dispute.winner = sideAWins ? PARTIES.A : PARTIES.B;

        dispute.state = State.Closed;

        if(!dispute.hasClaim)
            dispute.claimed = true;

        emit DisputeClosed(
            index,
            dispute.usdValue,
            dispute.tokenValue,
            ratioValue,
            dispute.support,
            dispute.against,
            dispute.winner
        );

        return true;
    }

    function _getSignerAddress(uint256 id, string memory _msg, bytes memory _sig)
        internal
        pure
        returns (address, bool)
    {
        bytes32 voteA = keccak256(abi.encodePacked(id.toString(),"A"));
        bytes32 voteB = keccak256(abi.encodePacked(id.toString(),"B"));

        bytes32 hashMsg = keccak256(bytes(_msg));

        if (hashMsg == voteA || hashMsg == voteB) {
            return (
                hashMsg.toEthSignedMessageHash().recover(_sig),
                hashMsg == voteA
            );
        }
        return (address(0), true);
    }

    // PUBLIC AND EXTERNAL FUNCTIONS

    function toggleHasClaim(uint disputeIndex) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender) || hasRole(SERVER_ROLE, msg.sender), "Only Admin or Server Allowed");

        Dispute storage dispute = disputes[disputeIndex];
        dispute.hasClaim = !dispute.hasClaim;
    }

    function createDisputeByServer(
        address _sideA,
        address _sideB,
        bool _hasClaim,
        address _nftAddr,
        uint256 txID,
        uint256 usdValue,
        address[] memory _arbiters
    ) external onlyRole(SERVER_ROLE) returns (bool) {
        return _createDispute(_sideA, _sideB, _hasClaim, _nftAddr, txID, usdValue, _arbiters);
    }

    function castVote(uint256 index, bool _agree) external returns (bool) {
        Dispute storage dispute = disputes[index];

        require(dispute.state == State.Open, "dispute is closed");
        require(dispute.arbiters.contains(msg.sender), "Not an arbiter");
        require(!dispute.arbiters.get(msg.sender).voted, "Already Voted");

        IterableArbiters.UserVote memory vote = _castVote(index, msg.sender, _agree);

        dispute.voteCount += 1;
        dispute.support += _agree ? 1 : 0;
        dispute.against += _agree ? 0 : 1;

        dispute.arbiters.set(msg.sender, vote);

        return true;
    }

    function cancelDispute(uint256 index) external onlyRole(SERVER_ROLE){
        Dispute storage dispute = disputes[index];

        require(dispute.state == State.Open, "dispute is closed");
        dispute.state = State.Canceled;

        emit DisputeCancelled(index);
    }

    function castVotesWithSignatures(
        uint256 index,
        bytes[] memory _sigs,
        string[] memory _msgs
    ) external onlyRole(SERVER_ROLE) returns (bool) {
        Dispute storage dispute = disputes[index];

        require(_sigs.length == _msgs.length, "sigs and msg != same length");
        require(dispute.state == State.Open, "dispute is closed");

        for (uint256 i = 0; i < _sigs.length; i++) {
            (address signer, bool agree) = _getSignerAddress(
                index,
                _msgs[i],
                _sigs[i]
            );

            if (!dispute.arbiters.contains(signer)) {
                continue;
            }
            require(!dispute.arbiters.get(signer).voted, "Already Voted");

            IterableArbiters.UserVote memory vote = _castVote(index, signer, agree);

            dispute.voteCount += 1;
            dispute.support += agree ? 1 : 0;
            dispute.against += agree ? 0 : 1;

            dispute.arbiters.set(signer, vote);

        }

        return true;
    }

    function finalizeDispute(
        uint256 index,
        bool vote,
        uint256 ratio // tokens per dollar
    ) external onlyRole(SERVER_ROLE) returns (bool) {
        return _finalizeDispute(index, vote, ratio);
    }

    function addArbiter(uint256 index, address _arbiter)
        external
        onlyRole(SERVER_ROLE)
    {
        Dispute storage _dispute = disputes[index];

        require(!_dispute.arbiters.contains(_arbiter), "Already an Arbiter");
        require(_dispute.state == State.Open, "dispute is closed");

        _dispute.arbiters.set(_arbiter, IterableArbiters.UserVote(_arbiter, false, false));
    }

    function removeArbiter(uint256 index, address _arbiter)
        external
        onlyRole(SERVER_ROLE)
    {
        Dispute storage _dispute = disputes[index];
        
        require(_dispute.arbiters.contains(_arbiter), "Not an arbiter");
        require(_dispute.state == State.Open, "dispute is closed");


        IterableArbiters.UserVote memory vote = _dispute.arbiters.get(_arbiter);

        if (vote.voted) {
            _dispute.support -= vote.agree ? 1 : 0;
            _dispute.against -= vote.agree ? 0 : 1;
            _dispute.voteCount -= 1;
        }
        _dispute.arbiters.remove(_arbiter);
    }

    function updateSideA(uint256 disputeId, address _sideA)
        external
        onlyRole(SERVER_ROLE)
    {
        Dispute storage _dispute = disputes[disputeId];
        _dispute.sideA = _sideA;
    }

    function updateSideB(uint256 disputeId, address _sideB)
        external
        onlyRole(SERVER_ROLE)
    {
        Dispute storage _dispute = disputes[disputeId];
        _dispute.sideB = _sideB;
    }

    function claim(uint256 index) external returns (bool) {
        Dispute storage _dispute = disputes[index];
        require(_dispute.state == State.Closed, "dispute is not closed");
        require(_dispute.claimed != true, "Already Claimed");

        if (_dispute.winner == PARTIES.A) {
            require(
                hasRole(SERVER_ROLE, msg.sender) ||
                    msg.sender == _dispute.sideA,
                "Only SideA or Server can claim"
            );
        } else {
            require(
                hasRole(SERVER_ROLE, msg.sender) ||
                    msg.sender == _dispute.sideB,
                "Only SideB or Server can claim"
            );
        }

        _dispute.claimed = true;

        // @TODO USE TRANSFER FROM HERE
        require(
            lpy.transfer(msg.sender, _dispute.tokenValue),
            "CLAIM:: transfer failed"
        );

        emit DisputeFundClaimed(_dispute.disputeID, _dispute.tokenValue, msg.sender);

        return true;
    }

    // READ ONLY FUNCTIONS
    function serializeDispute(uint index) internal view returns (DisputeView memory) {
        Dispute storage _dispute = disputes[index];

        return DisputeView(
            _dispute.disputeID,
            _dispute._nft,
            _dispute.usdValue,
            _dispute.tokenValue,
            _dispute.sideA,
            _dispute.sideB,
            _dispute.hasClaim,
            _dispute.voteCount,
            _dispute.support,
            _dispute.against,
            _dispute.arbiters.asArray(),
            _dispute.claimed,
            _dispute.winner,
            _dispute.state
        );
    }

    function getDisputeByIndex(uint256 index)
        external
        view
        returns (DisputeView memory _dispute)
    {
        _dispute = serializeDispute(index);
    }

    function getSideAOpenDisputes(address _user)
        public
        view
        returns (DisputeView[] memory)
    {
        uint256 count;
        for (uint256 i = 0; i < disputeIndexesAsSideA[_user].length; i++) {
            uint256 index = disputeIndexesAsSideA[_user][i];
            DisputeView memory dispute = serializeDispute(index);
            if (dispute.state == State.Open) {
                count++;
            }
        }

        DisputeView[] memory _disputes = new DisputeView[](count);

        uint256 outterIndex;
        for (uint256 i = 0; i < disputeIndexesAsSideA[_user].length; i++) {
            uint256 index = disputeIndexesAsSideA[_user][i];
            DisputeView memory dispute = serializeDispute(index);
            if (dispute.state == State.Open) {
                _disputes[outterIndex] = dispute;
                outterIndex++;
            }
        }

        return _disputes;
    }

    function getSideAClosedDisputes(address _user)
        public
        view
        returns (DisputeView[] memory)
    {
        uint256 count;
        for (uint256 i = 0; i < disputeIndexesAsSideA[_user].length; i++) {
            uint256 index = disputeIndexesAsSideA[_user][i];
            DisputeView memory dispute = serializeDispute(index);
            if (dispute.state == State.Closed) {
                count++;
            }
        }

        DisputeView[] memory _disputes = new DisputeView[](count);

        uint256 outterIndex;
        for (uint256 i = 0; i < disputeIndexesAsSideA[_user].length; i++) {
            uint256 index = disputeIndexesAsSideA[_user][i];
            DisputeView memory dispute = serializeDispute(index);
            if (dispute.state == State.Closed) {
                _disputes[outterIndex] = dispute;
                outterIndex++;
            }
        }

        return _disputes;
    }

    function getSideBOpenDisputes(address _user)
        public
        view
        returns (DisputeView[] memory)
    {
        uint256 count;
        for (uint256 i = 0; i < disputeIndexesAsSideB[_user].length; i++) {
            uint256 index = disputeIndexesAsSideB[_user][i];
            DisputeView memory dispute = serializeDispute(index);
            if (dispute.state == State.Open) {
                count++;
            }
        }

        DisputeView[] memory _disputes = new DisputeView[](count);

        uint256 outterIndex;
        for (uint256 i = 0; i < disputeIndexesAsSideB[_user].length; i++) {
            uint256 index = disputeIndexesAsSideB[_user][i];
            DisputeView memory dispute = serializeDispute(index);
            if (dispute.state == State.Open) {
                _disputes[outterIndex] = dispute;
                outterIndex++;
            }
        }

        return _disputes;
    }

    function getSideBClosedDisputes(address _user)
        public
        view
        returns (DisputeView[] memory)
    {
        uint256 count;
        for (uint256 i = 0; i < disputeIndexesAsSideB[_user].length; i++) {
            uint256 index = disputeIndexesAsSideB[_user][i];
            DisputeView memory dispute = serializeDispute(index);
            if (dispute.state == State.Closed) {
                count++;
            }
        }

        DisputeView[] memory _disputes = new DisputeView[](count);

        uint256 outterIndex;
        for (uint256 i = 0; i < disputeIndexesAsSideB[_user].length; i++) {
            uint256 index = disputeIndexesAsSideB[_user][i];
            DisputeView memory dispute = serializeDispute(index);
            if (dispute.state == State.Closed) {
                _disputes[outterIndex] = dispute;
                outterIndex++;
            }
        }

        return _disputes;
    }

    function getAllDisputes()
        external
        view
        returns (DisputeView[] memory)
    {
        uint256 count = numOfdisputes;
        DisputeView[] memory _disputes = new DisputeView[](count);

        for (uint256 i = 0; i < numOfdisputes; i++) {
            DisputeView memory dispute = serializeDispute(i);
            _disputes[i] = dispute;
        }

        return _disputes;
    }

    function getMyOpenDisputesAsSideA()
        external
        view
        returns (DisputeView[] memory _disputes)
    {
        _disputes = getSideAOpenDisputes(msg.sender);
    }

    function getMyClosedDisputesAsSideA()
        external
        view
        returns (DisputeView[] memory _disputes)
    {
        _disputes = getSideAClosedDisputes(msg.sender);
    }

    function getMyOpenDisputesAsSideB()
        external
        view
        returns (DisputeView[] memory _disputes)
    {
        _disputes = getSideBOpenDisputes(msg.sender);
    }

    function getMyClosedDisputesAsSideB()
        external
        view
        returns (DisputeView[] memory _disputes)
    {
        _disputes = getSideBClosedDisputes(msg.sender);
    }
}
