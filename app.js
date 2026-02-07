// Supabase Configuration
const SUPABASE_URL = 'https://rckxdgiwftapmpnwkuyt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJja3hkZ2l3ZnRhcG1wbndrdXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0Nzc2MjYsImV4cCI6MjA4NjA1MzYyNn0.3oKCwwbvdf09rVNc1_D9kVxxan0UVtnZazoOFyaXnYk';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

async function loadData() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Load error:', error);
      return [];
    }
    
    // Convert database format to your app format
    return data.map(entry => ({
      date: entry.date,
      doseTbsp: entry.dose_tbsp,
      erections: {
        morning: entry.erections_morning,
        stimulation: entry.erections_stimulation,
        duringSex: entry.erections_during_sex
      },
      urinary: {
        nightTrips: entry.urinary_night_trips,
        startEase: entry.urinary_start_ease,
        streamStrength: entry.urinary_stream_strength,
        emptying: entry.urinary_emptying
      },
      energy: {
        energy: entry.energy_energy,
        focus: entry.energy_focus,
        motivation: entry.energy_motivation
      },
      gut: {
        bloating: entry.gut_bloating,
        stoolForm: entry.gut_stool_form,
        regularity: entry.gut_regularity
      },
      bp: {
        dizziness: entry.bp_dizziness,
        exerciseTolerance: entry.bp_exercise_tolerance
      },
      alcohol: {
        drinks: entry.alcohol_drinks
      },
      notes: entry.notes || ''
    }));
  } catch (error) {
    console.error('Unexpected load error:', error);
    return [];
  }
}

async function saveData(entry) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('You must be logged in to save data');
      return;
    }
    
    const { error } = await supabase
      .from('entries')
      .upsert({
        user_id: user.id,
        date: entry.date,
        dose_tbsp: entry.doseTbsp,
        erections_morning: entry.erections.morning,
        erections_stimulation: entry.erections.stimulation,
        erections_during_sex: entry.erections.duringSex,
        urinary_night_trips: entry.urinary.nightTrips,
        urinary_start_ease: entry.urinary.startEase,
        urinary_stream_strength: entry.urinary.streamStrength,
        urinary_emptying: entry.urinary.emptying,
        energy_energy: entry.energy.energy,
        energy_focus: entry.energy.focus,
        energy_motivation: entry.energy.motivation,
        gut_bloating: entry.gut.bloating,
        gut_stool_form: entry.gut.stoolForm,
        gut_regularity: entry.gut.regularity,
        bp_dizziness: entry.bp.dizziness,
        bp_exercise_tolerance: entry.bp.exerciseTolerance,
        alcohol_drinks: entry.alcohol.drinks,
        notes: entry.notes
      });
    
    if (error) {
      console.error('Save error:', error);
      alert('Error saving data: ' + error.message);
    }
  } catch (error) {
    console.error('Unexpected save error:', error);
    alert('Unexpected error saving data');
  }
}

function getFormValue(id) {
  const el = document.getElementById(id);
  if (!el || el.value === '') return null;
  const num = Number(el.value);
  return isNaN(num) ? null : num;
}

async function handleSubmit(event) {
  event.preventDefault();

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

  // Save just this one day's entry to Supabase
  await saveData(day);

  // Re-render everything from Supabase
  await renderEntries();
  await renderSummary();
  await renderCharts();

  // Clear form
  event.target.reset();

  // Reset date back to today (local)
  const today = getTodayLocal();
  const dateInput = document.getElementById('date');
  if (dateInput) {
    dateInput.value = today;
  }
}

async function renderEntries() {
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

async function renderSummary() {
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

async function renderCharts() {
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
// ===== AUTHENTICATION FUNCTIONS =====

async function handleSignUp() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  
  if (!email || !password) {
    alert('Please enter email and password');
    return;
  }
  
  if (password.length < 6) {
    alert('Password must be at least 6 characters');
    return;
  }
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });
    
    if (error) {
      alert('Sign up error: ' + error.message);
      return;
    }
    
    alert('Account created! Please check your email to confirm.');
    document.getElementById('auth-email').value = '';
    document.getElementById('auth-password').value = '';
  } catch (error) {
    alert('Unexpected error: ' + error.message);
  }
}

async function handleSignIn() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  
  if (!email || !password) {
    alert('Please enter email and password');
    return;
  }
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      alert('Sign in error: ' + error.message);
      return;
    }
    
    // Hide login, show app
    showApp();
  } catch (error) {
    alert('Unexpected error: ' + error.message);
  }
}

async function handleSignOut() {
  try {
    await supabase.auth.signOut();
    // Show login, hide app
    showLogin();
  } catch (error) {
    alert('Sign out error: ' + error.message);
  }
}

function showLogin() {
  document.getElementById('auth-container').style.display = 'flex';
  document.getElementById('app-container').style.display = 'none';
}

function showApp() {
  document.getElementById('auth-container').style.display = 'none';
  document.getElementById('app-container').style.display = 'block';
}

window.addEventListener('load', async () => {
  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    // User not logged in - show login form
    showLogin();
  } else {
    // User is logged in - show app and load data
    showApp();
    
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

    // Load and display data
    await renderEntries();
    await renderSummary();
    await renderCharts();
  }
});
