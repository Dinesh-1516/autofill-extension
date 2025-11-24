// utils/getGeoIdByCityName.ts

type CityGeo = {
  name: string;
  geoId: string;
};

import { INDIAN_STATES, USA_STATES } from "../api-assets/states-and-cities";

const cityGeoList: CityGeo[] = [
  { name: "Andhra Pradesh", geoId: "106227689" },
  { name: "Arunachal Pradesh", geoId: "104698795" },
  { name: "Assam", geoId: "104436408" },
  { name: "Bihar", geoId: "105234752" },
  { name: "Chhattisgarh", geoId: "106964212" },
  { name: "Goa", geoId: "101223103" },
  { name: "Gujarat", geoId: "101588871" },
  { name: "Haryana", geoId: "102106636" },
  { name: "Himachal Pradesh", geoId: "103419177" },
  { name: "Jharkhand", geoId: "103037983" },
  { name: "Karnataka", geoId: "100811329" },
  { name: "Kerala", geoId: "105167843" },
  { name: "Madhya Pradesh", geoId: "100230751" },
  { name: "Maharashtra", geoId: "106300413" },
  { name: "Manipur", geoId: "100894413" },
  { name: "Meghalaya", geoId: "104101716" },
  { name: "Mizoram", geoId: "106284102" },
  { name: "Nagaland", geoId: "101245852" },
  { name: "Odisha", geoId: "100008630" },
  { name: "Punjab", geoId: "105926908" },
  { name: "Rajasthan", geoId: "105739802" },
  { name: "Sikkim", geoId: "101124108" },
  { name: "Tamil Nadu", geoId: "101436253" },
  { name: "Telangana", geoId: "102767464" },
  { name: "Tripura", geoId: "102423582" },
  { name: "Uttar Pradesh", geoId: "105216624" },
  { name: "Uttarakhand", geoId: "104951427" },
  { name: "West Bengal", geoId: "106652067" },
  { name: "Andaman and Nicobar Islands", geoId: "106936801" },
  { name: "Chandigarh", geoId: "104458930" },
  { name: "Dadra and Nagar Haveli and Daman and Diu", geoId: "115068782" },
  { name: "Delhi", geoId: "106187582" },
  { name: "Ladakh", geoId: "115852660" },
  { name: "Lakshadweep", geoId: "101188369" },
  { name: "Puducherry", geoId: "104543013" },
  { name: "Alabama", geoId: "102240587" },
  { name: "Alaska", geoId: "100290991" },
  { name: "Arizona", geoId: "106032500" },
  { name: "Arkansas", geoId: "102790221" },
  { name: "California", geoId: "102095887" },
  { name: "Colorado", geoId: "105763813" },
  { name: "Connecticut", geoId: "106914527" },
  { name: "Delaware", geoId: "105375497" },
  { name: "Florida", geoId: "101318387" },
  { name: "Georgia", geoId: "103950076" },
  { name: "Hawaii", geoId: "105051999" },
  { name: "Idaho", geoId: "102560739" },
  { name: "Illinois", geoId: "101949407" },
  { name: "Indiana", geoId: "103336534" },
  { name: "Iowa", geoId: "103078544" },
  { name: "Kansas", geoId: "104403803" },
  { name: "Kentucky", geoId: "106470801" },
  { name: "Louisiana", geoId: "101822552" },
  { name: "Maine", geoId: "101102875" },
  { name: "Maryland", geoId: "100809221" },
  { name: "Massachusetts", geoId: "101098412" },
  { name: "Michigan", geoId: "103051080" },
  { name: "Minnesota", geoId: "103411167" },
  { name: "Mississippi", geoId: "106899551" },
  { name: "Missouri", geoId: "101486475" },
  { name: "Montana", geoId: "101758306" },
  { name: "Nebraska", geoId: "101197782" },
  { name: "Nevada", geoId: "101690912" },
  { name: "New Hampshire", geoId: "103532695" },
  { name: "New Jersey", geoId: "101651951" },
  { name: "New Mexico", geoId: "105048220" },
  { name: "New York", geoId: "105080838" },
  { name: "North Carolina", geoId: "103255397" },
  { name: "North Dakota", geoId: "104611396" },
  { name: "Ohio", geoId: "106981407" },
  { name: "Oklahoma", geoId: "101343299" },
  { name: "Oregon", geoId: "101685541" },
  { name: "Pennsylvania", geoId: "102986501" },
  { name: "Rhode Island", geoId: "104877241" },
  { name: "South Carolina", geoId: "102687171" },
  { name: "South Dakota", geoId: "100115110" },
  { name: "Tennessee", geoId: "104629187" },
  { name: "Texas", geoId: "102748797" },
  { name: "Utah", geoId: "104102239" },
  { name: "Vermont", geoId: "104453637" },
  { name: "Virginia", geoId: "101630962" },
  { name: "Washington", geoId: "103977389" },
  { name: "West Virginia", geoId: "106420769" },
  { name: "Wisconsin", geoId: "104454774" },
  { name: "Wyoming", geoId: "100658004" },
];

// Merge all states into a single array for lookup
const allStatesGeoList: CityGeo[] = [...INDIAN_STATES, ...USA_STATES];

/**
 * Returns the geoId for a city or state if the input string contains the name (case-insensitive).
 * @param input - The lowercase string to search.
 * @returns The corresponding geoId if found, otherwise null.
 */
export const getGeoIdByCityName = (input: string): string | null => {
  const lowerInput = input.toLowerCase();

  // Check city list first
  const cityMatch = cityGeoList.find((city) =>
    lowerInput.includes(city.name.toLowerCase())
  );
  if (cityMatch) return cityMatch.geoId;

  // Check state lists
  const stateMatch = allStatesGeoList.find((state) =>
    lowerInput.includes(state.name.toLowerCase())
  );
  return stateMatch ? stateMatch.geoId : null;
};
