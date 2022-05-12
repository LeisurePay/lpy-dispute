const { deployments, ethers } = require("hardhat");
const { expect } = require("chai");

describe("Dispute Flow", (hre) => {
  let dispute;
  let mock;
  let first = true;
  let [deployer, server, customer, merchant, arbiter1, arbiter2, arbiter3] =
    Array(7).fill(null);

  const wei = ethers.utils.parseEther;

  beforeEach(async () => {
    if (!first) return;
    [deployer, server, customer, merchant, arbiter1, arbiter2, arbiter3] =
      await ethers.getSigners();

    const ERC20 = await ethers.getContractFactory("MockERC20");
    const DISPUTE = await ethers.getContractFactory("DisputeContract");

    mock = await ERC20.deploy();

    const args = [mock.address, server.address, false];
    dispute = await DISPUTE.deploy(...args);

    first = false;
  });

  it("toggle can only be called by accounts with DEFAULT_ADMIN_ROLE", async () => {
    const DEFAULT_ADMIN_ROLE = await dispute.DEFAULT_ADMIN_ROLE();
    const isAuto = await dispute.isAuto();
    await expect(dispute.connect(server).toggleAuto()).to.be.revertedWith(
      `AccessControl: account ${server.address.toLowerCase()} is missing role ${DEFAULT_ADMIN_ROLE}`
    );
    await dispute.connect(deployer).toggleAuto();
    const newAuto = await dispute.isAuto();

    expect(newAuto).to.equal(!isAuto);
  });

  it("address with server role can create dispute", async () => {
    let disputes = await dispute.getAllDisputes();
    expect(disputes.length).to.eq(0);

    await dispute
      .connect(server)
      .createDisputeByServer(customer.address, merchant.address, 1, [
        arbiter1.address,
        arbiter2.address,
        arbiter3.address,
      ]);

    disputes = await dispute.getAllDisputes();

    expect(disputes.length).to.eq(1);
  });

  it("castVote Function", async () => {
    const index = 0;

    await expect(
      dispute.connect(customer).castVote(index, true)
    ).to.be.revertedWith(`not allowed to vote`);

    await dispute.connect(arbiter1).castVote(index, true);

    await dispute.connect(arbiter2).castVote(index, true);

    await dispute.connect(arbiter3).castVote(index, false);

    await expect(
      dispute.connect(arbiter1).castVote(index, true)
    ).to.be.revertedWith(`already voted`);

    const votes = await dispute.fetchVotes(index);
    const details = await dispute.getDisputeByIndex(index);

    expect(votes.length).to.eq(details.voteCount);
  });

  it("finalizeDispute Function", async () => {
    const index = 0;

    await expect(
      dispute.connect(server).finalizeDispute(index, false, wei("1"))
    ).to.be.revertedWith("ERC20: transfer amount exceeds balance");

    // Transfer funds to Dispute App
    await mock.connect(deployer).transfer(dispute.address, wei("1"));

    const merchantOldBalance = await mock.balanceOf(merchant.address);

    await expect(
      dispute.connect(server).finalizeDispute(index, false, wei("1"))
    )
      .to.emit(mock, "Transfer")
      .withArgs(dispute.address, merchant.address, wei("1"));

    const merchantNewBalance = await mock.balanceOf(merchant.address);
    expect(merchantNewBalance).to.eq(merchantOldBalance + wei("1"));

    const deets = await dispute.getDisputeByIndex(index);
    expect(deets.state).to.eq(1);
  });

  it("all readOnly functions work", async () => {
    for (let i = 0; i < 3; i++) {
      await dispute
        .connect(server)
        .createDisputeByServer(customer.address, merchant.address, 1, [
          arbiter1.address,
          arbiter2.address,
          arbiter3.address,
        ]);
    }
    const custOpen = await dispute.getCustomerOpenDisputes(customer.address);
    const custClosed = await dispute.getCustomerClosedDisputes(
      customer.address
    );
    const merchOpen = await dispute.getMerchantOpenDisputes(merchant.address);
    const merchClosed = await dispute.getMerchantClosedDisputes(
      merchant.address
    );
    const allDisputes = await dispute.getAllDisputes();
    const myCustOpen = await dispute.getMyOpenDisputesAsCustomer();
    const myCustClosed = await dispute.getMyClosedDisputesAsCustomer();
    const myMercOpen = await dispute.getMyOpenDisputesAsMerchant();
    const myMercClose = await dispute.getMyClosedDisputesAsMerchant();
  });
});
