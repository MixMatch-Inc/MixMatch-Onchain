const requiredPublicEnv = (name: 'NEXT_PUBLIC_API_URL'): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required public environment variable: ${name}`);
  }

  return value;
};

export const webEnv = {
  apiUrl: requiredPublicEnv('NEXT_PUBLIC_API_URL'),
};

