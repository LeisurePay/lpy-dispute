const { ethers } = require("hardhat");
const { expect } = require("chai");
const { constants } = require("ethers");

describe("Dispute Flow", () => {
  let dispute;
  let mock;
  let erc721;
  let first = true;
  let [deployer, server, customer, merchant, arbiter1, arbiter2, arbiter3] =
    Array(7).fill(null);

  const wei = ethers.utils.parseEther;

  beforeEach(async () => {
    if (!first) return;
    [deployer, server, customer, merchant, arbiter1, arbiter2, arbiter3] =
      await ethers.getSigners();

    const ERC20 = await ethers.getContractFactory("MockERC20");
    const ERC721 = await ethers.getContractFactory("MockERC721");
    const IARB = await ethers.getContractFactory("IterableArbiters");

    mock = await ERC20.deploy();
    erc721 = await ERC721.deploy("https://based.com/");

    await erc721.safeMint(deployer.address, "");
    await erc721.safeMint(deployer.address, "");

    const args = [mock.address, server.address];
    const DISPUTE = await ethers.getContractFactory("DisputeContract", {
      libraries: {
        IterableArbiters: (await IARB.deploy()).address,
      },
    });
    dispute = await DISPUTE.deploy(...args);

    first = false;
  });

  it("address with server role can create dispute", async () => {
    let disputes = await dispute.getAllDisputes();
    await expect(disputes.length).to.eq(0);
    await expect(
      dispute.connect(server).createDisputeByServer(customer.address, merchant.address, false, erc721.address, 1, 20e6, [
        arbiter1.address,
        arbiter1.address
      ]), "Duplicate keys");

    await dispute
      .connect(server)
      .createDisputeByServer(customer.address, merchant.address, false, erc721.address, 1, 20e6, [
        arbiter1.address,
        arbiter2.address,
        arbiter3.address,
      ]);

      await dispute
      .connect(server)
      .createDisputeByServer(customer.address, merchant.address, false, erc721.address, 1, 20e6, [
        arbiter1.address,
        arbiter2.address,
        arbiter3.address,
      ]);

    disputes = await dispute.getAllDisputes();

    expect(disputes.length).to.eq(2);
  });

  it("Created Dispute NFT Field shouldn't be empty", async () => {
    const disputes = await dispute.getAllDisputes();
    const _dispute = disputes[0];
    expect(_dispute._nft._nft).to.not.eq(constants.AddressZero);
    expect(_dispute._nft._nft).to.eq(erc721.address);
    expect(_dispute._nft._id).to.eq(1);
  });

  it("toggleHasClaim can only be called by accounts with DEFAULT_ADMIN_ROLE or SERVER_ROLE", async () => {
    const { hasClaim } = await dispute.getDisputeByIndex(1);
    await expect(dispute.connect(customer).toggleHasClaim(1)).to.be.revertedWith(
      "Only Admin or Server Allowed"
    );
    await expect(dispute.connect(deployer).toggleHasClaim(1))
      .to.emit(dispute, "ToggledHasClaim")
      .withArgs(1, !hasClaim);

    const { hasClaim: newHasClaim } = await dispute.getDisputeByIndex(1);
    expect(newHasClaim).to.equal(!hasClaim);
  });

  it("castVote Function works only for arbiters who haven't already voted", async () => {
    const disputes = await dispute.getAllDisputes();

    for (let i = 0; i < disputes.length; i++) {
      await expect(
        dispute.connect(customer).castVote(i, true)
      ).to.be.revertedWith("Not an arbiter");

      await dispute.connect(arbiter1).castVote(i, true);

      await dispute.connect(arbiter2).castVote(i, true);

      await dispute.connect(arbiter3).castVote(i, false);

      await expect(
        dispute.connect(arbiter1).castVote(i, true)
      ).to.be.revertedWith("Already Voted");

      const details = await dispute.getDisputeByIndex(i);
      let votes = 0;
      for (let j = 0; j < details.arbiters.length; j++) {
        const element = details.arbiters[j];
        votes += element.voted ? 1 : 0;
      }

      expect(votes).to.eq(details.voteCount);
    }
  });

  it("finalizeDispute Function works as expected", async () => {
    await expect(dispute.connect(arbiter1).finalizeDispute(0, false, wei("1"))).to.be.reverted;
    await dispute.connect(server).finalizeDispute(0, false, wei("1"));

    await expect(dispute.connect(server).claim(0)).to.be.revertedWith(
      "Already Claimed"
    );

    const disputeIndex = 1; // Dispute hasClaim == TRUE

    await dispute.connect(server).finalizeDispute(disputeIndex, false, wei("1"));

    await expect(dispute.connect(server).claim(disputeIndex)).to.be.revertedWith(
      "ERC20: transfer amount exceeds balance"
    );

    // Transfer funds to Dispute App
    await mock.connect(deployer).transfer(dispute.address, wei("1000"));

    const d = await dispute.getDisputeByIndex(disputeIndex);
    // console.log(d);
    // const dollarValue = d.usdValue;
    const received = d.tokenValue;
    const winner = d.winner;

    // console.log("Dollar: $", +dollarValue, "Received: ", +received);

    if (winner === 1) {
      const serverOldBalance = await mock.balanceOf(server.address);

      await expect(dispute.connect(merchant).claim(disputeIndex)).to.be.revertedWith(
        "Only SideA or Server can claim"
      );

      await expect(dispute.connect(server).claim(disputeIndex))
        .to.emit(mock, "Transfer")
        .withArgs(dispute.address, server.address, received);

      const serverNewBalance = await mock.balanceOf(server.address);
      expect(serverNewBalance).to.eq(serverOldBalance + received);
    } else if (winner === 2) {
      const merchantOldBalance = await mock.balanceOf(merchant.address);

      await expect(dispute.connect(customer).claim(disputeIndex)).to.be.revertedWith(
        "Only SideB or Server can claim"
      );

      await expect(dispute.connect(merchant).claim(disputeIndex))
        .to.emit(mock, "Transfer")
        .withArgs(dispute.address, merchant.address, received);

      const merchantNewBalance = await mock.balanceOf(merchant.address);
      expect(merchantNewBalance).to.eq(merchantOldBalance + received);
    }

    const deets = await dispute.getDisputeByIndex(disputeIndex);
    expect(deets.state).to.eq(1);

    await expect(
      dispute.connect(customer).castVote(disputeIndex, true)
    ).to.be.revertedWith(`dispute is closed`);
  });

  it("all readOnly functions work", async () => {
    for (let i = 0; i < 3; i++) {
      await dispute
        .connect(server)
        .createDisputeByServer(customer.address, merchant.address, false, erc721.address, 1, 20e6, [
          arbiter1.address,
          arbiter2.address,
          arbiter3.address,
        ]);
    }
    const custOpen = await dispute.getSideAOpenDisputes(customer.address);
    const custClosed = await dispute.getSideAClosedDisputes(
      customer.address
    );
    const merchOpen = await dispute.getSideBOpenDisputes(merchant.address);
    const merchClosed = await dispute.getSideBClosedDisputes(
      merchant.address
    );
    const allDisputes = await dispute.getAllDisputes();
    const myCustOpen = await dispute.getMyOpenDisputesAsSideA();
    const myCustClosed = await dispute.getMyClosedDisputesAsSideA();
    const myMercOpen = await dispute.getMyOpenDisputesAsSideB();
    const myMercClose = await dispute.getMyClosedDisputesAsSideB();
  });
});
