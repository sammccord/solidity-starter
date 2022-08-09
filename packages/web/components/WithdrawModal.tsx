import { Dialog } from '@headlessui/react'
import { FormEvent, FormEventHandler } from 'react'
import Modal, { ModalProps } from './Modal'

export default function WithdrawModal({
  open,
  onClose,
  onSubmit,
  available
}: { onSubmit: FormEventHandler<HTMLFormElement>; available: number } & Pick<ModalProps, 'onClose' | 'open'>) {
  return (
    <Modal open={open} onClose={onClose}>
      <Dialog.Panel className='relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full'>
        <form onSubmit={onSubmit}>
          <div className='bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4'>
            <div className='sm:flex sm:items-start'>
              <div className='mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 sm:mx-0 sm:h-10 sm:w-10'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  className='h-6 w-6 text-emerald-500'
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
              <div className='mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left'>
                <Dialog.Title as='h3' className='text-lg leading-6 font-medium text-gray-900'>
                  Withdraw Funds
                </Dialog.Title>
                <div className='mt-2'>
                  <p className='text-sm text-gray-500'>
                    <b>{available}</b> Available to withdraw
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className='bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse'>
            <button
              type='submit'
              className='w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-emerald-600 text-base font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:ml-3 sm:w-auto sm:text-sm'
            >
              Withdraw
            </button>
            <button
              type='button'
              className='mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm'
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </Dialog.Panel>
    </Modal>
  )
}
