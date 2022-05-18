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
    struct UserVote {
        address voter;
        bool agree;
        bool voted;
    }
    struct Dispute {
        uint256 nftId;
        uint256 amount;
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
    mapping(address => uint256[]) public myCustomerDisputeIndexes;
    mapping(address => uint256[]) public myMerchantDisputeIndexes;
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
        uint256 amount,
        address indexed customer,
        address indexed merchant,
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
        uint256 amount
    );

    // INTERNAL FUNCTIONS
    function _createDispute(
        address _customer,
        address _merchant,
        uint256 txID,
        uint256 amount,
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
        dispute.amount = amount;

        myCustomerDisputeIndexes[_customer].push(disputes.length);
        myMerchantDisputeIndexes[_merchant].push(disputes.length);

        emit DisputeCreated(
            disputes.length,
            txID,
            amount,
            _customer,
            _merchant,
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
        UserVote memory vote = userVote[index][signer];

        vote.voter = signer;
        vote.agree = agree;
        vote.voted = true;
        emit DisputeVoted(index, signer, agree);
        return vote;
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

        emit DisputeClosed(index, customerWins, inFavor, tokenAmount);

        return true;
    }

    function _getSignerAddress(string memory _msg, bytes memory _sig)
        internal
        pure
        returns (address, bool)
    {
        bytes32 hashMsg = keccak256(bytes(_msg));

        if (hashMsg == VOTE_A || hashMsg == VOTE_B) {
            return (hashMsg.recover(_sig), hashMsg == VOTE_A);
        }
        return (address(0), true);
    }

    // PUBLIC AND EXTERNAL FUNCTIONS

    function toggleAuto() external onlyRole(DEFAULT_ADMIN_ROLE) {
        isAuto = !isAuto;
    }

    function createDisputeByServer(
        address _customer,
        address _merchant,
        uint256 txID,
        uint256 amount,
        address[] memory _arbiters
    ) external onlyRole(SERVER_ROLE) returns (bool) {
        return _createDispute(_customer, _merchant, txID, amount, _arbiters);
    }

    // function createDispute(
    //     address _merchant,
    //     uint256 txID,
    //     address[] memory _arbiters
    // ) external returns (bool) {
    //     return _createDispute(msg.sender, _merchant, txID, _arbiters);
    // }

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

        // if (dispute.voteCount == dispute.arbiters.length && isAuto) {
        //     // @TODO Figure out how to pass in the funds on createDispute so as to use a fixed value here
        //     _finalizeDispute(index, true, 0);
        // }

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
            userVote[index][msg.sender] = vote;
        }

        return true;
    }

    function finalizeDispute(
        uint256 index,
        bool inFavor,
        uint256 rate
    ) external onlyRole(SERVER_ROLE) returns (bool) {
        uint256 tokenAmount = disputes[index].amount / rate;

        return _finalizeDispute(index, inFavor, tokenAmount);
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
        for (uint256 i = 0; i < myCustomerDisputeIndexes[_user].length; i++) {
            uint256 index = myCustomerDisputeIndexes[_user][i];
            Dispute memory dispute = getDisputeByIndex(index);
            if (dispute.state == State.Open) {
                count++;
            }
        }

        Dispute[] memory _disputes = new Dispute[](count);

        uint256 outterIndex;
        for (uint256 i = 0; i < myCustomerDisputeIndexes[_user].length; i++) {
            uint256 index = myCustomerDisputeIndexes[_user][i];
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
        for (uint256 i = 0; i < myCustomerDisputeIndexes[_user].length; i++) {
            uint256 index = myCustomerDisputeIndexes[_user][i];
            Dispute memory dispute = getDisputeByIndex(index);
            if (dispute.state == State.Closed) {
                count++;
            }
        }

        Dispute[] memory _disputes = new Dispute[](count);

        uint256 outterIndex;
        for (uint256 i = 0; i < myCustomerDisputeIndexes[_user].length; i++) {
            uint256 index = myCustomerDisputeIndexes[_user][i];
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
        for (uint256 i = 0; i < myMerchantDisputeIndexes[_user].length; i++) {
            uint256 index = myMerchantDisputeIndexes[_user][i];
            Dispute memory dispute = getDisputeByIndex(index);
            if (dispute.state == State.Open) {
                count++;
            }
        }

        Dispute[] memory _disputes = new Dispute[](count);

        uint256 outterIndex;
        for (uint256 i = 0; i < myMerchantDisputeIndexes[_user].length; i++) {
            uint256 index = myMerchantDisputeIndexes[_user][i];
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
        for (uint256 i = 0; i < myMerchantDisputeIndexes[_user].length; i++) {
            uint256 index = myMerchantDisputeIndexes[_user][i];
            Dispute memory dispute = getDisputeByIndex(index);
            if (dispute.state == State.Closed) {
                count++;
            }
        }

        Dispute[] memory _disputes = new Dispute[](count);

        uint256 outterIndex;
        for (uint256 i = 0; i < myMerchantDisputeIndexes[_user].length; i++) {
            uint256 index = myMerchantDisputeIndexes[_user][i];
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
