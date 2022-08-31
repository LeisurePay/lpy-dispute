const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("Cancel Scenario Flow", () => {
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

    disputes = await dispute.getAllDisputes();

    expect(disputes.length).to.eq(1);
  });

  it("Server cancels Dispute [FAIL] caller isn't signer", async () => {
    const disputeIndex = 0;

    await expect(dispute.cancelDispute(disputeIndex)).to.be.reverted;
    const details = await dispute.getDisputeByIndex(disputeIndex);

    expect(details.state).to.eq(0);
  });

  it("Server cancels Dispute [SUCCESS]", async () => {
    const disputeIndex = 0;

    await dispute.connect(server).cancelDispute(disputeIndex);
    const details = await dispute.getDisputeByIndex(disputeIndex);

    expect(details.state).to.eq(2);
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

  it("Server submits signed votes but dispute is cancelled [FAIL] ", async () => {
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
      "dispute is closed"
    );

    _dispute = await dispute.getDisputeByIndex(0);
    expect(_dispute.voteCount).to.equal(0);
  });

  it("Server should call finalizeDispute function [FAIL : Dispute's canceled]", async () => {
    await expect(
      dispute.connect(server).finalizeDispute(0, false, wei("1"))
    ).to.be.revertedWith("dispute is closed");
  });
});
