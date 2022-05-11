// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Create a Dispute smart contract
contract DisputeContract is Ownable {
    using ECDSA for bytes32;

    enum State {
        Open,
        Closed
    }
    struct UserVote {
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
    mapping(uint256 => mapping(address => bool)) private isArbiter;
    mapping(uint256 => mapping(address => UserVote)) private userVote;
    IERC20 private lpy;

    constructor(IERC20 _lpy) {
        lpy = _lpy;
    }

    function getSignerAddress(bytes32 _msg, bytes memory _sig)
        internal
        pure
        returns (address)
    {
        return _msg.recover(_sig);
    }

    function createDispute(
        address _customer,
        address _merchant,
        uint256 txID,
        address[] memory _arbiters
    ) external returns (bool) {
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

    function castVote(uint256 index, bool _agree) external returns (bool) {
        Dispute storage dispute = disputes[index];
        UserVote storage vote = userVote[index][msg.sender];

        require(dispute.state == State.Open, "dispute is closed");
        require(isArbiter[index][msg.sender], "not allowed to vote");
        require(!userVote[index][msg.sender].voted, "already voted");

        vote.agree = _agree;
        vote.voted = true;

        dispute.voteCount += 1;
        dispute.support += _agree ? 1 : 0;
        dispute.against += _agree ? 0 : 1;

        return true;
    }

    function castVotesWithSignatures(
        uint256 index,
        bytes[] memory _sigs,
        bytes32[] memory _msgs,
        bool[] memory _agree
    ) external returns (bool) {
        Dispute storage dispute = disputes[index];
        require(_sigs.length == _agree.length, "sigs and agree != same length");
        require(dispute.state == State.Open, "dispute is closed");

        for (uint256 i = 0; i < _sigs.length; i++) {
            address signer = getSignerAddress(_msgs[i], _sigs[i]);

            if (!isArbiter[index][signer]) {
                continue;
            }
            if (userVote[index][signer].voted) {
                continue;
            }
            // require(isArbiter[index][signer], "not allowed to vote");
            // require(!userVote[index][signer].voted, "already voted");

            UserVote storage vote = userVote[index][signer];

            vote.agree = _agree[i];
            vote.voted = true;

            dispute.voteCount += 1;
            dispute.support += _agree[i] ? 1 : 0;
            dispute.against += _agree[i] ? 0 : 1;
        }

        return true;
    }

    function closeDispute(
        uint256 index,
        bool inFavor,
        uint256 tokenAmount
    ) external returns (bool) {
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
}
