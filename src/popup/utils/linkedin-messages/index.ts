async function getCookie(
  url: string,
  name: string
): Promise<chrome.cookies.Cookie | null> {
  return new Promise((resolve) => {
    chrome.cookies.get({ url, name }, (cookie) => {
      resolve(cookie);
    });
  });
}

async function getLatestFirebaseToken(): Promise<string | null> {
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

export const fetchLinkedinUserDetails = async () => {
  function requestStats() {
    console.log("token2: ", chrome.cookies);
    // loginApi.getUserInfo().then((response) => {
    //   console.log("Debug login resp", response);
    //   if (response.data.Response === "Ok") {
    //   }
    // });
    // getUserInfo.then((response) => {
    //   console.log("Debug login resp", response);
    //   if (response.data.Response === "Ok") {
    //   }
    // });
    chrome.cookies.get(
      {
        url: "https://www.linkedin.com",
        name: "JSESSIONID",
      },
      extractTokenAndPerformRequest
    );
  }
  async function extractTokenAndPerformRequest(cookie: any) {
    console.log("token1: ", cookie);
    if (!cookie) {
      console.log("token0: ");
      return;
    }
    const token = cookie.value.replace(/"/g, "");
    let vrl =
      "https://www.linkedin.com/voyager/api/messaging/conversations?keyVersion=LEGACY_INBOX";
    const req = new Request(vrl, {
      method: "GET",
      headers: new Headers({
        accept: "application/json",
        "Content-Type": "application/json",
        "csrf-token": token,
      }),
      credentials: "include",
    });
    const baseURL = "https://hire10x.10xscale.ai/api/v1";
    let mydetails = baseURL + "/user/me/";
    // const instance = axios.create({
    //   baseURL: live,
    // });
    const firebaseToken = getLatestFirebaseToken();

    const tokendata: string | null = await firebaseToken;

    const request = new Request(mydetails, {
      method: "GET",
      headers: new Headers({
        "Content-Type": "application/json",
        Authorization: tokendata || "",
      }),
    });

    // const config = {
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    // };

    // instance.get("/user/me/", config).then((res) => console.log("ress - ", res));
    // fetch(req)
    //   .then((res) => console.log("ress - ", res))
    //   .catch((e) => {
    //     console.log("Error: ", e);
    //   })
    //   .then((json) => {});

    fetch(request)
      .then((res) => {
        console.log("json test new res: ", res);
        return res.json();
      })
      .catch((e) => {
        console.log("Error: ", e);
      })
      .then((pjson) => {
        console.log("json test new1: ", pjson?.Data.user_id);
        let userid = pjson?.Data?.user_id;
        fetch(req)
          .then((res) => res.json())
          .catch((e) => {
            console.log("Error: ", e);
          })
          .then((json) => {
            console.log("json test: ", json);
            let id = json?.["elements"]?.[0]?.["sdkEntityUrn"]
              ?.split("(")?.[1]
              ?.split(",")?.[0];
            console.log("linkedin_id", id);
            if (id) requestStats1(id, userid);
          });
      });
  }

  requestStats();

  function requestStats1(uid: any, userid: any) {
    console.log("token2: ", chrome.cookies);
    chrome.cookies.get(
      {
        url: "https://www.linkedin.com",
        name: "JSESSIONID",
      },
      (cookie) => extractTokenAndPerformRequest1(cookie, uid, userid)
    );
  }
  function extractTokenAndPerformRequest1(cookie: any, id: any, userid: any) {
    console.log("token1: ", cookie);
    console.log("UID Full: ", id);
    console.log("UID: ", id.split(":")[2]);
    let uid = id.split(":");
    if (!cookie) {
      console.log("token0: ");
      return;
    }

    const token = cookie.value.replace(/"/g, "");

    let new_linkedin =
      "https://www.linkedin.com/voyager/api/identity/dash/profiles?decorationId=com.linkedin.voyager.dash.deco.identity.profile.WebTopCardCore-9&memberIdentity=" +
      uid[uid.length - 1] +
      "&q=memberIdentity";

    const req1 = new Request(new_linkedin, {
      method: "GET",
      headers: new Headers({
        accept: "application/json",
        "Content-Type": "application/json",
        "csrf-token": token,
      }),
      credentials: "include",
    });

    fetch(req1)
      .then((res) => res.json())
      .catch((e: any) => {
        console.log("EEE", e);

        // sendResponse({ msg: "pls open your linkedin" });
      })
      .then((json) => {
        console.log("json test Final: ", json);
        // const key = "Test";
        // const value = "SomeValue";
        // chrome.storage.local.set({ key: value }, () => {});
        //     chrome.storage.local.set({ [key]: value }, function () {
        //   console.log("DEBUG1 ", "Test");
        // });
        const fName = json.elements[0].firstName;
        const lName = json.elements[0].lastName;
        const fullName = fName + " " + lName;
        console.log("Full Name2: ", fullName);
        const dataToStore = {
          userName: fullName,
        };
        console.log("userid - ", userid, dataToStore);
        // const collectionRef = db.collection("linkedinCurrentUserName");

        // setDoc(doc(db, "linkedinCurrentUserName", userid), {
        //   userName: fullName,
        // });
        // chrome.storage.local.set(dataToStore, function () {
        //   if (chrome.runtime.lastError) {
        //     console.error("Error storing data: ", chrome.runtime.lastError);
        //   } else {
        //     console.log("Data stored successfully!");
        //   }
        // });
      });
  }
};
