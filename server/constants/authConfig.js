/** Session lifetime — refresh token keeps users signed in (default 30 days). */
export const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '30d';

/** Access token lifetime (renewed silently via refresh token when needed). */
export const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15d';
