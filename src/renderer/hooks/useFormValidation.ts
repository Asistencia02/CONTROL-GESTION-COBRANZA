import { useState, useCallback } from 'react'
import { z } from 'zod'

interface ValidationError {
  [key: string]: string
}

interface UseFormValidationOptions {
  schema: z.ZodSchema
  mode?: 'onChange' | 'onBlur' | 'onSubmit'
}

export const useFormValidation = <T extends Record<string, any>>(
  options: UseFormValidationOptions
) => {
  const [errors, setErrors] = useState<ValidationError>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validate = useCallback(
    async (data: Partial<T>) => {
      try {
        options.schema.parse(data)
        setErrors({})
        return true
      } catch (error) {
        if (error instanceof z.ZodError) {
          const newErrors: ValidationError = {}
          error.errors.forEach((err) => {
            const path = err.path.join('.')
            newErrors[path] = err.message
          })
          setErrors(newErrors)
        }
        return false
      }
    },
    [options.schema]
  )

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target

      if (options.mode === 'onChange' || touched[name]) {
        await validate({ [name]: value } as Partial<T>)
      }
    },
    [validate, touched, options.mode]
  )

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
    
    if (options.mode === 'onBlur' || options.mode === 'onChange') {
      validate({ [name]: e.target.value } as Partial<T>)
    }
  }, [validate, options.mode])

  const getFieldError = (fieldName: string): string | undefined => {
    return touched[fieldName] ? errors[fieldName] : undefined
  }

  return {
    errors,
    touched,
    validate,
    handleChange,
    handleBlur,
    getFieldError,
    setTouched,
    setErrors,
  }
}
