import { supabase } from './supabase.js'

const colors = {
  reuniao:"#e74c3c",
  evento:"#8e44ad",
  trabalho:"#3498db",
  aula:"#27ae60",
  orientacao:"#f39c12",
  atendimento:"#2c3e50"
}

let calendar, selectedDate=null, selectedEvent=null

document.addEventListener('DOMContentLoaded', async ()=>{

const el=document.getElementById('calendar')

async function load(){
 const {data}=await supabase.from('events').select('*')
 return data.map(e=>({
   id:e.id,
   title:e.title,
   start:`${e.date}T${e.start_time}`,
   end:`${e.date}T${e.end_time}`,
   color:colors[e.category]
 }))
}

calendar=new FullCalendar.Calendar(el,{
 initialView:'timeGridWeek',
 headerToolbar:{
  left:'prev,next today',
  center:'title',
  right:'dayGridMonth,timeGridWeek,timeGridDay'
 },
 selectable:true,
 editable:true,

 dateClick:(info)=>{
   selectedEvent=null
   selectedDate=info.dateStr
   openModal()
 },

 eventClick:(info)=>{
   selectedEvent=info.event
   openModal(info.event)
 },

 eventDrop: async (info)=>{
   const e=info.event
   await supabase.from('events').update({
     date:e.startStr.split('T')[0],
     start_time:e.startStr.split('T')[1].slice(0,5),
     end_time:e.endStr.split('T')[1].slice(0,5)
   }).eq('id',e.id)
 },

 eventResize: async (info)=>{
   const e=info.event
   await supabase.from('events').update({
     end_time:e.endStr.split('T')[1].slice(0,5)
   }).eq('id',e.id)
 },

 events: async (i,cb)=> cb(await load())
})

calendar.render()
})

const modal=document.getElementById('modal')
const save=document.getElementById('save')
const del=document.getElementById('delete')
const close=document.getElementById('close')

function openModal(event=null){
 modal.classList.remove('hidden')

 if(event){
  del.classList.remove('hidden')
  document.getElementById('title').value=event.title
 }else{
  del.classList.add('hidden')
 }
}

close.onclick=()=>modal.classList.add('hidden')

save.onclick=async ()=>{
 const title=document.getElementById('title').value
 const start=document.getElementById('start').value
 const end=document.getElementById('end').value
 const category=document.getElementById('category').value

 if(selectedEvent){
  await supabase.from('events').update({title}).eq('id',selectedEvent.id)
 }else{
  await supabase.from('events').insert([{
   title,date:selectedDate,start_time:start,end_time:end,category
  }])
 }

 modal.classList.add('hidden')
 calendar.refetchEvents()
}

del.onclick=async ()=>{
 if(!selectedEvent)return
 await supabase.from('events').delete().eq('id',selectedEvent.id)
 modal.classList.add('hidden')
 calendar.refetchEvents()
}
