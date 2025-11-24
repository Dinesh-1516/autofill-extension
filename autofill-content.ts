// ========== FIELD TRACKING SYSTEM (UPDATED WITH FULL LABEL PATH) ==========
interface FieldTrackingData {
  "FIELD NAME": string;
  "FULL LABEL PATH": string;  // NEW: Full nested label hierarchy
  "REQUIRED": boolean;
  "FILLED": boolean;
  "FILLED_BY"?: 'fuzzy_match' | 'ai_autofill' | 'failed';
  "SELECTOR": string;
}

// Global variable to store all field tracking data
let FIELD_TRACKING: FieldTrackingData[] = [];

// Helper function to get field name from element - handles multiple label sources
function getFieldName(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  // For checkbox/radio groups, prioritize group name over individual option label
  const isGroupedInput = element instanceof HTMLInputElement && 
                         (element.type === 'checkbox' || element.type === 'radio');
  
  if (isGroupedInput) {
    // 1. Try fieldset legend (the group name)
    const fieldsetLabel = getFieldsetLabel(element);
    if (fieldsetLabel) {
      return fieldsetLabel.replace(/[:\*]+$/, '').trim();
    }
    
    // 2. Try group label
    const groupLabel = getGroupLabel(element);
    if (groupLabel) {
      return groupLabel.replace(/[:\*]+$/, '').trim();
    }
  }
  
  // 3. Try direct label (most common for regular inputs)
  const directLabel = getDirectLabel(element);
  if (directLabel) {
    return directLabel.replace(/[:\*]+$/, '').trim();
  }
  
  // 4. Try aria-label (accessibility label)
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    return ariaLabel.replace(/[:\*]+$/, '').trim();
  }
  
  // 5. For non-grouped inputs, try fieldset/group labels
  if (!isGroupedInput) {
    const fieldsetLabel = getFieldsetLabel(element);
    if (fieldsetLabel) {
      return fieldsetLabel.replace(/[:\*]+$/, '').trim();
    }
    
    const groupLabel = getGroupLabel(element);
    if (groupLabel) {
      return groupLabel.replace(/[:\*]+$/, '').trim();
    }
  }
  
  // 6. Try label hierarchy (comprehensive check)
  const labelHierarchy = getFieldLabelHierarchy(element);
  if (labelHierarchy.length > 0 && labelHierarchy[0]) {
    return labelHierarchy[0].replace(/[:\*]+$/, '').trim();
  }
  
  // 7. Try placeholder
  if ('placeholder' in element && element.placeholder) {
    return element.placeholder.replace(/[:\*]+$/, '').trim();
  }
  
  // 8. Try name attribute
  if (element.name) {
    return element.name;
  }
  
  // 9. Try id
  if (element.id) {
    return element.id;
  }
  
  // 10. Check for preceding heading (for fields under section headings)
  const precedingHeading = getPrecedingHeading(element);
  if (precedingHeading) {
    return precedingHeading.replace(/[:\*]+$/, '').trim();
  }
  
  // 11. Last resort - use selector
  return generateUniqueSelector(element);
}

// Helper to get preceding heading for a field
function getPrecedingHeading(element: HTMLElement): string | null {
  let current: HTMLElement | null = element;
  let depth = 0;
  const maxDepth = 5;
  
  while (current && depth < maxDepth) {
    // Check previous siblings for headings
    let prev = current.previousElementSibling;
    while (prev) {
      if (prev instanceof HTMLElement) {
        // Check if it's a heading
        if (prev.tagName.match(/^H[1-6]$/)) {
          const text = prev.textContent?.trim();
          if (text && text.length < 100) {
            return text;
          }
        }
        // Check for div/span with heading-like class
        if (prev.classList.contains('heading') || 
            prev.classList.contains('section-title') ||
            prev.classList.contains('form-section') ||
            prev.hasAttribute('data-type') && prev.getAttribute('data-type') === 'control_head') {
          const text = prev.textContent?.trim();
          if (text && text.length < 100) {
            return text;
          }
        }
      }
      prev = prev.previousElementSibling;
    }
    
    current = current.parentElement;
    depth++;
  }
  
  return null;
}

// Helper function to check if field is required
function isFieldRequired(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): boolean {
  return element.hasAttribute('required') || 
         element.getAttribute('aria-required') === 'true' ||
         element.classList.contains('required');
}

// NEW: Helper function to get full label path (nested hierarchy)
function getFullLabelPath(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  const labelHierarchy = getFieldLabelHierarchy(element);
  
  if (labelHierarchy.length === 0) {
    // Fallback to basic field name
    return getFieldName(element);
  }
  
  // Join hierarchy with " -> " separator, clean up each label
  const cleanedHierarchy = labelHierarchy.map(label => 
    label.replace(/[:\*]+$/, '').trim()
  ).filter(label => label.length > 0); // Remove any empty labels
  
  // If hierarchy is empty after cleaning, fallback to field name
  if (cleanedHierarchy.length === 0) {
    return getFieldName(element);
  }
  
  // REVERSE the hierarchy: Outermost -> Inner -> Innermost
  return cleanedHierarchy.reverse().join(' -> ');
}

// Function to add field to tracking (UPDATED)
function trackField(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  filled: boolean,
  filledBy?: 'fuzzy_match' | 'ai_autofill' | 'failed'
): void {
  const selector = generateUniqueSelector(element);
  const fieldName = getFieldName(element);
  const fullLabelPath = getFullLabelPath(element);  // NEW
  const required = isFieldRequired(element);
  
  // Check if field already exists in tracking
  const existingIndex = FIELD_TRACKING.findIndex(f => f.SELECTOR === selector);
  
  const trackingData: FieldTrackingData = {
    "FIELD NAME": fieldName,
    "FULL LABEL PATH": fullLabelPath,  // NEW
    "REQUIRED": required,
    "FILLED": filled,
    "FILLED_BY": filledBy,
    "SELECTOR": selector
  };
  
  if (existingIndex >= 0) {
    // Update existing entry
    FIELD_TRACKING[existingIndex] = trackingData;
  } else {
    // Add new entry
    FIELD_TRACKING.push(trackingData);
  }
}

// Function to print and get tracking data (UPDATED)
function printFieldTracking(): FieldTrackingData[] {
  console.log('\n🎯 ============ FIELD TRACKING SUMMARY ============');
  
  const fuzzyFilled = FIELD_TRACKING.filter(f => f.FILLED_BY === 'fuzzy_match');
  const aiFilled = FIELD_TRACKING.filter(f => f.FILLED_BY === 'ai_autofill');
  const failed = FIELD_TRACKING.filter(f => f.FILLED_BY === 'failed');
  
  console.log(`\n📊 Statistics:`);
  console.log(`   - Total fields tracked: ${FIELD_TRACKING.length}`);
  console.log(`   - Fuzzy match filled: ${fuzzyFilled.length}`);
  console.log(`   - AI autofill filled: ${aiFilled.length}`);
  console.log(`   - Failed fields: ${failed.length}`);
  
  console.log('\n✅ FUZZY MATCH FILLED:');
  fuzzyFilled.forEach((field, idx) => {
    console.log(`   ${idx + 1}. "${field["FIELD NAME"]}" - REQ: ${field.REQUIRED ? 'YES' : 'NO'}`);
  });
  
  console.log('\n🤖 AI AUTOFILL FILLED:');
  aiFilled.forEach((field, idx) => {
    console.log(`   ${idx + 1}. "${field["FIELD NAME"]}" - REQ: ${field.REQUIRED ? 'YES' : 'NO'}`);
  });
  
  console.log('\n❌ FAILED FIELDS:');
  failed.forEach((field, idx) => {
    console.log(`   ${idx + 1}. "${field["FIELD NAME"]}" - REQ: ${field.REQUIRED ? 'YES' : 'NO'}`);
  });
  
  console.log('\n📋 FULL TRACKING DATA:');
  console.log(JSON.stringify(FIELD_TRACKING, null, 2));
  
  console.log('\n============ END OF TRACKING SUMMARY ============\n');
  
  return FIELD_TRACKING;
}

// Reset tracking data
function resetFieldTracking(): void {
  FIELD_TRACKING = [];
}

