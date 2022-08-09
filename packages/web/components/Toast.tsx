import { Transition } from '@headlessui/react'
import React from 'react'

export default function Toast({ children }: { children: React.ReactElement }) {
  return (
    <Transition
      appear
      show
      enter='transition-opacity duration-75'
      enterFrom='opacity-0'
      enterTo='opacity-100'
      leave='transition-opacity duration-150'
      leaveFrom='opacity-100'
      leaveTo='opacity-0'
    >
      <div className='fixed bottom-0 inset-x-0 pb-2 sm:pb-5'>
        <div className='max-w-7xl mx-auto px-2 sm:px-6 lg:px-8'>
          <div className='p-2 rounded-lg bg-indigo-600 shadow-lg sm:p-3'>
            <div className='flex items-center justify-between flex-wrap'>
              <div className='w-0 flex-1 flex items-center'>
                <span className='flex items-center justify-center p-2 rounded-lg bg-indigo-800'>
                  <svg
                    className='animate-spin h-5 w-5 text-white'
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                  >
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      stroke-width='4'
                    ></circle>
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                    ></path>
                  </svg>
                </span>
                <p className='ml-3 font-medium text-white'>
                  <span className=''>{children}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  )
}
