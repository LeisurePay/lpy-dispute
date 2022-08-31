# LPY DISPUTE

A Repo responsible for creating and handling disputes on chain

[TestCase Sheet](https://docs.google.com/spreadsheets/d/1Dzt3BeL2CGE3RBusBb9S_nm6sqAwg2tqP8Ck2LIOw1U/edit#gid=0)

## SET UP

To  set up the project for testing and deployment(+ verification):

1. Simply run `yarn` to install dependencies

## CONFIGURATIONS

These are the configurations that are required to run the project.

* `./keys.json`: This is the configuration file for the accounts private keys, follows the format of [keys.example.json](./keys.example.json)
  * see [keys.example.json](keys.example.json) for more details
  * duplicate [keys.example.json](keys.example.json) and rename copy to `keys.json`
  * each network has its own array of private keys
  * the array indices is are named [deployer, server, arbiter1, arbiter2, arbiter3, arbiter4]

* `./.env`: This is the configuration file for the environmental variables, follows the format of [.env.example](./.env.example)
  * see [.env.example](./.env.example) for more details
  * duplicate [.env.example](./.env.example) and rename copy to `.env`
  * `PRIVATE_KEY`: This is the mnenomic phrase, hardhat would fetch the private keys from this mnemonic phrase using this path `m/44'/60'/0'/0/{index}`
  * `SHOULD_VERIFY`: This is a boolean value, if 0, contracts won't get verified, else if 1, the project will verify the contracts after deployment
  * `{{NETWORK}_API_KEY}`: The API key for verifying the contracts
    * where NETWORK is the chain explorer name, e.g. `BSCSCAN`, `ETHERSCAN`, `FMTSCAN`
    * see [API Keys](https://etherscan.io/myapikey) for more details

* [./helpers/apiKeys.js](./helpers/apiKeys.js): This is the configuration file where the api keys are defined
  * Each key is a network that contains sub networks (mainnet, ropsten, rinkeby, kovan, bsc, bscTestnet)
  * Each sub network should equal to base chain api key
  * see [Supported Network Names](https://github.com/NomicFoundation/hardhat/tree/master/packages/hardhat-etherscan#multiple-api-keys-and-alternative-block-explorers) for more recognized sub networks

* [./helpers/config.js](./helpers/config.js): This is the configuration file for the the deployed contract addresses on different networks (which is based on the network names in [hardhat config](./hardhat.config.js#L26))
  * networks where contracts address are provided won't be redeployed.

```js
bsc_test: {
    Dispute: { address: "" },
    IterableArbiters: { address: "" },
    MockERC20: { address: "0x55d398326f99059ff775485246999027b3197955" },
    MockERC721: { address: "" },
}
```

## Compiling

To compile the contracts, simply run `npx hardhat compile`

## Deploying

To deploy the contracts, simply run `npx hardhat deploy --network <network-name>` e.g:  `npx hardhat deploy --network bsc_test`, you can find list of networks for this repo in the `hardhat.config.js` file.

This is a hardhat task that deploys the contracts using the script files in the `deploy` folder.

The deployment is from top to bottom, based on the order of the files in the folder.

In the likely case where some contracts are already deployed, you can let the script know by [editing the config file and adding the deployed contract address to the `network` object](./helpers/config.js).

With this, the deploy script would pick up the address instead of redeploying the contract

## Testing

To test all test files in this repo, simply run `npx hardhat test --network <network-name>`

To test a specific file, simply run `npx hardhat test <path/to/test> --neetwork <network-name>` e.g: `npx hardhat test test/dispute.test.js`

Where `<network-name>` can be any of the following

```json
{
    "test" : "The Hardhat Test Environment",
    "bsc_test" : "The Binance Test Network",
    "bsc_main" : "The Binance Main Network",
}
```

## Dispute Contract Order of Operation

**NOTE: Every step is linked to it's specific function documentation**

Step 1: [Create a Dispute](./docs/Dispute.md#createdisputebyserver) - Keep note of the dispute ID from the event log

Step 2: You can [add an arbiter](./docs/Dispute.md#addarbiter) or [remove an arbiter](./docs/Dispute.md#removearbiter)

Step 3: If there's an error about who sideA or sideB is on dispute creation, you can [update sideA](./docs/Dispute.md#updatesidea) or [update sideB](./docs/Dispute.md#updatesideb)

Step 4: If you decide to stop a dispute, you can [Cancel a Dispute](./docs/Dispute.md#canceldispute)

Step 5: Arbiters vote by signing a message `("disputeIndex + A|B")` and submits this signature to the server.

Step 6: The server can send the signatures along with the messages signed to the contract by calling [Casting Votes](./docs/Dispute.md#castvoteswithsignatures)

Step 7: Before finalizing the dispute, the server needs to determine if the resolution payment would be onChain(LPY) or off chain(probably fiat currency), this is done by calling by updating the `hasClaim` field of the dispute, this is done by calling [toggleHasClaim Function](./docs/Dispute.md#togglehasclaim)

Step 8: The server can finalize the dispute by calling [Finalize Dispute](./docs/Dispute.md#finalizedispute) and passing who is the winner of the dispute.

Step 9: If `hasClaim` was true when dispute was finalized, the winner or server can call the [Claim Function](./docs/Dispute.md#claim) to claim the amount at stake **ELSE:** the SERVER would discuss with the winner on how to send payment over to them.