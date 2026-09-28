export function assetUrl(url: string): string {
  const serverRoot = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api").replace(/\/api\/?$/, "");
  return url.startsWith("/uploads/") ? `${serverRoot}${url}` : url;
}
