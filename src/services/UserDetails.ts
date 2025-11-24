// src/services/UserDetails.ts
// Service for fetching and updating user details from the API

// API Configuration
const API_BASE_URL = 'http://103.173.214.116/user-service';
const RESUME_API_BASE_URL = 'http://dev.10xscale.ai/jd-cv-service';

// API Headers - These should match your authentication requirements
const X_SIGNATURE = '4689008018943119360-STUDENT';
const X_USER_ID = '4689008018943119360';
const X_USER_ROLE = 'STUDENT';
const USER_ID = '4689008018943119360'; // Keep as string to avoid number precision issues

interface APIResponse<T> {
  data: T;
  metadata: {
    message: string;
    request_id: string;
    timestamp: string;
  };
}

interface UserData {
  id?: string;
  full_name?: string;
  user_name?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  gender?: string;
  age?: number;
  date_of_birth?: string;
  nationality?: string;
  citizenship?: string;
  alternate_phone?: string;
  street_address?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  location?: string;
  preferred_language?: string;
  timezone?: string;
  preferred_locations?: string[];
  designation?: string;
  secondary_designation?: string;
  skills?: string;
  secondary_skills?: string;
  total_years_of_experience?: number;
  summary?: string;
  notice_period?: string;
  current_location?: string;
  willing_to_relocate?: boolean;
  english_proficiency?: string;
  expected_salary?: number;
  work_availability?: string[];
  available_hours?: string;
  authorized_work_us?: boolean;
  authorized_work_uk?: boolean;
  authorized_work_canada?: boolean;
  visa_status?: string;
  has_disability?: boolean;
  belongs_to_minority?: boolean;
  gender_identity?: string;
  sexual_orientation?: string;
  veteran_status?: string;
  ethnicity?: string;
  eeo_additional_notes?: string;
  linkedin_link?: string;
  github_link?: string;
  portfolio_website?: string;
  extra_links?: Record<string, any>;
  image?: string;
  resume?: string;
  auth_provider?: string;
  educations?: Array<{
    id?: number;
    institution?: string;
    degree?: string;
    field_of_study?: string;
    start_month?: number;
    start_year?: number;
    end_month?: number;
    end_year?: number;
    is_current?: boolean;
    grade?: string;
    description?: string;
    meta?: Record<string, any>;
  }>;
  experiences?: Array<{
    id?: number;
    company?: string;
    title?: string;
    experience_type?: string;
    start_month?: number;
    start_year?: number;
    end_month?: number;
    end_year?: number;
    is_current?: boolean;
    description?: string;
    reference_name?: string;
    reference_relationship?: string;
    reference_phone?: string;
    reference_email?: string;
    meta?: Record<string, any>;
  }>;
  meta?: Record<string, any>;
}

/**
 * Get public URL for resume from cloud path
 */