// Track all unfilled fields on the page
function trackAllUnfilledFields(): void {
  const allInputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select');
  
  allInputs.forEach((element) => {
    // Skip hidden, submit, button fields
    if (element instanceof HTMLInputElement && 
        (element.type === 'hidden' || element.type === 'submit' || element.type === 'button')) {
      return;
    }
    
    const selector = generateUniqueSelector(element);
    
    // Check if this field is already tracked
    const alreadyTracked = FIELD_TRACKING.some(f => f.SELECTOR === selector);
    
    if (!alreadyTracked) {
      // Check if field is empty
      let isEmpty = false;
      
      if (element instanceof HTMLSelectElement) {
        isEmpty = !element.value || element.value === '';
      } else if (element instanceof HTMLInputElement) {
        if (element.type === 'checkbox' || element.type === 'radio') {
          isEmpty = !element.checked;
        } else if (element.type === 'file') {
          isEmpty = !element.files || element.files.length === 0;
        } else {
          isEmpty = !element.value || element.value === '';
        }
      } else {
        isEmpty = !element.value || element.value === '';
      }
      
      // Track as failed if empty, otherwise don't track (already filled by user/other means)
      if (isEmpty) {
        trackField(element, false, 'failed');
      }
    }
  });
}

// ========== END OF FIELD TRACKING SYSTEM ==========

// ========== ENHANCED FUZZY MATCHING SYSTEM WITH CONTEXT AWARENESS ================

// Levenshtein distance for string similarity
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// Normalize and sort tokens for comparison
function normalizeAndSort(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .sort()
    .join(" ")
    .trim();
}

// Compute similarity score (Token Sort / Fuzzy Ratio)
function similarityScore(str1: string, str2: string): number {
  const s1 = normalizeAndSort(str1);
  const s2 = normalizeAndSort(str2);

  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return 1.0;

  const distance = levenshteinDistance(s1, s2);
  const score = 1.0 - distance / maxLength;
  return score;
}
  
// Normalize text for comparison
function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

// Extract meaningful words from text/key
function extractKeyWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/[\s_\-\.]+/)
    .filter(word => word.length > 0);
}

// Get all possible keys from nested object with their paths
function getAllKeys(obj: any, prefix: string = ''): string[] {
  const keys: string[] = [];
  
  for (const key in obj) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(fullPath);
      keys.push(...getAllKeys(obj[key], fullPath));
    } else {
      keys.push(fullPath);
    }
  }
  
  return keys;
}

// Get label hierarchy for an input field (immediate, parent, section)
function getFieldLabelHierarchy(input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string[] {
  const labels: string[] = [];
  
  // 1. Immediate label (closest - highest priority)
  let immediateLabel = '';
  
  // Check for associated label
  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label?.textContent) immediateLabel = label.textContent;
  }
  
  // Check for parent label
  if (!immediateLabel) {
    const parentLabel = input.closest('label');
    if (parentLabel?.textContent) immediateLabel = parentLabel.textContent;
  }
  
  // Check placeholder
  if (!immediateLabel && 'placeholder' in input && input.placeholder) {
    immediateLabel = input.placeholder;
  }
  
  // Check name attribute
  if (!immediateLabel && input.name) {
    immediateLabel = input.name;
  }
  
  // Check aria-label
  if (!immediateLabel && input.getAttribute('aria-label')) {
    immediateLabel = input.getAttribute('aria-label') || '';
  }
  
  if (immediateLabel) labels.push(immediateLabel);
  
  // 2. Parent label (medium priority)
  const formLine = input.closest('.form-line');
  if (formLine) {
    const parentLabel = formLine.querySelector('.form-label');
    if (parentLabel?.textContent && parentLabel.textContent !== immediateLabel) {
      labels.push(parentLabel.textContent);
    }
  }
  
  // 3. Section header (lowest priority)
  let currentElement: Element | null = input;
  while (currentElement) {
    currentElement = currentElement.parentElement;
    if (currentElement?.classList.contains('form-section')) {
      const header = currentElement.querySelector('.form-header');
      if (header?.textContent) {
        labels.push(header.textContent);
        break;
      }
    }
  }
  
  return labels;
}

// Enhanced file input label detection with sibling and wrapper text search
function getFileInputLabelHierarchy(fileInput: HTMLInputElement): string[] {
  const labels: string[] = [];
  
  // Standard label detection
  const standardLabels = getFieldLabelHierarchy(fileInput);
  labels.push(...standardLabels);
  
  // Check parent wrapper for text content (common pattern)
  let parent = fileInput.parentElement;
  let depth = 0;
  while (parent && depth < 5) {
    const textNodes = Array.from(parent.childNodes).filter(
      node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
    );
    
    textNodes.forEach(node => {
      const text = node.textContent?.trim();
      if (text && text.length > 3 && text.length < 200) {
        labels.push(text);
      }
    });
    
    const textElements = parent.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
    textElements.forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length > 5 && text.length < 200) {
        if (!labels.some(l => normalizeText(l) === normalizeText(text))) {
          labels.push(text);
        }
      }
    });
    
    parent = parent.parentElement;
    depth++;
  }
  
  // Check siblings
  const siblings = fileInput.parentElement?.children;
  if (siblings) {
    Array.from(siblings).forEach(sibling => {
      if (sibling !== fileInput && sibling.textContent) {
        const text = sibling.textContent.trim();
        if (text.length > 5 && text.length < 200) {
          if (!labels.some(l => normalizeText(l) === normalizeText(text))) {
            labels.push(text);
          }
        }
      }
    });
  }
  
  if (fileInput.accept) {
    labels.push(`file_upload_${fileInput.accept}`);
  }
  
  if (fileInput.id) {
    labels.push(fileInput.id);
  }
  if (fileInput.name) {
    labels.push(fileInput.name);
  }
  
  return labels;
}

// Check if text suggests file/resume upload
function isFileUploadRelated(text: string): boolean {
  const normalized = normalizeText(text);
  const keywords = [
    'resume', 'cv', 'upload', 'file', 'document', 'attach',
    'drag', 'drop', 'pdf', 'doc', 'docx', 'browse'
  ];
  
  return keywords.some(keyword => normalized.includes(keyword));
}

// COMPREHENSIVE alias matching function
// This handles ALL variations so userData can stay clean

