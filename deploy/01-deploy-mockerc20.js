/* eslint-disable node/no-unpublished-require */
const { verify, networkConfig, developmentChains } = require("../helpers");

const deployMockERC20 = async (hre) => {
  // @ts-ignore
  const { getNamedAccounts, deployments, network } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const args = [];

  log("Deploying MockToken and waiting for confirmations...");
  const networkName = networkConfig[network.name] ? network.name : "default";
  const mockerc20 = await deploy("MockERC20", {
    from: deployer,
    log: true,
    args,
    waitConfirmations: networkConfig[networkName].blockConfirmations,
  });
  log(`MockToken at ${mockerc20.address}`);
  if (
    !developmentChains.includes(network.name) && Boolean(+process.env.SHOULD_VERIFY)
  ) {
    await verify(mockerc20.address, args, "contracts/MockERC20.sol:MockERC20");
  }
};

deployMockERC20.tags = ["all", "mockerc20"];
module.exports = deployMockERC20;
