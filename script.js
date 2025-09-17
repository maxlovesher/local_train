// --- CONFIGURATION AND INITIAL STATE ---
// Backend deployed on Render
const API_URL = 'https://local-train-server.onrender.com/api';
let timetableData = {}; 
let officialHolidays = [];
let studentAddedHolidays = [];
let absentDates = [];
let authToken = null;
let userId = null;

// --- DOM ELEMENTS ---
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const logoutBtn = document.getElementById('logout-btn');

const showRegisterLink = document.getElementById('showRegister');
const showLoginLink = document.getElementById('showLogin');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');

const sectionSelector = document.getElementById('section-selector');
const attendanceForm = document.getElementById('attendance-form');
const holidayForm = document.getElementById('holiday-form');
const leaveForm = document.getElementById('leave-form');
const holidayList = document.getElementById('holiday-list');
const leaveList = document.getElementById('leave-list');
const loader = document.querySelector('.loader');
const resultsSection = document.getElementById('results-section');
const resultsTableContainer = document.getElementById('results-table-container');

// Set default dates for the semester (current semester approx)
const today = new Date();
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const defaultStartDate = new Date();
defaultStartDate.setMonth(today.getMonth() - 2);
startDateInput.valueAsDate = defaultStartDate;
const defaultEndDate = new Date();
defaultEndDate.setMonth(today.getMonth() + 4);
endDateInput.valueAsDate = defaultEndDate;

// --- AUTHENTICATION AND PAGE INITIALIZATION ---

document.addEventListener('DOMContentLoaded', initializeApp);

function toggleScreens(isLoggedIn) {
    if (isLoggedIn) {
        loginScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
    } else {
        loginScreen.classList.remove('hidden');
        appScreen.classList.add('hidden');
    }
}

async function initializeApp() {
    authToken = localStorage.getItem('authToken');
    userId = localStorage.getItem('userId');

    if (!authToken || !userId) {
        toggleScreens(false);
        return;
    }

    // User is authenticated, proceed to load application data
    toggleScreens(true);

    try {
        const fetchHeaders = { 'Authorization': `Bearer ${authToken}` };
        
        console.log('Loading app data...');
        console.log('Auth Token:', authToken);
        console.log('User ID:', userId);
        
        // Test each API call individually with better error handling
        let timetableJson = {};
        let officialHolidaysJson = [];
        let userPrefs = null;
        
        // 1. Try to fetch timetable data
        try {
            console.log('Fetching timetable from:', `${API_URL}/data/timetable`);
            const timetableResponse = await fetch(`${API_URL}/data/timetable`);
            console.log('Timetable response status:', timetableResponse.status);
            if (timetableResponse.ok) {
                timetableJson = await timetableResponse.json();
                console.log('Timetable data loaded:', timetableJson);
            } else {
                console.error('Timetable fetch failed:', await timetableResponse.text());
                // Use sample data as fallback
                timetableJson = getSampleTimetableData();
            }
        } catch (err) {
            console.error('Error fetching timetable:', err);
            timetableJson = getSampleTimetableData();
        }
        
        // 2. Try to fetch holidays data
        try {
            console.log('Fetching holidays from:', `${API_URL}/data/holidays`);
            const holidaysResponse = await fetch(`${API_URL}/data/holidays`);
            console.log('Holidays response status:', holidaysResponse.status);
            if (holidaysResponse.ok) {
                officialHolidaysJson = await holidaysResponse.json();
                console.log('Holidays data loaded:', officialHolidaysJson);
            } else {
                console.error('Holidays fetch failed:', await holidaysResponse.text());
                // Use sample data as fallback
                officialHolidaysJson = getSampleHolidaysData();
            }
        } catch (err) {
            console.error('Error fetching holidays:', err);
            officialHolidaysJson = getSampleHolidaysData();
        }
        
        // 3. Try to fetch user preferences
        try {
            console.log('Fetching user preferences from:', `${API_URL}/user/preferences/${userId}`);
            const userResponse = await fetch(`${API_URL}/user/preferences/${userId}`, { headers: fetchHeaders });
            console.log('User preferences response status:', userResponse.status);
            if (userResponse.ok) {
                userPrefs = await userResponse.json();
                console.log('User preferences loaded:', userPrefs);
            } else if (userResponse.status === 404) {
                console.log('No user preferences found (404) - this is normal for new users');
                userPrefs = null;
            } else {
                console.error('User preferences fetch failed:', await userResponse.text());
                userPrefs = null;
            }
        } catch (err) {
            console.error('Error fetching user preferences:', err);
            userPrefs = null;
        }

        // Set the data even if some calls failed
        timetableData = timetableJson;
        officialHolidays = Array.isArray(officialHolidaysJson) ? officialHolidaysJson : [];
        
        // Populate app state with loaded user preferences
        if (userPrefs) {
            absentDates = userPrefs.absentDates || []; 
            studentAddedHolidays = userPrefs.studentHolidays || [];
            
            // Populate inputs with saved data. Input's default HTML value is used as fallback.
            if (userPrefs.desiredAttendance) document.getElementById('desired-attendance').value = userPrefs.desiredAttendance;
            if (userPrefs.section) document.getElementById('section-selector').value = userPrefs.section;
        }

        showHolidays();
        showAbsences();
        
        // If a section was loaded from preferences (or is already selected), display its timetable
        if (sectionSelector.value) {
            displayTimetable(sectionSelector.value);
            document.getElementById('attendance-form-container').style.display = 'block';
            createSubjectInputs(sectionSelector.value);
        }
        
        console.log('App initialization completed successfully');

    } catch (error) {
        console.error('Critical Initialization Error:', error);
        alert(`Failed to load user data: ${error.message}. Using sample data for demonstration.`);
        // Use sample data as fallback
        timetableData = getSampleTimetableData();
        officialHolidays = getSampleHolidaysData();
        showHolidays();
        showAbsences();
    }
}

