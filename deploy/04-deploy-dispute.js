/* eslint-disable node/no-unpublished-require */
const { verify, networkConfig, developmentChains } = require("../helpers");

const deployDispute = async (hre) => {
  // @ts-ignore
  const { getNamedAccounts, deployments, network } = hre;
  const { deploy, get, log } = deployments;
  const { deployer, server } = await getNamedAccounts();

  const mock = await get("MockERC20");
  const IArb = await get("IterableArbiters");

  const args = [mock.address, server];

  log("Deploying DisputeContract and waiting for confirmations...");
  const networkName = networkConfig[network.name] ? network.name : "default";
  const dispute = await deploy("DisputeContract", {
    from: deployer,
    log: true,
    args,
    waitConfirmations: networkConfig[networkName].blockConfirmations,
    libraries: {
      IterableArbiters: IArb.address,
    },
  });
  log(`DisputeContract at ${dispute.address}`);
  if (
    !developmentChains.includes(network.name) && Boolean(+process.env.SHOULD_VERIFY)
  ) {
    await verify(dispute.address, args, "contracts/Dispute.sol:DisputeContract");
  }
};

deployDispute.tags = ["all", "dispute"];
module.exports = deployDispute;
