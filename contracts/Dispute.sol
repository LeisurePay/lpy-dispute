// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title LPY Dispute Contract
/// @author Leisure Pay
/// @notice Dispute Contract for the Leisure Pay Ecosystem
/// @dev Dispute Contract for the Leisure Pay Ecosystem
contract DisputeContract is AccessControlEnumerable {
    using ECDSA for bytes32;

    enum State {
        Open,
        Closed
    }

    enum PARTIES {
        NULL,
        A,
        B
    }

    struct UserVote {
        address voter;
        bool agree;
        bool voted;
    }

    struct Dispute {
        uint256 nftId;
        uint256 usdValue;
        uint256 tokenValue;
        address sideA;
        address sideB;
        uint256 voteCount;
        uint256 support;
        uint256 against;
        address[] arbiters;
        bool claimed;
        PARTIES winner;
        State state;
    }

    Dispute[] private disputes;

    mapping(uint256 => mapping(address => bool)) public isArbiter;
    mapping(uint256 => mapping(address => UserVote)) public userVote;
    mapping(address => uint256[]) public disputeIndexesAsSideA;
    mapping(address => uint256[]) public disputeIndexesAsSideB;

    IERC20 private lpy;
    bool public isAuto;

    bytes32 public constant VOTE_A = keccak256(bytes("A"));
    bytes32 public constant VOTE_B = keccak256(bytes("B"));

    // ROLES
    bytes32 public constant SERVER_ROLE = bytes32("SERVER_ROLE");

    // CONSTRUCTOR
    constructor(
        IERC20 _lpy,
        address _server,
        bool _isAuto
    ) {
        lpy = _lpy;

        _grantRole(SERVER_ROLE, _server);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        isAuto = _isAuto;
    }

    // EVENTS
    event DisputeCreated(
        uint256 indexed disputeIndex,
        uint256 nftId,
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
        bool arbitersVote,
        bool finalVote,
        uint256 usdValue,
        uint256 tokenValue,
        uint256 rate,
        PARTIES winner
    );

    event DisputeFundClaimed(
        uint256 indexed disputeIndex,
        uint256 tokenValue,
        address claimer
    );

    // INTERNAL FUNCTIONS
    function _createDispute(
        address _sideA,
        address _sideB,
        uint256 txID,
        uint256 usdValue,
        address[] memory _arbiters
    ) internal returns (bool) {
        require(_sideA != _sideB, "sideA == sideB");

        Dispute memory dispute;

        dispute.nftId = txID;
        dispute.sideA = _sideA;
        dispute.sideB = _sideB;
        dispute.arbiters = _arbiters;
        for (uint256 i = 0; i < _arbiters.length; i++) {
            isArbiter[disputes.length][_arbiters[i]] = true;
        }
        dispute.state = State.Open;
        dispute.usdValue = usdValue;

        disputeIndexesAsSideA[_sideA].push(disputes.length);
        disputeIndexesAsSideB[_sideB].push(disputes.length);

        emit DisputeCreated(
            disputes.length,
            txID,
            usdValue,
            _sideA,
            _sideB,
            _arbiters
        );
        disputes.push(dispute);

        return true;
    }

    // vote on a dispute
    function _castVote(
        uint256 index,
        address signer,
        bool agree
    ) internal returns (UserVote memory) {
        UserVote memory vote = UserVote(signer, agree, true);

        emit DisputeVoted(index, signer, agree);

        return vote;
    }

    function _finalizeDispute(
        uint256 index,
        bool inFavor,
        uint256 ratioValue
    ) internal returns (bool) {
        Dispute storage dispute = disputes[index];

        require(dispute.state == State.Open, "dispute is closed");

        dispute.tokenValue = dispute.usdValue * ratioValue;

        bool sideAWins = dispute.support > dispute.against;

        dispute.winner = sideAWins ? PARTIES.A : PARTIES.B;

        dispute.state = State.Closed;

        emit DisputeClosed(
            index,
            sideAWins,
            inFavor,
            dispute.usdValue,
            dispute.tokenValue,
            ratioValue,
            dispute.winner
        );

        return true;
    }

    function _getSignerAddress(string memory _msg, bytes memory _sig)
        internal
        pure
        returns (address, bool)
    {
        bytes32 hashMsg = keccak256(bytes(_msg));

        if (hashMsg == VOTE_A || hashMsg == VOTE_B) {
            return (
                hashMsg.toEthSignedMessageHash().recover(_sig),
                hashMsg == VOTE_A
            );
        }
        return (address(0), true);
    }

    // PUBLIC AND EXTERNAL FUNCTIONS

    function toggleAuto() external onlyRole(DEFAULT_ADMIN_ROLE) {
        isAuto = !isAuto;
    }

    function createDisputeByServer(
        address _sideA,
        address _sideB,
        uint256 txID,
        uint256 usdValue,
        address[] memory _arbiters
    ) external onlyRole(SERVER_ROLE) returns (bool) {
        return _createDispute(_sideA, _sideB, txID, usdValue, _arbiters);
    }

    function castVote(uint256 index, bool _agree) external returns (bool) {
        Dispute storage dispute = disputes[index];

        require(dispute.state == State.Open, "dispute is closed");
        require(isArbiter[index][msg.sender], "not allowed to vote");
        require(!userVote[index][msg.sender].voted, "already voted");

        UserVote memory vote = _castVote(index, msg.sender, _agree);

        dispute.voteCount += 1;
        dispute.support += _agree ? 1 : 0;
        dispute.against += _agree ? 0 : 1;

        userVote[index][msg.sender] = vote;

        return true;
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
                _msgs[i],
                _sigs[i]
            );

            if (!isArbiter[index][signer]) {
                continue;
            }
            if (userVote[index][signer].voted) {
                continue;
            }

            UserVote memory vote = _castVote(index, signer, agree);

            dispute.voteCount += 1;
            dispute.support += agree ? 1 : 0;
            dispute.against += agree ? 0 : 1;
            userVote[index][signer] = vote;
        }

        return true;
    }

    function finalizeDispute(
        uint256 index,
        bool inFavor,
        uint256 ratio // tokens per dollar
    ) external onlyRole(SERVER_ROLE) returns (bool) {
        return _finalizeDispute(index, inFavor, ratio);
    }

    function addArbiter(uint256 index, address _arbiter)
        external
        onlyRole(SERVER_ROLE)
    {
        Dispute storage _dispute = disputes[index];
        require(!isArbiter[index][_arbiter], "already an arbiter");
        require(_dispute.state == State.Open, "dispute is closed");

        userVote[index][_arbiter] = UserVote(_arbiter, false, false);
        _dispute.arbiters.push(_arbiter);
        isArbiter[index][_arbiter] = true;
    }

    function removeArbiter(uint256 index, address _arbiter)
        external
        onlyRole(SERVER_ROLE)
    {
        Dispute storage _dispute = disputes[index];
        require(isArbiter[index][_arbiter], "not an arbiter");
        require(_dispute.state == State.Open, "dispute is closed");

        uint256 length = _dispute.arbiters.length;
        for (uint256 i = 0; i < length; i++) {
            if (_dispute.arbiters[i] == _arbiter) {
                _dispute.arbiters[i] = _dispute.arbiters[length - 1];
                _dispute.arbiters.pop();

                if (userVote[index][_arbiter].voted) {
                    _dispute.support -= userVote[index][_arbiter].agree ? 1 : 0;
                    _dispute.against -= userVote[index][_arbiter].agree ? 0 : 1;
                    _dispute.voteCount -= 1;
                }
                userVote[index][_arbiter] = UserVote(address(0), false, false);
                break;
            }
        }
        isArbiter[index][_arbiter] = false;
    }

    function claim(uint256 index) external returns (Dispute memory) {
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

        require(
            lpy.transfer(msg.sender, _dispute.tokenValue),
            "CLAIM:: transfer failed"
        );

        return _dispute;
    }

    // READ ONLY FUNCTIONS

    function fetchVotes(uint256 index) public view returns (UserVote[] memory) {
        Dispute memory dispute = disputes[index];
        uint256 count;
        for (uint256 i = 0; i < dispute.arbiters.length; i++) {
            if (userVote[index][dispute.arbiters[i]].voted) {
                count++;
            }
        }

        UserVote[] memory _votes = new UserVote[](count);

        uint256 outterIndex;
        for (uint256 i = 0; i < dispute.arbiters.length; i++) {
            UserVote memory _userVote = userVote[index][dispute.arbiters[i]];

            if (_userVote.voted) {
                _votes[outterIndex] = _userVote;
                outterIndex++;
            }
        }

        return _votes;
    }

    function getDisputeByIndex(uint256 index)
        public
        view
        returns (Dispute memory _dispute)
    {
        _dispute = disputes[index];
    }

    function getCustomerOpenDisputes(address _user)
        public
        view
        returns (Dispute[] memory)
    {
        uint256 count;
        for (uint256 i = 0; i < disputeIndexesAsSideA[_user].length; i++) {
            uint256 index = disputeIndexesAsSideA[_user][i];
            Dispute memory dispute = getDisputeByIndex(index);
            if (dispute.state == State.Open) {
                count++;
            }
        }

        Dispute[] memory _disputes = new Dispute[](count);

        uint256 outterIndex;
        for (uint256 i = 0; i < disputeIndexesAsSideA[_user].length; i++) {
            uint256 index = disputeIndexesAsSideA[_user][i];
            Dispute memory dispute = getDisputeByIndex(index);
            if (dispute.state == State.Open) {
                _disputes[outterIndex] = disputes[i];
                outterIndex++;
            }
        }

        return _disputes;
    }

    function getCustomerClosedDisputes(address _user)
        public
        view
        returns (Dispute[] memory)
    {
        uint256 count;
        for (uint256 i = 0; i < disputeIndexesAsSideA[_user].length; i++) {
            uint256 index = disputeIndexesAsSideA[_user][i];
            Dispute memory dispute = getDisputeByIndex(index);
            if (dispute.state == State.Closed) {
                count++;
            }
        }

        Dispute[] memory _disputes = new Dispute[](count);

        uint256 outterIndex;
        for (uint256 i = 0; i < disputeIndexesAsSideA[_user].length; i++) {
            uint256 index = disputeIndexesAsSideA[_user][i];
            Dispute memory dispute = getDisputeByIndex(index);
            if (dispute.state == State.Closed) {
                _disputes[outterIndex] = disputes[i];
                outterIndex++;
            }
        }

        return _disputes;
    }

    function getMerchantOpenDisputes(address _user)
        public
        view
        returns (Dispute[] memory)
    {
        uint256 count;
        for (uint256 i = 0; i < disputeIndexesAsSideB[_user].length; i++) {
            uint256 index = disputeIndexesAsSideB[_user][i];
            Dispute memory dispute = getDisputeByIndex(index);
            if (dispute.state == State.Open) {
                count++;
            }
        }

        Dispute[] memory _disputes = new Dispute[](count);

        uint256 outterIndex;
        for (uint256 i = 0; i < disputeIndexesAsSideB[_user].length; i++) {
            uint256 index = disputeIndexesAsSideB[_user][i];
            Dispute memory dispute = getDisputeByIndex(index);
            if (dispute.state == State.Open) {
                _disputes[outterIndex] = disputes[i];
                outterIndex++;
            }
        }

        return _disputes;
    }

    function getMerchantClosedDisputes(address _user)
        public
        view
        returns (Dispute[] memory)
    {
        uint256 count;
        for (uint256 i = 0; i < disputeIndexesAsSideB[_user].length; i++) {
            uint256 index = disputeIndexesAsSideB[_user][i];
            Dispute memory dispute = getDisputeByIndex(index);
            if (dispute.state == State.Closed) {
                count++;
            }
        }

        Dispute[] memory _disputes = new Dispute[](count);

        uint256 outterIndex;
        for (uint256 i = 0; i < disputeIndexesAsSideB[_user].length; i++) {
            uint256 index = disputeIndexesAsSideB[_user][i];
            Dispute memory dispute = getDisputeByIndex(index);
            if (dispute.state == State.Closed) {
                _disputes[outterIndex] = disputes[i];
                outterIndex++;
            }
        }

        return _disputes;
    }

    function getAllDisputes()
        external
        view
        returns (Dispute[] memory _disputes)
    {
        _disputes = disputes;
    }

    function getMyOpenDisputesAsCustomer()
        external
        view
        returns (Dispute[] memory _disputes)
    {
        _disputes = getCustomerOpenDisputes(msg.sender);
    }

    function getMyClosedDisputesAsCustomer()
        external
        view
        returns (Dispute[] memory _disputes)
    {
        _disputes = getCustomerClosedDisputes(msg.sender);
    }

    function getMyOpenDisputesAsMerchant()
        external
        view
        returns (Dispute[] memory _disputes)
    {
        _disputes = getMerchantOpenDisputes(msg.sender);
    }

    function getMyClosedDisputesAsMerchant()
        external
        view
        returns (Dispute[] memory _disputes)
    {
        _disputes = getMerchantClosedDisputes(msg.sender);
    }
}
