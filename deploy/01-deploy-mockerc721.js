/* eslint-disable node/no-unpublished-require */
const { verify, networkConfig, developmentChains } = require("../helpers");

const deployMockERC721 = async (hre) => {
  // @ts-ignore
  const { getNamedAccounts, deployments, network } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const args = ["https://based.com/"];

  log("----------------------------------------------------");
  log("Deploying MockToken and waiting for confirmations...");
  const mockerc721 = await deploy("MockERC721", {
    from: deployer,
    log: true,
    args,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: networkConfig[network.name]
      ? networkConfig[network.name].blockConfirmations
      : 1,
  });
  log(`MockToken at ${mockerc721.address}`);
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(
      mockerc721.address,
      args,
      "contracts/MockERC721.sol:MockERC721"
    );
  }
};

deployMockERC721.tags = ["all", "mockerc721"];
module.exports = deployMockERC721;
