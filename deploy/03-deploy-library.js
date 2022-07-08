/* eslint-disable node/no-unpublished-require */
const { verify, networkConfig, developmentChains } = require("../helpers");
const { config } = require("../helpers");

const deployLib = async (hre) => {
  // @ts-ignore
  const { getNamedAccounts, deployments, ethers, network } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const args = [];
  if (
    config[network.name] &&
    ethers.utils.isAddress(config[network.name].IterableArbiters.address)
  ) {
    log("Already deployed");
    log(
      `Library at ${ethers.utils.getAddress(
        config[network.name].IterableArbiters.address
      )}`
    );
  } else {
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
      !developmentChains.includes(network.name) &&
      Boolean(+process.env.SHOULD_VERIFY)
    ) {
      await verify(
        lib.address,
        args,
        "contracts/IterableArbiters.sol:IterableArbiters"
      );
    }
  }
};

deployLib.tags = ["all", "lib"];
module.exports = deployLib;
