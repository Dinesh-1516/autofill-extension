// src/background/background.ts (UPDATED - Auto-import removed)
import { handleGetActiveTabUrl } from "../popup/utils/global";
import { LinkedInJobFetcher } from "./../popup/utils/linkedin/index";
import { v4 as uuidv4 } from "uuid";

import { getCookie, getLatestFirebaseToken } from "./background-helpers/helper";
import {
  getCsrfToken,
  sendLinkedinConnect,
} from "./modules/linkedin/connect-request";
import { initializeAutofillData, handleAutofillMessages } from "./autofill-background";

let capturedUrls: string = "";
let linkedinTabUrl: string = "";

type MessageElement = {
  deliveredAt: number;
  body: { text: string };
  sender: {
    participantType: {
      member: {
        firstName: { text: string };
        lastName: { text: string };
      };
    };
  };
};

type MessengerResponse = {
  data?: {
    messengerMessagesByAnchorTimestamp?: {
      elements?: MessageElement[];
    };
    messengerConversationsByRecipients?: {
      elements?: {
        entityUrn?: string;
      }[];
    };
  };
};

interface CandidateProfile {
  url: string;
  candidateId: string;
}

interface ProcessResult {
  total: number;
  success: number;
  failed: number;
  failures: { candidate: CandidateProfile; error: string }[];
}

chrome.runtime.onInstalled.addListener(() => {
  const manifest = chrome.runtime.getManifest();
  const version = manifest.version;
  console.log("Extension successfully installed. Version:", version);

  // ✅ INITIALIZE AUTOFILL DATA
  initializeAutofillData();
});

console.log(linkedinTabUrl);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // ✅ FIRST, CHECK IF IT'S AN AUTOFILL MESSAGE
  const autofillHandled = handleAutofillMessages(message, sender, sendResponse);
  if (autofillHandled) {
    return true; // Message handled by autofill module
  }

  // Otherwise, handle existing LinkedIn/Career Pilot messages
  if (message === "getLogData") {
    sendResponse("message from background.ts");
  } else if (message.type === "GET_ACTIVE_TAB_URL") {
    (async () => {
      try {
        const url = await handleGetActiveTabUrl(sendResponse);
        console.log("main_url_base", url);

        if (url.activeUrl?.includes("linkedin")) {
          linkedinTabUrl = url.activeUrl;
          console.log(
            "selected_tab_url_for_linkedin_if_we_want_another_save_and_add_from_here",
            linkedinTabUrl
          );
        }
        sendResponse({ url: url.activeUrl });
      } catch (error) {
        console.error("Error in handling active tab URL:", error);
        sendResponse({ error: "Failed to retrieve active tab URL" });
      }
    })();
    return true;
  } else if (message.action === "getCapturedUrls") {
    sendResponse(capturedUrls);
  } else if (message.action === "fetch_Linkedin_job_data") {
    console.log("fetch_Linkedin_job_data invoked", message);
    console.log(
      "fetch_Linkedin_job_data_in_background",
      message.startPage,
      message.endPage
    );
    if (message.startPage && message.endPage && linkedinTabUrl.length > 0) {
      LinkedInJobFetcher.fetchAndProcessInBatches(
        message.startPage,
        message.endPage,
        linkedinTabUrl
      );
    }
  }
  return true;
});


chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log("Tab Data", tab);

  if (changeInfo.url && changeInfo.url.includes("linkedin.com/jobs/search")) {
    linkedinTabUrl = changeInfo.url;
    console.log("Updated LinkedIn URL:", linkedinTabUrl);

    chrome.tabs.sendMessage(tabId, { action: "activateLinkedInComponent" });
  }
});

// Linkedin Message and Connect request related code

