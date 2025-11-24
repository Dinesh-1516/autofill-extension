/**
 * Sends a LinkedIn connection request to a single user.
 * This is a fully self-contained async function.
 * @returns A success message string.
 * @throws An error if any step fails.
 */
export const sendLinkedinConnect = async (
  profileUrl: string,
  message: string,
  csrfToken: string
): Promise<string> => {
  // 1. Get the Profile URN from the profile URL
  const profileId = profileUrl.split("in/")[1].split("/")[0];
  const profileApiUrl = `https://www.linkedin.com/voyager/api/identity/dash/profiles?decorationId=com.linkedin.voyager.dash.deco.identity.profile.WebTopCardCore-9&memberIdentity=${profileId}&q=memberIdentity`;

  const profileResponse = await fetch(profileApiUrl, {
    method: "GET",
    headers: { "csrf-token": csrfToken },
  });

  if (!profileResponse.ok) {
    throw new Error(
      `Failed to fetch profile data. Status: ${profileResponse.status}`
    );
  }

  const profileJson = await profileResponse.json();
  const profileUrn = profileJson?.elements?.[0]?.entityUrn;

  if (!profileUrn) {
    throw new Error(`Could not extract profile URN for ${profileId}.`);
  }

  // 2. Send the connection request using the Profile URN
  const connectApiUrl =
    "https://www.linkedin.com/voyager/api/voyagerRelationshipsDashMemberRelationships?action=verifyQuotaAndCreate";
  const connectPayload = {
    inviteeProfileUrn: profileUrn,
    customMessage: message,
  };

  const connectResponse = await fetch(connectApiUrl, {
    method: "POST",
    headers: {
      "csrf-token": csrfToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(connectPayload),
  });

  if (!connectResponse.ok) {
    // LinkedIn often returns 4xx/5xx with a JSON body explaining the error
    const errorJson = await connectResponse.json();
    throw new Error(
      `Connection request failed: ${errorJson?.message || "Unknown error"}`
    );
  }

  return `Successfully sent connect request to ${profileId}.`;
};

/**
 * A helper function to promisify chrome.cookies.get and fetch the CSRF token.
 * This makes our logic cleaner and reusable.
 */
export const getCsrfToken = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    chrome.cookies.get(
      {
        url: "https://www.linkedin.com",
        name: "JSESSIONID",
      },
      (cookie) => {
        if (cookie && cookie.value) {
          resolve(cookie.value.replace(/"/g, ""));
        } else {
          reject(
            new Error(
              "LinkedIn CSRF token (JSESSIONID cookie) not found. Are you logged in?"
            )
          );
        }
      }
    );
  });
};
