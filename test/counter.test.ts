import { expect } from 'chai'
import { ethers } from 'hardhat'
import '@nomiclabs/hardhat-ethers'

import { Counter__factory, Counter } from '../build/types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber } from 'ethers'

const { getContractFactory, getSigners } = ethers

describe('Counter', () => {
  let counter: Counter
  let signers: SignerWithAddress[]
  let owner: SignerWithAddress
  let others: SignerWithAddress[]

  beforeEach(async () => {
    // 1
    signers = await getSigners()
    owner = signers[0]
    others = signers.slice(1)
    // 2
    const counterFactory = (await getContractFactory('Counter', signers[0])) as Counter__factory
    const share = Math.floor(100 / signers.length)
    counter = await counterFactory.deploy(
      'SlickToken',
      'SLK',
      signers.map((s) => s.address),
      Array.from({ length: signers.length }, () => share),
    )
    await counter.deployed()
    const initialCount = await counter.getCount()

    // 3
    expect(initialCount).to.eq(0)
    expect(counter.address).to.properAddress
  })

  it('should allow authorized team members to deposit rewards', async () => {
    const amount = ethers.utils.parseEther('1.0')
    await signers[1].sendTransaction({
      to: counter.address,
      value: amount,
    })
    const releasable = await counter['releasable(address)'](signers[1].address)
    expect(releasable.gt(0)).to.eq(true)
  })

  it('should reflect an accurate releasable amount given the number of team members and total deposits', async () => {
    const amount = ethers.utils.parseEther('1.0')
    const expected = amount.div(signers.length)
    await owner.sendTransaction({
      to: counter.address,
      value: amount, // Sends exactly 1.0 ether
    })
    const releasable = await counter['releasable(address)'](owner.address)
    expect(releasable.eq(expected)).to.eq(true)
  })

  it('should ignore deposits from unauthorized team members', async () => {
    const amount = ethers.utils.parseEther('1.0')
    await owner.sendTransaction({
      to: counter.address,
      value: amount, // Sends exactly 1.0 ether
    })
    const w = ethers.Wallet.createRandom()
    const shares = await counter.shares(w.address)
    expect(shares.eq(0)).to.eq(true)
  })

  it('should deposit rewards to the pool of users, not individual users', async () => {
    const amount = ethers.utils.parseEther('1.0')
    const otherGuyBalance = await signers[1].getBalance()
    await owner.sendTransaction({
      to: counter.address,
      value: amount, // Sends exactly 1.0 ether
    })
    expect(otherGuyBalance).to.eq(otherGuyBalance)
  })

  it('should be able to withdraw their deposits', async () => {
    const amount = ethers.utils.parseEther('1.0')
    await owner.sendTransaction({
      to: counter.address,
      value: amount,
    })
    const postSendBalance = await owner.getBalance()
    await counter['release(address)'](owner.address)
    const newBalance = await owner.getBalance()
    expect(newBalance.gt(postSendBalance)).to.eq(true)
  })

  it('should not get rewards for deposits distributed before deposits', async () => {
    const tx = counter['release(address)'](owner.address)
    await expect(tx).revertedWith('Counter: account has not deposited')
  })
})