function processResponseMsg(
  json: any,
  user_id: any,
  token: any,
  sendResponse: any
) {
  console.log("processResponseMsg params", json, user_id, token, sendResponse);
  let { elements, metadata, paging } = json;

  console.log("elements: ", elements);
  console.log("metadata: ", metadata);
  console.log("paging: ", paging);

  // const unreadCount = metadata.unreadCount;
  //const totalMessages = paging.total;
  if (elements == undefined) {
    elements = json["data"]["messengerConversationsByCategory"]["elements"];
  }

  const messages: any = [];

  let new_messages: any = [];

  //send it to the firestore
  let timestamp = Date.now();
  let sdkEntityUrns: any[] = [];
  let detail_urls: any[] = [];
  let originTokens: any[] = [];
  let texts: any[] = [];
  let from_senders: any[] = [];
  let to_senders: any[] = [];
  let is_reads: any[] = [];
  let messages_to_share: any[] = [];
  let main_message_read_status: any[] = [];
  let lastActivityAts: any[] = [];
  let unique_identifiers: any[] = [];
  let sdk_urls_orig: any[] = [];
  let mailbox_urns: any[] = [];
  let profile_images_data: any[] = [];
  let profile_urls: any[] = [];

  let from_linkedin_ids: any[] = [];
  console.log(
    "Main Messages console",
    messages_to_share,
    new_messages,
    messages,
    elements
  );

  elements?.forEach((k: any) => {
    console.log("Processing element:", k);
    // Only process if withNonConnection is explicitly false
    if (k.withNonConnection !== false) {
      return; // skip this element
    }

    const sdk_url_orig = k.sdkEntityUrn || k.entityUrn;
    const sdk_url = sdk_url_orig
      ?.replace(/:/g, "%3A")
      ?.replace(/\(/g, "%28")
      ?.replace(/==\)/g, "%3D%3D%29")
      ?.replace(/,/g, "%2C");

    const url =
      "https://www.linkedin.com/voyager/api/voyagerMessagingGraphQL/graphql?queryId=messengerMessages.060b8b4d7dee63b8227028ebd88572a7&variables=(deliveredAt:" +
      timestamp.toString() +
      ",conversationUrn:" +
      sdk_url +
      ",countBefore:20,countAfter:0)";

    detail_urls.push(sdk_url === undefined ? "" : url);
    sdkEntityUrns.push(sdk_url === undefined ? "" : sdk_url);
    sdk_urls_orig.push(sdk_url_orig ?? "");

    const mailbox_urn = sdk_url_orig?.split("(")?.[1]?.split(",")?.[0] || "";
    mailbox_urns.push(mailbox_urn);

    const originToken = k.events?.[0]?.originToken || "";
    originTokens.push(originToken);

    const eventContent =
      k.events?.[0]?.eventContent?.[
        "com.linkedin.voyager.messaging.event.MessageEvent"
      ];
    const text = eventContent?.attributedBody?.text || "";
    texts.push(text);

    const fromProfile =
      k.events?.[0]?.from?.["com.linkedin.voyager.messaging.MessagingMember"]
        ?.miniProfile;
    const name =
      fromProfile && fromProfile.firstName && fromProfile.lastName
        ? `${fromProfile.firstName} ${fromProfile.lastName}`
        : "";
    from_senders.push(name);

    const is_read = k.unreadCount ?? "";
    is_reads.push(is_read);
    main_message_read_status.push(k?.read);
    const toProfile =
      k.participants?.[0]?.["com.linkedin.voyager.messaging.MessagingMember"]
        ?.miniProfile;
    const to_name =
      toProfile && toProfile.firstName && toProfile.lastName
        ? `${toProfile.firstName} ${toProfile.lastName}`
        : "";
    to_senders.push(to_name);

    const publicIdentifier = toProfile?.publicIdentifier || "";
    const id_ = publicIdentifier
      ? `https://www.linkedin.com/in/${publicIdentifier}`
      : "";
    from_linkedin_ids.push(id_);

    const unique_identifier = fromProfile?.publicIdentifier || "";
    unique_identifiers.push(unique_identifier);

    const lastActivityAt = k.lastActivityAt ?? "";
    lastActivityAts.push(lastActivityAt);
    const profileImageData =
      k.participants?.[0]?.["com.linkedin.voyager.messaging.MessagingMember"]
        ?.miniProfile?.picture?.["com.linkedin.common.VectorImage"];
    const profile_pics = profileImageData
      ? profileImageData.rootUrl +
        profileImageData.artifacts?.[3]?.fileIdentifyingUrlPathSegment
      : "";
    profile_images_data.push(profile_pics);
    // profile url added with hardcoded linkedin profile URL structure with publicIdentifier
    // This assumes that the first participant is the one whose profile URL we want
    const profile_url =
      "https://www.linkedin.com/in/" +
        k.participants?.[0]?.["com.linkedin.voyager.messaging.MessagingMember"]
          ?.miniProfile?.publicIdentifier || "";
    profile_urls.push(profile_url);
  });

  //let main_unique_identifier = mode(unique_identifiers)

  console.log(
    "messages_to_share collected messages to store into database",
    user_id,
    unique_identifiers,

    {
      detail_urls: detail_urls,
      sdkEntityUrns: sdkEntityUrns,
      originTokens: originTokens,
      texts: texts,
      from_senders: from_senders,
      is_reads: is_reads,
      to_senders: to_senders,
      main_message_read_status: main_message_read_status,
      profile_images: profile_images_data,
      profile_urls: profile_urls,
    }
  );

  sendResponse({
    result: "Linkedin_Initial_Chats Fetched",
    unique_identifiers: unique_identifiers,
    data: {
      detail_urls: detail_urls,
      sdkEntityUrns: sdkEntityUrns,
      originTokens: originTokens,
      texts: texts,
      from_senders: from_senders,
      is_reads: is_reads,
      to_senders: to_senders,
      main_message_read_status: main_message_read_status,
      profile_pics: profile_images_data,
      profile_urls: profile_urls,
    },
  });

  // setDoc(doc(db, "chats", user_id.toString()), {
  //   detail_urls: detail_urls,
  //   sdkEntityUrns: sdkEntityUrns,
  //   sdk_urls_orig: sdk_urls_orig,
  //   mailbox_urns: mailbox_urns,
  //   originTokens: originTokens,
  //   texts: texts,
  //   from_senders: from_senders,
  //   is_reads: is_reads,
  //   to_senders: to_senders,
  //   lastActivityAts: lastActivityAts,
  //   from_linkedin_ids: from_linkedin_ids,
  // });

  //get the details of the first one as well
  //also get the latest detail of the first one

  sendResponse({ result: "fetch_linkedin_chats Action completed" });
}

