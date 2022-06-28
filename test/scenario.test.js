const { ethers } = require("hardhat");
const { expect } = require("chai");

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

  const makeChoice = (index) => {
    const choice = CHOICES[Math.floor(Math.random() * CHOICES.length)];
    return `${index}${choice}`;
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
    const index = 0;

    await expect(
      dispute.connect(arbiter4).castVote(index, true)
    ).to.be.revertedWith(`Not an arbiter`);
  });

  it("3 Arbiters call castVote Function [SUCCESS]", async () => {
    const index = 0;

    await (await dispute.connect(arbiter1).castVote(index, true)).wait(1);

    await (await dispute.connect(arbiter2).castVote(index, true)).wait(1);

    await (await dispute.connect(arbiter3).castVote(index, false)).wait(1);


    const details = await dispute.getDisputeByIndex(index);

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
    const index = 0;
    await expect(
      dispute.connect(arbiter1).castVote(index, true)
    ).to.be.revertedWith(`Already Voted`);
  });

  it("Server removes Arbiter1 from arbiters Array [vote count should reduce] [SUCCESS]", async () => {
    let _dispute = await dispute.getDisputeByIndex(0);
    let voteCount = _dispute.voteCount;

    expect(_dispute.arbiters.length).to.eq(3);
    expect(voteCount).to.eq(3);

    await (
      await dispute.connect(server).removeArbiter(0, arbiter1.address)
    ).wait(1);

    _dispute = await dispute.getDisputeByIndex(0);
    voteCount = _dispute.voteCount;

    expect(_dispute.arbiters.length).to.eq(2);
    expect(voteCount).to.eq(2);
  });

  it("Server should add Arbiter 1 and Arbiter 4 [SUCCESS]", async () => {
    let _dispute = await dispute.getDisputeByIndex(0);

    expect(_dispute.arbiters.length).to.eq(2);

    await (
      await dispute.connect(server).addArbiter(0, arbiter1.address)
    ).wait(1);
    await (
      await dispute.connect(server).addArbiter(0, arbiter4.address)
    ).wait(1);

    _dispute = await dispute.getDisputeByIndex(0);

    expect(_dispute.arbiters.length).to.eq(4);
  });

  it("Arbiter1 and Arbiter4 call castVote Function [SUCCESS]", async () => {
    const index = 0;

    await (await dispute.connect(arbiter1).castVote(index, true)).wait(1);

    await (await dispute.connect(arbiter4).castVote(index, true)).wait(1);

    const details = await dispute.getDisputeByIndex(index);

    let iVotes = 0;
    for (let i = 0; i < details.arbiters.length; i++) {
      const element = details.arbiters[i];
      iVotes += element.voted ? 1 : 0;
    }

    expect(details.voteCount).to.eq(4);
    expect(iVotes).to.eq(details.voteCount);
  });

  it("Server removes All Arbiters + votes [SUCCESS]", async () => {
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

  it("Server adds all arbiters", async () => {
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

    expect(_dispute.arbiters.length).to.eq(4);
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

  it("Server submits 3 signed votes without duplicates [SUCCESS] ", async () => {
    const _msgs = [];
    const _sigs = [];

    for (let i = 0; i < 3; i++) {
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
    expect(_dispute.voteCount).to.equal(3);
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

  it("CLAIM: should succeed if hasClaim was on when finalize was called", async () => {
    // Transfer funds to Dispute App
    await mock.connect(deployer).transfer(dispute.address, wei("1000"));

    const oldBalance = await mock.balanceOf(server.address);
    await dispute.connect(server).claim(1);
    const newBalance = await mock.balanceOf(server.address);
    expect(+newBalance).to.eq(+oldBalance + +newBalance);
  });
});
