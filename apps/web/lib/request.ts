export const rejectCrossOrigin = (request: Request): Response | null => {
  const origin = request.headers.get('origin');
  if (!origin) return null;
  if (origin !== new URL(request.url).origin) {
    return Response.json({ error: 'Cross-origin request rejected' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }
  return null;
};
