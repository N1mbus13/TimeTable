// ═══════════════════════════════════════════════════
//  CMR Timetable Planner — script.js
// ═══════════════════════════════════════════════════

// ─────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────

const USERS = {
  teacher: { username: 'admin',   password: 'admin123',   role: 'teacher' },
  student: { username: 'student', password: 'student123', role: 'student' },
};

const TIME_SLOTS = [
  { time: '8:30 - 9:30',   isBreak: false },
  { time: '9:30 - 10:30',  isBreak: false },
  { time: '10:30 - 10:45', isBreak: true,  label: 'Short Break' },
  { time: '10:45 - 11:45', isBreak: false },
  { time: '11:45 - 12:45', isBreak: false },
  { time: '12:45 - 1:30',  isBreak: true,  label: 'Lunch Break' },
  { time: '1:30 - 2:30',   isBreak: false },
  { time: '2:30 - 3:30',   isBreak: false },
  { time: '3:30 - 4:30',   isBreak: false },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// ─────────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────────

let currentRole = 'teacher';
let currentUser = '';

// ─────────────────────────────────────────────────
//  LOCAL STORAGE HELPERS
// ─────────────────────────────────────────────────

function ls(key) {
  return JSON.parse(localStorage.getItem(key));
}

function lsSave(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

function getClasses() {
  return ls('tt_classes') || ['Cloud Computing A', 'Cloud Computing B', 'Cloud Computing C'];
}

function saveClasses(c) {
  lsSave('tt_classes', c);
}

function getSubjects() {
  return ls('tt_subjects') || {
    HTML:             ['Teacher A', 'Teacher B'],
    Java:             ['Teacher C', 'Teacher D'],
    'Cloud Computing':['Teacher E', 'Teacher F'],
    Excel:            ['Teacher G', 'Teacher H'],
    IDE:              ['Teacher I', 'Teacher J'],
  };
}

function saveSubjects(s) {
  lsSave('tt_subjects', s);
}

function getTimetableData() {
  return ls('tt_data') || {};
}

function saveTimetableData(d) {
  lsSave('tt_data', d);
}

// ─────────────────────────────────────────────────
//  PERIOD MAP
// ─────────────────────────────────────────────────

function periodMap() {
  const m = {};
  let p = 1;
  TIME_SLOTS.forEach(s => {
    if (!s.isBreak) m[s.time] = `Period ${p++}`;
  });
  return m;
}

// ─────────────────────────────────────────────────
//  ENSURE TIMETABLE DATA IS INITIALISED
// ─────────────────────────────────────────────────

function ensureTimetableData() {
  const classes = getClasses();
  let data = getTimetableData();

  classes.forEach(cls => {
    if (!data[cls]) data[cls] = {};
    DAYS.forEach(day => {
      if (!data[cls][day]) data[cls][day] = {};
      TIME_SLOTS.forEach(slot => {
        if (slot.isBreak) {
          data[cls][day][slot.time] = { subject: slot.label, teacher: '' };
        } else if (!data[cls][day][slot.time]) {
          data[cls][day][slot.time] = { subject: '', teacher: '' };
        }
      });
    });
  });

  saveTimetableData(data);
  return data;
}

// ─────────────────────────────────────────────────
//  TOAST NOTIFICATION
// ─────────────────────────────────────────────────

function toast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `show ${type}`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = ''; }, 2800);
}

// ─────────────────────────────────────────────────
//  LOGIN / LOGOUT
// ─────────────────────────────────────────────────

function setRole(role) {
  currentRole = role;
  document.querySelectorAll('.role-tab').forEach((tab, i) => {
    tab.classList.toggle('active', (role === 'teacher' && i === 0) || (role === 'student' && i === 1));
  });
}

function doLogin() {
  const u = document.getElementById('login-username').value.trim();
  const p = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');
  err.style.display = 'none';

  const expected = currentRole === 'teacher' ? USERS.teacher : USERS.student;

  if (u === expected.username && p === expected.password) {
    currentUser = u;
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('app-page').style.display = 'block';
    setupApp(currentRole);
  } else {
    err.textContent = '⚠️ Invalid username or password.';
    err.style.display = 'block';
  }
}

function doLogout() {
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('app-page').style.display = 'none';
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
}

// Enter key triggers login
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
  document.getElementById('login-username').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
});

