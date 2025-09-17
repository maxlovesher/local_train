// No more hardcoded data! This will be fetched from timetable.json
let timetableData = {}; 
let officialHolidays = [];
let studentAddedHolidays = [];
let absentDates = [];

// DOM elements
const sectionSelector = document.getElementById('section-selector');
const timetableContainer = document.getElementById('timetable-container');
const timetableElement = document.getElementById('timetable');
const attendanceFormContainer = document.getElementById('attendance-form-container');
const subjectInputsContainer = document.getElementById('subject-inputs');
const attendanceForm = document.getElementById('attendance-form');
const loader = document.querySelector('.loader');
const resultsSection = document.getElementById('results-section');
const resultsTableContainer = document.getElementById('results-table-container');

// New DOM elements for holiday and leave functionality
const holidayForm = document.getElementById('holiday-form');
const leaveForm = document.getElementById('leave-form');
const holidayList = document.getElementById('holiday-list');
const leaveList = document.getElementById('leave-list');

// Set default dates for the semester (current semester approx)
const today = new Date();
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');

// Set default start date to 2 months ago
const defaultStartDate = new Date();
defaultStartDate.setMonth(today.getMonth() - 2);
startDateInput.valueAsDate = defaultStartDate;

// Set default end date to 4 months from now
const defaultEndDate = new Date();
defaultEndDate.setMonth(today.getMonth() + 4);
endDateInput.valueAsDate = defaultEndDate;

// --- Data Loading and Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Fetch both JSON files
    const fetchTimetable = fetch('timetable.json').then(response => response.json());
    const fetchOfficialHolidays = fetch('holidays.json').then(response => response.json());

    Promise.all([fetchTimetable, fetchOfficialHolidays])
        .then(([timetableJson, officialHolidaysJson]) => {
            timetableData = timetableJson;
            officialHolidays = officialHolidaysJson;
            console.log('Official data loaded successfully.');
            loadLocalData();
        })
        .catch(error => {
            console.error('There was a problem loading the data:', error);
        });
});

function loadLocalData() {
    // Load student-added holidays from localStorage
    const savedHolidays = localStorage.getItem('studentHolidays');
    if (savedHolidays) {
        studentAddedHolidays = JSON.parse(savedHolidays);
    }
    showHolidays();

    // Load absent dates from localStorage
    const savedAbsences = localStorage.getItem('absentDates');
    if (savedAbsences) {
        absentDates = JSON.parse(savedAbsences);
    }
    showAbsences();
}

function saveLocalData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// --- Helper Functions ---
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

// --- New Form Functionality ---
holidayForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const dateInput = document.getElementById('holiday-date').value;
    const eventInput = document.getElementById('holiday-event').value;

    const newHoliday = {
        date: dateInput,
        event: eventInput
    };
    studentAddedHolidays.push(newHoliday);
    saveLocalData('studentHolidays', studentAddedHolidays);
    
    showHolidays();
    calculateAttendance(); // Recalculate with new holiday
    holidayForm.reset();
});

leaveForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const dateInput = document.getElementById('leave-date').value;

    if (!absentDates.includes(dateInput)) {
        absentDates.push(dateInput);
        saveLocalData('absentDates', absentDates);
        showAbsences();
        calculateAttendance(); // Recalculate with new absence
    }
    leaveForm.reset();
});

function showHolidays() {
    holidayList.innerHTML = '';
    const allHolidays = [...officialHolidays, ...studentAddedHolidays];
    allHolidays.forEach(holiday => {
        const li = document.createElement('li');
        if (holiday.date) {
            li.textContent = `${holiday.date}: ${holiday.event}`;
        } else {
            li.textContent = `${holiday.date_start} to ${holiday.date_end}: ${holiday.event}`;
        }
        holidayList.appendChild(li);
    });
}

function showAbsences() {
    leaveList.innerHTML = '';
    absentDates.sort().forEach(date => {
        const li = document.createElement('li');
        li.textContent = date;
        leaveList.appendChild(li);
    });
}

// --- Main App Logic (Modified) ---
sectionSelector.addEventListener('change', function() {
    const section = this.value;

    if (section) {
        displayTimetable(section);
        attendanceFormContainer.style.display = 'block';
        createSubjectInputs(section);
    } else {
        timetableContainer.style.display = 'none';
        attendanceFormContainer.style.display = 'none';
        resultsSection.style.display = 'none';
    }
});

