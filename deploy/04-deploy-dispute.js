/* eslint-disable node/no-unpublished-require */
const { verify, networkConfig, developmentChains } = require("../helpers");

const deployDispute = async (hre) => {
  // @ts-ignore
  const { getNamedAccounts, deployments, network } = hre;
  const { deploy, get, log } = deployments;
  const { deployer, server } = await getNamedAccounts();
  // const nft = await get("MockERC721");
  const mock = await get("MockERC20");
  const IArb = await get("IterableArbiters");

  const args = [mock.address, server];

  log("----------------------------------------------------");
  log("Deploying DisputeContract and waiting for confirmations...");
  const dispute = await deploy("DisputeContract", {
    from: deployer,
    log: true,
    args,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: networkConfig[network.name]
      ? networkConfig[network.name].blockConfirmations
      : 1,
    libraries: {
      IterableArbiters: IArb.address,
    },
  });
  log(`DisputeContract at ${dispute.address}`);
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    // await verify(
    //   dispute.address,
    //   args,
    //   "contracts/Dispute.sol:DisputeContract",
    // );
  }
};

deployDispute.tags = ["all", "dispute"];
module.exports = deployDispute;
