import { Dialog, Transition } from '@headlessui/react'
import { CheckCircleIcon } from '@heroicons/react/solid'
import { BigNumber, ContractTransaction } from 'ethers'
import { formatEther, formatUnits, parseEther } from 'ethers/lib/utils'
import type { NextPage } from 'next'
import { FormEvent, useCallback, useEffect, useReducer, useState } from 'react'
import Modal from '../components/Modal'
import usePool from '../hooks/usePool'
import { useImmerReducer } from 'use-immer'
import { hooks, metaMask } from '../lib/connectors/metamask'
import Toast from '../components/Toast'
import Err from '../components/Error'
import dynamic from 'next/dynamic'

const WithdrawModal = dynamic(() => import('../components/WithdrawModal'), { ssr: false })
const DepositModal = dynamic(() => import('../components/DepositModal'), { ssr: false })

const { useAccounts, useIsActive, useProvider } = hooks

interface PoolState {
  currentBalance?: BigNumber
  totalDeposits?: BigNumber
  totalReleased?: BigNumber
  myDeposit?: BigNumber
  myRewards?: BigNumber
  releasable?: BigNumber
}

const initialState = {
  currentBalance: undefined,
  totalDeposits: undefined,
  totalReleased: undefined,
  myDeposit: undefined,
  myRewards: undefined,
  releasable: undefined
}

enum PoolEvents {
  DepositReceived = 'DepositReceived',
  RewardsDistributed = 'RewardsDistributed',
  PaymentReleased = 'PaymentReleased',
  PaymentReceived = 'PaymentReceived'
}

const initialOperations: Record<
  PoolEvents,
  { pending: ContractTransaction[]; completed: Partial<ContractTransaction[]> }
> = {
  [PoolEvents.DepositReceived]: { pending: [], completed: [] },
  [PoolEvents.RewardsDistributed]: { pending: [], completed: [] },
  [PoolEvents.PaymentReleased]: { pending: [], completed: [] },
  [PoolEvents.PaymentReceived]: { pending: [], completed: [] }
}

type ModalState = 'depositing' | 'withdrawing' | undefined

function operationReducer(
  state = initialOperations,
  action: { event: PoolEvents; pending?: ContractTransaction; received?: Partial<ContractTransaction> }
) {
  if (action.pending) {
    state[action.event].pending.push(action.pending)
  }

  if (action.received) {
    const i = state[action.event].pending.findIndex((tx) => tx.from === action.received?.from)
    if (i > -1) {
      state[action.event].completed.push(...state[action.event].pending.splice(i, 1))
    }
  }
}

