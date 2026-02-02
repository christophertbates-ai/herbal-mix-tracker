const STORAGE_KEY = 'herbalTrackerData';

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getFormValue(id) {
  const el = document.getElementById(id);
  if (!el || el.value === '') return null;
  const num = Number(el.value);
  return isNaN(num) ? null : num;
}

function handleSubmit(event) {
  event.preventDefault();
  const data = loadData();

  const date = document.getElementById('date').value;
  const doseTbsp = getFormValue('doseTbsp');

  if (!date || doseTbsp === null) {
    alert('Please fill at least date and dose.');
    return;
  }

  const day = {
    date,
    doseTbsp,
    erections: {
      morning: getFormValue('erections-morning'),
      stimulation: getFormValue('erections-stimulation'),
      duringSex: getFormValue('erections-during')
    },
    urinary: {
      nightTrips: getFormValue('urinary-night'),
      startEase: getFormValue('urinary-start'),
      streamStrength: getFormValue('urinary-stream'),
      emptying: getFormValue('urinary-empty')
    },
    energy: {
      energy: getFormValue('energy-energy'),
      focus: getFormValue('energy-focus'),
      motivation: getFormValue('energy-motivation')
    },
    gut: {
      bloating: getFormValue('gut-bloating'),
      stoolForm: getFormValue('gut-stool'),
      regularity: getFormValue('gut-regularity')
    },
    bp: {
      dizziness: getFormValue('bp-dizzy'),
      exerciseTolerance: getFormValue('bp-exercise')
    },
    notes: document.getElementById('notes').value.trim()
  };

  // Replace existing entry with same date, or push new
  const existingIndex = data.findIndex(d => d.date === date);
  if (existingIndex >= 0) {
    data[existingIndex] = day;
  } else {
    data.push(day);
  }

  saveData(data);
  renderEntries();
  renderSummary();
  event.target.reset();

  // Reset date back to today after clear
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('date').value = today;
}

function renderEntries() {
  const data = loadData().sort((a, b) => a.date.localeCompare(b.date));
  const list = document.getElementById('entries-list');
  list.innerHTML = '';

  data.forEach(day => {
    const li = document.createElement('li');
    li.className = 'entry-item';
    li.innerHTML = `
      <strong>${day.date}</strong><br>
      Dose: ${day.doseTbsp} Tbsp<br>
      <span class="small-text">
        Morning erection: ${day.erections.morning ?? '-'} |
        Night trips: ${day.urinary.nightTrips ?? '-'} |
        Energy: ${day.energy.energy ?? '-'}
      </span><br>
      <span class="small-text">${day.notes || ''}</span>
    `;
    list.appendChild(li);
  });
}

function average(values) {
  const nums = values.filter(v => typeof v === 'number');
  if (!nums.length) return null;
  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
}

function renderSummary() {
  const data = loadData()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14); // last 14 entries

  const summaryDiv = document.getElementById('summary');
  if (!data.length) {
    summaryDiv.textContent = 'No data yet.';
    return;
  }

  const avgMorning = average(data.map(d => d.erections.morning));
  const avgStimulation = average(data.map(d => d.erections.stimulation));
  const avgNightTrips = average(data.map(d => d.urinary.nightTrips));
  const avgEnergy = average(data.map(d => d.energy.energy));
  const avgDose = average(data.map(d => d.doseTbsp));

  summaryDiv.innerHTML = `
    <p>Average dose (Tbsp): <strong>${avgDose ?? '-'}</strong></p>
    <p>Morning erection (0–3): <strong>${avgMorning ?? '-'}</strong></p>
    <p>With stimulation (0–3): <strong>${avgStimulation ?? '-'}</strong></p>
    <p>Night trips (0–3, higher = better): <strong>${avgNightTrips ?? '-'}</strong></p>
    <p>Energy (0–3): <strong>${avgEnergy ?? '-'}</strong></p>
  `;
}

window.addEventListener('load', () => {
  // Hook up form
  const form = document.getElementById('entry-form');
  if (form) {
    form.addEventListener('submit', handleSubmit);
  }

  // Default date = today
  const today = new Date().toISOString().slice(0, 10);
  const dateInput = document.getElementById('date');
  if (dateInput) {
    dateInput.value = today;
  }

  renderEntries();
  renderSummary();
});
