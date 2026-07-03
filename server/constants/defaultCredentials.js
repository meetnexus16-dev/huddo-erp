export const DEFAULT_USER_PASSWORD = 'password123';

export function formatDefaultPasswordMessage(baseMessage) {
  const trimmed = (baseMessage || 'User created successfully.').replace(/\s*Default login password:.*$/i, '').trim();
  return `${trimmed} Default login password: ${DEFAULT_USER_PASSWORD}.`;
}

export function withDefaultPasswordMeta(payload = {}, baseMessage) {
  return {
    ...payload,
    default_password: DEFAULT_USER_PASSWORD,
    message: formatDefaultPasswordMessage(baseMessage || payload.message)
  };
}
