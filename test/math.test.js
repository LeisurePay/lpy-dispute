const { ethers, network } = require("hardhat");
const { expect } = require("chai");

describe("Math Flow", () => {
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

  const tokenPerDollar = wei("0.5"); // 0.5 token == 1 dollar
  const usdValue = 100e6; // 100 usd at stake

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
    mock = await ERC20.deploy();

    const firstMint = await erc721.safeMint(deployer.address, "");
    if (!network.name.match(/.*(ganache|localhost|hardhat).*/i))
      await firstMint.wait(2);

    const args = [mock.address, server.address];
    const library = await IARB.deploy();
    const DISPUTE = await ethers.getContractFactory("DisputeContract", {
      libraries: {
        IterableArbiters: library.address,
      },
    });
    dispute = await DISPUTE.deploy(...args);

    console.log('====================================');
    console.log('=====MATH TEST CONTRACTS======');
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
      .createDisputeByServer(customer.address, merchant.address, true, erc721.address, 0, usdValue, [
        arbiter1.address,
        arbiter2.address,
        arbiter3.address,
        arbiter4.address,
      ])
    if (!network.name.match(/.*(ganache|localhost|hardhat).*/i))
      await tx.wait(2);

    disputes = await dispute.getAllDisputes();

    expect(disputes.length).to.eq(1);
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

  it("Server submits signed votes without duplicates [SUCCESS] ", async () => {
    const _msgs = [];
    const _sigs = [];

    for (let i = 0; i < 4; i++) {
      _msgs.push(votes[i].choice);
      _sigs.push(votes[i].signature);
    }

    let _dispute = await dispute.getDisputeByIndex(0);
    expect(_dispute.voteCount).to.equal(0);

    const tx = await dispute.connect(server).castVotesWithSignatures(0, _sigs, _msgs)
    if (!network.name.match(/.*(ganache|localhost|hardhat).*/i))
      await tx.wait(2);

    _dispute = await dispute.getDisputeByIndex(0);
    expect(_dispute.voteCount).to.equal(4);
  });

  it("Server should call finalizeDispute function [SUCCESS]", async () => {
    const tx = await dispute.connect(server).finalizeDispute(0, false, tokenPerDollar)
    if (!network.name.match(/.*(ganache|localhost|hardhat).*/i))
      await tx.wait(2);

    const _dispute = await dispute.getDisputeByIndex(0);

    expect(_dispute.state).to.equal(1); // Closed
  });

  it("CLAIM: should ensure math is correct [Success]", async () => {
    // Transfer funds to Dispute App
    const tx2 = await mock.connect(deployer).transfer(dispute.address, wei("1000"));
    if (!network.name.match(/.*(ganache|localhost|hardhat).*/i))
      await tx2.wait(2);
    const _dispute = await dispute.getDisputeByIndex(0);

    const tokenValue = (+usdValue * +tokenPerDollar) / 1e6;
    expect(+_dispute.tokenValue).to.eq(tokenValue);
    expect(tokenValue / 1e18).to.eq(50); // Confirm since we know the result before hand

    if (_dispute.winner === 1) {
      const tx = await dispute.connect(customer).claim(0);
      expect(tx)
        .to.emit(dispute, "DisputeFundClaimed")
        .withArgs(_dispute.disputeIndex, tokenValue, customer.address);
      expect(tx)
        .to.emit(mock, "Transfer")
        .withArgs(dispute.address, customer.address, tokenValue);
      if (!network.name.match(/.*(ganache|localhost|hardhat).*/i)) tx.wait(2);
    } else if (_dispute.winner === 2) {
      const tx = await dispute.connect(merchant).claim(0);
      expect(tx)
        .to.emit(dispute, "DisputeFundClaimed")
        .withArgs(_dispute.disputeIndex, tokenValue, merchant.address);
      expect(tx)
        .to.emit(mock, "Transfer")
        .withArgs(dispute.address, merchant.address, tokenValue);

      if (!network.name.match(/.*(ganache|localhost|hardhat).*/i)) tx.wait(2);
    }
  });
});
