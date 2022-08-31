const { ethers } = require("hardhat");
const { expect } = require("chai");
const { constants } = require("ethers");

describe("Scenario Flow", () => {
  let dispute;
  let mock;
  let erc721;
  let first = true;
  let [
    deployer,
    server,
    customer,
    merchant,
    arbiter1,
    arbiter2,
    arbiter3,
    arbiter4,
  ] = Array(8).fill(null);
  const votes = [{}];
  const votes2 = [{}];
  const CHOICES = ["A", "B"];

  const wei = ethers.utils.parseEther;

  const makeChoice = (disputeIndex) => {
    const choice = CHOICES[Math.floor(Math.random() * CHOICES.length)];
    return `${disputeIndex}${choice}`;
  };

  beforeEach(async () => {
    if (!first) return;
    [
      deployer,
      server,
      customer,
      merchant,
      arbiter1,
      arbiter2,
      arbiter3,
      arbiter4,
    ] = await ethers.getSigners();

    const ERC20 = await ethers.getContractFactory("MockERC20");
    const ERC721 = await ethers.getContractFactory("MockERC721");
    const IARB = await ethers.getContractFactory("IterableArbiters");

    erc721 = await ERC721.deploy("https://based.com/");
    await erc721.safeMint(deployer.address, "");
    await erc721.safeMint(deployer.address, "");
    mock = await ERC20.deploy();

    const args = [mock.address, server.address];
    const DISPUTE = await ethers.getContractFactory("DisputeContract", {
      libraries: {
        IterableArbiters: (await IARB.deploy()).address,
      },
    });
    dispute = await DISPUTE.deploy(...args);

    first = false;
  });

  it("Server Creates Dispute (Duplicate Arbiters) [FAIL]", async () => {
    let disputes = await dispute.getAllDisputes();
    expect(disputes.length).to.eq(0);

    await expect(
      dispute.connect(server).createDisputeByServer(customer.address, merchant.address, false, erc721.address, 1, 20, [
        arbiter1.address,
        arbiter1.address
      ])).to.be.revertedWith("Duplicate Keys");

    disputes = await dispute.getAllDisputes();

    expect(disputes.length).to.eq(0);
  });

  it("Server Creates Dispute (Non Existing NFT) [FAIL]", async () => {
    let disputes = await dispute.getAllDisputes();
    expect(disputes.length).to.eq(0);

    await expect(
      dispute.connect(server).createDisputeByServer(customer.address, merchant.address, false, erc721.address, 110, 20, [
        arbiter1.address,
      ])).to.be.revertedWith("ERC721URIStorage: URI query for nonexistent token")

    disputes = await dispute.getAllDisputes();

    expect(disputes.length).to.eq(0);
  });

  it("Server Creates Dispute [SUCCESS]", async () => {
    let disputes = await dispute.getAllDisputes();
    expect(disputes.length).to.eq(0);

    await (
      await dispute
        .connect(server)
        .createDisputeByServer(customer.address, merchant.address, false, erc721.address, 1, 20, [
          arbiter1.address,
          arbiter2.address,
          arbiter3.address,
        ])
    ).wait(1);

    // Initialize dispute index 1 with true value for hasClaim field
    await (
      await dispute
        .connect(server)
        .createDisputeByServer(customer.address, merchant.address, true, erc721.address, 1, 20, [
          arbiter1.address,
          arbiter2.address,
          arbiter3.address,
        ])
    ).wait(1);

    disputes = await dispute.getAllDisputes();

    expect(disputes.length).to.eq(2);
  });

  it("Non Arbiter tries to call castVote Function [FAIL]", async () => {
    const disputeIndex = 0;

    await expect(
      dispute.connect(arbiter4).castVote(disputeIndex, true)
    ).to.be.revertedWith(`Not an arbiter`);
  });

  it("3 Arbiters call castVote Function [SUCCESS]", async () => {
    const disputeIndex = 0;

    await (await dispute.connect(arbiter1).castVote(disputeIndex, true)).wait(1);

    await (await dispute.connect(arbiter2).castVote(disputeIndex, true)).wait(1);

    await (await dispute.connect(arbiter3).castVote(disputeIndex, false)).wait(1);

    const details = await dispute.getDisputeByIndex(disputeIndex);

    let iVotes = 0;
    for (let i = 0; i < details.arbiters.length; i++) {
      const element = details.arbiters[i];
      iVotes += element.voted ? 1 : 0;
    }

    expect(iVotes).to.eq(3);
    expect(details.voteCount).to.eq(3);
    expect(iVotes).to.eq(details.voteCount);
  });

  it("Arbiter1 Already Voted but tries to vote again [FAIL]", async () => {
    const disputeIndex = 0;
    await expect(
      dispute.connect(arbiter1).castVote(disputeIndex, true)
    ).to.be.revertedWith(`Already Voted`);
  });

  it("Server removes Arbiter1 from arbiters Array [vote count should reduce] [SUCCESS]", async () => {
    let _dispute = await dispute.getDisputeByIndex(0);
    let voteCount = _dispute.voteCount;

    expect(_dispute.arbiters.length).to.eq(3);
    expect(voteCount).to.eq(3);

    await expect(dispute.connect(server).removeArbiter(0, arbiter1.address))
      .to.emit(dispute, "ArbiterRemoved")
      .withArgs(_dispute.disputeIndex, arbiter1.address);

    _dispute = await dispute.getDisputeByIndex(0);
    voteCount = _dispute.voteCount;

    expect(_dispute.arbiters.length).to.eq(2);
    expect(voteCount).to.eq(2);
  });

  it("Server should add Arbiter 1 and Arbiter 4 [SUCCESS]", async () => {
    let _dispute = await dispute.getDisputeByIndex(0);

    expect(_dispute.arbiters.length).to.eq(2);
    await expect(dispute.connect(server).addArbiter(0, arbiter1.address))
      .to.emit(dispute, "ArbiterAdded")
      .withArgs(_dispute.disputeIndex, arbiter1.address);

    await (
      await dispute.connect(server).addArbiter(0, arbiter4.address)
    ).wait(1);

    _dispute = await dispute.getDisputeByIndex(0);

    expect(_dispute.arbiters.length).to.eq(4);
  });

  it("Arbiter1 and Arbiter4 call castVote Function [SUCCESS]", async () => {
    const disputeIndex = 0;

    await (await dispute.connect(arbiter1).castVote(disputeIndex, true)).wait(1);

    await (await dispute.connect(arbiter4).castVote(disputeIndex, true)).wait(1);

    const details = await dispute.getDisputeByIndex(disputeIndex);

    let iVotes = 0;
    for (let i = 0; i < details.arbiters.length; i++) {
      const element = details.arbiters[i];
      iVotes += element.voted ? 1 : 0;
    }

    expect(details.voteCount).to.eq(4);
    expect(iVotes).to.eq(details.voteCount);
  });

  it("Server removes All Arbiters + votes (vote counts equal 0) [SUCCESS]", async () => {
    let _dispute = await dispute.getDisputeByIndex(0);
    let voteCount = _dispute.voteCount;

    expect(_dispute.arbiters.length).to.eq(4);
    expect(voteCount).to.eq(4);

    await (
      await dispute.connect(server).removeArbiter(0, arbiter1.address)
    ).wait(1);
    await (
      await dispute.connect(server).removeArbiter(0, arbiter2.address)
    ).wait(1);
    await (
      await dispute.connect(server).removeArbiter(0, arbiter3.address)
    ).wait(1);
    await (
      await dispute.connect(server).removeArbiter(0, arbiter4.address)
    ).wait(1);

    _dispute = await dispute.getDisputeByIndex(0);
    voteCount = _dispute.voteCount;

    expect(_dispute.arbiters.length).to.eq(0);
    expect(voteCount).to.eq(0);
  });

  it("Server adds all arbiters (voteCount remains zero)", async () => {
    let _dispute = await dispute.getDisputeByIndex(0);

    expect(_dispute.arbiters.length).to.eq(0);

    await (
      await dispute.connect(server).addArbiter(0, arbiter1.address)
    ).wait(1);
    await (
      await dispute.connect(server).addArbiter(0, arbiter2.address)
    ).wait(1);
    await (
      await dispute.connect(server).addArbiter(0, arbiter3.address)
    ).wait(1);
    await (
      await dispute.connect(server).addArbiter(0, arbiter4.address)
    ).wait(1);

    _dispute = await dispute.getDisputeByIndex(0);
    const voteCount = _dispute.voteCount;

    expect(_dispute.arbiters.length).to.eq(4);
    expect(voteCount).to.eq(0);
  });

  it("Arbiters sign Votes", async () => {
    const signers = [arbiter1, arbiter2, arbiter3, arbiter4];

    for (let i = 0; i < signers.length; i++) {
      const arbiterSigner = signers[i];

      const choice = makeChoice(0);
      const address = arbiterSigner.address;

      const messageHash = ethers.utils.id(choice);
      const messageHashBytes = ethers.utils.arrayify(messageHash);
      const signature = await arbiterSigner.signMessage(messageHashBytes);

      votes[i] = {
        choice,
        address,
        signature,
      };
    }

    for (let i = 0; i < signers.length; i++) {
      const arbiterSigner = signers[i];

      const choice = makeChoice(1);
      const address = arbiterSigner.address;

      const messageHash = ethers.utils.id(choice);
      const messageHashBytes = ethers.utils.arrayify(messageHash);
      const signature = await arbiterSigner.signMessage(messageHashBytes);

      votes2[i] = {
        choice,
        address,
        signature,
      };
    }
  });

  it("Server submits signed votes with duplicates [FAIL] ", async () => {
    const _msgs = [];
    const _sigs = [];

    for (let i = 0; i < votes.length; i++) {
      _msgs.push(votes[i].choice);
      _sigs.push(votes[i].signature);
    }

    _msgs.push(votes[0].choice);
    _sigs.push(votes[0].signature);

    let _dispute = await dispute.getDisputeByIndex(0);
    expect(_dispute.voteCount).to.equal(0);

    await expect(dispute.connect(server).castVotesWithSignatures(0, _sigs, _msgs)).to.be.revertedWith(
      "Already Voted"
    );

    _dispute = await dispute.getDisputeByIndex(0);
    expect(_dispute.voteCount).to.equal(0);
  });

  it("Server submits 2 signed votes without duplicates [SUCCESS] ", async () => {
    const _msgs = [];
    const _sigs = [];

    for (let i = 0; i < 2; i++) {
      _msgs.push(votes[i].choice);
      _sigs.push(votes[i].signature);
    }

    let _dispute = await dispute.getDisputeByIndex(0);
    expect(_dispute.voteCount).to.equal(0);

    await (
      await dispute.connect(server).castVotesWithSignatures(0, _sigs, _msgs)
    ).wait(1);

    // Parallel Dispute which hasClaim would be toggled to true
    const _msgs2 = [];
    const _sigs2 = [];

    for (let i = 0; i < 4; i++) {
      _msgs2.push(votes2[i].choice);
      _sigs2.push(votes2[i].signature);
    }
    await (
      await dispute.connect(server).castVotesWithSignatures(1, _sigs2, _msgs2)
    ).wait(1);

    _dispute = await dispute.getDisputeByIndex(0);
    expect(_dispute.voteCount).to.equal(2);
  });

  it("Server submits all invalid signed votes [FAIL] ", async () => {
    const _msgs = [];
    const _sigs = [];

    for (let i = 2; i < 3; i++) {
      _msgs.push("Yoooo Invalid");
      _sigs.push(votes[i].signature);
    }
    await expect(
      dispute.connect(server).castVotesWithSignatures(0, _sigs, _msgs)
    ).to.be.revertedWith("No votes to cast");
  });

  it("Server submits x valid signed votes but one or more invalid votes [SUCCESS] ", async () => {
    const _msgs = [];
    const _sigs = [];

    for (let i = 2; i < 4; i++) {
      let msg = votes[i].choice;
      if (i === 3) msg = "Yoooo Invalid";
      _msgs.push(msg);
      _sigs.push(votes[i].signature);
    }
    await dispute.connect(server).castVotesWithSignatures(0, _sigs, _msgs)
  });

  it("Server should call finalizeDispute function [FAIL : not all Arbiter voted]", async () => {
    await expect(
      dispute.connect(server).finalizeDispute(0, false, wei("1"))
    ).to.be.revertedWith("Votes not completed");
  });

  it("Server submits last signed vote [SUCCESS] ", async () => {
    const _msgs = [];
    const _sigs = [];

    for (let i = 3; i < 4; i++) {
      _msgs.push(votes[i].choice);
      _sigs.push(votes[i].signature);
    }

    let _dispute = await dispute.getDisputeByIndex(0);
    expect(_dispute.voteCount).to.equal(3);

    await (
      await dispute.connect(server).castVotesWithSignatures(0, _sigs, _msgs)
    ).wait(1);

    _dispute = await dispute.getDisputeByIndex(0);
    expect(_dispute.voteCount).to.equal(4);
  });

  it("Server should call finalizeDispute function [SUCCESS]", async () => {
    await (
      await dispute.connect(server).finalizeDispute(0, false, wei("1"))
    ).wait(1);

    const _dispute = await dispute.getDisputeByIndex(0);

    expect(_dispute.state).to.equal(1); // Closed

    // Dispute Index 1
    await (
      await dispute.connect(server).finalizeDispute(1, false, wei("1"))
    ).wait(1);
  });

  it("CLAIM: should fail if hasClaim was off when finalize was called", async () => {
    await expect(dispute.connect(server).claim(0)).to.be.revertedWith(
      "Already Claimed"
    );
  });

  it("should FAIL to claim if winner side address is changed and winner tries to claim function", async () => {
    const _dispute = await dispute.getDisputeByIndex(1);
    const newSide = constants.AddressZero;
    if (_dispute.winner === 1) {
      await expect(dispute.connect(server).updateSideA(1, newSide))
        .to.emit(dispute, "SideAUpdated")
        .withArgs(1, _dispute.sideA, newSide);
      await expect(dispute.connect(customer).claim(1)).to.be.revertedWith(
        "Only SideA or Server can claim"
      );
      await expect(dispute.connect(server).updateSideA(1, _dispute.sideA))
        .to.emit(dispute, "SideAUpdated")
        .withArgs(1, newSide, _dispute.sideA);
    } else if (_dispute.winner === 2) {
      await expect(dispute.connect(server).updateSideB(1, newSide))
        .to.emit(dispute, "SideBUpdated")
        .withArgs(1, _dispute.sideB, newSide);
      await expect(dispute.connect(merchant).claim(1)).to.be.revertedWith(
        "Only SideB or Server can claim"
      );
      await expect(dispute.connect(server).updateSideB(1, _dispute.sideB))
        .to.emit(dispute, "SideBUpdated")
        .withArgs(1, newSide, _dispute.sideB);
    }

    // Reset the sides back to their prev value
  });

  it("CLAIM: should succeed if hasClaim was on when finalize was called", async () => {
    // Transfer funds to Dispute App
    await mock.connect(deployer).transfer(dispute.address, wei("1000"));

    const _dispute = await dispute.getDisputeByIndex(1);

    let oldBalance = 0;
    let newBalance = 0;

    if (_dispute.winner === 1) {
      oldBalance = await mock.balanceOf(customer.address);
      await expect(dispute.connect(customer).claim(1))
        .to.emit(dispute, "DisputeFundClaimed")
        .withArgs(_dispute.disputeIndex, _dispute.tokenValue, customer.address);
      newBalance = await mock.balanceOf(customer.address);
    } else if (_dispute.winner === 2) {
      oldBalance = await mock.balanceOf(customer.address);
      await expect(dispute.connect(merchant).claim(1))
        .to.emit(dispute, "DisputeFundClaimed")
        .withArgs(_dispute.disputeIndex, _dispute.tokenValue, merchant.address);
      newBalance = await mock.balanceOf(merchant.address);
    }
    expect(+newBalance).to.eq(+oldBalance + +_dispute.tokenValue);
  });
});
