export function isMobileOrTabletUserAgent(userAgent: string) {
  const normalizedUserAgent = userAgent.toLowerCase();
  const isMobile =
    /android.+mobile|iphone|ipod|windows phone|blackberry|bb10|mobile/.test(
      normalizedUserAgent,
    );
  const isTablet = /ipad|tablet|android(?!.*mobile)|kindle|silk|playbook/.test(
    normalizedUserAgent,
  );

  return isMobile || isTablet;
}

export function isMobileOrTabletRequest({
  secChUaMobile,
  secChUaPlatform,
  userAgent,
}: {
  secChUaMobile: string | null;
  secChUaPlatform: string | null;
  userAgent: string;
}) {
  if (secChUaMobile === '?1') {
    return true;
  }

  const platform = secChUaPlatform?.replaceAll('"', '').toLowerCase() ?? '';
  if (platform === 'android' || platform === 'ios') {
    return true;
  }

  return isMobileOrTabletUserAgent(userAgent);
}
