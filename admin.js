/* Admin dashboard logic */
const PASS = "sktala2026";   // TODO: remove – use real authentication checked on the server
const $ = s => document.querySelector(s);
let data = [];

function toast(t) { const e = $("#toast"); e.textContent = t; e.classList.remove("hide"); setTimeout(() => e.classList.add("hide"), 2200); }
const fmt = ts => new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

/* ---- Login ---- */
function enter() { $("#gate").classList.add("hide"); $("#dash").classList.remove("hide"); load(); }
$("#loginForm").onsubmit = e => {
  e.preventDefault();
  if ($("#pass").value.trim() === PASS) { sessionStorage.setItem("sk_admin", "1"); $("#err").textContent = ""; enter(); }
  else { $("#err").textContent = "Wrong passcode. Try again."; $("#pass").select(); }
};
$("#show").onchange = e => $("#pass").type = e.target.checked ? "text" : "password";
$("#logout").onclick = () => { sessionStorage.removeItem("sk_admin"); location.reload(); };
if (sessionStorage.getItem("sk_admin")) enter();

async function load() { data = await listSubmissions(); stats(); filterActs(); render(); }

/* ---- Stats ---- */
function stats() {
  $("#sTotal").textContent = data.length;
  $("#sPeople").textContent = new Set(data.map(d => (d.name || "").trim().toLowerCase())).size;
  $("#sPending").textContent = data.filter(d => d.status === "Pending").length;
  $("#sApproved").textContent = data.filter(d => d.status === "Approved").length;
  $("#sPhotos").textContent = data.reduce((n, d) => n + (d.photos || []).length, 0);
}
function filterActs() {
  const cur = $("#fAct").value, acts = [...new Set(data.map(d => d.activity))].sort();
  $("#fAct").innerHTML = '<option value="">All activities</option>';
  acts.forEach(a => { const o = document.createElement("option"); o.textContent = a; o.value = a; $("#fAct").append(o); });
  $("#fAct").value = cur;
}

/* ---- Grid ---- */
function filtered() {
  const q = $("#q").value.toLowerCase(), a = $("#fAct").value, s = $("#fStatus").value, d = $("#fDate").value;
  return data.filter(x =>
    (!q || [x.name, x.gradeSection, x.activity, x.id].join(" ").toLowerCase().includes(q)) &&
    (!a || x.activity === a) && (!s || x.status === s) && (!d || x.date === d));
}
function render() {
  const g = $("#grid"); g.textContent = "";
  const rows = filtered(); $("#empty").classList.toggle("hide", rows.length > 0);
  rows.forEach(x => {
    const c = document.createElement("div"); c.className = "sub-card";
    const im = document.createElement("div"); im.className = "img";
    if (x.photos && x.photos[0]) im.style.backgroundImage = `url(${x.photos[0]})`; else im.textContent = "No photo";
    const b = document.createElement("div"); b.className = "body";
    const n = document.createElement("b"); n.textContent = x.name;
    const a = document.createElement("div"); a.textContent = x.activity;
    const m = document.createElement("div"); m.className = "mute"; m.textContent = `${x.gradeSection} · ${x.date || fmt(x.created)}`;
    const st = document.createElement("span"); st.className = "badge " + x.status; st.textContent = x.status;
    b.append(n, a, m, st); c.append(im, b); c.onclick = () => openSub(x.id); g.append(c);
  });
}
["#q", "#fAct", "#fStatus", "#fDate"].forEach(s => $(s).oninput = render);

/* ---- Detail modal ---- */
function openSub(id) {
  const x = data.find(d => d.id === id); if (!x) return;
  const box = $("#box"); box.textContent = "";
  const h = document.createElement("h2"); h.className = "tag"; h.textContent = x.name; box.append(h);

  const info = document.createElement("div");
  [["Reference", x.id], ["Age", x.age], ["Contact", x.contact || "—"], ["Grade & Section", x.gradeSection], ["Activity", x.activity],
  ["Date", x.date], ["Role", x.role], ["Submitted", fmt(x.created)]].forEach(([k, v]) => {
    const p = document.createElement("div"); const b = document.createElement("b"); b.textContent = k + ": ";
    p.append(b, document.createTextNode(v ?? "")); info.append(p);
  });
  box.append(info);
  const nt = document.createElement("p"); nt.textContent = x.notes || "(no description)"; box.append(nt);

  const ph = document.createElement("div"); ph.className = "photos";
  (x.photos || []).forEach((src, i) => {
    const im = document.createElement("img"); im.src = src; im.alt = "Documentation " + (i + 1);
    im.onclick = () => window.open(src);
    ph.append(im);
  });
  box.append(ph);

  const sel = document.createElement("select");
  ["Pending", "Approved", "Rejected"].forEach(s => { const o = document.createElement("option"); o.textContent = s; sel.append(o); });
  sel.value = x.status;
  const bar = document.createElement("p"); bar.className = "topbar";
  const left = document.createElement("span"); left.append(sel);
  const right = document.createElement("span");
  const save = mk("Save status", "btn", async () => { await updateSubmission(x.id, { status: sel.value }); toast("Saved ★"); closeSub(); load(); });
  const dl = mk("Download photos", "btn alt sm", () => (x.photos || []).forEach((src, i) => { const a = document.createElement("a"); a.href = src; a.download = `${x.id}_${i + 1}.jpg`; a.click(); }));
  const del = mk("Delete", "btn red sm", async () => { if (confirm("Delete this submission?")) { await deleteSubmission(x.id); closeSub(); load(); toast("Deleted"); } });
  const cl = mk("Close", "btn alt sm", closeSub);
  right.append(save, " ", dl, " ", del, " ", cl); bar.append(left, right); box.append(bar);
  $("#modal").classList.remove("hide");
}
function mk(t, cls, fn) { const b = document.createElement("button"); b.className = cls; b.textContent = t; b.onclick = fn; return b; }
function closeSub() { $("#modal").classList.add("hide"); }
$("#modal").onclick = e => e.target.id === "modal" && closeSub();

/* ---- CSV ---- */
$("#csv").onclick = () => {
  const head = ["Reference", "Name", "Age", "Contact", "Grade & Section", "Activity", "Date", "Role", "Status", "Photos", "Notes"];
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = data.map(d => [d.id, d.name, d.age, d.contact, d.gradeSection, d.activity, d.date, d.role, d.status, (d.photos || []).length, d.notes].map(esc).join(","));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([[head.join(","), ...rows].join("\n")], { type: "text/csv" }));
  a.download = "sk-tala-submissions.csv"; a.click();
};