// Sample data fallback functions
function getSampleTimetableData() {
    return {
        "1": [
            {
                "subject": "Mathematics",
                "code": "MATH101",
                "classesPerDay": { "0": 0, "1": 2, "2": 1, "3": 2, "4": 1, "5": 0, "6": 0 }
            },
            {
                "subject": "Physics",
                "code": "PHY101", 
                "classesPerDay": { "0": 0, "1": 1, "2": 2, "3": 1, "4": 2, "5": 0, "6": 0 }
            },
            {
                "subject": "Chemistry",
                "code": "CHEM101",
                "classesPerDay": { "0": 0, "1": 1, "2": 1, "3": 1, "4": 1, "5": 0, "6": 0 }
            }
        ],
        "2": [
            {
                "subject": "Biology",
                "code": "BIO101",
                "classesPerDay": { "0": 0, "1": 2, "2": 1, "3": 1, "4": 2, "5": 0, "6": 0 }
            },
            {
                "subject": "English",
                "code": "ENG101",
                "classesPerDay": { "0": 0, "1": 1, "2": 2, "3": 2, "4": 1, "5": 0, "6": 0 }
            }
        ]
    };
}

function getSampleHolidaysData() {
    return [
        { "date": "2024-01-26", "event": "Republic Day" },
        { "date": "2024-08-15", "event": "Independence Day" },
        { "date": "2024-10-02", "event": "Gandhi Jayanti" },
        { "date_start": "2024-12-25", "date_end": "2024-12-31", "event": "Winter Break" }
    ];
}

function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    authToken = null;
    userId = null;
    // Reset app state
    timetableData = {};
    officialHolidays = [];
    studentAddedHolidays = [];
    absentDates = [];
    toggleScreens(false);
}

// --- FORM TOGGLE LOGIC ---
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    authTitle.textContent = 'Register';
    authSubtitle.textContent = 'Create your new account';
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    authTitle.textContent = 'Sign In';
    authSubtitle.textContent = 'Access your dashboard';
});

// --- LOGIN AND REGISTER SUBMISSION HANDLERS ---

loginForm.addEventListener('submit', (e) => handleAuthSubmit(e, 'login'));
registerForm.addEventListener('submit', (e) => handleAuthSubmit(e, 'register'));

