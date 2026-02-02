const STORAGE_KEY = 'herbalTrackerData';
let erectionChart = null;
let alcoholChart = null;

// Get today's date in local time as YYYY-MM-DD
function getTodayLocal() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
    alcohol: {
      drinks: getFormValue('alcohol-drinks')
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
  renderCharts();
  event.target.reset();

  // Reset date back to today (local) after clear
  const today = getTodayLocal();
  const dateInput = document.getElementById('date');
  if (dateInput) {
    dateInput.value = today;
  }
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
        Energy: ${day.energy.energy ?? '-'} |
        Drinks: ${day.alcohol?.drinks ?? 0}
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
  const avgDrinks = average(
    data.map(d => (d.alcohol && typeof d.alcohol.drinks === 'number' ? d.alcohol.drinks : null))
  );

  summaryDiv.innerHTML = `
    <p>Average dose (Tbsp): <strong>${avgDose ?? '-'}</strong></p>
    <p>Morning erection (0–3): <strong>${avgMorning ?? '-'}</strong></p>
    <p>With stimulation (0–3): <strong>${avgStimulation ?? '-'}</strong></p>
    <p>Night trips (0–3, higher = better): <strong>${avgNightTrips ?? '-'}</strong></p>
    <p>Energy (0–3): <strong>${avgEnergy ?? '-'}</strong></p>
    <p>Drinks per day (recent): <strong>${avgDrinks ?? '-'}</strong></p>
  `;
}

function renderCharts() {
  const data = loadData().sort((a, b) => a.date.localeCompare(b.date));
  const labels = data.map(d => d.date);
  const morningScores = data.map(d =>
    typeof d.erections.morning === 'number' ? d.erections.morning : null
  );
  const drinks = data.map(d =>
    d.alcohol && typeof d.alcohol.drinks === 'number' ? d.alcohol.drinks : 0
  );

  const erectionCanvas = document.getElementById('erectionChart');
  const alcoholCanvas = document.getElementById('alcoholChart');

  if (!erectionCanvas || !alcoholCanvas || typeof Chart === 'undefined') {
    return;
  }

  const ctx1 = erectionCanvas.getContext('2d');
  const ctx2 = alcoholCanvas.getContext('2d');

  // Destroy previous charts if they exist
  if (erectionChart) erectionChart.destroy();
  if (alcoholChart) alcoholChart.destroy();

  // Chart 1: Morning erections over time
  erectionChart = new Chart(ctx1, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Morning erection (0–3)',
          data: morningScores,
          borderColor: '#0e7afe',
          backgroundColor: 'rgba(14,122,254,0.2)',
          tension: 0.3,
          spanGaps: true
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 3
        }
      }
    }
  });

  // Chart 2: Alcohol vs morning erections
  alcoholChart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Morning erection (0–3)',
          data: morningScores,
          borderColor: '#0e7afe',
          backgroundColor: 'rgba(14,122,254,0.2)',
          yAxisID: 'y1',
          tension: 0.3,
          spanGaps: true
        },
        {
          label: 'Drinks',
          data: drinks,
          borderColor: '#ff9800',
          backgroundColor: 'rgba(255,152,0,0.2)',
          yAxisID: 'y2',
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true }
      },
      scales: {
        y1: {
          type: 'linear',
          position: 'left',
          beginAtZero: true,
          max: 3,
          title: {
            display: true,
            text: 'Morning erection'
          }
        },
        y2: {
          type: 'linear',
          position: 'right',
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          title: {
            display: true,
            text: 'Drinks'
          }
        }
      }
    }
  });
}

window.addEventListener('load', () => {
  // Hook up form
  const form = document.getElementById('entry-form');
  if (form) {
    form.addEventListener('submit', handleSubmit);
  }

  // Default date = today (local)
  const today = getTodayLocal();
  const dateInput = document.getElementById('date');
  if (dateInput) {
    dateInput.value = today;
  }

  renderEntries();
  renderSummary();
  renderCharts();
});
