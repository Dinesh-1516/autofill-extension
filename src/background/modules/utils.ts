export const loggingErrorFn = (message: string, error: unknown) => {
  return console.error(`${message}:`, error);
};

export async function getCookie(
  url: string,
  name: string
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    chrome.cookies.get({ url, name }, (cookie) => {
      if (chrome.runtime.lastError) {
        loggingErrorFn(
          "Error retrieving cookie",
          chrome.runtime.lastError.message
        );
        return reject(new Error(chrome.runtime.lastError.message));
      }
      resolve(cookie ? cookie.value : null);
    });
  });
}

export async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}



export async function retryableFetch(
  fn: (...args: any[]) => Promise<any>,
  args: any[],
  maxRetries = 3,
  delayMs = 1000
) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn(...args);
    } catch (err: any) {
      if (
        err.message.includes("ERR_NETWORK_CHANGED") ||
        err.message.includes("NetworkError") ||
        err.message.includes("Failed to fetch")
      ) {
        console.warn(
          `Network issue detected (attempt ${attempt + 1}): ${err.message}`
        );
        attempt++;
        await new Promise((res) => setTimeout(res, delayMs * attempt));
      } else {
        throw err;
      }
    }
  }
  throw new Error("Max retries reached for network error");
}