// ─────────────────────────────────────────────────
//  APP SETUP (called after login)
// ─────────────────────────────────────────────────

function setupApp(role) {
  const badge = document.getElementById('role-badge');
  badge.textContent = role === 'teacher' ? '👨‍🏫 Teacher' : '🎓 Student';
  badge.className = `role-badge ${role}`;
  document.getElementById('user-name-display').textContent = currentUser;

  const navTabs      = document.getElementById('nav-tabs');
  const studentPicker = document.getElementById('student-picker');

  if (role === 'teacher') {
    navTabs.style.display = 'flex';
    studentPicker.style.display = 'none';
    showTab('timetables');
    renderSubjectList();
    renderTeacherList();
    renderClassList();
    renderTimetables();
  } else {
    navTabs.style.display = 'none';
    studentPicker.style.display = 'block';
    document.getElementById('tab-timetables').classList.add('active');
    populateStudentClassSelect();
    renderStudentView();
  }
}

// ─────────────────────────────────────────────────
//  TAB SWITCHING
// ─────────────────────────────────────────────────

function showTab(name) {
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  const map = { timetables: 0, classes: 1, subjects: 2 };
  const tabs = document.querySelectorAll('.nav-tab');
  if (tabs[map[name]]) tabs[map[name]].classList.add('active');
}

// ─────────────────────────────────────────────────
//  CLASS MANAGEMENT
// ─────────────────────────────────────────────────

function renderClassList() {
  const list = document.getElementById('class-list');
  const classes = getClasses();
  list.innerHTML = '';

  classes.forEach((cls, idx) => {
    const li = document.createElement('li');
    li.className = 'list-item';
    li.innerHTML = `
      <span>${cls}</span>
      <div class="list-item-actions">
        <button class="btn-sm-edit" onclick="renameClass(${idx})">✏️ Rename</button>
        <button class="btn-red" onclick="deleteClass(${idx})">✕ Remove</button>
      </div>
    `;
    list.appendChild(li);
  });
}

function addClass() {
  const input = document.getElementById('class-input');
  const name = input.value.trim();
  if (!name) { toast('⚠️ Enter a class name', 'error'); return; }

  const classes = getClasses();
  if (classes.includes(name)) { toast('⚠️ Class already exists', 'error'); return; }

  classes.push(name);
  saveClasses(classes);
  ensureTimetableData();
  input.value = '';
  renderClassList();
  renderTimetables();
  toast(`✅ Added class "${name}"`);
}

function deleteClass(idx) {
  const classes = getClasses();
  const name = classes[idx];
  if (!confirm(`Remove class "${name}"? This will delete its timetable.`)) return;

  classes.splice(idx, 1);
  saveClasses(classes);

  let data = getTimetableData();
  delete data[name];
  saveTimetableData(data);

  renderClassList();
  renderTimetables();
  toast(`🗑️ Removed class "${name}"`);
}

function renameClass(idx) {
  const classes = getClasses();
  const oldName = classes[idx];
  const newName = prompt('Enter new name:', oldName)?.trim();
  if (!newName || newName === oldName) return;
  if (classes.includes(newName)) { toast('⚠️ Name already used', 'error'); return; }

  classes[idx] = newName;
  saveClasses(classes);

  let data = getTimetableData();
  data[newName] = data[oldName];
  delete data[oldName];
  saveTimetableData(data);

  renderClassList();
  renderTimetables();
  toast(`✅ Renamed to "${newName}"`);
}

// ─────────────────────────────────────────────────
//  SUBJECT MANAGEMENT
// ─────────────────────────────────────────────────

function renderSubjectList() {
  const list = document.getElementById('subject-list');
  const subjects = getSubjects();
  list.innerHTML = '';

  Object.keys(subjects).forEach(subj => {
    const li = document.createElement('li');
    li.className = 'list-item';
    li.innerHTML = `
      <span style="font-weight:600">${subj}</span>
      <div class="list-item-actions">
        <span style="font-size:0.75rem;color:#94a3b8;">${subjects[subj].length} teacher(s)</span>
        <button class="btn-red" onclick="removeSubject('${subj.replace(/'/g, "\\'")}')">✕</button>
      </div>
    `;
    list.appendChild(li);
  });

  // Sync the subject picker dropdown in the teacher panel
  const picker = document.getElementById('subject-picker');
  const cur = picker.value;
  picker.innerHTML = '<option value="">— Select Subject —</option>' +
    Object.keys(subjects).map(s => `<option value="${s}">${s}</option>`).join('');
  if (cur) picker.value = cur;
}