function checkAliasMatch(normalizedLabel: string, normalizedKey: string): number {
  // Comprehensive aliases mapping - covers all form label variations
  const aliasMap: Record<string, string[]> = {
    // === NAME FIELDS ===
    'fullname': ['name', 'completename', 'legalname'],
    'firstname': ['first', 'given', 'forename', 'fname', 'givenname'],
    'lastname': ['last', 'surname', 'family', 'lname', 'familyname'],
    'middlename': ['middle', 'mname', 'middleinitial'],
    
    // === CONTACT ===
    'email': ['emailaddress', 'mail', 'e-mail', 'emailid'],
    'phonenumber': ['phone', 'mobile', 'telephone', 'contact', 'cell', 'cellphone', 'contactnumber', 'mobilenumber', 'telephonenumber'],
    'alternatephone': ['alternate', 'secondary', 'secondaryphone', 'alternatenumber', 'secondarynumber', 'homephone', 'otherphone'],
    
    // === ADDRESS ===
    'addressstreet': ['address', 'street', 'addressline1', 'address1', 'streetaddress', 'line1'],
    'addressline2': ['address2', 'apartment', 'apt', 'suite', 'unit', 'line2'],
    'addresscity': ['city', 'town', 'locality'],
    'addressstate': ['state', 'province', 'region', 'county', 'stateprovince'],
    'addresspostalcode': ['zip', 'zipcode', 'postal', 'postcode', 'postalcode'],
    'addresscountry': ['country', 'nation'],
    
    // === DATE OF BIRTH ===
    'dateofbirth': ['dob', 'birthdate', 'birthday', 'birth', 'bdate'],
    'dateofbirthday': ['day', 'dd', 'dobday', 'birthd ay', 'dateday', 'birthdateday'],
    'dateofbirthmonth': ['month', 'mm', 'dobmonth', 'birthmonth', 'datemonth', 'birthdatemonth'],
    'dateofbirthyear': ['year', 'yyyy', 'dobyear', 'birthyear', 'dateyear', 'birthdateyear'],
    
    // === PERSONAL INFO ===
    'gender': ['sex'],
    'maritalstatus': ['marital', 'status'],
    'nationality': ['nation', 'countryofbirth'],
    'citizenship': ['citizen', 'citizenstatus', 'countryofcitizenship'],
    
    // === EDUCATION - HIGH SCHOOL ===
    'educationhighschoolname': ['highschool', 'school', 'schoolname', 'secondaryschool', 'highschoolname'],
    'educationhighschoollevel': ['educationlevel', 'level', 'qualification'],
    'educationhighschoolstartyear': ['schoolstart', 'schoolstartyear', 'highschoolstart'],
    'educationhighschoolendyear': ['schoolend', 'schoolendyear', 'highschoolend', 'graduationyear', 'graduation'],
    'educationhighschoolgpa': ['schoolgpa', 'highschoolgpa', 'gpa', 'grade', 'grades'],
    
    // === EDUCATION - COLLEGE ===
    'educationcollegename': ['college', 'university', 'collegename', 'universityname', 'institution', 'uni', 'school'],
    'educationcollegedegree': ['degree', 'degreetype', 'qualification', 'certification'],
    'educationcollegemajor': ['major', 'fieldofstudy', 'field', 'concentration', 'specialization', 'subject', 'course'],
    'educationcollegestartyear': ['collegestart', 'universitystart', 'degreestart'],
    'educationcollegeendyear': ['collegeend', 'universityend', 'degreeend', 'expectedgraduation', 'graduation'],
    'educationcollegegpa': ['collegegpa', 'universitygpa', 'gpa', 'grade', 'cgpa'],
    
    // === WORK EXPERIENCE ===
    'workpositiontitle': ['jobtitle', 'position', 'title', 'role', 'job', 'positiontitle', 'designation'],
    'workcompanyname': ['company', 'employer', 'organization', 'companyname', 'employername', 'workplace', 'firm'],
    'worklocation': ['location', 'joblocation', 'workplace', 'city'],
    'workemploymenttype': ['employmenttype', 'jobtype', 'type', 'worktype'],
    'workstartmonth': ['startmonth', 'frommonth', 'beginmonth'],
    'workstartyear': ['startyear', 'fromyear', 'beginyear'],
    'workendmonth': ['endmonth', 'tomonth', 'untilmonth'],
    'workendyear': ['endyear', 'toyear', 'untilyear'],
    'workcurrentlyemployed': ['currentlyworking', 'currentjob', 'present', 'currentlyemployed', 'stillempl oyed'],
    'workdescription': ['description', 'jobdescription', 'responsibilities', 'duties', 'role', 'experience'],
    
    // === REFERENCES ===
    'referencename': ['reference', 'refereename', 'referee', 'referral', 'referenceperson'],
    'referencerelationship': ['relationship', 'relation'],
    'referencephone': ['referencephone', 'refereephon e', 'referencecontact'],
    'referenceemail': ['referenceemail', 'refereemail'],
    
    // === EMPLOYMENT DETAILS ===
    'employmentnoticeperiod': ['noticeperiod', 'notice', 'noticetime'],
    'employmentpreferredlocation': ['preferredlocation', 'desiredlocation', 'location', 'preferredcity'],
    'employmentcurrentlocation': ['currentlocation', 'location', 'city'],
    'employmentwillingtorelocate': ['relocate', 'willingtorelocate', 'relocation', 'canrelocate'],
    'employmentenglishproficiency': ['english', 'englishproficiency', 'englishlevel', 'language'],
    'employmentexpectedsalary': ['salary', 'expectedsalary', 'salaryexpectation', 'desiredsalary', 'compensation', 'pay', 'wage'],
    'employmentavailabledays': ['availabledays', 'workdays', 'days'],
    'employmentavailablehours': ['availablehours', 'workhours', 'hours', 'availability'],
    'employmentauthorizedus': ['authorizedus', 'usauthorization', 'usworkauthorization', 'uswork'],
    'employmentauthorizeduk': ['authorizeduk', 'ukauthorization', 'ukworkauthorization'],
    'employmentauthorizedcanada': ['authorizedcanada', 'canadaauthorization'],
    'employmentvisastatus': ['visa', 'visastatus', 'workpermit', 'authorization'],
    
    // === EEO ===
    'eeodisability': ['disability', 'disabilitystatus', 'disabled'],
    'eeogenderidentity': ['genderidentity', 'gender'],
    'eeosexualorientation': ['sexualorientation', 'orientation'],
    'eeoveteranstatus': ['veteran', 'veteranstatus', 'military'],
    'eeominoritygroup': ['minority', 'minoritygroup', 'race', 'ethnicity'],
    'eeoethnicity': ['ethnicity', 'race', 'racialbackground'],
    
    // === DOCUMENTS & LINKS ===
    'resume': ['cv', 'resumefile', 'cvfile', 'curriculum', 'curriculumvitae'],
    'cv': ['resume', 'cvfile', 'resumefile'],
    'portfolio': ['website', 'portfoliourl', 'portfoliowebsite', 'personalwebsite'],
    'linkedin': ['linkedinurl', 'linkedinprofile', 'linkedin-url'],
    'github': ['githuburl', 'githubprofile', 'github-url', 'git'],
  };
  
  // Check direct match
  if (normalizedLabel === normalizedKey) return 1.0;
  
  // Check if either is a canonical form and the other is its alias
  for (const [canonical, aliases] of Object.entries(aliasMap)) {
    // Label is canonical, key is alias
    if (normalizedLabel === canonical && aliases.includes(normalizedKey)) {
      return 0.98;
    }
    // Key is canonical, label is alias
    if (normalizedKey === canonical && aliases.includes(normalizedLabel)) {
      return 0.98;
    }
    // Both are aliases of same canonical
    if (aliases.includes(normalizedLabel) && aliases.includes(normalizedKey)) {
      return 0.95;
    }
  }
  
  return 0; // No alias match found
}

// Check multi-word match (e.g., "First Name" matches "first_name")
function checkMultiWordMatch(labelWords: string[], keyWords: string[]): number {
  if (labelWords.length === 0 || keyWords.length === 0) return 0;
  
  // Check if label words are subset of key words (order-independent)
  let matchCount = 0;
  for (const labelWord of labelWords) {
    if (keyWords.includes(labelWord)) {
      matchCount++;
    }
  }
  
  // Calculate coverage
  const labelCoverage = matchCount / labelWords.length;
  const keyCoverage = matchCount / keyWords.length;
  
  // Good match if most words match
  if (labelCoverage >= 0.8 && keyCoverage >= 0.5) {
    return Math.max(labelCoverage, keyCoverage);
  }
  
  return 0;
}

// Check contextual combination (e.g., "References > Name > First" -> "reference_name")
function checkContextualCombination(labelPath: string[], dataKey: string): number {
  const normalizedKey = normalizeText(dataKey);
  const keyWords = extractKeyWords(dataKey);
  
  // Extract significant words from label path
  const pathWords: string[] = [];
  for (const label of labelPath) {
    const words = extractKeyWords(label);
    // Skip common section headers that don't add meaning
    const meaningfulWords = words.filter(w => 
      !['section', 'form', 'information', 'details', 'personal', 'please', 'enter', 'provide'].includes(w)
    );
    pathWords.push(...meaningfulWords);
  }
  
  // Remove duplicates
  const uniquePathWords = Array.from(new Set(pathWords));
  
  // Check if combined path words match key structure
  let matchCount = 0;
  for (const pathWord of uniquePathWords) {
    if (keyWords.includes(pathWord) || normalizedKey.includes(pathWord)) {
      matchCount++;
    }
  }
  
  if (uniquePathWords.length === 0) return 0;
  
  const coverage = matchCount / uniquePathWords.length;
  
  // Example: ["references", "name", "first"] matches "reference_name" or "reference_contact_name"
  if (coverage >= 0.6) {
    return 0.85; // High confidence for contextual match
  }
  
  return 0;
}

// Check containment (one contains the other)
function checkContainment(
  normalizedLabel: string, 
  normalizedKey: string,
  labelWords: string[],
  keyWords: string[]
): number {
  
  // Direct substring containment
  if (normalizedLabel.includes(normalizedKey) || normalizedKey.includes(normalizedLabel)) {
    const ratio = Math.min(normalizedLabel.length, normalizedKey.length) / 
                  Math.max(normalizedLabel.length, normalizedKey.length);
    return ratio * 0.85;
  }
  
  // Word-level containment
  for (const labelWord of labelWords) {
    for (const keyWord of keyWords) {
      if (labelWord.includes(keyWord) || keyWord.includes(labelWord)) {
        if (labelWord.length >= 4 && keyWord.length >= 4) {
          return 0.75;
        }
      }
    }
  }
  
  return 0;
}

