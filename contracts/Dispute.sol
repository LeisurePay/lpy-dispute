// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Create a Dispute smart contract
contract DisputeContract is AccessControlEnumerable {
    using ECDSA for bytes32;

    enum State {
        Open,
        Closed
    }
    struct UserVote {
        address voter;
        bool agree;
        bool voted;
    }
    struct Dispute {
        uint256 nftId;
        address customer;
        address merchant;
        uint256 voteCount;
        uint256 support;
        uint256 against;
        address[] arbiters;
        State state;
    }

    Dispute[] private disputes;
    mapping(uint256 => mapping(address => bool)) public isArbiter;
    mapping(uint256 => mapping(address => UserVote)) public userVote;
    IERC20 private lpy;
    bool public isAuto;

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

    // INTERNAL FUNCTIONS
    function _createDispute(
        address _customer,
        address _merchant,
        uint256 txID,
        address[] memory _arbiters
    ) internal returns (bool) {
        require(_customer != _merchant, "custmer == merchant");

        Dispute memory dispute;

        dispute.nftId = txID;
        dispute.customer = _customer;
        dispute.merchant = _merchant;
        dispute.voteCount = 0;
        dispute.support = 0;
        dispute.against = 0;
        dispute.arbiters = _arbiters;
        for (uint256 i = 0; i < _arbiters.length; i++) {
            isArbiter[disputes.length][_arbiters[i]] = true;
        }
        dispute.state = State.Open;

        disputes.push(dispute);

        return true;
    }

    function _finalizeDispute(
        uint256 index,
        bool inFavor,
        uint256 tokenAmount
    ) internal returns (bool) {
        Dispute storage dispute = disputes[index];
        require(dispute.state == State.Open, "dispute is closed");

        bool customerWins = dispute.support > dispute.against;

        if ((!customerWins && inFavor) || (customerWins && !inFavor)) {
            require(
                lpy.transfer(dispute.merchant, tokenAmount),
                "transfer failed"
            );
        }

        dispute.state = State.Closed;

        return true;
    }

    function _getSignerAddress(string memory _msg, bytes memory _sig)
        internal
        pure
        returns (address)
    {
        return keccak256(bytes(_msg)).recover(_sig);
    }

    // PUBLIC AND EXTERNAL FUNCTIONS

    function toggleAuto() external onlyRole(DEFAULT_ADMIN_ROLE) {
        isAuto = !isAuto;
    }

    function createDispute(
        address _customer,
        address _merchant,
        uint256 txID,
        address[] memory _arbiters
    ) external onlyRole(SERVER_ROLE) returns (bool) {
        return _createDispute(_customer, _merchant, txID, _arbiters);
    }

    function createDispute(
        address _merchant,
        uint256 txID,
        address[] memory _arbiters
    ) external returns (bool) {
        return _createDispute(msg.sender, _merchant, txID, _arbiters);
    }

    function castVote(uint256 index, bool _agree) external returns (bool) {
        Dispute storage dispute = disputes[index];
        UserVote memory vote = userVote[index][msg.sender];

        require(dispute.state == State.Open, "dispute is closed");
        require(isArbiter[index][msg.sender], "not allowed to vote");
        require(!userVote[index][msg.sender].voted, "already voted");

        vote.voter = msg.sender;
        vote.agree = _agree;
        vote.voted = true;

        dispute.voteCount += 1;
        dispute.support += _agree ? 1 : 0;
        dispute.against += _agree ? 0 : 1;

        userVote[index][msg.sender] = vote;

        if (dispute.voteCount == dispute.arbiters.length && isAuto) {
            // @TODO Figure out how to pass in the funds on createDispute so as to use a fixed value here
            _finalizeDispute(index, true, 0);
        }

        return true;
    }

    function castVotesWithSignatures(
        uint256 index,
        bytes[] memory _sigs,
        string[] memory _msgs,
        bool[] memory _agree
    ) external onlyRole(SERVER_ROLE) returns (bool) {
        Dispute storage dispute = disputes[index];
        require(_sigs.length == _agree.length, "sigs and agree != same length");
        require(dispute.state == State.Open, "dispute is closed");

        for (uint256 i = 0; i < _sigs.length; i++) {
            address signer = _getSignerAddress(_msgs[i], _sigs[i]);

            if (!isArbiter[index][signer]) {}
            if (userVote[index][signer].voted) {}

            UserVote memory vote = userVote[index][signer];

            vote.voter = msg.sender;
            vote.agree = _agree[i];
            vote.voted = true;

            dispute.voteCount += 1;
            dispute.support += _agree[i] ? 1 : 0;
            dispute.against += _agree[i] ? 0 : 1;
            userVote[index][msg.sender] = vote;
        }

        return true;
    }

    function finalizeDispute(
        uint256 index,
        bool inFavor,
        uint256 tokenAmount
    ) external onlyRole(SERVER_ROLE) returns (bool) {
        Dispute storage dispute = disputes[index];
        require(dispute.state == State.Open, "dispute is closed");

        bool customerWins = dispute.support > dispute.against;

        if ((!customerWins && inFavor) || (customerWins && !inFavor)) {
            require(
                lpy.transfer(dispute.merchant, tokenAmount),
                "transfer failed"
            );
        }

        dispute.state = State.Closed;

        return true;
    }

    // READ ONLY FUNCTIONS

    function fetchVotes(uint256 index)
        public
        view
        returns (UserVote[] memory _votes)
    {
        Dispute memory dispute = disputes[index];
        uint256 count;
        for (uint256 i = 0; i < dispute.arbiters.length; i++) {
            UserVote memory _userVote = userVote[index][dispute.arbiters[i]];

            if (_userVote.voted) {
                _votes[count] = _userVote;
                count++;
            }
        }
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
        returns (Dispute[] memory _disputes)
    {
        uint256 index;
        for (uint256 i = 0; i < disputes.length; i++) {
            if (
                disputes[i].customer == _user && disputes[i].state == State.Open
            ) {
                _disputes[index] = disputes[i];
                index++;
            }
        }
    }

    function getCustomerClosedDisputes(address _user)
        public
        view
        returns (Dispute[] memory _disputes)
    {
        uint256 index;
        for (uint256 i = 0; i < disputes.length; i++) {
            if (
                disputes[i].customer == _user &&
                disputes[i].state == State.Closed
            ) {
                _disputes[index] = disputes[i];
                index++;
            }
        }
    }

    function getMerchantOpenDisputes(address _user)
        public
        view
        returns (Dispute[] memory _disputes)
    {
        uint256 index;
        for (uint256 i = 0; i < disputes.length; i++) {
            if (
                disputes[i].merchant == _user && disputes[i].state == State.Open
            ) {
                _disputes[index] = disputes[i];
                index++;
            }
        }
    }

    function getMerchantClosedDisputes(address _user)
        public
        view
        returns (Dispute[] memory _disputes)
    {
        uint256 index;
        for (uint256 i = 0; i < disputes.length; i++) {
            if (
                disputes[i].merchant == _user &&
                disputes[i].state == State.Closed
            ) {
                _disputes[index] = disputes[i];
                index++;
            }
        }
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
