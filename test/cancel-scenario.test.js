const { ethers, network } = require("hardhat");
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
    const firstMint = await erc721.safeMint(deployer.address, "");
    if (!network.name.match(/.*(ganache|localhost|hardhat).*/i))
      await firstMint.wait(2);

    mock = await ERC20.deploy();
    const args = [mock.address, server.address];
    const library = await IARB.deploy();
    const DISPUTE = await ethers.getContractFactory("DisputeContract", {
      libraries: {
        IterableArbiters: library.address,
      },
    });
    dispute = await DISPUTE.deploy(...args);

    console.log('====================================');
    console.log('=====CANCEL TEST CONTRACTS======');
    console.log(`ERC20: ${mock.address}`);
    console.log(`ERC721: ${erc721.address}`);
    console.log(`Library: ${library.address}`);
    console.log(`Dispute: ${dispute.address}`);
    console.log('====================================');

    first = false;
  });

  it("Server Creates Dispute [SUCCESS]", async () => {
    let disputes = await dispute.getAllDisputes();
    expect(disputes.length).to.eq(0);

    const tx = await dispute
      .connect(server)
      .createDisputeByServer(customer.address, merchant.address, false, erc721.address, 0, 20e6, [
        arbiter1.address,
        arbiter2.address,
        arbiter3.address,
      ])
    if (!network.name.match(/.*(ganache|localhost|hardhat).*/i))
      await tx.wait(2);

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
    const tx = await dispute.connect(server).cancelDispute(disputeIndex);
    if (!network.name.match(/.*(ganache|localhost|hardhat).*/i))
      await tx.wait(2);
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
  });

  it("Server submits signed votes but dispute is cancelled [FAIL] ", async () => {
    const _msgs = [];
    const _sigs = [];

    for (const element of votes) {
      _msgs.push(element.choice);
      _sigs.push(element.signature);
    }

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
