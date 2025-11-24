// import { diceParseAndFetchJobsFromURL } from "./dice";
import { loggingErrorFn } from "./linkedin-post";
export async function handleGetActiveTabUrl(
  sendResponse: (response: any) => void
) {
  let activeUrl: string | undefined;

  try {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (activeTab?.url) {
      activeUrl = activeTab.url;
      sendResponse({ activeUrl });
    } else {
      sendResponse({ error: "No active tab found" });
    }
  } catch (error) {
    loggingErrorFn("Error retrieving active tab data", error);
    sendResponse({ error: "Failed to retrieve active tab data" });
  }

  return {
    active: true,
    activeUrl,
  };
}

export function getQueryParams(url: string): Record<string, string | string[]> {
  const urlObj = new URL(url);
  const params: Record<string, string | string[]> = {};
  urlObj.searchParams.forEach((value, key) => {
    if (params[key]) {
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value);
      } else {
        params[key] = [params[key] as string, value];
      }
    } else {
      params[key] = value;
    }
  });
  console.log("main_params", params);

  return params;
}

export async function getCookie(
  url: string,
  name: string
): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.cookies.get({ url, name }, (cookie) => {
      if (cookie && cookie.value) {
        resolve(cookie.value); // Return only the cookie's value
      } else {
        resolve(null);
      }
    });
  });
}