export const fetchLinkedinUserDetails = async () => {
  console.log(" Step 1 Entering into fetchLinkedinUserDetails");
  // const idToken = (await firebaseAuth.currentUser?.getIdToken()) ?? "";

  // console.log("ID Token - ", idToken);
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
        url: "https://www.linkedin.com/*",
        name: "JSESSIONID",
      },
      extractTokenAndPerformRequest
    );
  }
  async function extractTokenAndPerformRequest(cookie: any) {
    if (!cookie?.value) {
      console.warn("Missing CSRF token in cookie");
      return;
    }

    const csrfToken = cookie.value.replace(/"/g, "");
    const linkedInUrl =
      "https://www.linkedin.com/voyager/api/messaging/conversations?keyVersion=LEGACY_INBOX";

    try {
      const linkedInResponse = await fetch(linkedInUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "csrf-token": csrfToken,
        },
        credentials: "include",
      });

      const linkedInData = await linkedInResponse.json();
      console.log("LinkedIn response:", linkedInData);

      const sdkEntityUrn = linkedInData?.["elements"]?.[0]?.["sdkEntityUrn"];
      const linkedInId = sdkEntityUrn?.split("(")?.[1]?.split(",")?.[0];
      console.log("sdkEntityUrn and linkedInId", sdkEntityUrn, linkedInId);
      if (!linkedInId) {
        console.warn("LinkedIn ID not found in LinkedIn response");
        return;
      }

      // If you still have a known userId from elsewhere, pass it here
      requestStats1(linkedInId, "");
    } catch (error) {
      console.error("Error fetching LinkedIn data:", error);
    }
  }

  requestStats();

  function requestStats1(uid: any, userid: any) {
    console.log("requestStats1 invoked");
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
        console.log("EE", e);

        // sendResponse({ msg: "pls open your linkedin" });
      })
      .then((json) => {
        console.log("json test Final for Linkedin User Details: ", json);
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
        // const usersCollection = collection(db, "linkedinCurrentUserName");
        // const documentRef = doc(usersCollection, userid.toString());
        // setDoc(documentRef, dataToStore)
        //   .then(() => {
        //     console.log("Document successfully written or updated!");
        //   })
        //   .catch((error) => {
        //     console.error("Error writing or updating document: ", error);
        //   });
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

async function getIndividualLinkedinChats(
  user_id: string,
  detail_url: any,
  sdkEntityUrn: any
): Promise<{
  detail_url: any;
  times: number[];
  senders: string[];
  texts: string[];
  profile_pics: string[];
  seenAt?: number | null;
  seenByProfilePic?: string | null;
} | null> {
  console.log("⚙️ processResponseMsgDetail invoked");
  console.log("📨 Input Payload:", {
    user_id,
    detail_url,
    sdkEntityUrn,
  });

  if (sdkEntityUrn?.length) {
    try {
      const sdk_url = sdkEntityUrn[0]
        .replaceAll(":", "%3A")
        .replaceAll("(", "%28")
        .replaceAll("==)", "%3D%3D%29")
        .replaceAll(",", "%2C");

      const url = `https://www.linkedin.com/voyager/api/voyagerMessagingGraphQL/graphql?queryId=messengerMessages.060b8b4d7dee63b8227028ebd88572a7&variables=(deliveredAt:${Date.now()},conversationUrn:${sdk_url},countBefore:20,countAfter:0)`;

      const cookie = await getCookie(
        "https://www.linkedin.com/*",
        "JSESSIONID"
      );
      const csrfToken = cookie?.value?.replace(/"/g, "") ?? "";

      const request = new Request(url, {
        method: "GET",
        headers: new Headers({
          accept: "application/json",
          "Content-Type": "application/json",
          "csrf-token": csrfToken,
        }),
        credentials: "include",
      });

      const res = await fetch(request);
      const json: MessengerResponse = await res.json();
      console.log("Individual_image_json_data", json);

      const innerData: any =
        json?.data?.messengerMessagesByAnchorTimestamp?.elements ?? [];
      const times: number[] = [];
      const senders: string[] = [];
      const texts: string[] = [];
      const profile_pics: string[] = [];

      innerData.forEach((msg: any, index: number) => {
        console.log("For_Each_innerData", msg, index);
        try {
          const sender = msg?.sender?.participantType?.member || "";
          const name = `${sender?.firstName?.text} ${sender?.lastName?.text}`;
          const profile_pic =
            sender?.profilePicture?.rootUrl +
              sender?.profilePicture?.artifacts?.[3]
                ?.fileIdentifyingUrlPathSegment || "";
          times.push(msg.deliveredAt);
          senders.push(name);
          texts.push(msg.body.text);
          profile_pics.push(profile_pic);
        } catch (error) {
          console.warn(
            `⚠️ Message parsing failed at index ${index}:`,
            msg,
            error
          );
        }
      });

      // ---- Added: Fetch and extract messengerSeenReceipts JSON ----
      let seenAt: number | null = null;
      let seenByProfilePic: string | null = null;

      const seenReceiptsUrl = `https://www.linkedin.com/voyager/api/voyagerMessagingGraphQL/graphql?queryId=messengerSeenReceipts.2a64b8e3dacc77e4fe0737d1197c2e83&variables=(conversationUrn:${sdk_url})`;
      try {
        const seenReq = new Request(seenReceiptsUrl, {
          method: "GET",
          headers: new Headers({
            accept: "application/json",
            "Content-Type": "application/json",
            "csrf-token": csrfToken,
          }),
          credentials: "include",
        });

        const seenRes = await fetch(seenReq);
        const seenJson = await seenRes.json();

        // try to extract seenAt and profile picture url
        const elements =
          seenJson?.data?.messengerSeenReceiptsByConversation?.elements;
        if (elements?.length && elements[0]?.seenAt) {
          seenAt = elements[0].seenAt;
          const member =
            elements[0]?.seenByParticipant?.participantType?.member;
          const rootUrl = member?.profilePicture?.rootUrl;
          const artifact =
            member?.profilePicture?.artifacts?.[1]
              ?.fileIdentifyingUrlPathSegment;
          if (rootUrl && artifact) {
            seenByProfilePic = rootUrl + artifact;
          }
        }

        console.log(
          "✅ Success: seenAt:",
          seenAt,
          "profilePic:",
          seenByProfilePic
        );
      } catch (seenErr) {
        console.error("❌ Error fetching messengerSeenReceipts data:", seenErr);
      }
      // ---------------------------------------------------------

      const main_chats_data = {
        detail_url,
        times,
        senders,
        texts,
        profile_pics,
        seenAt,
        seenByProfilePic,
      };

      console.log("✅ Returning main chats data:", main_chats_data);
      return main_chats_data;
    } catch (err) {
      console.error("❌ Error during LinkedIn chat fetch:", err);
      return null;
    }
  } else {
    console.warn("⚠️ No sdkEntityUrns available.");
    return null;
  }
}

function processResponseMsgViaSearch(
  json: any,
  user_id: any,
  token: any,
  sendResponse: any
) {
  //
  //
  // console.log('elements: ', elements)
  // console.log('metadata: ', metadata)
  console.log("processResponseMsgViaSearch Payload: ", {
    json,
    user_id,
    token,
  });
  const { data } = json;
  const elements = data["messengerConversationsBySearchCriteria"]["elements"];
  const metadata: any =
    data["messengerConversationsBySearchCriteria"]["metadata"];

  const messages: any = [];

  console.log("processResponseMsgViaSearch", messages, metadata, elements);
  let new_messages: any = [];

  //send it to the firestore
  const timestamp: number = Date.now();

  const sdkEntityUrns: string[] = []; // e.g., ["urn:li:fs_messagingConversation:..."]
  const detail_urls: string[] = []; // e.g., LinkedIn message detail URLs
  const originTokens: string[] = []; // e.g., tokens used for API calls
  const texts: string[] = []; // e.g., message content
  const from_senders: string[] = []; // e.g., sender LinkedIn IDs or names
  const to_senders: string[] = []; // e.g., receiver LinkedIn IDs or names
  const is_reads: boolean[] = []; // e.g., message read status
  const messages_to_share: string[] = []; // e.g., messages to copy/share
  const main_message_read_status: boolean[] = []; // e.g., main message read status
  const from_linkedin_ids: string[] = []; // e.g., sender LinkedIn URNs
  const lastActivityAts: string[] = []; // e.g., Unix timestamps (ms)
  const unique_identifiers: string[] = []; // e.g., message/conversation unique keys
  const sdk_urls_orig: string[] = []; // e.g., original SDK URLs used
  const mailbox_urns: string[] = [];
  const profile_images_data: any[] = [];
  const profile_urls: any[] = [];
  console.log(messages_to_share, new_messages, metadata);

  elements?.map((k: any) => {
    let sdk_url_orig = k["entityUrn"];
    let sdk_url = k["entityUrn"]
      ?.replaceAll(":", "%3A")
      ?.replaceAll("(", "%28")
      ?.replaceAll("==)", "%3D%3D%29")
      ?.replaceAll(",", "%2C");
    let url =
      "https://www.linkedin.com/voyager/api/voyagerMessagingGraphQL/graphql?queryId=messengerMessages.060b8b4d7dee63b8227028ebd88572a7&variables=(deliveredAt:" +
      timestamp.toString() +
      ",conversationUrn:" +
      sdk_url +
      ",countBefore:20,countAfter:0)";
    //"urn:li:msg_conversation:(urn:li:fsd_profile:ACoAAEFtxeoBa_NdSOJjgGW3bBXG5mLZcAydhMM,2-MmVjZGIyOTAtZjgzMy00MWZkLTkwMzQtYTdlYWRiZWRhNjMyXzAxMA==)"
    //https://www.linkedin.com/voyager/api/voyagerMessagingGraphQL/graphql?queryId=messengerMessages.060b8b4d7dee63b8227028ebd88572a7&variables=(deliveredAt:1686491158769,conversationUrn:urn%3Ali%3Amsg_conversation%3A%28urn%3Ali%3Afsd_profile%3AACoAAEFtxeoBa_NdSOJjgGW3bBXG5mLZcAydhMM%2C2-ZmEyMzQ3MjMtYzkwMi00NzA2LThkOGYtNWQ3MTlmNWJjYjE0XzAxMA%3D%3D%29,countBefore:20,countAfter

    if (sdk_url === undefined) {
      detail_urls.push("");
    } else {
      detail_urls.push(url);
    }

    if (sdk_url === undefined) {
      sdkEntityUrns.push("");
    } else {
      sdkEntityUrns.push(sdk_url);
    }

    if (sdk_url_orig === undefined) {
      sdk_urls_orig.push("");
    } else {
      sdk_urls_orig.push(sdk_url_orig);
    }

    let mailbox_urn = sdk_url_orig.split("(")?.[1]?.split(",")?.[0];
    if (mailbox_urn === undefined) {
      mailbox_urns.push("");
    } else {
      mailbox_urns.push(mailbox_urn);
    }

    let text = k["messages"]?.["elements"]?.[0]?.["body"]?.["text"];
    let sender_id =
      k["messages"]?.["elements"]?.[0]?.["sender"]?.["hostIdentityUrn"];

    let hostUrn = k["conversationParticipants"]?.[0]?.["hostIdentityUrn"];

    if (sender_id === user_id) {
      if (sender_id == hostUrn) {
        let to_name =
          k["conversationParticipants"]?.[1]?.["participantType"]?.["member"]?.[
            "firstName"
          ]?.["text"] +
          " " +
          k["conversationParticipants"]?.[1]?.["participantType"]?.["member"]?.[
            "lastName"
          ]?.["text"];
        let id_ =
          k["conversationParticipants"]?.[1]?.["participantType"]?.["member"]?.[
            "profileUrl"
          ];
        if (to_name === undefined) {
          to_senders.push("");
          from_linkedin_ids.push("");
        } else {
          to_senders.push(to_name);
          from_linkedin_ids.push(id_);
        }

        let name =
          k["conversationParticipants"]?.[0]?.["participantType"]?.["member"]?.[
            "firstName"
          ]?.["text"] +
          " " +
          k["conversationParticipants"]?.[0]?.["participantType"]?.["member"]?.[
            "lastName"
          ]?.["text"];
        if (name === undefined) {
          from_senders.push("");
        } else {
          from_senders.push(name);
        }
      } else {
        let to_name =
          k["conversationParticipants"]?.[0]?.["participantType"]?.["member"]?.[
            "firstName"
          ]?.["text"] +
          " " +
          k["conversationParticipants"]?.[0]?.["participantType"]?.["member"]?.[
            "lastName"
          ]?.["text"];
        let id_ =
          k["conversationParticipants"]?.[0]?.["participantType"]?.["member"]?.[
            "profileUrl"
          ];

        if (to_name === undefined) {
          to_senders.push("");
          from_linkedin_ids.push("");
        } else {
          to_senders.push(to_name);
          from_linkedin_ids.push(id_);
        }

        let name =
          k["conversationParticipants"]?.[1]?.["participantType"]?.["member"]?.[
            "firstName"
          ]?.["text"] +
          " " +
          k["conversationParticipants"]?.[1]?.["participantType"]?.["member"]?.[
            "lastName"
          ]?.["text"];
        if (name === undefined) {
          from_senders.push("");
        } else {
          from_senders.push(name);
        }
      }
    } else {
      if (sender_id == hostUrn) {
        let to_name =
          k["conversationParticipants"]?.[0]?.["participantType"]?.["member"]?.[
            "firstName"
          ]?.["text"] +
          " " +
          k["conversationParticipants"]?.[0]?.["participantType"]?.["member"]?.[
            "lastName"
          ]?.["text"];
        let id_ =
          k["conversationParticipants"]?.[0]?.["participantType"]?.["member"]?.[
            "profileUrl"
          ];

        if (to_name === undefined) {
          to_senders.push("");
          from_linkedin_ids.push("");
        } else {
          to_senders.push(to_name);
          from_linkedin_ids.push(id_);
        }

        let name =
          k["conversationParticipants"]?.[0]?.["participantType"]?.["member"]?.[
            "firstName"
          ]?.["text"] +
          " " +
          k["conversationParticipants"]?.[0]?.["participantType"]?.["member"]?.[
            "lastName"
          ]?.["text"];
        if (name === undefined) {
          from_senders.push("");
        } else {
          from_senders.push(name);
        }
      } else {
        let to_name =
          k["conversationParticipants"]?.[1]?.["participantType"]?.["member"]?.[
            "firstName"
          ]?.["text"] +
          " " +
          k["conversationParticipants"]?.[1]?.["participantType"]?.["member"]?.[
            "lastName"
          ]?.["text"];
        let id_ =
          k["conversationParticipants"]?.[0]?.["participantType"]?.["member"]?.[
            "profileUrl"
          ];

        if (to_name === undefined) {
          to_senders.push("");
          from_linkedin_ids.push("");
        } else {
          to_senders.push(to_name);
          from_linkedin_ids.push(id_);
        }

        let name =
          k["conversationParticipants"]?.[1]?.["participantType"]?.["member"]?.[
            "firstName"
          ]?.["text"] +
          " " +
          k["conversationParticipants"]?.[1]?.["participantType"]?.["member"]?.[
            "lastName"
          ]?.["text"];
        if (name === undefined) {
          from_senders.push("");
        } else {
          from_senders.push(name);
        }
      }
    }

    if (text === undefined) {
      texts.push("");
    } else {
      texts.push(text);
    }

    // let name = k['conversationParticipants']?.[0]?.['participantType']?.['member']?.['firstName']?.['text'] + ' ' + k['conversationParticipants']?.[0]?.['participantType']?.['member']?.['lastName']?.['text']
    // if (name === undefined) {
    //   from_senders.push(  '' )
    // } else {
    //   from_senders.push( name )
    // }
    //
    // let to_name = k['conversationParticipants']?.[1]?.['participantType']?.['member']?.['firstName']?.['text'] + ' ' + k['conversationParticipants']?.[1]?.['participantType']?.['member']?.['lastName']?.['text']
    // if (to_name === undefined) {
    //   to_senders.push(  '' )
    // } else {
    //   to_senders.push( to_name )
    // }

    // let hostUrn = k['conversationParticipants']?.[0]?.['hostIdentityUrn']
    // if (hostUrn === user_id) {
    //   let name = k['conversationParticipants']?.[1]?.['participantType']?.['member']?.['firstName']?.['text'] + ' ' + k['conversationParticipants']?.[1]?.['participantType']?.['member']?.['lastName']?.['text']
    //   if (name === undefined) {
    //     from_senders.push(  '' )
    //   } else {
    //     from_senders.push( name )
    //   }
    //
    //   let to_name = k['conversationParticipants']?.[1]?.['participantType']?.['member']?.['firstName']?.['text'] + ' ' + k['conversationParticipants']?.[1]?.['participantType']?.['member']?.['lastName']?.['text']
    //   if (to_name === undefined) {
    //     to_senders.push(  '' )
    //   } else {
    //     to_senders.push( to_name )
    //   }
    // }
    // else {
    //   let name = k['conversationParticipants']?.[0]?.['participantType']?.['member']?.['firstName']?.['text'] + ' ' + k['conversationParticipants']?.[0]?.['participantType']?.['member']?.['lastName']?.['text']
    //   if (name === undefined) {
    //     from_senders.push(  '' )
    //   } else {
    //     from_senders.push( name )
    //   }
    //
    //   let to_name = k['conversationParticipants']?.[0]?.['participantType']?.['member']?.['firstName']?.['text'] + ' ' + k['conversationParticipants']?.[0]?.['participantType']?.['member']?.['lastName']?.['text']
    //   if (to_name === undefined) {
    //     to_senders.push(  '' )
    //   } else {
    //     to_senders.push( to_name )
    //   }
    // }

    let is_read = k["read"];
    main_message_read_status.push(k?.read);

    if (is_read === undefined) {
      is_read.push("");
    } else {
      is_reads.push(is_read);
    }

    if (k["lastActivityAt"] === undefined) {
      lastActivityAts.push("");
    } else {
      lastActivityAts.push(k["lastActivityAt"]);
    }

    const profileImageData =
      k.participants?.[0]?.["com.linkedin.voyager.messaging.MessagingMember"]
        ?.miniProfile?.picture?.["com.linkedin.common.VectorImage"];
    const profile_pics = profileImageData
      ? profileImageData.rootUrl +
        profileImageData.artifacts?.[3]?.fileIdentifyingUrlPathSegment
      : "";
    profile_images_data.push(profile_pics);
    // profile url added with hardcoded linkedin profile URL structure with publicIdentifier
    // This assumes that the first participant is the one whose profile URL we want
    const profile_url =
      "https://www.linkedin.com/in/" +
        k.participants?.[0]?.["com.linkedin.voyager.messaging.MessagingMember"]
          ?.miniProfile?.publicIdentifier || "";
    profile_urls.push(profile_url);

    // messages_to_share.push({
    //   'detail_url' : url,
    //   'sdkEntityUrn': sdk_url,
    //   'originToken' : k['events']?.[0]?.['originToken'] ?? null,
    //   'from_sender' : k['events']?.[0]?.['from']?.['com.linkedin.voyager.messaging.MessagingMember']?.['miniProfile']?.['firstName'] + ' ' + k['events']?.[0]?.['from']?.['com.linkedin.voyager.messaging.MessagingMember']?.['miniProfile']?.['lastName'] ?? null,
    //   'to_sender': k['participants']?.[0]?.['com.linkedin.voyager.messaging.MessagingMember']?.['miniProfile']?.['firstName'] + ' ' + k['participants']?.[0]?.['com.linkedin.voyager.messaging.MessagingMember']?.['miniProfile']?.['lastName'] ?? null,
    //   'is_read' : k['unreadCount'] ?? null,
    //   'text': k['events']?.[0]?.['eventContent']?.['com.linkedin.voyager.messaging.event.MessageEvent']?.['attributedBody']?.['text'] ?? null
    // })

    return null;
  });

  //let main_unique_identifier = mode(unique_identifiers)

  console.log("messages_to_share: ", user_id, unique_identifiers, {
    detail_urls: detail_urls,
    sdkEntityUrns: sdkEntityUrns,
    originTokens: originTokens,
    texts: texts,
    from_senders: from_senders,
    is_reads: is_reads,
    to_senders: to_senders,
  });
  sendResponse({
    result: "Linkedin_Initial_Chats Fetched",
    unique_identifiers: unique_identifiers,
    data: {
      detail_urls: detail_urls,
      sdkEntityUrns: sdkEntityUrns,
      originTokens: originTokens,
      texts: texts,
      from_senders: from_senders,
      is_reads: is_reads,
      to_senders: to_senders,
      main_message_read_status: main_message_read_status,
      profile_pics: profile_images_data,
      profile_urls: profile_urls,
    },
  });

  //get the details of the first one as well
  //also get the latest detail of the first one
  if (detail_urls !== undefined) {
    const request = new Request(detail_urls?.[0], {
      method: "GET",
      headers: new Headers({
        accept: "application/json",
        "Content-Type": "application/json",
        "csrf-token": token,
      }),
      credentials: "include",
    });

    fetch(request)
      .then((res) => res.json())
      .then((json) =>
        getIndividualLinkedinChats(json, user_id, detail_urls?.[0])
      )
      .then((individualChatDetails) => {
        console.log("Fetched individual chat details:", {
          individualChatDetails,
          user_id,
          detail_urls: detail_urls,
        });
      });
  }
}

export async function extractLinkedinUserId() {
  try {
    const profileUrl = "https://www.linkedin.com/voyager/api/me";
    const cookie = await getCookie("https://www.linkedin.com", "JSESSIONID");

    if (!cookie) {
      console.error("JSESSIONID cookie not found");
      return null;
    }

    const token = cookie.value.replace(/"/g, "");

    const res = await fetch(profileUrl, {
      headers: {
        "csrf-token": token,
        accept: "application/json",
      },
      credentials: "include",
    });

    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

    const profileData = await res.json();
    console.log("This is the profileData", profileData);
    const userUrn = profileData?.miniProfile?.entityUrn;
    console.log("This is the userUrn", userUrn);
    const userId = userUrn?.split(":")?.[3]; // urn:li:user:123456

    if (!userId) {
      console.error("Profile URN not found in:", profileData);
      return null;
    }

    console.log("Extracted LinkedIn User ID:", userId);
    return userId;
  } catch (error: any) {
    console.error("API request failed:", error.message);
    return null;
  }
}

async function getLikedinRemainingConnectRequestCountandMessage(
  sendResponse: any
) {
  const cookie = await getCookie("https://www.linkedin.com", "JSESSIONID");

  if (!cookie) {
    console.error("JSESSIONID cookie not found.");
    return;
  }

  const csrfToken = cookie.value.replace(/"/g, "");

  try {
    const response = await fetch(
      "https://www.linkedin.com/voyager/api/graphql?includeWebMetadata=true&variables=()&queryId=voyagerRelationshipsDashCustomInviteComposeView.609650a05977a8ce1f34de667ea30a65",
      {
        method: "GET",
        credentials: "include",
        headers: {
          "csrf-token": csrfToken,
          accept: "application/vnd.linkedin.normalized+json+2.1",
          "x-restli-protocol-version": "2.0.0",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    console.log(
      "getLikedinRemainingConnectRequestCountandMessage response data:",
      data
    );
    const remainingConnectRequestCount =
      data?.data?.data?.relationshipsDashCustomInviteComposeViewByInviter
        ?.elements[0]?.remainingCreditsMessage?.text;
    console.log("getLikedinRemainingConnectRequestCountandMessage", data);
    sendResponse({
      type: "LINKEDIN_CONNECTTION_REQUEST_COUNT_SUCCESS_DATA",
      payload: remainingConnectRequestCount,
    });
  } catch (err) {
    console.error("Error fetching LinkedIn GraphQL data:", err);

    sendResponse({
      type: "LINKEDIN_CONNECTTION_REQUEST_COUNT_ERROR_DATA",
      error: String(err),
    });
  }
}

chrome.runtime.onMessageExternal.addListener(
  async (message, _, sendResponse) => {
    console.log("Received external message:", message, "from", _);
    if (message.action === "check_login_status") {
      const authData = await getLatestFirebaseToken(); // Asynchronously fetch the latest Firebase token
      if (authData) {
        console.log("User is logged in");
        sendResponse({ isLoggedIn: true }); // Send a positive login status back
      } else {
        console.log("User is NOT logged in");
        sendResponse({ isLoggedIn: false }); // Send a negative login status back
      }

      return true; // Important: returning true keeps the message channel open for async response
    } else if (message.action === "check_linkedin_connection") {
      console.log(
        "Received message from React app for check_linkedin_connection:",
        message
      );
      sendResponse({
        status: "success",
        message: "Linkedin connected successfully",
      });
      return true;
    } else if (
      message.action === "check_linkedin_and_get_linkedin_active_user_details"
    ) {
      console.log("ENTERED IN CHECK LINKEDIN");

      function requestStats() {
        console.log("token2: ", chrome.cookies);
        chrome.cookies.get(
          {
            url: "https://www.linkedin.com/*",
            name: "JSESSIONID",
          },
          extractTokenAndPerformRequest
        );
      }
      async function extractTokenAndPerformRequest(cookie: any) {
        // Fetcing Linkedin user details for storing the active user details.
        await fetchLinkedinUserDetails();
        console.log("token1: ", cookie);
        if (!cookie) {
          console.log("token0: ");
          return;
        }

        const token = cookie.value.replace(/"/g, "");
        console.log("Token: ", token);

        // let new_linkedin =
        //   "https://www.linkedin.com/voyager/api/feed/identityModule";
        let vrl =
          "https://www.linkedin.com/voyager/api/messaging/conversations?keyVersion=LEGACY_INBOX";
        // let test =
        //   "https://www.linkedin.com/voyager/api/voyagerMessagingDashMessengerMessages?action=createMessage";

        const req = new Request(vrl, {
          method: "GET",
          headers: new Headers({
            accept: "application/json",
            "Content-Type": "application/json",
            "csrf-token": token,
          }),
          credentials: "include",
        });
        console.log("Request passed", req);
        fetch(req)
          .then((res) => {
            if (!res.ok) {
              sendResponse({
                error_message:
                  "Please ensure you're logged into LinkedIn. If you're already logged in but still facing issues, try logging in using your email and password instead of OAuth.",
              });
              throw new Error("Network response was not ok");
            }
            return res.json();
          })
          .catch((e) => {
            console.log("Error - ", e);
            sendResponse({ msg: "Please login to your LinkedIn account" });
          })
          .then((json) => {
            console.log("json test:", json);
            let id = json?.["elements"]?.[0]?.["sdkEntityUrn"]
              ?.split("(")?.[1]
              ?.split(",")?.[0];
            console.log("linkedin_id", id);
            requestStats1(id);
            if (json?.status === 401) {
              sendResponse({ msg: "Please login to your LinkedIn account" });
            }
          });
      }

      requestStats();

      function requestStats1(uid: any) {
        console.log("token2: ", chrome.cookies);
        chrome.cookies.get(
          {
            url: "https://www.linkedin.com",
            name: "JSESSIONID",
          },
          (cookie) => extractTokenAndPerformRequest1(cookie, uid)
        );
      }
      function extractTokenAndPerformRequest1(cookie: any, id: any) {
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
          .then((res: any) => res.json())
          .catch((e) => {
            console.log("E", e);
            sendResponse({ msg: "please login to your linkedin account" });
          })
          .then((json) => {
            console.log("json test Final for linkedin user details: ", json);
            const fName = json.elements[0].firstName;
            const lName = json.elements[0].lastName;
            const fullName = fName + " " + lName;
            console.log("Full Name2:", fullName);
            // let id = json?.["elements"]?.[0]?.["sdkEntityUrn"]?.split("(")?.[1]?.split(",")?.[0];
            // console.log("linkedin_id", id);
            if (json?.status === 401) {
              sendResponse({ msg: "please login to your linkedin account" });
            } else {
              sendResponse({
                msg: "linkedin_user_details_fetched_successfully",
                id: id,
                fullName: fullName,
                user_details: json.elements[0],
              });
            }
          });
      }
    } else if (message.action == "fetch_linkedin_search_results") {
      let query = message?.payload?.query;
      let user_id = message?.payload?.user_id;
      console.log("fetch_linkedin_chats Action started", { query, user_id });

      function requestStats() {
        console.log("token2: ", chrome.cookies);
        chrome.cookies.get(
          {
            url: "https://www.linkedin.com",
            name: "JSESSIONID",
          },
          extractConnections
        );
      }

      function extractConnections(cookie: any) {
        if (!cookie) {
          console.log("token0: ");
          return;
        }
        const profileUrnId: any = encodeURIComponent(user_id);
        let message_conversations =
          `https://www.linkedin.com/voyager/api/voyagerMessagingGraphQL/graphql?queryId=messengerConversations.dac8c7f1824a84031125226192309c91&variables=(categories:List(INBOX,SPAM,ARCHIVE),count:20,firstDegreeConnections:false,mailboxUrn:${profileUrnId},keywords:` +
          query +
          ")";
        let message_connections =
          "https://www.linkedin.com/voyager/api/graphql?variables=(keyword:" +
          query +
          ",types:List(CONNECTIONS))&&queryId=voyagerMessagingDashMessagingTypeahead.8100af826d4cb2f0f75ab84b4ea40b80";

        const token = cookie.value.replace(/"/g, "");

        if (query !== "") {
          console.log("🔍 Query detected:", query);
          console.log("📡 Fetching message conversations using search...");

          const req = new Request(message_conversations, {
            method: "GET",
            headers: new Headers({
              accept: "application/json",
              "Content-Type": "application/json",
              "csrf-token": token,
            }),
            credentials: "include",
          });

          console.log("📤 Sending request to:", message_conversations);

          fetch(req)
            .then((res) => {
              console.log(
                "✅ Received response for message_conversations:",
                res
              );
              return res.json();
            })
            .then((json) => {
              console.log("📨 JSON received for message_conversations:", json);
              processResponseMsgViaSearch(json, user_id, token, sendResponse);
            })
            .catch((error) => {
              console.error("❌ Error fetching message_conversations:", error);
            });

          const req2 = new Request(message_connections, {
            method: "GET",
            headers: new Headers({
              accept: "application/json",
              "Content-Type": "application/json",
              "csrf-token": token,
            }),
            credentials: "include",
          });

          console.log("📤 Sending request to:", message_connections);

          fetch(req2)
            .then((res) => {
              console.log("✅ Received response for message_connections:", res);
              return res.json();
            })
            .then((json) => {
              console.log("📨 JSON received for message_connections:", json);
              // processResponseMsgConnection(json, user_id, token, sendResponse);
            })
            .catch((error) => {
              console.error("❌ Error fetching message_connections:", error);
            });
        } else {
          console.log(
            "🔕 No search query provided. Fetching default conversation list..."
          );

          const defaultUrl =
            "https://www.linkedin.com/voyager/api/messaging/conversations?keyVersion=LEGACY_INBOX";

          const request = new Request(defaultUrl, {
            method: "GET",
            headers: new Headers({
              accept: "application/json",
              "Content-Type": "application/json",
              "csrf-token": token,
            }),
            credentials: "include",
          });

          console.log(
            "📤 Sending default conversations request to:",
            defaultUrl
          );

          fetch(request)
            .then((res) => {
              console.log(
                "✅ Received response for default conversations:",
                res
              );
              return res.json();
            })
            .then((json) => {
              console.log("📨 JSON received for default conversations:", json);
              processResponseMsg(json, user_id, token, sendResponse);
            })
            .catch((error) => {
              console.error("❌ Error fetching default conversations:", error);
            });

          // Future enhancement placeholder
          // console.log("📝 Preparing empty structure for user message doc in Firestore");
          // setDoc(doc(db, "connection_chats", user_id.toString()), {
          //   detail_urls: [],
          //   sdkEntityUrns: [],
          //   sdk_urls_orig: [],
          //   mailbox_urns: [],
          //   originTokens: [],
          //   texts: [],
          //   from_senders: [],
          //   is_reads: [],
          //   to_senders: [],
          //   lastActivityAts: [],
          // });
        }
      }

      requestStats();
    } else if (message.action === "fetch_linkedin_chat_details") {
      const { detail_urls, user_id, sdkEntityUrns } = message?.payload;
      console.log("Message_payload_for_Individual_chats_now_received", {
        detail_urls,
        user_id,
        sdkEntityUrns,
      });
      getIndividualLinkedinChats(user_id, detail_urls, sdkEntityUrns).then(
        (response) => {
          if (response) {
            console.log("✅ Got chats, now send to web app:", response);
            sendResponse({
              status: "success",
              message: "Chat data fetched successfully",
              data: response,
            });
          } else {
            console.warn("❌ No chat data fetched.");
          }
        }
      );
    } else if (message.action === "send_linkedin_message") {
      const { text, conversation_urn, mailbox_urn, user_id, is_connection } =
        message.payload;

      console.log("Send Linkedin Messages payload");
      function requestStats() {
        console.log("token2: ", chrome.cookies);
        chrome.cookies.get(
          {
            url: "https://www.linkedin.com",
            name: "JSESSIONID",
          },
          extractTokenAndPerformRequest
        );
      }
      function extractTokenAndPerformRequest(cookie: any) {
        console.log("token1: ", cookie);
        if (!cookie) {
          console.log("token0: ");
          return;
        }

        const token = cookie.value.replace(/"/g, "");

        let random_int_array = [];
        for (let i = 0; i < 16; i++) {
          random_int_array.push(Math.floor(Math.random() * 256));
        }
        let rand_byte_array = new Uint8Array(random_int_array);
        let tracking_id = Array.from(rand_byte_array, (byte) =>
          String.fromCharCode(byte)
        ).join("");

        let originToken = uuidv4()?.toString();

        let msg = {};

        if (is_connection == 0) {
          console.log("Sending message as new connection");
          msg = {
            dedupeByClientGeneratedToken: false,
            mailboxUrn: mailbox_urn,
            message: {
              body: { text: text, attributes: [] },
              originToken: originToken,
              renderContentUnions: [],
              conversationUrn: conversation_urn,
            },
            trackingId: tracking_id,
          };
        } else {
          console.log("Sending message as existing connection");
          msg = {
            dedupeByClientGeneratedToken: false,
            mailboxUrn: mailbox_urn,
            message: {
              body: { text: text, attributes: [] },
              originToken: "7b3d2ec9-fb3d-4192-8f2a-0962997d3e44",
              renderContentUnions: [],
            },
            trackingId: tracking_id,
            hostRecipientUrns: [conversation_urn],
          };
        }
        const req = new Request(
          "https://www.linkedin.com/voyager/api/voyagerMessagingDashMessengerMessages?action=createMessage",
          {
            method: "POST",
            headers: new Headers({
              accept: "application/json",
              "Content-Type": "application/json",
              "csrf-token": token,
            }),
            credentials: "include",
            body: JSON.stringify(msg),
          }
        );

        fetch(req)
          .then((res) => res.json())
          .catch((e) => {
            console.log(e);

            sendResponse({ msg: "pls open your linkedin" });
          })
          .then((json) => {
            console.log("json inside1: ", json);
            if (json?.status === 401) {
              sendResponse({ msg: "pls open your linkedin" });
            } else {
              const request = new Request(
                "https://www.linkedin.com/voyager/api/messaging/conversations?keyVersion=LEGACY_INBOX",
                {
                  method: "GET",
                  headers: new Headers({
                    accept: "application/json",
                    "Content-Type": "application/json",
                    "csrf-token": token,
                  }),
                  credentials: "include",
                }
              );

              fetch(request)
                .then((res) => res.json())
                .then((json) =>
                  processResponseMsg(json, user_id, token, sendResponse)
                );

              sendResponse({ msg: "success" });
            }
          });
      }
      requestStats();
    } else if (message.action == "linkedinConnections") {
      //NOT USED
      function requestStats() {
        console.log("token2: ", chrome.cookies);
        chrome.cookies.get(
          {
            url: "https://www.linkedin.com",
            name: "JSESSIONID",
          },
          extractConnections
        );
      }

      function extractConnections(cookie: any) {
        if (!cookie) {
          console.log("token0: ");
          return;
        }
        // let url =
        //   "https://www.linkedin.com/voyager/api/relationships/dash/connections?decorationId=com.linkedin.voyager.dash.deco.web.mynetwork.ConnectionListWithProfile-15&count=50&q=search&sortType=RECENTLY_ADDED&start=0";

        let message_conversations =
          "https://www.linkedin.com/voyager/api/voyagerMessagingGraphQL/graphql?queryId=messengerConversations.dac8c7f1824a84031125226192309c91&variables=(categories:List(INBOX,SPAM,ARCHIVE),count:20,firstDegreeConnections:false,mailboxUrn:urn%3Ali%3Afsd_profile%3AACoAAASg-TsBz84jyIjse5R8e_RqGn6LWCq4KZA)";
        let connections =
          "https://www.linkedin.com/voyager/api/graphql?variables=(keyword:b,types:List(CONNECTIONS))&&queryId=voyagerMessagingDashMessagingTypeahead.8100af826d4cb2f0f75ab84b4ea40b80";
        let paginations =
          "https://www.linkedin.com/voyager/api/voyagerMessagingGraphQL/graphql?queryId=messengerConversations.ec20d615b99f18f7489617a00360e62c&variables=(category:PRIMARY_INBOX,count:20,mailboxUrn:urn%3Ali%3Afsd_profile%3AACoAAASg-TsBz84jyIjse5R8e_RqGn6LWCq4KZA,lastUpdatedBefore:1684827456000)";

        const token = cookie.value.replace(/"/g, "");

        let req = new Request(message_conversations, {
          method: "GET",
          headers: new Headers({
            accept: "application/json",
            "Content-Type": "application/json",
            "csrf-token": token,
          }),
          credentials: "include",
        });
        fetch(req)
          .then((res) => res.json())
          .then((json) => console.log("message conversations: ", json));

        let req2 = new Request(connections, {
          method: "GET",
          headers: new Headers({
            accept: "application/json",
            "Content-Type": "application/json",
            "csrf-token": token,
          }),
          credentials: "include",
        });
        fetch(req2)
          .then((res) => res.json())
          .then((json) => console.log("connections: ", json));

        let req3 = new Request(paginations, {
          method: "GET",
          headers: new Headers({
            accept: "application/json",
            "Content-Type": "application/json",
            "csrf-token": token,
          }),
          credentials: "include",
        });
        fetch(req3)
          .then((res) => res.json())
          .then((json) => console.log("paginations: ", json));
      }

      requestStats();
    } else if (message.action === "send_linkedin_connect") {
      (async () => {
        try {
          const { message: mainMessage, urls, candidate_ids } = message.payload;
          console.log("Payload received for LinkedIn Connect:", {
            mainMessage,
            urls,
            candidate_ids,
          });
          const candidates: CandidateProfile[] = urls.map(
            (url: string, index: number) => ({
              url,
              candidateId: candidate_ids[index],
            })
          );

          const csrfToken = await getCsrfToken();
          const results: ProcessResult = {
            total: candidates.length,
            success: 0,
            failed: 0,
            failures: [],
          };

          // This is the TRUE sequential loop. It waits for one connect to finish before starting the next.
          for (const candidate of candidates) {
            try {
              // Optional: Add a delay to seem more human and avoid rate limits
              await new Promise((resolve) =>
                setTimeout(resolve, 3000 + Math.random() * 2000)
              );

              const responseMessage = await sendLinkedinConnect(
                candidate.url,
                mainMessage,
                csrfToken
              );
              console.log(responseMessage);
              results.success++;
            } catch (error: any) {
              console.error(
                `Error processing ${candidate.url}:`,
                error.message
              );
              results.failed++;
              results.failures.push({ candidate, error: error.message });
            }
          }

          console.log("--- LinkedIn Connect Process Finished ---", results);
          // Send the FINAL, aggregated result back once.
          sendResponse({ status: "success", data: results });
        } catch (error: any) {
          console.error("A critical error occurred:", error.message);
          sendResponse({ status: "error", message: error.message });
        }
      })();

      // Return true to indicate you will send a response asynchronously.
      return true;
    } else if (message.action === "check_linkedin_remaining_connect_message") {
      console.log("Received message:", message);

      getLikedinRemainingConnectRequestCountandMessage(sendResponse); // Pass the response callback

      return true; // <--- Keep message channel open
    }
    //
    return true; // Keep the message channel open for asynchronous responses}
  }
);