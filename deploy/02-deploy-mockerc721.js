/* eslint-disable node/no-unpublished-require */
const { verify, networkConfig, developmentChains } = require("../helpers");
const { config } = require("../helpers");

const deployMockERC721 = async (hre) => {
  // @ts-ignore
  const { getNamedAccounts, deployments, ethers, network } = hre;
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const args = ["https://based.com/"];

  if (
    config[network.name] &&
    ethers.utils.isAddress(config[network.name].MockERC721.address)
  ) {
    log("Already deployed");
    log(
      `MockToken at ${ethers.utils.getAddress(
        config[network.name].MockERC721.address
      )}`
    );
  } else {
    log("Deploying MockNFT and waiting for confirmations...");
    const networkName = networkConfig[network.name] ? network.name : "default";
    const mockerc721 = await deploy("MockERC721", {
      from: deployer,
      log: true,
      args,
      waitConfirmations: networkConfig[networkName].blockConfirmations,
    });
    log(`MockToken at ${mockerc721.address}`);
    if (
      !developmentChains.includes(network.name) &&
      Boolean(+process.env.SHOULD_VERIFY)
    ) {
      await verify(
        mockerc721.address,
        args,
        "contracts/MockERC721.sol:MockERC721"
      );
    }
  }
};

deployMockERC721.tags = ["all", "mockerc721"];
module.exports = deployMockERC721;
