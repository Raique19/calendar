import { supabase } from './supabase.js'

const categories = {
  reuniao: "#e74c3c",
  evento: "#8e44ad",
  trabalho: "#3498db",
  aula: "#27ae60",
  orientacao: "#f39c12",
  atendimento: "#2c3e50"
};

let searchTerm = "";
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

  document.getElementById('search').oninput = (e) => {
    searchTerm = e.target.value.toLowerCase();
    calendar.refetchEvents();
  };

  /* SIDEBAR */
  Object.keys(categories).forEach(cat => {
    const li = document.createElement('li');
    li.dataset.cat = cat;

    li.innerHTML = `
      <span class="dot" style="background:${categories[cat]}"></span>
      <span>${cat}</span>
      <span class="count">0</span>
    `;

    li.onclick = () => {
      filterCategory = cat;

      document.querySelectorAll('.sidebar li').forEach(el => el.classList.remove('active'));
      li.classList.add('active');

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

    const counts = {};

    data.forEach(e => {
      counts[e.category] = (counts[e.category] || 0) + 1;
    });

    document.querySelectorAll('#categoryList li').forEach(li => {
      const cat = li.dataset.cat;
      const countEl = li.querySelector('.count');

      if (countEl) {
        countEl.innerText = counts[cat] || 0;
      }
    });

    return data
      .filter(e =>
        (!filterCategory || e.category === filterCategory) &&
        (!searchTerm || (e.title || '').toLowerCase().includes(searchTerm))
      )
      .map(e => ({
        id: e.id,
        title: e.title,
        start: `${e.date}T${e.start_time}`,
        end: `${e.date}T${e.end_time}`,
        color: categories[e.category],
        extendedProps: {
          mode: e.mode,
          location: e.location,
          link: e.link,
          start_time: e.start_time,
          end_time: e.end_time
        }
      }));
  }

  /* CALENDAR */

  calendar = new FullCalendar.Calendar(calendarEl, {

    initialView: 'dayGridMonth',
    locale: 'pt-br',

    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },

    editable: true,
    selectable: true,

    dateClick: (info) => {
      selectedEvent = null;
      selectedDate = info.dateStr;
      openModal();
    },

    eventClick: (info) => {

      selectedEvent = info.event;
      const event = info.event;

      document.getElementById('detailTitle').innerText = event.title;

      const mode = event.extendedProps.mode;
      document.getElementById('detailMode').innerHTML = `
        <span class="tag ${mode}">
          ${mode === 'virtual' ? 'ONLINE' : 'PRESENCIAL'}
        </span>
      `;

      document.getElementById('detailLocation').innerText = event.extendedProps.location || "-";

      const link = event.extendedProps.link;
      const linkEl = document.getElementById('detailLinkText');
      const joinBtn = document.getElementById('joinBtn');

      if (link) {
        linkEl.innerText = link;
        joinBtn.href = link;
        joinBtn.classList.remove("hidden");
      } else {
        linkEl.innerText = "-";
        joinBtn.classList.add("hidden");
      }

      document.getElementById('detailsModal').classList.remove('hidden');
    },

    events: async (fetchInfo, successCallback) => {
      const events = await loadEvents();
      successCallback(events);
    }

  });

  calendar.render();

  /* MODAL */

  const modal = document.getElementById('modal');
  const saveBtn = document.getElementById('save');
  const deleteBtn = document.getElementById('delete');
  const closeBtn = document.getElementById('close');

  function openModal() {
    modal.classList.remove('hidden');
  }

  closeBtn.onclick = () => modal.classList.add('hidden');

  saveBtn.onclick = async () => {
    const data = {
      title: document.getElementById('title').value,
      date: selectedDate,
      start_time: document.getElementById('start').value,
      end_time: document.getElementById('end').value,
      category: document.getElementById('category').value,
      mode: document.getElementById('mode').value,
      location: document.getElementById('location').value,
      link: document.getElementById('link').value
    };

    if (selectedEvent) {
      await supabase.from('events').update(data).eq('id', selectedEvent.id);
    } else {
      await supabase.from('events').insert([data]);
    }

    modal.classList.add('hidden');
    calendar.refetchEvents();
  };

  deleteBtn.onclick = async () => {
    if (!selectedEvent) return;

    await supabase.from('events').delete().eq('id', selectedEvent.id);

    modal.classList.add('hidden');
    calendar.refetchEvents();
  };

  /* DETAILS (CORREÇÃO) */

  const btnCloseDetails = document.getElementById('closeDetails');
  if (btnCloseDetails) {
    btnCloseDetails.onclick = () => {
      document.getElementById('detailsModal').classList.add('hidden');
    };
  }

  const deleteBtnDetails = document.getElementById('deleteEvent');
  if (deleteBtnDetails) {
    deleteBtnDetails.onclick = async () => {

      if (!selectedEvent) return;

      const confirmar = confirm("Deseja excluir este evento?");
      if (!confirmar) return;

      await supabase
        .from('events')
        .delete()
        .eq('id', selectedEvent.id);

      document.getElementById('detailsModal').classList.add('hidden');

      calendar.refetchEvents();
    };
  }

});