// Calculate match score considering full context hierarchy
function calculateContextualMatch(
  dataKey: string, 
  labelHierarchy: string[], 
  weights: number[]
): { score: number; matchType: 'exact' | 'alias' | 'fuzzy' } {
  
  const normalizedKey = normalizeText(dataKey);
  const keyWords = extractKeyWords(dataKey);
  
  let totalScore = 0;
  let totalWeight = 0;
  let bestMatchType: 'exact' | 'alias' | 'fuzzy' = 'fuzzy';
  
  // Process each label in hierarchy (immediate, parent, section)
  for (let i = 0; i < labelHierarchy.length; i++) {
    const label = labelHierarchy[i];
    const normalizedLabel = normalizeText(label);
    
    if (!normalizedLabel) continue;
    
    const weight = weights[i] || 0.1;
    totalWeight += weight;
    
    const labelWords = extractKeyWords(label);
    
    // STRATEGY 1: Exact match (highest priority)
    if (normalizedLabel === normalizedKey) {
      totalScore += 1.0 * weight;
      bestMatchType = 'exact';
      continue;
    }
    
    // STRATEGY 2: Alias detection (e.g., "First Name" matches "firstname")
    const aliasScore = checkAliasMatch(normalizedLabel, normalizedKey);
    if (aliasScore > 0.9) {
      totalScore += aliasScore * weight;
      if (bestMatchType === 'fuzzy') bestMatchType = 'alias';
      continue;
    }
    
    // STRATEGY 3: Multi-word matching (handles "First Name" -> "first_name")
    const multiWordScore = checkMultiWordMatch(labelWords, keyWords);
    if (multiWordScore > 0.8) {
      totalScore += multiWordScore * weight;
      continue;
    }
    
    // STRATEGY 4: Contextual combination (handles "References > Name > First" -> "reference_name")
    if (i > 0) {
      const contextScore = checkContextualCombination(labelHierarchy.slice(0, i + 1), dataKey);
      if (contextScore > 0.8) {
        totalScore += contextScore * weight;
        continue;
      }
    }
    
    // STRATEGY 5: Substring containment
    const containmentScore = checkContainment(normalizedLabel, normalizedKey, labelWords, keyWords);
    if (containmentScore > 0.7) {
      totalScore += containmentScore * weight;
      continue;
    }
    
    // STRATEGY 6: Fuzzy similarity (last resort)
    const fuzzyScore = similarityScore(normalizedLabel, normalizedKey);
    totalScore += fuzzyScore * weight;
  }
  
  const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
  
  return { score: finalScore, matchType: bestMatchType };
}

// ENHANCED: Context-aware fuzzy matching with increased strictness
function fuzzyMatchWithHierarchy(
  labelHierarchy: string[], 
  userData: any, 
  threshold: number = 0.8  // Increased from 0.75 to 0.8 for stricter matching
): { key: string; score: number; matchType: 'exact' | 'alias' | 'fuzzy' } | null {
  
  if (labelHierarchy.length === 0) return null;
  
  const allKeys = getAllKeys(userData);
  let bestMatch: { key: string; score: number; matchType: 'exact' | 'alias' | 'fuzzy' } | null = null;
  
  // Weight configuration for label hierarchy with stricter matching
  // Most important: immediate label (1.0)
  // Less important: parent context (0.3) - reduced from 0.4
  // Least important: section header (0.1) - reduced from 0.2
  const weights = [1.0, 0.3, 0.1];
  
  for (const key of allKeys) {
    const matchResult = calculateContextualMatch(key, labelHierarchy, weights);
    
    if (matchResult.score > threshold && (!bestMatch || matchResult.score > bestMatch.score)) {
      bestMatch = { key, score: matchResult.score, matchType: matchResult.matchType };
    }
  }
  
  return bestMatch;
}

// Fill input/textarea field
function fillTextField(element: HTMLInputElement | HTMLTextAreaElement, value: string): boolean {
  element.value = value;
  
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
  element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  
  return true;
}

// IMPROVED: Fill select dropdown with enhanced fuzzy matching
function fillSelectField(select: HTMLSelectElement, value: string): boolean {
  const normalizedValue = normalizeText(value);
  const valueWords = extractKeyWords(value);
  
  let bestMatch: { index: number; score: number; matchType: string } | null = null;
  
  for (let i = 0; i < select.options.length; i++) {
    const option = select.options[i];
    const optionText = normalizeText(option.textContent || '');
    const optionValue = normalizeText(option.value);
    const optionWords = extractKeyWords(option.textContent || '');
    
    let score = 0;
    let matchType = 'none';
    
    // Exact match
    if (optionText === normalizedValue || optionValue === normalizedValue) {
      score = 1.0;
      matchType = 'exact';
    }
    // Containment
    else if (optionText.includes(normalizedValue) || normalizedValue.includes(optionText) ||
             optionValue.includes(normalizedValue) || normalizedValue.includes(optionValue)) {
      score = 0.85;
      matchType = 'contains';
    }
    // Multi-word match
    else {
      const multiWordScore = checkMultiWordMatch(valueWords, optionWords);
      if (multiWordScore > 0.7) {
        score = multiWordScore;
        matchType = 'multiword';
      } else {
        // Fuzzy similarity
        const textScore = similarityScore(normalizedValue, optionText);
        const valueScore = similarityScore(normalizedValue, optionValue);
        score = Math.max(textScore, valueScore);
        matchType = 'fuzzy';
      }
    }
    
    if (score > 0.7 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { index: i, score, matchType };
    }
  }
  
  if (bestMatch && bestMatch.score > 0.7) {
    select.selectedIndex = bestMatch.index;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    select.dispatchEvent(new Event('blur', { bubbles: true }));
    
    console.log(`✅ Select matched [${bestMatch.matchType}] score: ${bestMatch.score.toFixed(3)}`);
    return true;
  }
  
  return false;
}

// Fill checkbox
function fillCheckboxField(checkbox: HTMLInputElement, value: string): boolean {
  const normalizedValue = normalizeText(value);
  const shouldCheck = ['yes', 'true', '1', 'checked', 'on'].includes(normalizedValue);
  
  if (checkbox.checked !== shouldCheck) {
    checkbox.checked = shouldCheck;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    checkbox.dispatchEvent(new Event('click', { bubbles: true }));
    return true;
  }
  
  return false;
}

// Fill file upload field
async function fillFileField(fileInput: HTMLInputElement, resumeFileName: string): Promise<boolean> {
  try {
    console.log(`📄 Attempting to upload file to:`, fileInput);
    
    // Try to get downloaded resume from chrome.storage.local first
    const storageResult = await chrome.storage.local.get(['resumeBase64', 'resumePath']);
    
    let blob: Blob;
    let fileName: string = resumeFileName;
    
    if (storageResult.resumeBase64) {
      console.log('✅ Using downloaded resume from API');
      
      // Convert base64 to blob
      const base64Data = storageResult.resumeBase64;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      blob = new Blob([byteArray], { type: 'application/pdf' });
      
      // Extract filename from resume path if available
      if (storageResult.resumePath) {
        const pathParts = storageResult.resumePath.split('/');
        const lastPart = pathParts[pathParts.length - 1];
        // Remove the ID prefix (e.g., "4506833483067297792:")
        const fileNamePart = lastPart.split(':')[1] || lastPart;
        fileName = fileNamePart || resumeFileName;
      }
      
      console.log('📄 Using filename:', fileName);
    } else {
      console.log('⚠️ No downloaded resume found, falling back to static Resume.pdf');
      
      // Fallback to static resume file
      const fileUrl = chrome.runtime.getURL(`src/static/Resume.pdf`);
      const response = await fetch(fileUrl);
      if (!response.ok) {
        console.error(`❌ Failed to fetch file: ${response.status}`);
        return false;
      }
      blob = await response.blob();
    }
    
    const file = new File([blob], fileName, { type: 'application/pdf' });
    
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;
    
    const events = ['change', 'input', 'blur', 'focus'];
    events.forEach(eventType => {
      fileInput.dispatchEvent(new Event(eventType, { bubbles: true }));
    });
    
    let parent = fileInput.parentElement;
    let depth = 0;
    while (parent && depth < 3) {
      events.forEach(eventType => {
        parent!.dispatchEvent(new Event(eventType, { bubbles: true }));
      });
      parent = parent.parentElement;
      depth++;
    }
    
    console.log(`✅ File uploaded successfully: ${fileName}`);
    return true;
  } catch (error) {
    console.error(`❌ Error uploading file:`, error);
    return false;
  }
}

// Get nested value from object
function getNestedValue(obj: any, path: string): string | undefined {
  const value = path.split('.').reduce((current, key) => {
    if (current === undefined || current === null) return undefined;
    
    if (current[key] !== undefined) return current[key];
    
    const lowerKey = key.toLowerCase();
    for (const objKey in current) {
      if (objKey.toLowerCase() === lowerKey) {
        return current[objKey];
      }
    }
    
    return undefined;
  }, obj);
  
  return value !== undefined && value !== null ? String(value) : undefined;
}

