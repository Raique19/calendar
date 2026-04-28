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
let searchTerm = "";

/* ================= INIT ================= */

document.addEventListener('DOMContentLoaded', () => {

  const calendarEl = document.getElementById('calendar');
  const categoryList = document.getElementById('categoryList');
  const categorySelect = document.getElementById('category');

  /* ================= SIDEBAR ================= */

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

  document.getElementById('search').oninput = (e) => {
    searchTerm = e.target.value.toLowerCase();
    calendar.refetchEvents();
  };

  /* ================= LOAD EVENTS ================= */

  async function loadEvents() {
    const { data } = await supabase.from('events').select('*');

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
        extendedProps: e
      }));
  }

  /* ================= CALENDAR ================= */

  calendar = new FullCalendar.Calendar(calendarEl, {

    initialView: 'dayGridMonth',
    locale: 'pt-br',

    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },

    buttonText: {
      today: 'Hoje',
      month: 'Mês',
      week: 'Semana',
      day: 'Dia'
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
      const e = info.event.extendedProps;

      document.getElementById('detailTitle').innerText = info.event.title;

      document.getElementById('detailMode').innerHTML = `
        <span class="tag ${e.mode}">
          ${e.mode === 'virtual' ? 'ONLINE' : 'PRESENCIAL'}
        </span>
      `;

      document.getElementById('detailLocation').innerText = e.location || "-";

      const linkEl = document.getElementById('detailLinkText');
      const joinBtn = document.getElementById('joinBtn');

      if (e.link) {
        linkEl.innerText = e.link;
        joinBtn.href = e.link;
        joinBtn.classList.remove('hidden');
      } else {
        linkEl.innerText = "-";
        joinBtn.classList.add('hidden');
      }

      document.getElementById('detailsModal').classList.remove('hidden');
    },

    eventResize: async (info) => {
      const e = info.event;
      await supabase.from('events').update({
        end_time: e.endStr.split('T')[1].slice(0,5)
      }).eq('id', e.id);
    },

    events: async (fetchInfo, successCallback) => {
      const events = await loadEvents();
      successCallback(events);
    }

  });

  calendar.render();

  /* ================= MODAL ================= */

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

  /* ================= DETAILS ================= */

  document.getElementById('closeDetails').onclick = () => {
    document.getElementById('detailsModal').classList.add('hidden');
  };

  document.getElementById('deleteEvent').onclick = async () => {
    if (!selectedEvent) return;

    await supabase.from('events')
      .delete()
      .eq('id', selectedEvent.id);

    document.getElementById('detailsModal').classList.add('hidden');
    calendar.refetchEvents();
  };

});
