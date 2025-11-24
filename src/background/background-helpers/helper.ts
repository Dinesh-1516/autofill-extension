export async function getCookie(
  url: string,
  name: string
): Promise<chrome.cookies.Cookie | null> {
  return new Promise((resolve) => {
    chrome.cookies.get({ url, name }, (cookie) => {
      resolve(cookie);
    });
  });
}

export async function getLatestFirebaseToken(): Promise<string | null> {
  console.log("getLatestFirebaseToken invoked");

  const domains = ["https://hire10x.10xscale.ai/*"];

  for (const domain of domains) {
    const cookie = await getCookie(domain, "firebase_id_token");
    if (cookie?.value) {
      console.log(`Found token in domain: ${domain}`);
      return cookie.value;
    }
  }

  console.log("No firebase_id_token found in any domain");
  return null;
}
