/* eslint-disable node/no-unpublished-require */
const { verify, networkConfig, developmentChains } = require("../helpers");

const deployLib = async (hre) => {
  // @ts-ignore
  const { getNamedAccounts, deployments, network } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const args = [];

  log("----------------------------------------------------");
  log("Deploying Library and waiting for confirmations...");
  const lib = await deploy("IterableArbiters", {
    from: deployer,
    log: true,
    args,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: networkConfig[network.name]
      ? networkConfig[network.name].blockConfirmations
      : 1,
  });
  log(`Library at ${lib.address}`);
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    // await verify(lib.address, args, "contracts/IterableArbiters.sol:IterableArbiters");
  }
};

deployLib.tags = ["all", "lib"];
module.exports = deployLib;
