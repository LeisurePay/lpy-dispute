/* eslint-disable node/no-unpublished-require */
const { verify, networkConfig, developmentChains } = require("../helpers");
const { config } = require("../helpers");

const deployDispute = async (hre) => {
  // @ts-ignore
  const { getNamedAccounts, deployments, ethers, network } = hre;
  const { deploy, get, log } = deployments;
  const { deployer, server } = await getNamedAccounts();

  const netConfig = config[network.name];
  const mock =
    netConfig && ethers.utils.isAddress(netConfig.MockERC20.address)
      ? netConfig.MockERC20
      : await get("MockERC20");

  const IArb =
    netConfig && ethers.utils.isAddress(netConfig.IterableArbiters.address)
      ? netConfig.IterableArbiters
      : await get("IterableArbiters");

  const args = [mock.address, server];

  if (netConfig && ethers.utils.isAddress(netConfig.Dispute.address)) {
    log("Already deployed");
    log(
      `DisputeContract at ${ethers.utils.getAddress(netConfig.Dispute.address)}`
    );
  } else {
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
      !developmentChains.includes(network.name) &&
      Boolean(+process.env.SHOULD_VERIFY)
    ) {
      await verify(
        dispute.address,
        args,
        "contracts/Dispute.sol:DisputeContract"
      );
    }
  }
};

deployDispute.tags = ["all", "dispute"];
module.exports = deployDispute;
