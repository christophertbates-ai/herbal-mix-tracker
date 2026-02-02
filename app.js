const STORAGE_KEY = 'herbalTrackerData';

// Chart instances
let erectionChart = null;
let alcoholChart = null;
let urinaryChart = null;
let energyChart = null;
let gutChart = null;
let bpChart = null;

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
    data.map(d =>
      d.alcohol && typeof d.alcohol.drinks === 'number' ? d.alcohol.drinks : null
    )
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

  const urinaryNight = data.map(d => d.urinary.nightTrips ?? null);
  const urinaryStart = data.map(d => d.urinary.startEase ?? null);
  const urinaryStream = data.map(d => d.urinary.streamStrength ?? null);
  const urinaryEmpty = data.map(d => d.urinary.emptying ?? null);

  const energyEnergy = data.map(d => d.energy.energy ?? null);
  const energyFocus = data.map(d => d.energy.focus ?? null);
  const energyMotivation = data.map(d => d.energy.motivation ?? null);

  const gutBloating = data.map(d => d.gut.bloating ?? null);
  const gutStool = data.map(d => d.gut.stoolForm ?? null);
  const gutRegularity = data.map(d => d.gut.regularity ?? null);

  const bpDizzy = data.map(d => d.bp.dizziness ?? null);
  const bpExercise = data.map(d => d.bp.exerciseTolerance ?? null);

  const erectionCanvas = document.getElementById('erectionChart');
  const alcoholCanvas = document.getElementById('alcoholChart');
  const urinaryCanvas = document.getElementById('urinaryChart');
  const energyCanvas = document.getElementById('energyChart');
  const gutCanvas = document.getElementById('gutChart');
  const bpCanvas = document.getElementById('bpChart');

  if (typeof Chart === 'undefined') {
    return;
  }

  // Destroy previous charts if they exist
  if (erectionChart) erectionChart.destroy();
  if (alcoholChart) alcoholChart.destroy();
  if (urinaryChart) urinaryChart.destroy();
  if (energyChart) energyChart.destroy();
  if (gutChart) gutChart.destroy();
  if (bpChart) bpChart.destroy();

  // Chart 1: Morning erections over time
  if (erectionCanvas) {
    const ctx1 = erectionCanvas.getContext('2d');
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
        plugins: { legend: { display: true } },
        scales: {
          y: {
            beginAtZero: true,
            max: 3
          }
        }
      }
    });
  }

  // Chart 2: Alcohol vs morning erections
  if (alcoholCanvas) {
    const ctx2 = alcoholCanvas.getContext('2d');
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
        plugins: { legend: { display: true } },
        scales: {
          y1: {
            type: 'linear',
            position: 'left',
            beginAtZero: true,
            max: 3,
            title: { display: true, text: 'Morning erection' }
          },
          y2: {
            type: 'linear',
            position: 'right',
            beginAtZero: true,
            grid: { drawOnChartArea: false },
            title: { display: true, text: 'Drinks' }
          }
        }
      }
    });
  }

  // Chart 3: Urinary
  if (urinaryCanvas) {
    const ctx3 = urinaryCanvas.getContext('2d');
    urinaryChart = new Chart(ctx3, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Night trips',
            data: urinaryNight,
            borderColor: '#4caf50',
            backgroundColor: 'rgba(76,175,80,0.2)',
            tension: 0.3,
            spanGaps: true
          },
          {
            label: 'Start ease',
            data: urinaryStart,
            borderColor: '#8bc34a',
            backgroundColor: 'rgba(139,195,74,0.2)',
            tension: 0.3,
            spanGaps: true
          },
          {
            label: 'Stream strength',
            data: urinaryStream,
            borderColor: '#cddc39',
            backgroundColor: 'rgba(205,220,57,0.2)',
            tension: 0.3,
            spanGaps: true
          },
          {
            label: 'Emptying',
            data: urinaryEmpty,
            borderColor: '#ffeb3b',
            backgroundColor: 'rgba(255,235,59,0.2)',
            tension: 0.3,
            spanGaps: true
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } },
        scales: {
          y: {
            beginAtZero: true,
            max: 3
          }
        }
      }
    });
  }

  // Chart 4: Energy
  if (energyCanvas) {
    const ctx4 = energyCanvas.getContext('2d');
    energyChart = new Chart(ctx4, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Energy',
            data: energyEnergy,
            borderColor: '#9c27b0',
            backgroundColor: 'rgba(156,39,176,0.2)',
            tension: 0.3,
            spanGaps: true
          },
          {
            label: 'Focus',
            data: energyFocus,
            borderColor: '#e91e63',
            backgroundColor: 'rgba(233,30,99,0.2)',
            tension: 0.3,
            spanGaps: true
          },
          {
            label: 'Motivation',
            data: energyMotivation,
            borderColor: '#f44336',
            backgroundColor: 'rgba(244,67,54,0.2)',
            tension: 0.3,
            spanGaps: true
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } },
        scales: {
          y: {
            beginAtZero: true,
            max: 3
          }
        }
      }
    });
  }

  // Chart 5: Gut
  if (gutCanvas) {
    const ctx5 = gutCanvas.getContext('2d');
    gutChart = new Chart(ctx5, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Bloating (higher = better)',
            data: gutBloating,
            borderColor: '#03a9f4',
            backgroundColor: 'rgba(3,169,244,0.2)',
            tension: 0.3,
            spanGaps: true
          },
          {
            label: 'Stool form',
            data: gutStool,
            borderColor: '#00bcd4',
            backgroundColor: 'rgba(0,188,212,0.2)',
            tension: 0.3,
            spanGaps: true
          },
          {
            label: 'Regularity',
            data: gutRegularity,
            borderColor: '#009688',
            backgroundColor: 'rgba(0,150,136,0.2)',
            tension: 0.3,
            spanGaps: true
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } },
        scales: {
          y: {
            beginAtZero: true,
            max: 3
          }
        }
      }
    });
  }

  // Chart 6: BP / Dizziness
  if (bpCanvas) {
    const ctx6 = bpCanvas.getContext('2d');
    bpChart = new Chart(ctx6, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Lightheaded when standing (higher = better)',
            data: bpDizzy,
            borderColor: '#795548',
            backgroundColor: 'rgba(121,85,72,0.2)',
            tension: 0.3,
            spanGaps: true
          },
          {
            label: 'Exercise tolerance',
            data: bpExercise,
            borderColor: '#607d8b',
            backgroundColor: 'rgba(96,125,139,0.2)',
            tension: 0.3,
            spanGaps: true
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true } },
        scales: {
          y: {
            beginAtZero: true,
            max: 3
          }
        }
      }
    });
  }
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