// ENHANCED: Fuzzy match only - fills only highly confident fields with improved matching
async function fuzzyMatchOnly() {
  console.log('\n🎯 ============ FUZZY MATCHING START ============');
  
  // Reset tracking data at start
  resetFieldTracking();
  
  const result = await chrome.storage.local.get('userData');
  const userData = result.userData;
  
  if (!userData) {
    console.error('❌ No user data found in storage');
    return { success: false, filledCount: 0, filledFields: [] };
  }
  
  console.log('📦 User data loaded from storage');
  console.log('   Available fields:', Object.keys(userData).length);
  
  let filledCount = 0;
  const filledFields: Array<{selector: string; field: string; score: number; matchType: string}> = [];
  
  const inputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
  const selects = document.querySelectorAll<HTMLSelectElement>('select');
  const fileInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
  
  console.log('\n📋 Form fields detected:');
  console.log('   - Text/Textarea inputs:', inputs.length);
  console.log('   - Select dropdowns:', selects.length);
  console.log('   - File inputs:', fileInputs.length);
  
  console.log('\n🎯 FUZZY MATCHING - High Confidence Only (threshold: 0.75)');
  
  type FieldMatch = {
    element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    labelHierarchy: string[];
    matchedField: string;
    score: number;
    matchType: 'exact' | 'alias' | 'fuzzy';
  };
  const allMatches: FieldMatch[] = [];

  // Collect matches for inputs (exclude file inputs)
  inputs.forEach((input) => {
    if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button' || input.type === 'file') return;
    const labelHierarchy = getFieldLabelHierarchy(input);
    if (labelHierarchy.length === 0) return;
    
    const match = fuzzyMatchWithHierarchy(labelHierarchy, userData);
    if (match) {
      allMatches.push({
        element: input,
        labelHierarchy,
        matchedField: match.key,
        score: match.score,
        matchType: match.matchType
      });
    }
  });

  // Collect matches for selects
  selects.forEach((select) => {
    const labelHierarchy = getFieldLabelHierarchy(select);
    if (labelHierarchy.length === 0) return;
    
    const match = fuzzyMatchWithHierarchy(labelHierarchy, userData);
    if (match) {
      allMatches.push({
        element: select,
        labelHierarchy,
        matchedField: match.key,
        score: match.score,
        matchType: match.matchType
      });
    }
  });

  console.log(`\n✅ Found ${allMatches.length} potential matches`);

  // Sort by match type priority, then by score
  allMatches.sort((a, b) => {
    // Priority: exact > alias > fuzzy
    const typeOrder = { exact: 3, alias: 2, fuzzy: 1 };
    const aTypeScore = typeOrder[a.matchType];
    const bTypeScore = typeOrder[b.matchType];
    
    if (aTypeScore !== bTypeScore) {
      return bTypeScore - aTypeScore;
    }
    return b.score - a.score;
  });
  
  const usedDataKeys = new Set<string>();

  for (const match of allMatches) {
    if (usedDataKeys.has(match.matchedField)) continue;

    const value = getNestedValue(userData, match.matchedField);
    if (!value) continue;

    let filled = false;
    const primaryLabel = match.labelHierarchy[0] || '';
    const selector = generateUniqueSelector(match.element);

    if (match.element instanceof HTMLInputElement && match.element.type === 'checkbox') {
      const normalizedValue = normalizeText(value);
      const labelText = normalizeText(primaryLabel);
      const inputValue = normalizeText(match.element.value);

      if (
        labelText === normalizedValue ||
        inputValue === normalizedValue ||
        similarityScore(labelText, normalizedValue) > 0.7 ||
        similarityScore(inputValue, normalizedValue) > 0.7
      ) {
        filled = fillCheckboxField(match.element, value);
      }
    } else if (match.element instanceof HTMLSelectElement) {
      filled = fillSelectField(match.element, value);
    } else {
      filled = fillTextField(match.element as HTMLInputElement | HTMLTextAreaElement, value);
    }

    if (filled) {
      console.log(`✅ Fuzzy filled "${match.matchedField}" [${match.matchType}] [score: ${match.score.toFixed(3)}]:`, value.substring(0, 50));
      filledCount++;
      filledFields.push({
        selector,
        field: match.matchedField,
        score: match.score,
        matchType: match.matchType
      });
      usedDataKeys.add(match.matchedField);
      
      // Track filled field
      trackField(match.element, true, 'fuzzy_match');
    } else {
      // Track failed field (match found but couldn't fill)
      trackField(match.element, false, 'failed');
    }
  }

  // Handle file uploads with tracking to prevent duplicates
  console.log('\n📤 Checking file uploads...');
  const filledFileInputs = new Set<HTMLInputElement>();
  
  for (const fileInput of fileInputs) {
    // Skip if already filled
    if (filledFileInputs.has(fileInput)) {
      console.log('⏭️  Already filled this file input, skipping...');
      continue;
    }
    
    const labelHierarchy = getFileInputLabelHierarchy(fileInput);
    const hasFileKeywords = labelHierarchy.some(l => isFileUploadRelated(l));
    const match = labelHierarchy.length > 0 ? 
      fuzzyMatchWithHierarchy(labelHierarchy, userData, 0.5) : null;  // Lower threshold for files
    
    console.log('📎 File input detected:');
    console.log('   - Labels:', labelHierarchy.slice(0, 3));
    console.log('   - Has file keywords:', hasFileKeywords);
    console.log('   - Match:', match ? `${match.key} [${match.matchType}] score: ${match.score.toFixed(3)}` : 'none');
    
    const shouldUpload = hasFileKeywords && (
      match?.key === 'resume' || 
      match?.key === 'cv' ||
      match?.key === 'resumefile' ||
      match?.key === 'cvfile' ||
      match?.key.includes('resume') ||
      match?.key.includes('cv') ||
      userData.resume ||
      userData.cv
    );
    
    if (shouldUpload) {
      const resumeFileName = getNestedValue(userData, 'resume') ||
                            getNestedValue(userData, 'cv') ||
                            getNestedValue(userData, 'links_and_documents_resume') ||
                            'Resume.pdf';
      
      const fileUploaded = await fillFileField(fileInput, resumeFileName);
      if (fileUploaded) {
        filledFileInputs.add(fileInput);
        const selector = generateUniqueSelector(fileInput);
        console.log(`✅ Fuzzy uploaded file [${match?.matchType || 'auto'}] [score: ${match?.score.toFixed(3) || 'auto'}]`);
        filledCount++;
        filledFields.push({
          selector,
          field: match?.key || 'resume',
          score: match?.score || 0.9,
          matchType: match?.matchType || 'fuzzy'
        });
        
        // Track filled file field
        trackField(fileInput, true, 'fuzzy_match');
      } else {
        // Track failed file upload
        trackField(fileInput, false, 'failed');
      }
    } else {
      // Track failed field (no match for file upload)
      if (hasFileKeywords) {
        trackField(fileInput, false, 'failed');
      }
    }
  }
  
  console.log('\n✅ ============ FUZZY MATCHING COMPLETE ============');
  console.log(`   Fields filled: ${filledCount}`);
  console.log(`   - Exact matches: ${filledFields.filter(f => f.matchType === 'exact').length}`);
  console.log(`   - Alias matches: ${filledFields.filter(f => f.matchType === 'alias').length}`);
  console.log(`   - Fuzzy matches: ${filledFields.filter(f => f.matchType === 'fuzzy').length}`);
  console.log(`   Success: ${filledCount > 0}`);
  
  // Track all unfilled fields before printing summary
  trackAllUnfilledFields();
  
  // Print field tracking summary
  const trackingData = printFieldTracking();
  
  return { success: filledCount > 0, filledCount, filledFields, trackingData };
}

// ========== FUZZY MATCHING SYSTEM END ==========


// ========== AI DIAGNOSTIC SYSTEM ==========

interface AIFormField {
  selector: string;
  id: string;
  name: string;
  type: string;
  inputType?: string;
  labels: {
    directLabel?: string;
    fieldsetLabel?: string;
    groupLabel?: string;
    placeholder?: string;
    ariaLabel?: string;
    precedingLabels?: string[];
    contextText?: string;
  };
  value: any;
  isEmpty: boolean;
  isRequired: boolean;
  options?: {
    unselected: Array<[string, string]>;
    selected: Array<[string, string]> | null;
  };
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: string;
    max?: string;
  };
  filled_by?: string;  // NEW: Track if filled by fuzzy matching
  should_fill?: boolean;  // NEW: Indicate if AI should fill this
}

