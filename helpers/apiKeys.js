const BSC_API = process.env.BSCSCAN_API_KEY;

const ApiKeys = {
  bsc: {
    bsc: BSC_API,
    bscTestnet: BSC_API,
  },
};

module.exports = ApiKeys;
