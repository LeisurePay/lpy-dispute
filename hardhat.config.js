require("dotenv").config();
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-ethers");
require("hardhat-deploy");
require("solidity-coverage");
const fs = require("fs");
const path = require("path");
const { eth, bsc } = require("./helpers/apiKeys");

let keys = {};
if (fs.existsSync(path.resolve(__dirname, "keys.json"))) {
  keys = JSON.parse(fs.readFileSync(path.resolve(__dirname, "keys.json")));
}
const getKeys = (keyName) => {
  return keys[keyName] || { mnemonic: process.env.PRIVATE_KEY };
};

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      chainId: 31337,
    },
    // BINANCE SMART CHAIN TESTNET
    bsc_test: {
      url: `https://data-seed-prebsc-1-s1.binance.org:8545`,
      accounts: getKeys("testnet"),
      networkCheckTimeout: 1000 * 500,
      network_id: 97,
      confirmations: 0,
      timeoutBlocks: 500,
      skipDryRun: true,
    },

    // BINANCE SMART CHAIN MAINNET
    bsc_main: {
      url: `https://bsc-dataseed1.binance.org`,
      accounts: getKeys("mainnet"),
      network_id: 56,
      confirmations: 10,
      timeoutBlocks: 200,
      skipDryRun: true,
    },
  },
  solidity: {
    version: "0.8.9",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
    },
    server: {
      default: 1,
    },
  },
  etherscan: {
    apiKey: {
      ...eth,
      ...bsc,
    },
  },
  mocha: {
    timeout: 200000, // 200 seconds max for running tests
  },
};
