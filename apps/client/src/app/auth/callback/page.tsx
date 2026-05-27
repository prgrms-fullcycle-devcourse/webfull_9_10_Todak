import AuthCallbackClient from './AuthCallbackClient';

interface AuthCallbackPageProps {
  searchParams: Promise<{
    token?: string | string[];
  }>;
}

export default async function AuthCallbackPage({
  searchParams,
}: AuthCallbackPageProps) {
  const params = await searchParams;
  const token = Array.isArray(params.token)
    ? (params.token[0] ?? null)
    : (params.token ?? null);

  return <AuthCallbackClient token={token} />;
}
