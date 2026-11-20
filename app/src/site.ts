// The public web address of ODDO. Change it here (or via EXPO_PUBLIC_SITE) when the own domain is live.
export const SITE = (process.env.EXPO_PUBLIC_SITE || 'https://oddosportsapp.com').replace(/\/$/, '');
export const SITE_HOST = SITE.replace(/^https?:\/\//, '');
