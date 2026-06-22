declare module 'sonner' {
  import type { ReactNode, ComponentProps } from 'react'

  interface ToastT {
    id: string | number
    title?: string
    description?: ReactNode
    duration?: number
    action?: {
      label: string
      onClick: () => void
    }
    cancel?: {
      label: string
      onClick: () => void
    }
    onDismiss?: () => void
    onAutoClose?: () => void
    important?: boolean
  }

  interface ToasterProps extends ComponentProps<'div'> {
    richColors?: boolean
    closeButton?: boolean
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center'
    hotkey?: string[]
    expand?: boolean
    duration?: number
    visibleToasts?: number
    offset?: string | number
    dir?: 'ltr' | 'rtl'
    className?: string
    style?: React.CSSProperties
    toastOptions?: {
      className?: string
      style?: React.CSSProperties
    }
  }

  interface ToastFn {
    (message: string | ReactNode): string | number
    (message: string | ReactNode, data?: Partial<ToastT>): string | number
    loading: (message: string | ReactNode, data?: Partial<ToastT>) => string | number
    success: (message: string | ReactNode, data?: Partial<ToastT>) => string | number
    error: (message: string | ReactNode, data?: Partial<ToastT>) => string | number
    info: (message: string | ReactNode, data?: Partial<ToastT>) => string | number
    warning: (message: string | ReactNode, data?: Partial<ToastT>) => string | number
    dismiss: (id?: string | number) => void
    promise: <T>(
      promise: Promise<T>,
      data?: {
        loading?: string | ReactNode
        success?: string | ReactNode | ((data: T) => string | ReactNode)
        error?: string | ReactNode | ((error: unknown) => string | ReactNode)
      }
    ) => Promise<T>
  }

  export const toast: ToastFn
  export const Toaster: (props: ToasterProps) => ReactNode
}
