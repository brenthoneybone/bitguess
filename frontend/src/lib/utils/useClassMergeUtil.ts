import { twMerge } from 'tailwind-merge'
import { type ClassValue, clsx } from 'clsx'

const merge = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export const useClassMergeUtil = () => ({
  merge,
})
