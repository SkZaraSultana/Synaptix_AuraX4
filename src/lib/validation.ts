export type ValidationResult = {
  valid: boolean
  message?: string
}

export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { valid: false, message: 'Email is required' }
  }
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}$/i
  if (!regex.test(email)) {
    return { valid: false, message: 'Invalid email format' }
  }
  // Must end with .com or .in
  if (!email.endsWith('.com') && !email.endsWith('.in')) {
    return { valid: false, message: 'Email must end with .com or .in' }
  }
  return { valid: true }
}

export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { valid: false, message: 'Password is required' }
  }
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' }
  }
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  if (!regex.test(password)) {
    return {
      valid: false,
      message: 'Password must contain: 1 uppercase, 1 lowercase, 1 number, 1 special character',
    }
  }
  return { valid: true }
}

export function validateName(name: string): ValidationResult {
  if (!name) {
    return { valid: false, message: 'Name is required' }
  }
  if (name.length < 3) {
    return { valid: false, message: 'Name must be at least 3 characters' }
  }
  const regex = /^[a-zA-Z\s]+$/
  if (!regex.test(name)) {
    return { valid: false, message: 'Name must contain only alphabets and spaces' }
  }
  return { valid: true }
}

export function validateConfirmPassword(password: string, confirmPassword: string): ValidationResult {
  if (!confirmPassword) {
    return { valid: false, message: 'Please confirm your password' }
  }
  if (password !== confirmPassword) {
    return { valid: false, message: 'Passwords do not match' }
  }
  return { valid: true }
}

