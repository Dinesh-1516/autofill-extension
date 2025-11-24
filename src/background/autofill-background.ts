// src/background/autofill-background.ts
// Autofill-specific background logic with API integration

import { getUserDetails, sendFailedFieldsToAPI } from '../services/UserDetails';

// Empty user data template (matches API structure)
const emptyUserData = {
  id: "",
  full_name: "",
  user_name: "",
  email: "",
  phone: "",
  role: "",
  status: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  gender: "",
  age: 0,
  date_of_birth: "",
  nationality: "",
  citizenship: "",
  alternate_phone: "",
  street_address: "",
  address_line_2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
  location: "",
  preferred_language: "",
  timezone: "",
  preferred_locations: [],
  designation: "",
  secondary_designation: "",
  skills: "",
  secondary_skills: "",
  total_years_of_experience: 0,
  summary: "",
  notice_period: "",
  current_location: "",
  willing_to_relocate: false,
  english_proficiency: "",
  expected_salary: 0,
  work_availability: [],
  available_hours: "",
  authorized_work_us: false,
  authorized_work_uk: false,
  authorized_work_canada: false,
  visa_status: "",
  has_disability: false,
  belongs_to_minority: false,
  gender_identity: "",
  sexual_orientation: "",
  veteran_status: "",
  ethnicity: "",
  eeo_additional_notes: "",
  linkedin_link: "",
  github_link: "",
  portfolio_website: "",
  extra_links: {},
  image: "",
  resume: "",
  auth_provider: "",
  educations: [],
  experiences: [],
  meta: {}
};

/**
 * Check if userData is empty (all values are empty/default)
 */
function isUserDataEmpty(userData: Record<string, any>): boolean {
  if (!userData) return true;
  
  // Check critical fields
  const criticalFields = ['full_name', 'email', 'phone', 'first_name', 'last_name'];
  
  for (const field of criticalFields) {
    const value = userData[field];
    if (value && value !== '' && value !== 0) {
      return false; // If any critical field has a value, data is not empty
    }
  }
  
  return true;
}

/**
 * Initialize or fetch autofill data
 */
export async function initializeAutofillData() {
  console.log("🔄 Initializing Autofill Extension data.");
  
  try {
    // Check if userData already exists in storage
    const result = await chrome.storage.local.get('userData');
    
    if (result.userData && !isUserDataEmpty(result.userData)) {
      console.log('✅ User data already exists in storage. Skipping API call.');
      console.log('Available fields:', Object.keys(result.userData).length);
      return;
    }
    
    // User data is empty, fetch from API
    console.log('📡 User data is empty. Fetching from API...');
    const apiUserData = await getUserDetails();
    
    if (!apiUserData) {
      console.warn('⚠️ Failed to fetch user data from API. Using empty template.');
      await chrome.storage.local.set({ userData: emptyUserData });
      return;
    }
    
    // Store API data directly without transformation
    await chrome.storage.local.set({ userData: apiUserData });
    
    console.log('✅ Autofill user data fetched from API and stored successfully');
    console.log('Available fields:', Object.keys(apiUserData).length);
    console.log('Sample data:', {
      name: apiUserData.full_name,
      email: apiUserData.email,
      phone: apiUserData.phone
    });
    
  } catch (error) {
    console.error('❌ Error initializing autofill data:', error);
    // Fallback to empty data
    await chrome.storage.local.set({ userData: emptyUserData });
  }
}

// Message handlers for autofill-specific actions
export function handleAutofillMessages(
  request: any,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
): boolean {
  // Update user data
  if (request.action === "updateUserData") {
    chrome.storage.local.set({ userData: request.userData }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  // Get user data (with API fetch if empty)
  if (request.action === "getUserData") {
    chrome.storage.local.get('userData', async (result) => {
      if (result.userData && !isUserDataEmpty(result.userData)) {
        sendResponse({ userData: result.userData });
      } else {
        // Fetch from API if empty
        console.log('📡 User data is empty. Fetching from API...');
        const apiUserData = await getUserDetails();
        
        if (apiUserData) {
          await chrome.storage.local.set({ userData: apiUserData });
          sendResponse({ userData: apiUserData });
        } else {
          sendResponse({ userData: emptyUserData });
        }
      }
    });
    return true;
  }

  // Get resume file
  if (request.action === "getResume") {
    chrome.storage.local.get('resumeFile', (result) => {
      sendResponse({ resumeFile: result.resumeFile });
    });
    return true;
  }
  
  // Refresh user data from API
  if (request.action === "refreshUserData") {
    getUserDetails().then(apiUserData => {
      if (apiUserData) {
        chrome.storage.local.set({ userData: apiUserData }, () => {
          console.log('✅ User data refreshed from API');
          sendResponse({ success: true, userData: apiUserData });
        });
      } else {
        console.error('❌ Failed to refresh user data from API');
        sendResponse({ success: false, error: 'Failed to fetch from API' });
      }
    });
    return true;
  }
  
  // NEW: Send failed field labels to API
  if (request.action === "sendFailedFields") {
    sendFailedFieldsToAPI(request.failedLabels).then(success => {
      if (success) {
        console.log('✅ Failed fields sent to API successfully');
        sendResponse({ success: true });
      } else {
        console.error('❌ Failed to send failed fields to API');
        sendResponse({ success: false });
      }
    });
    return true;
  }

  return false; // Not handled
}