function addSubject() {
  const input = document.getElementById('subject-input');
  const name = input.value.trim();
  if (!name) { toast('⚠️ Enter a subject name', 'error'); return; }

  const subjects = getSubjects();
  if (subjects[name]) { toast('⚠️ Subject already exists', 'error'); return; }

  subjects[name] = [];
  saveSubjects(subjects);
  input.value = '';
  renderSubjectList();
  renderTimetables();
  toast(`✅ Added subject "${name}"`);
}

function removeSubject(subj) {
  if (!confirm(`Remove subject "${subj}"?`)) return;

  const subjects = getSubjects();
  delete subjects[subj];
  saveSubjects(subjects);

  // Clear from timetable
  const classes = getClasses();
  let data = getTimetableData();
  classes.forEach(cls => DAYS.forEach(day => TIME_SLOTS.forEach(slot => {
    const cell = data[cls]?.[day]?.[slot.time];
    if (cell && !slot.isBreak && cell.subject === subj) {
      cell.subject = '';
      cell.teacher = '';
    }
  })));
  saveTimetableData(data);

  renderSubjectList();
  renderTeacherList();
  renderTimetables();
  toast(`🗑️ Removed subject "${subj}"`);
}

// ─────────────────────────────────────────────────
//  TEACHER MANAGEMENT
// ─────────────────────────────────────────────────

function renderTeacherList() {
  const list    = document.getElementById('teacher-list');
  const picker  = document.getElementById('subject-picker');
  const subj    = picker?.value;
  const subjects = getSubjects();
  list.innerHTML = '';

  if (!subj || !subjects[subj]) return;

  subjects[subj].forEach(t => {
    const li = document.createElement('li');
    li.className = 'list-item';
    li.innerHTML = `
      <span>${t}</span>
      <button class="btn-red" onclick="removeTeacher('${subj.replace(/'/g, "\\'")}','${t.replace(/'/g, "\\'")}')">✕</button>
    `;
    list.appendChild(li);
  });
}

function addTeacher() {
  const subj = document.getElementById('subject-picker').value;
  const name = document.getElementById('teacher-input').value.trim();

  if (!subj) { toast('⚠️ Select a subject first', 'error'); return; }
  if (!name) { toast('⚠️ Enter a teacher name', 'error'); return; }

  const subjects = getSubjects();
  if (subjects[subj].includes(name)) { toast('⚠️ Teacher already listed', 'error'); return; }

  subjects[subj].push(name);
  saveSubjects(subjects);
  document.getElementById('teacher-input').value = '';
  renderTeacherList();
  renderTimetables();
  toast(`✅ Added ${name} to ${subj}`);
}

function removeTeacher(subj, teacher) {
  const subjects = getSubjects();
  subjects[subj] = subjects[subj].filter(t => t !== teacher);
  saveSubjects(subjects);

  // Clear from timetable
  const classes = getClasses();
  let data = getTimetableData();
  classes.forEach(cls => DAYS.forEach(day => TIME_SLOTS.forEach(slot => {
    const cell = data[cls]?.[day]?.[slot.time];
    if (cell && !slot.isBreak && cell.teacher === teacher && cell.subject === subj) {
      cell.teacher = '';
    }
  })));
  saveTimetableData(data);

  renderTeacherList();
  renderTimetables();
  toast(`🗑️ Removed ${teacher} from ${subj}`);
}

// ─────────────────────────────────────────────────
//  RENDER TIMETABLES (TEACHER VIEW)
// ─────────────────────────────────────────────────