interface AIFormSection {
  heading: string;
  fields: AIFormField[];
  subsections: AIFormSection[];
}

interface AIFormSnapshot {
  url: string;
  title: string;
  timestamp: string;
  sections: AIFormSection[];
  allFields: AIFormField[];
  metadata: {
    totalFields: number;
    requiredFields: number;
    emptyFields: number;
    formAction?: string;
    formMethod?: string;
  };
}

// Type definition for AI-generated actions (used for validation and type safety)
interface AIFillAction {
  selector: string;
  action: 'fill' | 'select' | 'check' | 'uncheck' | 'click' | 'upload_file' | 'select_multiple' | 'fill_date' | 'radio_select' | 'spin_increment' | 'spin_decrement';
  value?: any;
  reasoning?: string; // AI's explanation for this action
}

// Type definition for the JSON payload from AI
interface AIPayload {
  actions: AIFillAction[];
}

// NEW: Capture form snapshot with fuzzy-filled fields marked
function captureAIFormSnapshotWithFuzzyData(filledSelectors: Set<string>): AIFormSnapshot {
  const sections: AIFormSection[] = [];
  const allFields: AIFormField[] = [];
  
  const visualSections = extractVisualSections(filledSelectors);
  if (visualSections.length > 0) {
    sections.push(...visualSections);
  } else {
    const sectionElements = document.querySelectorAll('form, fieldset, [role="group"], [class*="section"], [class*="form-group"]');
    
    sectionElements.forEach((section) => {
      const sectionData = extractSection(section as HTMLElement, filledSelectors);
      if (sectionData && (sectionData.fields.length > 0 || sectionData.subsections.length > 0)) {
        sections.push(sectionData);
      }
    });
  }
  
  const orphanFields = captureOrphanFields(filledSelectors);
  if (orphanFields.length > 0) {
    sections.push({
      heading: "Other Fields",
      fields: orphanFields,
      subsections: []
    });
  }
  
  function flattenSections(section: AIFormSection): void {
    allFields.push(...section.fields);
    section.subsections.forEach(flattenSections);
  }
  sections.forEach(flattenSections);
  
  return {
    url: window.location.href,
    title: document.title,
    timestamp: new Date().toISOString(),
    sections,
    allFields,
    metadata: {
      totalFields: allFields.length,
      requiredFields: allFields.filter(f => f.isRequired).length,
      emptyFields: allFields.filter(f => f.isEmpty && f.should_fill).length,
      formAction: (document.querySelector('form') as HTMLFormElement)?.action,
      formMethod: (document.querySelector('form') as HTMLFormElement)?.method
    }
  };
}

function extractSection(element: HTMLElement, filledSelectors: Set<string>): AIFormSection | null {
  const heading = getSectionHeading(element);
  
  const fields: AIFormField[] = [];
  const subsections: AIFormSection[] = [];
  
  const inputs = element.querySelectorAll('input, select, textarea');
  const directInputs = Array.from(inputs).filter(input => {
    const closestSemantic = input.closest('form, fieldset, [role="group"], [class*="section"], [class*="form-group"]');
    return closestSemantic === element;
  });
  
  directInputs.forEach((input) => {
    const field = extractField(input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, filledSelectors);
    if (field) fields.push(field);
  });
  
  const nestedSections = Array.from(element.querySelectorAll('fieldset, [role="group"]')).filter(nested => {
    const closestSemantic = nested.parentElement?.closest('form, fieldset, [role="group"]');
    return closestSemantic === element;
  });
  
  nestedSections.forEach((nested) => {
    const section = extractSection(nested as HTMLElement, filledSelectors);
    if (section) subsections.push(section);
  });
  
  if (fields.length === 0 && subsections.length === 0) {
    return null;
  }
  
  return {
    heading,
    fields,
    subsections
  };
}

function extractField(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  filledSelectors: Set<string>
): AIFormField | null {
  if (element.type === 'hidden' || element.type === 'submit' || element.type === 'button') {
    return null;
  }
  
  const selector = generateUniqueSelector(element);
  const isFilled = filledSelectors.has(selector);
  
  // If filled by fuzzy, return minimal data
  if (isFilled) {
    return {
      selector,
      id: element.id,
      name: element.name,
      type: element.type || element.tagName.toLowerCase(),
      inputType: element instanceof HTMLInputElement ? element.type : undefined,
      labels: {
        directLabel: getDirectLabel(element),
        fieldsetLabel: getFieldsetLabel(element),
        groupLabel: getGroupLabel(element)
      },
      value: element instanceof HTMLSelectElement ? element.value : 
             element instanceof HTMLInputElement && (element.type === 'checkbox' || element.type === 'radio') ? element.checked : 
             element instanceof HTMLInputElement && element.type === 'file' ? element.files?.[0]?.name || null :
             element.value,
      isEmpty: false,
      isRequired: element.hasAttribute('required'),
      filled_by: 'fuzzy_matching'
    };
  }
  
  // For empty fields, return full details
  const labels = {
    directLabel: getDirectLabel(element),
    fieldsetLabel: getFieldsetLabel(element),
    groupLabel: getGroupLabel(element),
    placeholder: 'placeholder' in element ? element.placeholder : undefined,
    ariaLabel: element.getAttribute('aria-label') || undefined,
    precedingLabels: getPrecedingLabels(element),
    contextText: getContextText(element)
  };
  
  let value: any;
  let options: { unselected: Array<[string, string]>; selected: Array<[string, string]> | null } | undefined;  
  if (element instanceof HTMLSelectElement) {
    value = element.value;
    const unselected: Array<[string, string]> = [];
    const selected: Array<[string, string]> = [];
    
    Array.from(element.options).forEach(opt => {
      const pair: [string, string] = [opt.value, opt.textContent?.trim() || ''];
      if (opt.selected) {
        selected.push(pair);
      } else {
        unselected.push(pair);
      }
    });
    
    options = {
      unselected,
      selected: selected.length > 0 ? selected : null
    };
  } else if (element instanceof HTMLInputElement) {
    if (element.type === 'checkbox' || element.type === 'radio') {
      value = element.checked;
    } else if (element.type === 'file') {
      value = element.files?.[0]?.name || null;
    } else {
      value = element.value;
    }
  } else {
    value = element.value;
  }
  
  const isEmpty = !value || value === '' || (typeof value === 'boolean' && !value);
  
  return {
    selector,
    id: element.id,
    name: element.name,
    type: element.type || element.tagName.toLowerCase(),
    inputType: element instanceof HTMLInputElement ? element.type : undefined,
    labels,
    value,
    isEmpty,
    isRequired: element.hasAttribute('required'),
    options,
    validation: {
      pattern: element.getAttribute('pattern') || undefined,
      minLength: element.getAttribute('minlength') ? parseInt(element.getAttribute('minlength')!) : undefined,
      maxLength: element.getAttribute('maxlength') ? parseInt(element.getAttribute('maxlength')!) : undefined,
      min: element.getAttribute('min') || undefined,
      max: element.getAttribute('max') || undefined
    },
    should_fill: isEmpty  // Mark empty fields for AI to fill
  };
}

function generateUniqueSelector(element: HTMLElement): string {
  if (element.id) return `#${element.id}`;
  if ('name' in element && (element as HTMLInputElement).name) return `[name="${(element as HTMLInputElement).name}"]`;
  
  let selector = element.tagName.toLowerCase();
  if (element.className) {
    const classes = Array.from(element.classList).filter(c => c && !c.includes(' '));
    if (classes.length > 0) {
      selector += `.${classes.join('.')}`;
    }
  }
  
  const parent = element.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(element);
    selector += `:nth-child(${index + 1})`;
  }
  
  return selector;
}

function getDirectLabel(element: HTMLElement): string | undefined {
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label?.textContent) {
      const text = label.textContent.trim();
      if (text) return text;
    }
  }
  
  const parentLabel = element.closest('label');
  if (parentLabel) {
    const clone = parentLabel.cloneNode(true) as HTMLElement;
    const input = clone.querySelector('input, select, textarea');
    if (input) input.remove();
    const text = clone.textContent?.trim();
    if (text) return text;
  }
  
  return undefined;
}

function getFieldsetLabel(element: HTMLElement): string | undefined {
  const fieldset = element.closest('fieldset');
  if (fieldset) {
    const legend = fieldset.querySelector(':scope > legend');
    if (legend?.textContent) {
      const text = legend.textContent.trim();
      if (text) return text;
    }
  }
  return undefined;
}

