const { deployments, ethers } = require("hardhat");
const { expect } = require("chai");

describe("Dispute Flow", (hre) => {
  let dispute;
  let first = true;
  let [deployer, server, customer, merchant, arbiter1, abiter2, arbiter3] = [
    "",
    "",
  ];

  beforeEach(async () => {
    if (!first) return;
    await deployments.fixture(["all"]);
    [deployer, server, customer, merchant, arbiter1, abiter2, arbiter3] =
      await ethers.getSigners();

    dispute = await ethers.getContract("DisputeContract");
    first = false;
  });

  /* `
createDispute
createDispute
castVote
castVotesWithSignatures
finalizeDispute
fetchVotes`;
*/

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
      .createDispute(customer, merchant, 1, [arbiter1, abiter2, arbiter3]);

    disputes = await dispute.getAllDisputes();

    expect(disputes.length).to.eq(1);
  });
});