function displayTimetable(section) {
    const subjects = timetableData[section];
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
        const classesPerWeek = Object.values(subject.classesPerDay).reduce((sum, count) => sum + count, 0);
        timetableHTML += `
            <tr>
                <td>${subject.subject}</td>
                <td>${subject.code}</td>
                <td>${classesPerWeek}</td>
            </tr>
        `;
    });

    timetableHTML += `</tbody></table>`;
    timetableElement.innerHTML = timetableHTML;
    timetableContainer.style.display = 'block';
}

function createSubjectInputs(section) {
    const subjects = timetableData[section];
    subjectInputsContainer.innerHTML = '';
    subjects.forEach(subject => {
        const inputId = `attendance-${subject.code}`;
        subjectInputsContainer.innerHTML += `
            <div class="subject-input">
                <label for="${inputId}">${subject.subject} (${subject.code}):</label>
                <input type="number" id="${inputId}" min="0" max="100" value="85" required>
                <span>%</span>
            </div>
        `;
    });
}

attendanceForm.addEventListener('submit', function(e) {
    e.preventDefault();
    loader.style.display = 'block';
    resultsSection.style.display = 'none';
    calculateAttendance();
});

function countScheduledAbsences(subject, startDate, endDate) {
    let plannedAbsences = 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (const absentDate of absentDates) {
        const date = new Date(absentDate);
        if (date >= start && date <= end) {
            const dayOfWeek = date.getDay().toString();
            if (subject.classesPerDay[dayOfWeek] > 0) {
                plannedAbsences += 1;
            }
        }
    }
    return plannedAbsences;
}

function calculateAttendance() {
    const section = sectionSelector.value;
    const startDate = new Date(document.getElementById('start-date').value);
    const endDate = new Date(document.getElementById('end-date').value);
    const desiredAttendance = parseFloat(document.getElementById('desired-attendance').value);

    if (startDate >= endDate) {
        alert('End date must be after start date');
        loader.style.display = 'none';
        return;
    }

    const today = new Date();
    const subjects = timetableData[section];
    const results = [];
    
    // Day-by-day calculation for accuracy
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const daysCompleted = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.floor(totalDays / 7);
    const weeksCompleted = Math.floor(daysCompleted / 7);

    subjects.forEach(subject => {
        const inputId = `attendance-${subject.code}`;
        const currentAttendancePercentage = parseFloat(document.getElementById(inputId).value);

        if (isNaN(currentAttendancePercentage) || currentAttendancePercentage < 0 || currentAttendancePercentage > 100) {
            alert(`Please enter a valid attendance percentage for ${subject.subject}`);
            loader.style.display = 'none';
            return;
        }

        let classesHeldSoFar = 0;
        let totalClasses = 0;

        const start = new Date(startDate);
        const end = new Date(endDate);
        const current = new Date();

        // Count classes held so far, skipping holidays
        for (let d = new Date(start); d <= current; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay().toString();
            if (!isHoliday(d) && subject.classesPerDay[dayOfWeek] > 0) {
                classesHeldSoFar += subject.classesPerDay[dayOfWeek];
            }
        }
        
        // Count total classes in the semester, skipping holidays
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay().toString();
            if (!isHoliday(d) && subject.classesPerDay[dayOfWeek] > 0) {
                totalClasses += subject.classesPerDay[dayOfWeek];
            }
        }

        const classesAttended = Math.round((currentAttendancePercentage / 100) * classesHeldSoFar);

        let bunkableClasses = 0;
        let mustAttend = 0;
        const totalClassesNeeded = Math.ceil((desiredAttendance / 100) * totalClasses);
        const classesYouCanAffordToMiss = classesAttended - totalClassesNeeded;
        const classesLeft = totalClasses - classesHeldSoFar;

        const scheduledAbsencesCount = countScheduledAbsences(subject, today, endDate);

        if (classesYouCanAffordToMiss >= 0) {
            bunkableClasses = classesYouCanAffordToMiss + classesLeft - scheduledAbsencesCount;
        } else {
            mustAttend = Math.abs(classesYouCanAffordToMiss) + scheduledAbsencesCount;
            bunkableClasses = classesLeft - mustAttend;
        }
        
        bunkableClasses = Math.max(0, bunkableClasses);
        mustAttend = Math.max(0, mustAttend);
        
        const projectedClassesAttended = classesAttended + (classesLeft - bunkableClasses);
        const projectedAttendance = (projectedClassesAttended / totalClasses) * 100;
        
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

    displayResults(results, desiredAttendance, weeksCompleted, totalWeeks);
    loader.style.display = 'none';
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
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
    resultsTableContainer.innerHTML = resultsHTML;
}