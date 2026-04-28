import { supabase } from './supabase.js'

const categories = {
  reuniao: "#e74c3c",
  evento: "#8e44ad",
  trabalho: "#3498db",
  aula: "#27ae60",
  orientacao: "#f39c12",
  atendimento: "#2c3e50"
};

let calendar;
let selectedDate = null;
let selectedEvent = null;
let filterCategory = null;

/* ================= FERIADOS ================= */

function getEaster(year) {
  const f = Math.floor;
  const G = year % 19;
  const C = f(year / 100);
  const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
  const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11));
  const J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7;
  const L = I - J;
  const month = 3 + f((L + 40) / 44);
  const day = L + 28 - 31 * f(month / 4);
  return new Date(year, month - 1, day);
}

function getHolidays(year) {
  const easter = getEaster(year);

  const carnaval = new Date(easter);
  carnaval.setDate(easter.getDate() - 47);

  const sextaSanta = new Date(easter);
  sextaSanta.setDate(easter.getDate() - 2);

  const corpus = new Date(easter);
  corpus.setDate(easter.getDate() + 60);

  return [
    { title: "Confraternização Universal", date: `${year}-01-01` },
    { title: "Tiradentes", date: `${year}-04-21` },
    { title: "Dia do Trabalho", date: `${year}-05-01` },
    { title: "Independência do Brasil", date: `${year}-09-07` },
    { title: "Nossa Senhora Aparecida", date: `${year}-10-12` },
    { title: "Finados", date: `${year}-11-02` },
    { title: "Proclamação da República", date: `${year}-11-15` },
    { title: "Natal", date: `${year}-12-25` },

    { title: "Independência da Bahia", date: `${year}-07-02` },
    { title: "Aniversário de Salvador", date: `${year}-03-29` },
    { title: "Nossa Senhora da Conceição", date: `${year}-12-08` },

    { title: "Carnaval", date: carnaval.toISOString().split('T')[0] },
    { title: "Sexta-feira Santa", date: sextaSanta.toISOString().split('T')[0] },
    { title: "Corpus Christi", date: corpus.toISOString().split('T')[0] }
  ];
}

/* ================= INIT ================= */

document.addEventListener('DOMContentLoaded', async () => {

  const calendarEl = document.getElementById('calendar');
  const categoryList = document.getElementById('categoryList');
  const categorySelect = document.getElementById('category');

  /* SIDEBAR */
  Object.keys(categories).forEach(cat => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="dot" style="background:${categories[cat]}"></span>${cat}`;
    li.onclick = () => {
      filterCategory = cat;
      calendar.refetchEvents();
    };
    categoryList.appendChild(li);

    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    categorySelect.appendChild(option);
  });

  /* PREVIEW */
  const previewDot = document.getElementById('previewDot');
  const previewText = document.getElementById('previewText');

  function updatePreview() {
    const title = document.getElementById('title').value || 'Sem título';
    const cat = document.getElementById('category').value;

    previewDot.style.background = categories[cat];
    previewText.textContent = title;
  }

  document.getElementById('title').oninput = updatePreview;
  document.getElementById('category').onchange = updatePreview;

  /* LOAD EVENTS */
 async function loadEvents() {
  const { data } = await supabase.from('events').select('*');

  return data
    .filter(e => !filterCategory || e.category === filterCategory)
    .map(e => ({
      id: e.id,
      title: e.title,
      start: `${e.date}T${e.start_time}`,
      end: `${e.date}T${e.end_time}`,
      color: categories[e.category],

      extendedProps: {
        mode: e.mode,
        location: e.location,
        link: e.link
      }
    }));
}

  calendar = new FullCalendar.Calendar(calendarEl, {

    dayCellDidMount: function(info) {
  const date = info.date.toISOString().split('T')[0];
  const year = info.date.getFullYear();

  const holidays = getHolidays(year);

  const isHoliday = holidays.find(h => h.date === date);

  if (isHoliday) {
    info.el.style.backgroundColor = "#ffecec"; // vermelho claro
  }
},
    
    initialView: 'dayGridMonth',

    locale: 'pt-br',

    buttonText: {
      today: 'Hoje',
      month: 'Mês',
      week: 'Semana',
      day: 'Dia'
    },

    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },

    editable: true,
    selectable: true,

    eventDragStart: (info) => info.el.style.opacity = 0.6,
    eventDragStop: (info) => info.el.style.opacity = 1,

    dateClick: (info) => {
      selectedEvent = null;
      selectedDate = info.dateStr;
      openModal();
    },

   eventClick: (info) => {

  const event = info.event;

  document.getElementById('detailTitle').innerText = event.title;
  document.getElementById('detailMode').innerText = event.extendedProps.mode || "-";
  document.getElementById('detailLocation').innerText = event.extendedProps.location || "-";

  const link = event.extendedProps.link;
  document.getElementById('detailLink').innerHTML = link
    ? `<a href="${link}" target="_blank">Abrir</a>`
    : "-";

  document.getElementById('detailsModal').classList.remove('hidden');
}

    eventResize: async (info) => {
      const e = info.event;
      await supabase.from('events').update({
        end_time: e.endStr.split('T')[1].slice(0,5)
      }).eq('id', e.id);
    },

    events: async function(fetchInfo, successCallback) {
      const events = await loadEvents();

      const year = fetchInfo.start.getFullYear();

    const holidays = getHolidays(year).map(h => ({
  title: h.title,
  start: h.date,
  allDay: true,
  color: "#f8d7da",
  textColor: "#721c24"
}));

      successCallback([...events, ...holidays]);
    }
  });

  calendar.render();

  document.getElementById('todayBtn').onclick = () => calendar.today();

  document.getElementById('clearFilters').onclick = () => {
    filterCategory = null;
    calendar.refetchEvents();
  };

});

/* ================= MODAL ================= */

const modal = document.getElementById('modal');
const saveBtn = document.getElementById('save');
const deleteBtn = document.getElementById('delete');
const closeBtn = document.getElementById('close');

function openModal(event = null) {
  modal.classList.remove('hidden');

  if (event) {
    deleteBtn.classList.remove('hidden');
    document.getElementById('title').value = event.title;
  } else {
    deleteBtn.classList.add('hidden');
  }
}

closeBtn.onclick = () => modal.classList.add('hidden');

modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.add('hidden');
});

saveBtn.onclick = async () => {
  const title = document.getElementById('title').value;
  const start = document.getElementById('start').value;
  const end = document.getElementById('end').value;
  const category = document.getElementById('category').value;

  const mode = document.getElementById('mode').value;
  const location = document.getElementById('location').value;
  const link = document.getElementById('link').value;

  if (selectedEvent) {
    await supabase.from('events')
      .update({ title, mode, location, link })
      .eq('id', selectedEvent.id);
  } else {
    await supabase.from('events').insert([{
      title,
      date: selectedDate,
      start_time: start,
      end_time: end,
      category,
      mode,
      location,
      link
    }]);
  }

  modal.classList.add('hidden');
  calendar.refetchEvents();
};

deleteBtn.onclick = async () => {
  if (!selectedEvent) return;

  await supabase.from('events')
    .delete()
    .eq('id', selectedEvent.id);

  modal.classList.add('hidden');
  calendar.refetchEvents();
};
document.getElementById('closeDetails').onclick = () => {
  document.getElementById('detailsModal').classList.add('hidden');
};
