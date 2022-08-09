import { Transition } from '@headlessui/react'

export default function Error({ error, onClose }: { error: string | Error; onClose: () => void }) {
  return (
    <Transition
      show
      appear
      enter='transition-opacity duration-75'
      enterFrom='opacity-0'
      enterTo='opacity-100'
      leave='transition-opacity duration-150'
      leaveFrom='opacity-100'
      leaveTo='opacity-0'
    >
      <div className='fixed bottom-0 inset-x-0 pb-2 sm:pb-5' onClick={onClose}>
        <div className='max-w-7xl mx-auto px-2 sm:px-6 lg:px-8'>
          <div className='p-2 rounded-lg bg-red-600 shadow-lg sm:p-3'>
            <div className='flex items-center justify-between flex-wrap'>
              <div className='w-0 flex-1 flex items-center'>
                <span className='flex p-2 rounded-lg bg-red-800'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    className='h-6 w-6 text-white'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                    stroke-width='2'
                  >
                    <path
                      stroke-linecap='round'
                      stroke-linejoin='round'
                      d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                    />
                  </svg>
                </span>
                <p className='ml-3 font-medium text-white'>
                  <span className='md:hidden'>Oops!</span>
                  <span className='hidden md:inline'>
                    {typeof error === 'string'
                      ? error
                      : error.message || 'Something unexpected happened. Please try whatever you were doing again.'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  )
}
