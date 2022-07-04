const networkConfig = {
  bsc_test: {
    blockConfirmations: 3,
  },
  bsc_main: {
    blockConfirmations: 3,
  },
  default: {
    blockConfirmations: 1,
  },
};

const developmentChains = ["hardhat", "localhost", "ganache"];

module.exports = {
  networkConfig,
  developmentChains,
};