const Home: NextPage = () => {
  const accounts = useAccounts()
  const isActive = useIsActive()
  const provider = useProvider()
  const pool = usePool(provider)

  const [operations, dispatch] = useImmerReducer(operationReducer, initialOperations)
  const [error, setError] = useState<Error | string | undefined>(undefined)

  const [{ totalDeposits, totalReleased, myDeposit, myRewards, currentBalance, releasable }, setState] =
    useState<PoolState>(initialState)
  const [modalState, setModalState] = useState<ModalState>(undefined)

  // pull all
  const handleChange = useCallback(async () => {
    if (!pool || !accounts?.length) return
    try {
      const [currentBalance, totalDeposits, totalReleased, myDeposit, myRewards, releasable] = await Promise.all([
        accounts?.length ? provider?.getBalance(accounts[0]) : Promise.resolve(undefined),
        pool.totalDeposits(),
        pool.totalReleased(),
        pool['deposits(address)'](accounts[0]),
        pool['rewards(address)'](accounts[0]),
        pool['releasable(address)'](accounts[0])
      ])
      setState({
        totalDeposits,
        totalReleased,
        myDeposit,
        myRewards,
        currentBalance,
        releasable
      })
    } catch (e) {
      setError(e as Error)
    }
  }, [setState, setError, accounts, pool])

  const handleDeposit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      try {
        e.preventDefault()
        console.log(e)
        const {
          deposit: { value }
        } = (e.target as HTMLFormElement).elements as unknown as {
          deposit: HTMLInputElement
        }
        const signer = provider?.getSigner()
        if (!signer) throw new Error('Failed to get signer')
        const tx = await pool?.connect(signer).deposit({ value: parseEther(value) })
        dispatch({ event: PoolEvents.DepositReceived, pending: tx })
        handleChange()
      } catch (e) {
        console.error(e)
        setError(e as Error)
      } finally {
        setModalState(undefined)
      }
    },
    [provider, setError, handleChange]
  )

  const handleWithdraw = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      try {
        e.preventDefault()
        const signer = provider?.getSigner()
        if (!signer) throw new Error('Failed to get signer')
        const tx = await pool?.connect(signer)['release()']()
        dispatch({ event: PoolEvents.PaymentReleased, pending: tx })
        handleChange()
      } catch (e) {
        console.error(e)
        setError(e as Error)
      } finally {
        setModalState(undefined)
      }
    },
    [provider, setError, handleChange]
  )

  // Get initial state from chain if active
  useEffect(() => {
    if (pool && isActive) handleChange()
  }, [isActive, pool, handleChange])

  // attempt to connect eagerly on mount
  useEffect(() => {
    void metaMask.connectEagerly().catch(() => {
      console.debug('Failed to connect eagerly to metamask')
    })
  }, [])

  useEffect(() => {
    const handleFocus = () => {
      handleChange()
    }
    window.addEventListener('focus', handleFocus)

    // handle listen for deposit
    const depositHandler = (address: string, amount: BigNumber) => {
      const event = { event: PoolEvents.DepositReceived, received: { from: address, value: amount } }
      console.log(event)
      dispatch(event)
      handleChange()
    }
    pool?.on(PoolEvents.DepositReceived, depositHandler)

    // handle listen for rewards
    const rewardsHandler = () => {
      const event = { event: PoolEvents.RewardsDistributed, received: {} }
      console.log(event)
      handleChange()
    }
    pool?.on(PoolEvents.RewardsDistributed, rewardsHandler)

    // handle listen for payment releases
    const releaseHandler = (address: string, amount: BigNumber) => {
      const event = { event: PoolEvents.PaymentReleased, received: { from: address, value: amount } }
      console.log(event)
      dispatch(event)
      handleChange()
    }
    pool?.on(PoolEvents.PaymentReleased, releaseHandler)
    return () => {
      window.removeEventListener('focus', handleFocus)
      pool?.off(PoolEvents.PaymentReleased, releaseHandler)
      pool?.off(PoolEvents.RewardsDistributed, rewardsHandler)
      pool?.off(PoolEvents.DepositReceived, depositHandler)
    }
  }, [pool, operations, dispatch, handleChange])

  return (
    <>
      <main className='flex-1 pb-8'>
        {/* Page header */}
        <div className='bg-white shadow'>
          <div className='px-4 sm:px-6 lg:max-w-6xl lg:mx-auto lg:px-8'>
            <div className='py-6 md:flex md:items-center md:justify-between lg:border-t lg:border-gray-200'>
              <div className='flex-1 min-w-0'>
                {/* Profile */}
                <div className='flex items-center'>
                  <svg
                    version='1.1'
                    id='Layer_2'
                    xmlns='http://www.w3.org/2000/svg'
                    x='0px'
                    y='0px'
                    viewBox='0 0 500 500'
                    enable-background='new 0 0 500 500'
                    xmlSpace='preserve'
                    className='hidden h-16 w-16 rounded-full sm:block'
                  >
                    <polygon fill='#2F3030' points='249.982,6.554 397.98,251.112 250.53,188.092 ' />
                    <polygon fill='#828384' points='102.39,251.112 249.982,6.554 250.53,188.092 ' />
                    <polygon fill='#343535' points='249.982,341.285 102.39,251.112 250.53,188.092 ' />
                    <polygon fill='#131313' points='397.98,251.112 250.53,188.092 249.982,341.285 ' />
                    <polygon fill='#2F3030' points='249.982,372.329 397.98,284.597 249.982,493.13 ' />
                    <polygon fill='#828384' points='249.982,372.329 102.39,284.597 249.982,493.13 ' />
                  </svg>
                  <div>
                    <div className='flex items-center'>
                      <svg
                        version='1.1'
                        id='Layer_2'
                        xmlns='http://www.w3.org/2000/svg'
                        x='0px'
                        y='0px'
                        viewBox='0 0 500 500'
                        enable-background='new 0 0 500 500'
                        xmlSpace='preserve'
                        className='h-16 w-16 rounded-full sm:hidden'
                      >
                        <polygon fill='#2F3030' points='249.982,6.554 397.98,251.112 250.53,188.092 ' />
                        <polygon fill='#828384' points='102.39,251.112 249.982,6.554 250.53,188.092 ' />
                        <polygon fill='#343535' points='249.982,341.285 102.39,251.112 250.53,188.092 ' />
                        <polygon fill='#131313' points='397.98,251.112 250.53,188.092 249.982,341.285 ' />
                        <polygon fill='#2F3030' points='249.982,372.329 397.98,284.597 249.982,493.13 ' />
                        <polygon fill='#828384' points='249.982,372.329 102.39,284.597 249.982,493.13 ' />
                      </svg>
                      <h1 className='ml-3 text-2xl font-bold leading-7 text-gray-900 sm:leading-9 sm:truncate'>
                        ETH Pool
                      </h1>
                    </div>
                    <dl className='mt-6 flex flex-col sm:ml-3 sm:mt-1 sm:flex-row sm:flex-wrap'>
                      <dt className='sr-only'>Account status</dt>
                      <dd className='mt-3 flex items-center text-sm text-gray-500 font-medium sm:mr-6 sm:mt-0'>
                        <CheckCircleIcon className='flex-shrink-0 mr-1.5 h-5 w-5 text-emerald-400' aria-hidden='true' />
                        A really great way to get paid for doing almost nothing
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className='mt-6 flex space-x-3 md:mt-0 md:ml-4'>
                {isActive ? (
                  <>
                    <button
                      onClick={() => setModalState('depositing')}
                      type='button'
                      className='inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500'
                    >
                      Deposit
                    </button>
                    <button
                      onClick={() => setModalState('withdrawing')}
                      type='button'
                      className='inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500'
                    >
                      Withdraw
                    </button>
                  </>
                ) : (
                  <button
                    type='button'
                    onClick={() => {
                      void metaMask
                        .activate()
                        .then(() => setError(undefined))
                        .catch(setError)
                    }}
                    className='inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500'
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className='mt-8'>
          <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8'>
            <h2 className='text-lg leading-6 font-medium text-gray-900'>Overview</h2>
            <div className='mt-2 grid grid-cols-2 gap-5 md:grid-cols-4'>
              <div className='bg-white overflow-hidden shadow rounded-lg'>
                <div className='p-5'>
                  <div className='flex items-center'>
                    <div className='flex-shrink-0'>
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        className='h-6 w-6 text-gray-400'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10'
                        />
                      </svg>
                    </div>
                    <div className='ml-5 w-0 flex-1'>
                      <dl>
                        <dt className='text-sm font-medium text-gray-500 truncate'>Total Deposited</dt>
                        <dd>
                          <div className='text-lg font-medium text-gray-900'>
                            {totalDeposits ? formatUnits(totalDeposits) : 0}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              <div className='bg-white overflow-hidden shadow rounded-lg'>
                <div className='p-5'>
                  <div className='flex items-center'>
                    <div className='flex-shrink-0'>
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        className='h-6 w-6 text-gray-400'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
                        />
                      </svg>
                    </div>
                    <div className='ml-5 w-0 flex-1'>
                      <dl>
                        <dt className='text-sm font-medium text-gray-500 truncate'>Total Paid</dt>
                        <dd>
                          <div className='text-lg font-medium text-gray-900'>
                            {totalReleased ? formatUnits(totalReleased) : 0}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              <div className='bg-white overflow-hidden shadow rounded-lg'>
                <div className='p-5'>
                  <div className='flex items-center'>
                    <div className='flex-shrink-0'>
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        className='h-6 w-6 text-gray-400'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          d='M17 16v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2h2m3-4H9a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-1m-1 4l-3 3m0 0l-3-3m3 3V3'
                        />
                      </svg>
                    </div>
                    <div className='ml-5 w-0 flex-1'>
                      <dl>
                        <dt className='text-sm font-medium text-gray-500 truncate'>Your Deposits</dt>
                        <dd>
                          <div className='text-lg font-medium text-gray-900'>
                            {myDeposit ? formatUnits(myDeposit) : 0}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              <div className='bg-white overflow-hidden shadow rounded-lg'>
                <div className='p-5'>
                  <div className='flex items-center'>
                    <div className='flex-shrink-0'>
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        className='h-6 w-6 text-gray-400'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                        stroke-width='2'
                      >
                        <path stroke-linecap='round' stroke-linejoin='round' d='M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' />
                      </svg>
                    </div>
                    <div className='ml-5 w-0 flex-1'>
                      <dl>
                        <dt className='text-sm font-medium text-gray-500 truncate'>Available Rewards</dt>
                        <dd>
                          <div className='text-lg font-medium text-gray-900'>
                            {myRewards ? formatUnits(myRewards) : 0}
                          </div>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <DepositModal
        open={modalState === 'depositing'}
        onClose={() => setModalState(undefined)}
        available={currentBalance ? +formatEther(currentBalance) : 0}
        onSubmit={handleDeposit}
      ></DepositModal>
      <WithdrawModal
        open={modalState === 'withdrawing'}
        onClose={() => setModalState(undefined)}
        available={releasable ? +formatEther(releasable) : 0}
        onSubmit={handleWithdraw}
      />
      {error && <Err error={error} onClose={() => setError(undefined)} />}
      {Object.values(operations).some((op) => op.pending.length > 0) && (
        <Toast>
          <>Confirming transaction...</>
        </Toast>
      )}
    </>
  )
}

export default Home
