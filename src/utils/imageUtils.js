const imageCache = new Map();
const TTL = 5 * 60 * 1000; // 5 minutes

export async function checkImage(url) {
  const now = Date.now();

  // Check cache
  if (imageCache.has(url)) {
    const { value, expiry } = imageCache.get(url);
    if (now < expiry) return value;
    imageCache.delete(url);
  }

  let isValid = false;

  try {
    // Try HEAD first
    let res = await fetch(url, { method: "HEAD" });

    // Fallback to GET if HEAD fails
    if (!res.ok) {
      res = await fetch(url, { method: "GET" });
    }

    if (res.ok) {
      const contentType = res.headers.get("content-type");
      isValid = contentType?.startsWith("image");
    }
  } catch {
    isValid = false;
  }

  // Cache with TTL (shorter for failures)
  imageCache.set(url, {
    value: isValid,
    expiry: now + (isValid ? TTL : 60 * 1000), // 1 min for failures
  });

  return isValid;
}