async function handleAuthSubmit(e, type) {
    e.preventDefault();
    
    const username = document.getElementById(`${type}-username`).value;
    const password = document.getElementById(`${type}-password`).value;
    
    // Minimal client-side validation
    let isValid = true;
    const usernameError = document.getElementById(`${type}UsernameError`);
    const passwordError = document.getElementById(`${type}PasswordError`);

    if (!username) { usernameError.style.display = 'block'; isValid = false; } else { usernameError.style.display = 'none'; }
    if (!password) { passwordError.style.display = 'block'; isValid = false; } else { passwordError.style.display = 'none'; }
    
    if (isValid) {
        const loginData = { username, password };

        try {
            const response = await fetch(`${API_URL}/${type}`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginData)
            });

            const result = await response.json();

            if (response.ok) {
                if (type === 'register') {
                    alert('Registration successful! Please sign in now.');
                    // Switch back to login view after successful registration
                    showLoginLink.click(); 
                    return; 
                }
                
                // SUCCESS: Store token/ID and initialize the app
                localStorage.setItem('authToken', result.token);
                localStorage.setItem('userId', result.userId);
                authToken = result.token;
                userId = result.userId;
                
                initializeApp();

            } else {
                alert(`Operation Failed: ${result.message || 'Invalid credentials'}`);
            }

        } catch (error) {
            console.error('Network or server error:', error);
            alert('A network error occurred. Ensure your backend server is running.');
        }
    }
}

logoutBtn.addEventListener('click', handleLogout);

// --- CORE CALCULATOR LOGIC ---

// Helper function to check if a date is a holiday
function isHoliday(date) {
    const holidays = [...officialHolidays, ...studentAddedHolidays];
    const formattedDate = date.toISOString().split('T')[0];
    
    for (const holiday of holidays) {
        if (holiday.date === formattedDate) {
            return true;
        }
        if (holiday.date_start && holiday.date_end) {
            const startDate = new Date(holiday.date_start);
            const endDate = new Date(holiday.date_end);
            if (date >= startDate && date <= endDate) {
                return true;
            }
        }
    }
    return false;
}

function isAbsent(date) {
    const formattedDate = date.toISOString().split('T')[0];
    return absentDates.includes(formattedDate);
}

// --- Delete Functions ---

async function deleteHoliday(index) {
    if (confirm('Are you sure you want to delete this holiday?')) {
        studentAddedHolidays.splice(index, 1);
        await savePreferencesToServer();
        showHolidays();
        // Recalculate if form is already filled
        if (sectionSelector.value) {
            calculateAttendance();
        }
    }
}

async function deleteLeave(index) {
    if (confirm('Are you sure you want to delete this leave date?')) {
        absentDates.splice(index, 1);
        await savePreferencesToServer();
        showAbsences();
        // Recalculate if form is already filled
        if (sectionSelector.value) {
            calculateAttendance();
        }
    }
}

// --- New Form Functionality ---
holidayForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const dateInput = document.getElementById('holiday-date').value;
    const eventInput = document.getElementById('holiday-event').value;

    const newHoliday = { date: dateInput, event: eventInput };
    studentAddedHolidays.push(newHoliday);
    
    await savePreferencesToServer();
    
    showHolidays();
    if (sectionSelector.value) {
        calculateAttendance();
    }
    holidayForm.reset();
});

leaveForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const dateInput = document.getElementById('leave-date').value;

    if (!absentDates.includes(dateInput)) {
        absentDates.push(dateInput);
        
        await savePreferencesToServer();

        showAbsences();
        if (sectionSelector.value) {
            calculateAttendance();
        }
    }
    leaveForm.reset();
});

// --- Server Saving Logic ---