function getGroupLabel(element: HTMLElement): string | undefined {
  const group = element.closest('[role="group"]');
  if (group) {
    const ariaLabel = group.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;
    
    const ariaLabelledBy = group.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const labelElement = document.getElementById(ariaLabelledBy);
      if (labelElement?.textContent) {
        const text = labelElement.textContent.trim();
        if (text) return text;
      }
    }
  }
  return undefined;
}

function getPrecedingLabels(element: HTMLElement): string[] | undefined {
  const labels: string[] = [];
  const formContainer = element.closest('form, fieldset, [role="group"], [class*="form"]');
  
  if (!formContainer) return undefined;
  
  const allElements = Array.from(formContainer.querySelectorAll('label, h1, h2, h3, h4, h5, h6, [class*="label"], [class*="heading"], [class*="title"]'));
  const elementIndex = Array.from(formContainer.querySelectorAll('input, select, textarea')).indexOf(element as any);
  
  if (elementIndex === -1) return undefined;
  
  for (const el of allElements) {
    const elementPosition = Array.from(formContainer.querySelectorAll('*')).indexOf(el);
    const inputPosition = Array.from(formContainer.querySelectorAll('*')).indexOf(element);
    
    if (elementPosition < inputPosition) {
      const text = el.textContent?.trim();
      if (text && text.length > 0 && text.length < 200 && !text.includes('\n\n')) {
        labels.push(text);
      }
    }
  }
  
  return labels.length > 0 ? labels.slice(-5) : undefined;
}

function getContextText(element: HTMLElement): string | undefined {
  const parent = element.parentElement;
  if (!parent) return undefined;
  
  const clone = parent.cloneNode(true) as HTMLElement;
  
  const inputs = clone.querySelectorAll('input, select, textarea, button');
  inputs.forEach(input => input.remove());
  
  const text = clone.textContent?.trim();
  
  if (text && text.length > 0 && text.length < 300) {
    return text;
  }
  
  return undefined;
}

function getSectionHeading(element: HTMLElement): string {
  const legend = element.querySelector(':scope > legend');
  if (legend?.textContent) {
    const text = legend.textContent.trim();
    if (text) return text;
  }
  
  const heading = element.querySelector(':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6');
  if (heading?.textContent) {
    const text = heading.textContent.trim();
    if (text) return text;
  }
  
  const label = element.querySelector(':scope > .form-label, :scope > .section-title, :scope > [class*="heading"]');
  if (label?.textContent) {
    const text = label.textContent.trim();
    if (text) return text;
  }
  
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;
  
  const ariaLabelledBy = element.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const labelElement = document.getElementById(ariaLabelledBy);
    if (labelElement?.textContent) {
      const text = labelElement.textContent.trim();
      if (text) return text;
    }
  }
  
  const id = element.id;
  if (id) {
    const labelFor = document.querySelector(`[for="${id}"]`);
    if (labelFor?.textContent) {
      const text = labelFor.textContent.trim();
      if (text) return text;
    }
  }
  
  return 'Unnamed Section';
}

function extractVisualSections(filledSelectors: Set<string>): AIFormSection[] {
  const sections: AIFormSection[] = [];
  
  const headerSelectors = [
    '[data-type="control_head"]',
    'h1, h2, h3, h4, h5, h6',
    '[class*="header"]',
    '[class*="section-title"]',
    '[id*="header"]',
    'legend',
    '[role="heading"]'
  ];
  
  const allHeaders = document.querySelectorAll(headerSelectors.join(', '));
  const processedInputs = new Set<Element>();
  
  allHeaders.forEach((header, index) => {
    const headerText = extractHeaderText(header as HTMLElement);
    
    if (!headerText || headerText === 'Unnamed Section') return;
    
    const fields: AIFormField[] = [];
    
    let nextHeader: Element | null = null;
    for (let i = index + 1; i < allHeaders.length; i++) {
      const potentialNext = allHeaders[i];
      const potentialText = extractHeaderText(potentialNext as HTMLElement);
      if (potentialText && potentialText !== 'Unnamed Section') {
        nextHeader = potentialNext;
        break;
      }
    }
    
    const container = header.closest('form') || document.body;
    const allInputs = Array.from(container.querySelectorAll('input, select, textarea'));
    
    const allElements = Array.from(container.querySelectorAll('*'));
    const headerIndex = allElements.indexOf(header);
    const nextHeaderIndex = nextHeader ? allElements.indexOf(nextHeader) : Infinity;
    
    allInputs.forEach((input) => {
      if (processedInputs.has(input)) return;
      
      const inputIndex = allElements.indexOf(input);
      
      if (inputIndex > headerIndex && inputIndex < nextHeaderIndex) {
        const field = extractField(
          input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
          filledSelectors
        );
        if (field) {
          fields.push(field);
          processedInputs.add(input);
        }
      }
    });
    
    if (fields.length > 0) {
      sections.push({
        heading: headerText,
        fields,
        subsections: []
      });
    }
  });
  
  return sections;
}

function extractHeaderText(element: HTMLElement): string {
  if (element.hasAttribute('data-type') && element.getAttribute('data-type') === 'control_head') {
    const nestedHeader = element.querySelector('h1, h2, h3, h4, h5, h6, [class*="header"], [class*="form-header"]');
    if (nestedHeader?.textContent) {
      const text = nestedHeader.textContent.trim();
      if (text) return text;
    }
  }
  
  if (element.textContent) {
    const text = element.textContent.trim();
    if (text && text.length > 0 && text.length < 200) {
      return text;
    }
  }
  
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;
  
  return '';
}

function captureOrphanFields(filledSelectors: Set<string>): AIFormField[] {
  const fields: AIFormField[] = [];
  const inputs = document.querySelectorAll('input, select, textarea');
  
  inputs.forEach((input) => {
    const hasSemanticParent = input.closest('form, fieldset, [role="group"], [class*="form-group"]');
    if (!hasSemanticParent) {
      const field = extractField(
        input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
        filledSelectors
      );
      if (field) fields.push(field);
    }
  });
  
  return fields;
}

