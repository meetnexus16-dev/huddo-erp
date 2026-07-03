export const DEFAULT_USER_PASSWORD = 'password123';

export const DEFAULT_PASSWORD_LABEL = `Default login password: ${DEFAULT_USER_PASSWORD}`;

export function getUserCreatedMessage(baseMessage = 'User created successfully.') {
  return `${baseMessage} ${DEFAULT_PASSWORD_LABEL}. Ask them to change it after first login.`;
}