function renderTimetables() {
  const container = document.getElementById('timetables-container');
  if (!container) return;

  const classes  = getClasses();
  const subjects = getSubjects();
  const data     = ensureTimetableData();
  const pm       = periodMap();
  container.innerHTML = '';

  classes.forEach((cls, ci) => {
    const wrap = document.createElement('div');
    wrap.className = 'timetable-wrap';
    wrap.id = `tt-wrap-${ci}`;

    let rows = '';

    TIME_SLOTS.forEach(slot => {
      if (slot.isBreak) {
        rows += `<tr class="break-row">
          <td class="time-cell">
            <span class="break-label">${slot.label}</span>
            <span class="time-str">${slot.time}</span>
          </td>
          ${DAYS.map(() => `<td><span class="break-label">${slot.label}</span></td>`).join('')}
        </tr>`;
      } else {
        const period = pm[slot.time] || '';
        rows += `<tr>
          <td class="time-cell">
            <span class="period-num">${period}</span>
            <span class="time-str">${slot.time}</span>
          </td>
          ${DAYS.map(day => {
            const cell     = data[cls][day][slot.time];
            const curSubj  = cell?.subject || '';
            const curTeacher = cell?.teacher || '';

            const subjOpts = Object.keys(subjects)
              .map(s => `<option value="${s}"${s === curSubj ? ' selected' : ''}>${s}</option>`)
              .join('');

            const teachOpts = curSubj && subjects[curSubj]
              ? subjects[curSubj]
                  .map(t => `<option value="${t}"${t === curTeacher ? ' selected' : ''}>${t}</option>`)
                  .join('')
              : '';

            return `<td>
              <div class="cell-select-wrap">
                <select class="cell-select subject-sel"
                  data-class="${cls}" data-day="${day}" data-time="${slot.time}">
                  <option value="">Subject</option>${subjOpts}
                </select>
                <select class="cell-select teacher-sel"
                  data-class="${cls}" data-day="${day}" data-time="${slot.time}">
                  <option value="">Teacher</option>${teachOpts}
                </select>
                <div class="export-text">
                  <span class="export-subject">${curSubj}</span>
                  <span class="export-teacher">${curTeacher}</span>
                </div>
              </div>
            </td>`;
          }).join('')}
        </tr>`;
      }
    });

    wrap.innerHTML = `
      <div class="timetable-header">
        <div>
          <h2>${cls}</h2>
          <p>Weekly Timetable · ${DAYS.length} days · ${TIME_SLOTS.filter(s => !s.isBreak).length} periods</p>
        </div>
        <div class="tt-actions">
          <button class="tt-btn-download" data-class="${cls}" data-index="${ci}">📥 Download PDF</button>
          <button class="tt-btn-reset" data-class="${cls}">🔄 Reset</button>
        </div>
      </div>
      <div class="timetable-scroll">
        <table class="tt">
          <thead><tr>
            <th>Time</th>
            ${DAYS.map(d => `<th>${d}</th>`).join('')}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    container.appendChild(wrap);

    // ── Subject change ──────────────────────────────
    wrap.querySelectorAll('.subject-sel').forEach(sel => {
      sel.addEventListener('change', e => {
        const { class: cls, day, time } = e.target.dataset;
        let data = getTimetableData();
        data[cls][day][time].subject = e.target.value;
        data[cls][day][time].teacher = '';
        saveTimetableData(data);
        renderTimetables();
      });
    });

    // ── Teacher change + conflict check ─────────────
    wrap.querySelectorAll('.teacher-sel').forEach(sel => {
      sel.addEventListener('change', e => {
        const { class: cls, day, time } = e.target.dataset;
        const newTeacher = e.target.value;
        let data = getTimetableData();
        const subj = data[cls][day][time].subject;
        const pm2  = periodMap();

        if (subj && newTeacher) {
          const classes = getClasses();
          for (const otherCls of classes) {
            if (otherCls !== cls) {
              const cell = data[otherCls]?.[day]?.[time];
              if (cell && cell.subject === subj && cell.teacher === newTeacher) {
                toast(`☹️ ${newTeacher} is already teaching ${subj} in ${otherCls} at ${pm2[time] || time}`, 'error');
                e.target.value = data[cls][day][time].teacher || '';
                return;
              }
            }
          }
        }

        data[cls][day][time].teacher = newTeacher;
        saveTimetableData(data);
      });
    });

    // ── Download PDF ────────────────────────────────
    wrap.querySelector('.tt-btn-download')?.addEventListener('click', async () => {
      await downloadPDF(ci, cls);
    });

    // ── Reset timetable ─────────────────────────────
    wrap.querySelector('.tt-btn-reset')?.addEventListener('click', () => {
      if (!confirm(`Reset ${cls} timetable?`)) return;
      let data = getTimetableData();
      DAYS.forEach(day => TIME_SLOTS.forEach(slot => {
        data[cls][day][slot.time] = slot.isBreak
          ? { subject: slot.label, teacher: '' }
          : { subject: '', teacher: '' };
      }));
      saveTimetableData(data);
      renderTimetables();
      toast(`✅ ${cls} timetable reset`);
    });
  });
}

// ─────────────────────────────────────────────────
//  PDF DOWNLOAD (TEACHER)
// ─────────────────────────────────────────────────

async function downloadPDF(index, cls) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('l', 'mm', 'a4'); // landscape A4
  const el  = document.getElementById(`tt-wrap-${index}`);
  if (!el) return;

  el.setAttribute('data-exporting', 'true');
  toast(`📥 Preparing ${cls} PDF...`);
  await new Promise(r => setTimeout(r, 100));

  const canvas = await html2canvas(el, { scale: 2, useCORS: true });
  const img    = canvas.toDataURL('image/png');
  const pw     = 297 - 20; // A4 landscape width minus margins
  const ph     = (canvas.height * pw) / canvas.width;

  doc.addImage(img, 'PNG', 10, 10, pw, ph);
  doc.save(`${cls}-timetable.pdf`);
  el.removeAttribute('data-exporting');
}

// ─────────────────────────────────────────────────
//  STUDENT VIEW
// ─────────────────────────────────────────────────

function populateStudentClassSelect() {
  const sel     = document.getElementById('student-class-select');
  const classes = getClasses();
  sel.innerHTML = classes.map(c => `<option value="${c}">${c}</option>`).join('');
}

function renderStudentView() {
  const container = document.getElementById('timetables-container');
  const sel       = document.getElementById('student-class-select');
  const cls       = sel?.value;
  if (!cls) { container.innerHTML = ''; return; }

  const data = ensureTimetableData();
  const pm   = periodMap();
  container.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'timetable-wrap';
  wrap.id = 'student-tt';

  let rows = '';

  TIME_SLOTS.forEach(slot => {
    if (slot.isBreak) {
      rows += `<tr class="break-row">
        <td class="time-cell">
          <span class="break-label">${slot.label}</span>
          <span class="time-str">${slot.time}</span>
        </td>
        ${DAYS.map(() => `<td><span class="break-label">${slot.label}</span></td>`).join('')}
      </tr>`;
    } else {
      rows += `<tr>
        <td class="time-cell">
          <span class="period-num">${pm[slot.time] || ''}</span>
          <span class="time-str">${slot.time}</span>
        </td>
        ${DAYS.map(day => {
          const cell    = data[cls]?.[day]?.[slot.time];
          const subj    = cell?.subject  || '';
          const teacher = cell?.teacher  || '';
          if (!subj) return `<td><span class="empty-cell">—</span></td>`;
          return `<td>
            <div class="readonly-cell">
              <span class="readonly-subject">${subj}</span>
              ${teacher ? `<span class="readonly-teacher">👤 ${teacher}</span>` : ''}
            </div>
          </td>`;
        }).join('')}
      </tr>`;
    }
  });

  wrap.innerHTML = `
    <div class="timetable-header">
      <div>
        <h2>${cls} — Student View</h2>
        <p>Read-only timetable · ${DAYS.length} days</p>
      </div>
      <div class="tt-actions">
        <button class="tt-btn-download" onclick="downloadStudentPDF()">📥 Download PDF</button>
      </div>
    </div>
    <div class="timetable-scroll">
      <table class="tt">
        <thead><tr>
          <th>Time</th>
          ${DAYS.map(d => `<th>${d}</th>`).join('')}
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  container.appendChild(wrap);
}

// ─────────────────────────────────────────────────
//  PDF DOWNLOAD (STUDENT)
// ─────────────────────────────────────────────────

async function downloadStudentPDF() {
  const sel = document.getElementById('student-class-select');
  const cls = sel?.value;
  if (!cls) { toast('Select a class first', 'error'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('l', 'mm', 'a4');
  const el  = document.getElementById('student-tt');
  if (!el) return;

  toast(`📥 Preparing ${cls} PDF...`);
  await new Promise(r => setTimeout(r, 100));

  const canvas = await html2canvas(el, { scale: 2, useCORS: true });
  const img    = canvas.toDataURL('image/png');
  const pw     = 297 - 20;
  const ph     = (canvas.height * pw) / canvas.width;

  doc.addImage(img, 'PNG', 10, 10, pw, ph);
  doc.save(`${cls}-timetable.pdf`);
}
