import bcryptjs from 'bcryptjs'

/**
 * Hash una contraseña usando bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    if (!password || password.trim().length === 0) {
      throw new Error('Contraseña no puede estar vacía')
    }
    const salt = await bcryptjs.genSalt(10)
    const hash = await bcryptjs.hash(password, salt)
    return hash
  } catch (err) {
    console.error('Error hashing password:', err)
    throw err
  }
}

/**
 * Comparar contraseña con su hash
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    if (!password || !hash) {
      return false
    }
    const isMatch = await bcryptjs.compare(password, hash)
    return isMatch
  } catch (err) {
    console.error('Error comparing password:', err)
    return false
  }
}

/**
 * Verificar si una contraseña está hasheada o en texto plano
 * Las contraseñas hasheadas con bcrypt siempre comienzan con $2a$, $2b$ o $2y$
 */
export const isPasswordHashed = (password: string): boolean => {
  return /^\$2[aby]\$/.test(password)
}
