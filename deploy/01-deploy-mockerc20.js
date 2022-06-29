/* eslint-disable node/no-unpublished-require */
const {
  // verify,
  networkConfig,
  developmentChains,
} = require("../helpers");

const deployMockERC20 = async (hre) => {
  // @ts-ignore
  const { getNamedAccounts, deployments, network } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const args = [];

  log("----------------------------------------------------");
  log("Deploying MockToken and waiting for confirmations...");
  const mockerc20 = await deploy("MockERC20", {
    from: deployer,
    log: true,
    args,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: networkConfig[network.name]
      ? networkConfig[network.name].blockConfirmations
      : 1,
  });
  log(`MockToken at ${mockerc20.address}`);
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    // await verify(mockerc20.address, args, "contracts/MockERC20.sol:MockERC20");
  }
};

deployMockERC20.tags = ["all", "mockerc20"];
module.exports = deployMockERC20;
