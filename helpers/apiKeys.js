const ETH_API = process.env.ETHERSCAN_API_KEY;
const BSC_API = process.env.BSCSCAN_API_KEY;

const eth = {
  mainnet: ETH_API,
  ropsten: ETH_API,
  rinkeby: ETH_API,
  goerli: ETH_API,
  kovan: ETH_API,
};
const bsc = {
  bsc: BSC_API,
  bscTestnet: BSC_API,
};

module.exports = { eth, bsc };
