/* eslint-disable node/no-unpublished-require */
const { verify, networkConfig, developmentChains } = require("../helpers");

const deployDispute = async (hre) => {
  // @ts-ignore
  const { getNamedAccounts, deployments, network } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const args = ["0x0000000000000000000000000000000000000000"];

  log("----------------------------------------------------");
  log("Deploying Dispute and waiting for confirmations...");
  const dispute = await deploy("Dispute", {
    from: deployer,
    log: true,
    args,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: networkConfig[network.name].blockConfirmations || 1,
  });
  log(`Dispute at ${dispute.address}`);
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(dispute.address, args);
  }
};

deployDispute.tags = ["all", "dispute"];
module.exports = deployDispute;