async function getResumePublicUrl(cloudPath: string): Promise<string | null> {
  try {
    console.log('📄 Fetching resume public URL...');
    console.log('Cloud path:', cloudPath);
    
    const response = await fetch(
      `${RESUME_API_BASE_URL}/v1/generate/public-url?cloud_path=${encodeURIComponent(cloudPath)}`,
      {
        method: 'GET',
        headers: {
          'accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`❌ Resume API Error: ${response.status} - ${response.statusText}`);
      return null;
    }

    const apiResponse: APIResponse<string> = await response.json();
    console.log('✅ Resume public URL fetched successfully');
    
    return apiResponse.data;
  } catch (error) {
    console.error('❌ Error fetching resume public URL:', error);
    return null;
  }
}

/**
 * Download resume and convert to base64
 */
async function downloadResumeAsBase64(publicUrl: string): Promise<string | null> {
  try {
    console.log('📥 Downloading resume from public URL...');
    
    const response = await fetch(publicUrl);
    
    if (!response.ok) {
      console.error(`❌ Resume download error: ${response.status}`);
      return null;
    }

    const blob = await response.blob();
    
    // Convert blob to base64
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove the data URL prefix (data:application/pdf;base64,)
        const base64Data = base64String.split(',')[1];
        console.log('✅ Resume downloaded and converted to base64');
        console.log('Resume size:', blob.size, 'bytes');
        resolve(base64Data);
      };
      reader.onerror = () => {
        console.error('❌ Error converting resume to base64');
        reject(new Error('Failed to convert resume to base64'));
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('❌ Error downloading resume:', error);
    return null;
  }
}

/**
 * GET user details from API and download resume
 */
export async function getUserDetails(): Promise<UserData | null> {
  try {
    console.log('🔄 Fetching user details from API...');
    console.log('API URL:', `${API_BASE_URL}/v1/users/${USER_ID}`);
    console.log('Request Headers:', {
      'x-signature': X_SIGNATURE,
      'x-user-id': X_USER_ID,
      'x-user-role': X_USER_ROLE,
      'Content-Type': 'application/json',
    });
    
    const response = await fetch(`${API_BASE_URL}/v1/users/${USER_ID}`, {
      method: 'GET',
      headers: {
        'x-signature': X_SIGNATURE,
        'x-user-id': X_USER_ID,
        'x-user-role': X_USER_ROLE,
        'Content-Type': 'application/json',
      },
    });

    console.log('Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} - ${response.statusText}`);
      try {
        const errorBody = await response.text();
        console.error('Error response body:', errorBody);
      } catch (e) {
        console.error('Could not parse error response');
      }
      return null;
    }

    const apiResponse: APIResponse<UserData> = await response.json();
    
    // Log the complete API response
    console.log('✅ User details fetched successfully');
    console.log('API Response:', {
      metadata: apiResponse.metadata,
      data: {
        ...apiResponse.data,
        // Don't log potentially large binary data
        image: apiResponse.data?.image ? '[Image data]' : undefined,
        resume: apiResponse.data?.resume ? apiResponse.data.resume : undefined,
        extra_links: apiResponse.data?.extra_links ? '[Extra links]' : undefined,
        meta: apiResponse.data?.meta ? '[Metadata]' : undefined,
        educations: apiResponse.data?.educations ? `[${apiResponse.data.educations.length} education entries]` : undefined,
        experiences: apiResponse.data?.experiences ? `[${apiResponse.data.experiences.length} experience entries]` : undefined,
      }
    });
    
    // Log important fields individually for easier debugging
    if (apiResponse.data) {
      const { id, email, full_name, first_name, last_name, phone } = apiResponse.data;
      console.log('User Info:', { id, email, full_name, first_name, last_name, phone });
    }
    
    // **NEW: Handle resume download if resume path exists**
    if (apiResponse.data?.resume) {
      console.log('📄 Resume path found:', apiResponse.data.resume);
      
      // Step 1: Get public URL for resume
      const publicUrl = await getResumePublicUrl(apiResponse.data.resume);
      
      if (publicUrl) {
        console.log('✅ Public URL obtained:', publicUrl.substring(0, 100) + '...');
        
        // Step 2: Download resume and convert to base64
        const resumeBase64 = await downloadResumeAsBase64(publicUrl);
        
        if (resumeBase64) {
          // Step 3: Store resume in chrome.storage.local for later use
          await chrome.storage.local.set({ 
            resumeBase64: resumeBase64,
            resumePath: apiResponse.data.resume 
          });
          console.log('✅ Resume downloaded and stored in chrome.storage.local');
        } else {
          console.warn('⚠️ Failed to download resume, but continuing with user data');
        }
      } else {
        console.warn('⚠️ Failed to get public URL for resume, but continuing with user data');
      }
    } else {
      console.log('ℹ️ No resume path found in user data');
    }
    
    return apiResponse.data;
  } catch (error) {
    console.error('❌ Error fetching user details:', error);
    return null;
  }
}

/**
 * NEW: Send failed field labels to API
 */
export async function sendFailedFieldsToAPI(failedLabels: string[]): Promise<boolean> {
  try {
    console.log('📤 Sending failed field labels to API...');
    console.log('Failed labels:', failedLabels);
    
    // Create additional_questions object with empty values
    const additionalQuestions: Record<string, string> = {};
    failedLabels.forEach(label => {
      additionalQuestions[label] = "";
    });
    
    const formData = new FormData();
    formData.append('user_data', JSON.stringify({ additional_questions: additionalQuestions }));
    
    const response = await fetch(`${API_BASE_URL}/v1/users/${USER_ID}`, {
      method: 'PUT',
      headers: {
        'accept': 'application/json',
        'x-signature': X_SIGNATURE,
        'x-user-id': X_USER_ID,
        'x-user-role': X_USER_ROLE,
      },
      body: formData,
    });

    if (!response.ok) {
      console.error(`❌ Failed to send failed fields: ${response.status} - ${response.statusText}`);
      return false;
    }

    const apiResponse = await response.json();
    console.log('✅ Failed field labels sent successfully');
    console.log('Response:', apiResponse.metadata.message);
    
    return true;
  } catch (error) {
    console.error('❌ Error sending failed fields:', error);
    return false;
  }
}

/**
 * PUT user details to API (for future use)
 */
export async function updateUserDetails(
  userData: Partial<UserData>,
  file?: File,
  uploadFor?: string,
  forEmbeddingGeneration?: string
): Promise<boolean> {
  try {
    console.log('🔄 Updating user details...');
    
    const formData = new FormData();
    
    // Add user data
    formData.append('user_data', JSON.stringify(userData));
    
    // Add file if provided
    if (file) {
      formData.append('file', file);
    }
    
    // Add optional fields
    if (uploadFor) {
      formData.append('upload_for', uploadFor);
    }
    
    if (forEmbeddingGeneration) {
      formData.append('for_embedding_generation', forEmbeddingGeneration);
    }
    
    const response = await fetch(`${API_BASE_URL}/v1/users/${USER_ID}`, {
      method: 'PUT',
      headers: {
        'x-signature': X_SIGNATURE,
        'x-user-id': X_USER_ID,
        'x-user-role': X_USER_ROLE,
        // Don't set Content-Type - browser will set it with boundary for FormData
      },
      body: formData,
    });

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} - ${response.statusText}`);
      return false;
    }

    const apiResponse: APIResponse<UserData> = await response.json();
    console.log('✅ User details updated successfully');
    console.log('Response:', apiResponse.metadata.message);
    
    return true;
  } catch (error) {
    console.error('❌ Error updating user details:', error);
    return false;
  }
}