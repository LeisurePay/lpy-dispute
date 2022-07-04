# LPY DISPUTE

A Repo responsible for creating and handling disputes on chain

[TestCase Sheet](https://docs.google.com/spreadsheets/d/1Dzt3BeL2CGE3RBusBb9S_nm6sqAwg2tqP8Ck2LIOw1U/edit#gid=0)

## SET UP

To  set up the project for testing and deployment(+ verification):

1. Simply run `yarn` to install dependencies

2. Duplicate `keys.example.json` and rename to `keys.json`, for the mainnet and testnet, provide list of private keys OR if you want to use a seedphrase instead, duplicate `.env.example`, rename to `.env`, your `BSCSCAN_API_KEY` should be the API key gotten from <https://bscscan.com> which would be used for contract verification while the `PRIVATE_KEY` should equal your account seed phrase.

3. `SHOULD_VERIFY` field in the `.env` file let's the deployment script know if it should verify a contract or not; `0` == `false`, contracts won't be verified, `1` == `true`, contracts would be verified after deployment

## Compiling

To compile the contracts, simply run `npx hardhat compile`

## Deploying

To deploy the contracts, simply run `npx hardhat deploy --network <network-name>` e.g:  `npx hardhat deploy --network bsc_test`, you can find list of networks for this repo in the `hardhat.config.js` file.

This is a hardhat task that deploys the contracts using the script files in the `deploy` sub-folder.

The deployment is from top to bottom, based on the order of the files in the folder.

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
