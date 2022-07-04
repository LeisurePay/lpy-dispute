/* eslint-disable node/no-unpublished-require */
const { verify, networkConfig, developmentChains } = require("../helpers");

const deployLib = async (hre) => {
  // @ts-ignore
  const { getNamedAccounts, deployments, network } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const args = [];

  log("Deploying Library and waiting for confirmations...");
  const networkName = networkConfig[network.name] ? network.name : "default";
  const lib = await deploy("IterableArbiters", {
    from: deployer,
    log: true,
    args,
    waitConfirmations: networkConfig[networkName].blockConfirmations,
  });
  log(`Library at ${lib.address}`);
  if (
    !developmentChains.includes(network.name) && Boolean(+process.env.SHOULD_VERIFY)
  ) {
    await verify(lib.address, args, "contracts/IterableArbiters.sol:IterableArbiters");
  }
};

deployLib.tags = ["all", "lib"];
module.exports = deployLib;