async function savePreferencesToServer() {
    if (!authToken || !userId) {
        console.log('Not authenticated, skipping save');
        return;
    }

    const desiredAttendanceInput = document.getElementById('desired-attendance');
    const sectionInput = document.getElementById('section-selector');
    
    const desiredAttendance = desiredAttendanceInput ? desiredAttendanceInput.value : '75';
    const section = sectionInput ? sectionInput.value : '';

    const preferencesData = {
        section: section,
        desiredAttendance: parseFloat(desiredAttendance),
        absentDates: absentDates,
        studentHolidays: studentAddedHolidays
    };

    try {
        const response = await fetch(`${API_URL}/user/preferences`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${authToken}` 
            },
            body: JSON.stringify(preferencesData)
        });

        if (response.ok) {
            console.log('Preferences saved successfully to server.');
        } else {
            console.log('Server save failed, but continuing with local data');
        }

    } catch (error) {
        console.error('Error saving data:', error);
        console.log('Warning: Preferences could not be saved to the server, but app will continue working.');
    }
}

// --- Rest of Calculator Logic ---

sectionSelector.addEventListener('change', function() {
    const section = this.value;

    if (section) {
        displayTimetable(section);
        document.getElementById('attendance-form-container').style.display = 'block';
        createSubjectInputs(section);
        // Save section preference on change
        savePreferencesToServer(); 
    } else {
        document.getElementById('timetable-container').style.display = 'none';
        document.getElementById('attendance-form-container').style.display = 'none';
        resultsSection.style.display = 'none';
    }
});

function countScheduledAbsences(subject, startDate, endDate) {
    let plannedAbsences = 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (const absentDate of absentDates) {
        const date = new Date(absentDate);
        if (date >= start && date <= end) {
            const dayOfWeek = date.getDay().toString();
            if (subject.classesPerDay && subject.classesPerDay[dayOfWeek] > 0) {
                plannedAbsences += 1;
            }
        }
    }
    return plannedAbsences;
}

function showHolidays() {
    holidayList.innerHTML = '';
    
    // Show official holidays (cannot be deleted)
    officialHolidays.forEach(holiday => {
        const li = document.createElement('li');
        li.className = 'holiday-item official';
        if (holiday.date) {
            li.innerHTML = `<span>${holiday.date}: ${holiday.event}</span> <span class="official-tag">Official</span>`;
        } else {
            li.innerHTML = `<span>${holiday.date_start} to ${holiday.date_end}: ${holiday.event}</span> <span class="official-tag">Official</span>`;
        }
        holidayList.appendChild(li);
    });
    
    // Show student-added holidays (can be deleted)
    studentAddedHolidays.forEach((holiday, index) => {
        const li = document.createElement('li');
        li.className = 'holiday-item student-added';
        
        const holidayText = holiday.date ? `${holiday.date}: ${holiday.event}` : `${holiday.date_start} to ${holiday.date_end}: ${holiday.event}`;
        
        li.innerHTML = `
            <span>${holidayText}</span>
            <button class="delete-btn" onclick="deleteHoliday(${index})" title="Delete Holiday">×</button>
        `;
        holidayList.appendChild(li);
    });
    
    if (officialHolidays.length === 0 && studentAddedHolidays.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No holidays added yet';
        li.className = 'no-items';
        holidayList.appendChild(li);
    }
}

function showAbsences() {
    leaveList.innerHTML = '';
    absentDates.sort().forEach((date, index) => {
        const li = document.createElement('li');
        li.className = 'leave-item';
        li.innerHTML = `
            <span>${date}</span>
            <button class="delete-btn" onclick="deleteLeave(${index})" title="Delete Leave">×</button>
        `;
        leaveList.appendChild(li);
    });
    
    if (absentDates.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No leave dates added yet';
        li.className = 'no-items';
        leaveList.appendChild(li);
    }
}

function displayTimetable(section) {
    const subjects = timetableData[section];

    if (!subjects || !Array.isArray(subjects)) {
        document.getElementById('timetable').innerHTML = '<p>No timetable data available for this section.</p>';
        document.getElementById('timetable-container').style.display = 'block';
        return;
    }

    let timetableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Subject</th>
                    <th>Code</th>
                    <th>Classes/Week</th>
                </tr>
            </thead>
            <tbody>
    `;

    subjects.forEach(subject => {
        const classesPerWeek = Object.values(subject.classesPerDay || {}).reduce((sum, count) => sum + count, 0);
        timetableHTML += `
            <tr>
                <td>${subject.subject}</td>
                <td>${subject.code}</td>
                <td>${classesPerWeek}</td>
            </tr>
        `;
    });

    timetableHTML += `</tbody></table>`;
    document.getElementById('timetable').innerHTML = timetableHTML;
    document.getElementById('timetable-container').style.display = 'block';
}

function createSubjectInputs(section) {
    const subjects = timetableData[section];
    const subjectInputsContainer = document.getElementById('subject-inputs');
    
    if (!subjects || !Array.isArray(subjects)) {
        subjectInputsContainer.innerHTML = '<p>No subjects available for this section.</p>';
        return;
    }
    
    subjectInputsContainer.innerHTML = '';
    subjects.forEach(subject => {
        const inputId = `attendance-${subject.code}`;
        const inputDiv = document.createElement('div');
        inputDiv.className = 'subject-input';
        inputDiv.innerHTML = `
            <label for="${inputId}">${subject.subject} (${subject.code}):</label>
            <input type="number" id="${inputId}" min="0" max="100" value="85" required>
            <span>%</span>
        `;
        subjectInputsContainer.appendChild(inputDiv);
    });
}

// Add event listener for the attendance form submission
attendanceForm.addEventListener('submit', function(e) {
    e.preventDefault();
    // Show loader before calculation
    if (loader) loader.style.display = 'block';
    
    // Add a small delay to show loader
    setTimeout(() => {
        calculateAttendance();
    }, 100);
});

function calculateAttendance() {
    try {
        // Show loader at start
        if (loader) loader.style.display = 'block';
        
        // Get form values with validation
        const section = sectionSelector.value;
        const startDateValue = document.getElementById('start-date').value;
        const endDateValue = document.getElementById('end-date').value;
        const desiredAttendanceValue = document.getElementById('desired-attendance').value;

        // Add proper validation for required fields
        if (!section) {
            alert('Please select a section first.');
            if (loader) loader.style.display = 'none';
            return;
        }

        if (!startDateValue || !endDateValue) {
            alert('Please select both start and end dates.');
            if (loader) loader.style.display = 'none';
            return;
        }

        if (!desiredAttendanceValue) {
            alert('Please enter desired attendance percentage.');
            if (loader) loader.style.display = 'none';
            return;
        }

        const startDate = new Date(startDateValue);
        const endDate = new Date(endDateValue);
        const desiredAttendance = parseFloat(desiredAttendanceValue);

        // Better date validation
        if (startDate >= endDate) {
            alert('End date must be after start date');
            if (loader) loader.style.display = 'none';
            return;
        }

        // Validate desired attendance
        if (isNaN(desiredAttendance) || desiredAttendance < 0 || desiredAttendance > 100) {
            alert('Please enter a valid desired attendance percentage (0-100)');
            if (loader) loader.style.display = 'none';
            return;
        }

        const today = new Date();
        const subjects = timetableData[section];
        
        // Better validation for subjects data
        if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
            alert("Please select a valid section. Timetable data not found for this section.");
            if (loader) loader.style.display = 'none';
            resultsSection.style.display = 'none';
            return;
        }
        
        const results = [];
        
        // Calculate weeks completed based on total days
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const daysCompleted = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
        const totalWeeks = Math.floor(totalDays / 7);
        const weeksCompleted = Math.floor(daysCompleted / 7);

        // Add error handling for each subject calculation
        let hasValidationError = false;

        subjects.forEach(subject => {
            const inputId = `attendance-${subject.code}`;
            const inputElement = document.getElementById(inputId);
            
            if (!inputElement) {
                console.error(`Input element not found for subject: ${subject.code}`);
                return;
            }
            
            const currentAttendancePercentage = parseFloat(inputElement.value);

            if (isNaN(currentAttendancePercentage) || currentAttendancePercentage < 0 || currentAttendancePercentage > 100) {
                alert(`Please enter a valid attendance percentage for ${subject.subject} (0-100)`);
                hasValidationError = true;
                return;
            }

            // Validate subject structure
            if (!subject.classesPerDay || typeof subject.classesPerDay !== 'object') {
                console.error(`Invalid classesPerDay structure for subject: ${subject.code}`, subject);
                return;
            }

            let classesHeldSoFar = 0;
            let totalClasses = 0;

            const start = new Date(startDate);
            const end = new Date(endDate);
            const current = new Date();

            // Count classes held so far, skipping holidays
            for (let d = new Date(start); d <= current && d <= end; d.setDate(d.getDate() + 1)) {
                const dayOfWeek = d.getDay().toString();
                if (!isHoliday(d) && subject.classesPerDay[dayOfWeek] && subject.classesPerDay[dayOfWeek] > 0) {
                    classesHeldSoFar += subject.classesPerDay[dayOfWeek];
                }
            }
            
            // Count total classes in the semester, skipping holidays
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dayOfWeek = d.getDay().toString();
                if (!isHoliday(d) && subject.classesPerDay[dayOfWeek] && subject.classesPerDay[dayOfWeek] > 0) {
                    totalClasses += subject.classesPerDay[dayOfWeek];
                }
            }

            // Handle edge case where no classes are scheduled
            if (totalClasses === 0) {
                console.warn(`No classes scheduled for subject: ${subject.subject}`);
                return;
            }

            const classesAttended = Math.round((currentAttendancePercentage / 100) * classesHeldSoFar);

            let bunkableClasses = 0;
            let mustAttend = 0;
            const totalClassesNeeded = Math.ceil((desiredAttendance / 100) * totalClasses);
            const classesYouCanAffordToMiss = classesAttended - totalClassesNeeded;
            const classesLeft = totalClasses - classesHeldSoFar;

            const scheduledAbsencesCount = countScheduledAbsences(subject, today, endDate);

            if (classesYouCanAffordToMiss >= 0) {
                bunkableClasses = Math.max(0, classesYouCanAffordToMiss + classesLeft - scheduledAbsencesCount);
            } else {
                mustAttend = Math.abs(classesYouCanAffordToMiss) + scheduledAbsencesCount;
                bunkableClasses = Math.max(0, classesLeft - mustAttend);
            }
            
            const projectedClassesAttended = classesAttended + (classesLeft - bunkableClasses);
            const projectedAttendance = totalClasses > 0 ? (projectedClassesAttended / totalClasses) * 100 : 0;
            
            results.push({
                subject: subject.subject,
                code: subject.code,
                totalClasses,
                classesHeldSoFar,
                classesAttended,
                classesLeft,
                bunkableClasses,
                mustAttend,
                projectedAttendance
            });
        });

        // Stop processing if there were validation errors
        if (hasValidationError) {
            if (loader) loader.style.display = 'none';
            return;
        }

        displayResults(results, desiredAttendance, weeksCompleted, totalWeeks);
        
        if (loader) loader.style.display = 'none';
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Error in calculateAttendance:', error);
        alert('An error occurred while calculating attendance. Please check your inputs and try again.');
        if (loader) loader.style.display = 'none';
    }
}

