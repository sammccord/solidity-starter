# ETH Pool Solidity + Frontend Challenge

[Assignment doc](https://github.com/ekonomia-tech/hiring-challenges/blob/main/solidity-and-front-end.md)

## Time Spent

Longer than I'd like to admit, 6-8 hours
## Getting Started

- Clone the repo.
- `npm install -g pnpm`
  - This fork is now a monorepo btw
- `pnpm install`

## Running Hardhat Tests

- `pnpm run test --filter contracts`

## Running Next.js Dapp

- `cd packages/contracts && npm run dev`
  - Will start a hardhat node, and deploy contracts
  - Note the contract's address logged from this command
- Place the pool contract's address in `packages/web/.env` ensuring that the `NEXT_PUBLIC_POOL_ADDRESS` variable is correct
- In another terminal, `cd packages/web && npm run dev`

**Note:** The app is configured to only use Metamask at the moment, so please ensure you have the browser extension installed - [https://metamask.io/](https://metamask.io/)

- Fund your testnet account so you can start depositing to the pool

```sh
cd packages/contracts
npx hardhat fund --account $YOUR_ADDRESS_HERE --amount 1.0 --network localhost
```

- Open `localhost:3000`
- Click `Connect` in the top right to grant the dapp access to the Web3 context provided by Metamask
- Click `Deposit` to make a deposit to the pool contract
- Distribute rewards to the pool

```sh
cd packages/contracts
npx hardhat reward --pool $POOL_CONTRACT_ADDRESS --amount 1.0 --network localhost
```

- Click `Withdraw` to withdraw your deposit + share of rewards

## Misc.

This was fun; I forgot how cool it feels to develop dapps. The tooling has come a long way, last I wrote Solidity there was no Hardhat and I mainly worked with Ganache + a bunch of Truffle scripts. This experience is much better.

It did take me a while to figure out all the new tooling, though, so that did eat a good chunk of my time I could've used to build out sexier features.

Initially, I modeled my contracts after OpenZeppelin's `PaymentSplitter` contract, and had functionality to deposit / reward in the pool's ERC20, but I was taking too long and just decided to keep it to ether. I also have functionality to do partial withdraws, but that part didn't make it into the frontend before I cut myself off. I also would've liked to use the more sophisticated event filter API, and render a table of pool events, but settled for basic event handling and amount display. There's obviously so much that could be done, but I need to call it.

Anyway, thanks for the opportunity. My Solidity experience is primarily self taught, so if I wouldn't pass an audit, definitely let me know why. Thanks again!