// Fill radio button
function fillRadioField(radio: HTMLInputElement): boolean {
  if (radio.type !== 'radio') return false;
  
  if (radio.name) {
    const radioGroup = document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${radio.name}"]`);
    radioGroup.forEach(r => {
      if (r !== radio && r.checked) {
        r.checked = false;
        r.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }
  
  if (!radio.checked) {
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    radio.dispatchEvent(new Event('click', { bubbles: true }));
    return true;
  }
  
  return false;
}

// Fill multi-select dropdown
function fillMultiSelectField(select: HTMLSelectElement, values: string[]): boolean {
  if (!select.multiple) return false;
  
  let changed = false;
  
  Array.from(select.options).forEach(opt => {
    if (opt.selected) {
      opt.selected = false;
      changed = true;
    }
  });
  
  values.forEach(value => {
    const normalizedValue = normalizeText(value);
    
    for (let i = 0; i < select.options.length; i++) {
      const option = select.options[i];
      const optionText = normalizeText(option.textContent || '');
      const optionValue = normalizeText(option.value);
      
      if (optionText === normalizedValue || optionValue === normalizedValue ||
          optionText.includes(normalizedValue) || normalizedValue.includes(optionText)) {
        option.selected = true;
        changed = true;
        break;
      }
    }
  });
  
  if (changed) {
    select.dispatchEvent(new Event('change', { bubbles: true }));
    select.dispatchEvent(new Event('blur', { bubbles: true }));
    return true;
  }
  
  return false;
}

// Fill date input
function fillDateField(input: HTMLInputElement, dateValue: string): boolean {
  if (input.type !== 'date') return false;
  
  let formattedDate = dateValue;
  
  if (dateValue.includes('/')) {
    const parts = dateValue.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else if (parts[0].length === 4) {
        formattedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
  }
  
  input.value = formattedDate;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new Event('blur', { bubbles: true }));
  
  return true;
}

// Handle spin button
function fillSpinButton(input: HTMLInputElement, action: 'increment' | 'decrement'): boolean {
  if (input.type !== 'number') return false;
  
  const currentValue = parseFloat(input.value) || 0;
  const step = parseFloat(input.step) || 1;
  const min = input.min ? parseFloat(input.min) : -Infinity;
  const max = input.max ? parseFloat(input.max) : Infinity;
  
  let newValue = action === 'increment' ? currentValue + step : currentValue - step;
  
  newValue = Math.max(min, Math.min(max, newValue));
  
  input.value = newValue.toString();
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  
  return true;
}
// Replace the function starting around line 750

async function executeAIActionsFromJSON(
  actionsJSON: string
): Promise<{ success: number; failed: number; errors: string[]; trackingData: FieldTrackingData[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    // ADD TYPE ANNOTATION HERE (previously it was just: const payload = JSON.parse(...))
    const payload: AIPayload = JSON.parse(actionsJSON);

    if (!payload.actions || !Array.isArray(payload.actions)) {
      throw new Error('Invalid JSON: "actions" array not found');
    }

    console.log(`🤖 Executing ${payload.actions.length} AI actions...`);

    // Rest of the function stays the same
    for (const action of payload.actions) {
      try {
        // Skip if value is null, undefined, or empty string for fill/select actions
        if (['fill', 'select', 'check', 'upload_file', 'select_multiple', 'fill_date'].includes(action.action) && 
            (action.value === null  || action.value === "string" || action.value === "null")) {
          console.log(`⏭️  Skipping action for ${action.selector} - value is ${action.value === '' ? 'empty string' : 'null/undefined'}`);
          failed++;
          continue;
        }
        const element = document.querySelector(action.selector) as
          | HTMLInputElement
          | HTMLSelectElement
          | HTMLTextAreaElement;

        if (!element) {
          const error = `Element not found: ${action.selector}`;
          console.warn(`⚠️ ${error}`);
          errors.push(error);
          failed++;
          continue;
        }

        let actionSuccess = false;

        switch (action.action) {
          case 'fill':
            if (
              element instanceof HTMLInputElement ||
              element instanceof HTMLTextAreaElement
            ) {
              element.value = String(action.value);
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
              element.dispatchEvent(new Event('blur', { bubbles: true }));
              actionSuccess = true;
            }
            break;

          case 'select':
            if (element instanceof HTMLSelectElement) {
              element.value = String(action.value);
              element.dispatchEvent(new Event('change', { bubbles: true }));
              element.dispatchEvent(new Event('blur', { bubbles: true }));
              actionSuccess = true;
            }
            break;

          case 'check':
            if (
              element instanceof HTMLInputElement &&
              (element.type === 'checkbox' || element.type === 'radio')
            ) {
              element.checked = true;
              element.dispatchEvent(new Event('change', { bubbles: true }));
              element.dispatchEvent(new Event('click', { bubbles: true }));
              actionSuccess = true;
            }
            break;

          case 'uncheck':
            if (
              element instanceof HTMLInputElement &&
              element.type === 'checkbox'
            ) {
              element.checked = false;
              element.dispatchEvent(new Event('change', { bubbles: true }));
              element.dispatchEvent(new Event('click', { bubbles: true }));
              actionSuccess = true;
            }
            break;

          case 'click':
            element.click();
            actionSuccess = true;
            break;
            
          case 'upload_file':
            if (element instanceof HTMLInputElement && element.type === 'file') {
              actionSuccess = await fillFileField(element, String(action.value));
            }
            break;
            
          case 'radio_select':
            if (element instanceof HTMLInputElement && element.type === 'radio') {
              actionSuccess = fillRadioField(element);
            }
            break;
            
          case 'select_multiple':
            if (element instanceof HTMLSelectElement && element.multiple) {
              const values = Array.isArray(action.value) ? action.value : [action.value];
              actionSuccess = fillMultiSelectField(element, values);
            }
            break;
            
          case 'fill_date':
            if (element instanceof HTMLInputElement && element.type === 'date') {
              actionSuccess = fillDateField(element, String(action.value));
            }
            break;
            
          case 'spin_increment':
            if (element instanceof HTMLInputElement && element.type === 'number') {
              actionSuccess = fillSpinButton(element, 'increment');
            }
            break;
            
          case 'spin_decrement':
            if (element instanceof HTMLInputElement && element.type === 'number') {
              actionSuccess = fillSpinButton(element, 'decrement');
            }
            break;
        }

        if (actionSuccess) {
          console.log(
            `✅ ${action.action} on ${action.selector}:`,
            action.value,
            action.reasoning || ''
          );
          success++;
          
          // Track AI-filled field
          trackField(element, true, 'ai_autofill');
        } else {
          const error = `Failed to execute ${action.action} on ${action.selector}`;
          errors.push(error);
          failed++;
          
          // Track failed AI action
          trackField(element, false, 'failed');
        }
      } catch (error) {
        const errorMsg = `Error executing action on ${action.selector}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
        failed++;
      }
    }

    console.log(`\n📊 Execution complete: ${success} success, ${failed} failed`);
    
    // Track all unfilled fields before printing summary
    trackAllUnfilledFields();
    
    // Print field tracking summary after AI autofill
    const trackingData = printFieldTracking();

    return { success, failed, errors, trackingData };
  } catch (parseError) {
    const errorMsg = `Failed to parse JSON: ${parseError}`;
    console.error(`❌ ${errorMsg}`);
    errors.push(errorMsg);
    return { success: 0, failed: 0, errors, trackingData: [] };
  }
}

// ========== MESSAGE LISTENERS ==========

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log(' Message received:', request.action);
  
  if (request.action === 'countFormFields') {
    console.log('Counting form fields...');
    const allInputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select'
    );
    const totalFields = allInputs.length;
    console.log(`Total fields detected: ${totalFields}`);
    sendResponse({ totalFields });
    return true;
  }
  
  if (request.action === 'fuzzyMatchOnly') {
    console.log(' Starting fuzzy matching...');
    fuzzyMatchOnly().then(result => {
      console.log('✅ Fuzzy match complete:', result);
      console.log(' Sending response:', {
        success: result.success,
        filledCount: result.filledCount,
        filledFieldsCount: result.filledFields.length
      });
      sendResponse(result);
    });
    return true;
  }
  
  if (request.action === 'captureForAI') {
    console.log(' Capturing form snapshot for AI...');
    console.log('   Filled selectors received:', request.filledSelectors?.length || 0);
    
    const filledSelectors = new Set<string>(request.filledSelectors || []);
    const snapshot = captureAIFormSnapshotWithFuzzyData(filledSelectors);
    
    console.log('✅ Snapshot captured:');
    console.log('   - Total fields:', snapshot.allFields.length);
    console.log('   - Empty fields to fill:', snapshot.metadata.emptyFields);
    console.log('   - Required fields:', snapshot.metadata.requiredFields);
    console.log('   - Sections:', snapshot.sections.length);
    
    // Log detailed snapshot for debugging (truncated for readability)
    console.log(' Full snapshot (first 3 fields only):');
    snapshot.allFields.slice(0, 3).forEach((field, idx) => {
      console.log(`   Field ${idx + 1}:`, {
        selector: field.selector,
        type: field.type,
        labels: field.labels.directLabel || field.labels.placeholder || 'no label',
        isEmpty: field.isEmpty,
        filled_by: field.filled_by,
        should_fill: field.should_fill
      });
    });
    
    console.log(' Sending snapshot to popup...');
    sendResponse({ snapshot });
    return true;
  }
  
  if (request.action === 'executeAIActionsFromJSON') {
    console.log(' Received AI actions to execute');
    console.log(' Raw JSON payload:');
    console.log(request.actionsJSON);
    
    try {
      const parsed = JSON.parse(request.actionsJSON);
      console.log('✅ Parsed successfully:');
      console.log('   - Number of actions:', parsed.actions?.length || 0);
      console.log('   - First 3 actions:');
      parsed.actions?.slice(0, 3).forEach((action: any, idx: number) => {
        console.log(`      Action ${idx + 1}:`, {
          selector: action.selector,
          action: action.action,
          value: action.value,
          reasoning: action.reasoning?.substring(0, 50) + '...'
        });
      });
    } catch (e) {
      console.error('❌ Failed to parse JSON:', e);
    }
    
    executeAIActionsFromJSON(request.actionsJSON).then(result => {
      console.log('✅ AI actions execution complete:');
      console.log('   - Success:', result.success);
      console.log('   - Failed:', result.failed);
      console.log('   - Errors:', result.errors);
      console.log(' Sending execution result back to popup...');
      sendResponse(result);
    });
    return true;
  }
  
  if (request.action === 'getFieldTracking') {
    console.log(' Getting field tracking data...');
    
    // Track all unfilled fields before returning
    trackAllUnfilledFields();
    
    console.log('✅ Returning field tracking data:', FIELD_TRACKING.length, 'fields');
    sendResponse({ trackingData: FIELD_TRACKING });
    return true;
  }
  
  console.warn('⚠️ Unknown action:', request.action);
});