function displayResults(results, desiredAttendance, weeksCompleted, totalWeeks) {
    let resultsHTML = `
        <p>Based on your desired attendance of <span class="highlight">${desiredAttendance}%</span></p>
        <p>Weeks completed: ${weeksCompleted} of ${totalWeeks} total weeks</p>
        <table>
            <thead>
                <tr>
                    <th>Subject</th>
                    <th>Total Classes</th>
                    <th>Held So Far</th>
                    <th>Attended</th>
                    <th>Classes Left</th>
                    <th>Can Bunk</th>
                    <th>Must Attend</th>
                    <th>Projected %</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    if (results.length === 0) {
      resultsHTML += `<tr><td colspan="8">No data to display. Please select a section and enter attendance.</td></tr>`;
    } else {
        results.forEach(result => {
            let statusClass = '';
            if (result.projectedAttendance >= desiredAttendance) {
                statusClass = 'success';
            } else if (result.projectedAttendance >= desiredAttendance - 5) {
                statusClass = 'warning';
            } else {
                statusClass = 'danger';
            }

            resultsHTML += `
                <tr>
                    <td>${result.subject} (${result.code})</td>
                    <td>${result.totalClasses}</td>
                    <td>${result.classesHeldSoFar}</td>
                    <td>${result.classesAttended}</td>
                    <td>${result.classesLeft}</td>
                    <td class="highlight">${result.bunkableClasses}</td>
                    <td>${result.mustAttend}</td>
                    <td class="${statusClass}">${result.projectedAttendance.toFixed(1)}%</td>
                </tr>
            `;
        });
    }

    resultsHTML += `</tbody></table>`;
    document.getElementById('results-table-container').innerHTML = resultsHTML;
}

// Make delete functions globally accessible
window.deleteHoliday = deleteHoliday;
window.deleteLeave = deleteLeave;