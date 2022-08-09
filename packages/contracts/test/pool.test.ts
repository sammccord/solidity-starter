import { expect } from 'chai'
import { ethers } from 'hardhat'
import '@nomiclabs/hardhat-ethers'

import { Pool__factory, Pool } from '../build/types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber } from 'ethers'

const { getContractFactory, getSigners } = ethers

describe('Pool', () => {
  let pool: Pool
  let signers: SignerWithAddress[]
  let team: SignerWithAddress
  let userA: SignerWithAddress
  let userB: SignerWithAddress
  let userC: SignerWithAddress
  let users: SignerWithAddress[]

  beforeEach(async () => {
    // 1
    signers = await getSigners()
    team = signers[0]
    users = signers.slice(1)
    userA = users[0]
    userB = users[1]
    userC = users[2]
    // 2
    const poolFactory = (await getContractFactory('Pool', signers[0])) as Pool__factory
    pool = await poolFactory.deploy()
    await pool.deployed()
    const initialDeposits = await pool.totalDeposits()
    const initialReleased = await pool.totalReleased()
    // 3
    expect(initialDeposits).to.eq(0)
    expect(initialReleased).to.eq(0)
    expect(pool.address).to.properAddress
  })

  it('should allow users to deposit to the pool', async () => {
    const amount = ethers.utils.parseEther('1.0')
    await pool.connect(userA).deposit({
      value: amount,
    })
    const releasable = await pool.connect(userA)['releasable()']()
    expect(releasable).to.eq(amount)
  })

  it('should track the total deposits made to the contract', async () => {
    const amount = ethers.utils.parseEther('1.0')
    await pool.connect(userA).deposit({
      value: amount,
    })
    const totalDeposits = await pool.totalDeposits()
    expect(totalDeposits).to.eq(amount)
  })

  it('should prevent users from withdrawing if they have not deposited', async () => {
    const tx = pool.connect(userA)['release(uint256)'](ethers.utils.parseEther('1.1'))
    expect(tx).revertedWith('account has no deposits')
  })

  it('should allow users to withdraw their deposits', async () => {
    const deposit = ethers.utils.parseEther('1.0')
    await pool.connect(userA).deposit({
      value: deposit,
    })
    const releasable = await pool['releasable(address)'](userA.address)
    expect(releasable).to.eq(deposit)

    const beforeReleaseBalance = await userA.getBalance()
    await pool.connect(userA)['release()']()
    const afterReleaseBalance = await userA.getBalance()
    expect(beforeReleaseBalance.lt(afterReleaseBalance)).to.eq(true)

    const released = await pool.released(userA.address)
    expect(released).to.eq(deposit)

    const totalReleased = await pool.totalReleased()
    expect(totalReleased).to.eq(deposit)
  })

  it('should allow users to withdraw an amount less than their deposit', async () => {
    const deposit = ethers.utils.parseEther('1.0')
    await pool.connect(userA).deposit({
      value: deposit,
    })

    const toWithdraw = deposit.div(2)
    await pool.connect(userA)['release(uint256)'](toWithdraw)

    const released = await pool.released(userA.address)
    expect(released).to.eq(toWithdraw)

    const releasable = await pool['releasable(address)'](userA.address)
    expect(releasable).to.eq(toWithdraw)
  })

  it('should allow users to specify an amount to withdraw greater than their rewards, but less than total deposit', async () => {
    const amount = ethers.utils.parseEther('1.0')
    await pool.connect(userA).deposit({
      value: amount,
    })

    // they should have 2, 100% of rewards
    await pool.connect(team).reward({
      value: amount,
    })

    const toWithdraw = amount.add(amount.div(2)) // 1.5
    await pool.connect(userA)['release(uint256)'](toWithdraw)

    const released = await pool.released(userA.address)
    expect(released).to.eq(toWithdraw)

    const remainingDeposits = await pool['deposits(address)'](userA.address)
    expect(remainingDeposits).to.eq(amount.div(2))

    const remainingRewards = await pool['rewards(address)'](userA.address)
    expect(remainingRewards).to.eq(0)
  })

  it('should prevent users from withdrawing more than is releasable', async () => {
    const deposit = ethers.utils.parseEther('1.0')
    await pool.connect(userA).deposit({
      value: deposit,
    })
    const tx = pool.connect(userA)['release(uint256)'](ethers.utils.parseEther('1.1'))
    expect(tx).revertedWith('account cannot release more than what is owed')
  })

  it('should prevent non-team members from distributing rewards', async () => {
    const tx = pool.connect(userA).reward({ value: ethers.utils.parseEther('1.0') })
    await expect(tx).revertedWith('Ownable: caller is not the owner')
  })

  it('should allow the team to deposit rewards', async () => {
    const amount = ethers.utils.parseEther('1.0')
    await pool.connect(userA).deposit({
      value: amount,
    })

    await pool.connect(team).reward({
      value: amount,
    })

    const releasable = await pool['releasable(address)'](userA.address)
    expect(releasable).to.eq(amount.mul(2))

    const rewards = await pool['rewards(address)'](userA.address)
    expect(rewards).to.eq(amount)
  })

  it('should allow multiple users to share the pool', async () => {
    const amount = ethers.utils.parseEther('1.0')
    await pool.connect(userA).deposit({
      value: amount,
    })
    await pool.connect(userB).deposit({
      value: amount,
    })

    await pool.connect(userC).deposit({
      value: amount,
    })

    await pool.connect(team).reward({
      value: amount,
    })

    const individualShare = BigNumber.from(amount).add(amount.div(3))
    const aReleasable = await pool['releasable(address)'](userA.address)
    expect(aReleasable).to.eq(individualShare)
    const bReleasable = await pool['releasable(address)'](userB.address)
    expect(bReleasable).to.eq(individualShare)
  })

  it('should only award users based on their share of the pool at the time rewards were distributed', async () => {
    const amount = ethers.utils.parseEther('1.0')
    await pool.connect(userA).deposit({
      value: amount,
    })

    await pool.connect(team).reward({
      value: amount,
    })
    await pool.connect(userB).deposit({
      value: amount,
    })

    const aReleasable = await pool['releasable(address)'](userA.address)
    expect(aReleasable).to.eq(amount.mul(2))

    const aRewards = await pool['rewards(address)'](userA.address)
    expect(aRewards).to.eq(amount)

    const bReleasable = await pool['releasable(address)'](userB.address)
    expect(bReleasable).to.eq(amount)

    const bRewards = await pool['rewards(address)'](userB.address)
    expect(bRewards).to.eq(BigNumber.from(0))
  })
})
