import { firebaseConfig, ADMIN_UID } from "./firebase-config.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);
const authSection = $("authSection");
const studentDashboard = $("studentDashboard");
const adminDashboard = $("adminDashboard");
const logoutBtn = $("logoutBtn");

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("authMessage").textContent = "";
  try {
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
  } catch (err) {
    $("authMessage").textContent = friendlyAuthError(err);
  }
});

$("resetPasswordBtn").addEventListener("click", async () => {
  const email = $("email").value.trim();
  if (!email) {
    $("authMessage").textContent = "Enter your email first.";
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    $("authMessage").textContent = "Password reset email sent.";
  } catch (err) {
    $("authMessage").textContent = friendlyAuthError(err);
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  hideAll();
  if (!user) {
    authSection.classList.remove("hidden");
    return;
  }

  logoutBtn.classList.remove("hidden");

  if (user.uid === ADMIN_UID) {
    adminDashboard.classList.remove("hidden");
    await Promise.all([loadAdminStudents(), loadNotices("admin")]);
  } else {
    studentDashboard.classList.remove("hidden");
    await Promise.all([loadStudentProfile(user.uid), loadStudentMarks(user.uid), loadNotices("student")]);
  }
});

function hideAll() {
  authSection.classList.add("hidden");
  studentDashboard.classList.add("hidden");
  adminDashboard.classList.add("hidden");
  logoutBtn.classList.add("hidden");
}

function friendlyAuthError(err) {
  const code = err?.code || "";
  if (code.includes("invalid-credential")) return "Incorrect email or password.";
  if (code.includes("too-many-requests")) return "Too many attempts. Please try again later.";
  return "Sign-in failed. Please check your details.";
}

async function loadStudentProfile(uid) {
  const ref = doc(db, "students", uid);
  const snap = await getDoc(ref);
  const target = $("studentProfile");

  if (!snap.exists()) {
    target.innerHTML = "<p>No student profile is linked to this login. Contact your tutor.</p>";
    return;
  }

  const s = snap.data();
  target.innerHTML = `
    <p><strong>${escapeHtml(s.name || "")}</strong></p>
    <p>Student ID: ${escapeHtml(s.studentId || "")}</p>
    <p>Course: ${escapeHtml(s.course || "")}</p>
    <p>Email: ${escapeHtml(s.email || "")}</p>`;
}

async function loadStudentMarks(uid) {
  const body = $("studentMarksBody");
  body.innerHTML = "";
  const snap = await getDocs(collection(db, "students", uid, "marks"));

  const rows = [];
  snap.forEach(d => rows.push({ id: d.id, ...d.data() }));
  rows.sort((a, b) => (a.assessment || a.id).localeCompare(b.assessment || b.id));

  if (!rows.length) {
    body.innerHTML = `<tr><td colspan="4">No marks have been published yet.</td></tr>`;
    return;
  }

  for (const m of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(m.assessment || m.id)}</td>
      <td>${escapeHtml(String(m.mark ?? ""))}</td>
      <td>${escapeHtml(String(m.max ?? ""))}</td>
      <td>${escapeHtml(m.feedback || "")}</td>`;
    body.appendChild(tr);
  }
}

async function loadNotices(mode) {
  const target = mode === "admin" ? $("adminNotices") : $("studentNotices");
  target.innerHTML = "";
  const q = query(collection(db, "notices"), orderBy("createdAt", "desc"), limit(20));
  const snap = await getDocs(q);

  if (snap.empty) {
    target.innerHTML = "<p>No notices yet.</p>";
    return;
  }

  snap.forEach(d => {
    const n = d.data();
    const el = document.createElement("div");
    el.className = "notice";
    const date = n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : "";
    el.innerHTML = `
      <h4>${escapeHtml(n.title || "Notice")}</h4>
      <p>${escapeHtml(n.message || "")}</p>
      <p class="muted small">${escapeHtml(date)}</p>`;
    target.appendChild(el);
  });
}

$("studentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const uid = $("studentUid").value.trim();

  await setDoc(doc(db, "students", uid), {
    studentId: $("studentId").value.trim(),
    name: $("studentName").value.trim(),
    email: $("studentEmail").value.trim(),
    course: $("studentCourse").value.trim()
  }, { merge: true });

  e.target.reset();
  $("studentCourse").value = "EEE XXXX";
  await loadAdminStudents();
  alert("Student saved.");
});

async function loadAdminStudents() {
  const body = $("adminStudentsBody");
  body.innerHTML = "";
  const snap = await getDocs(collection(db, "students"));

  snap.forEach(d => {
    const s = d.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(s.studentId || "")}</td>
      <td>${escapeHtml(s.name || "")}</td>
      <td>${escapeHtml(s.email || "")}</td>
      <td>${escapeHtml(s.course || "")}</td>`;
    body.appendChild(tr);
  });

  if (snap.empty) {
    body.innerHTML = `<tr><td colspan="4">No students added yet.</td></tr>`;
  }
}

$("noticeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = $("noticeTitle").value.trim();
  const message = $("noticeMessage").value.trim();
  const sendEmail = $("emailNotice").checked;

  const noticeRef = await addDoc(collection(db, "notices"), {
    title,
    message,
    createdAt: serverTimestamp()
  });

  if (sendEmail) {
    try {
      // Optional backend endpoint. Replace with your deployed HTTPS Function URL.
      const EMAIL_FUNCTION_URL = "YOUR_DEPLOYED_EMAIL_FUNCTION_URL";
      if (EMAIL_FUNCTION_URL.startsWith("YOUR_")) {
        throw new Error("Email backend is not configured.");
      }
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(EMAIL_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ noticeId: noticeRef.id, title, message })
      });
      if (!res.ok) throw new Error("Email request failed.");
    } catch (err) {
      alert(`Notice published, but email was not sent: ${err.message}`);
    }
  }

  e.target.reset();
  await loadNotices("admin");
});

$("importCsvBtn").addEventListener("click", async () => {
  $("csvMessage").textContent = "";
  const file = $("csvInput").files[0];
  if (!file) {
    $("csvMessage").textContent = "Choose a CSV file first.";
    return;
  }

  try {
    const text = await file.text();
    const rows = parseCsv(text);
    if (!rows.length) throw new Error("CSV contains no data rows.");

    const required = ["uid", "assessment", "mark", "max", "feedback"];
    for (const k of required) {
      if (!(k in rows[0])) throw new Error(`Missing CSV column: ${k}`);
    }

    let batch = writeBatch(db);
    let batchCount = 0;
    let total = 0;

    for (const row of rows) {
      const uid = row.uid.trim();
      const assessment = row.assessment.trim();
      if (!uid || !assessment) continue;

      const mark = Number(row.mark);
      const max = Number(row.max);
      if (!Number.isFinite(mark) || !Number.isFinite(max)) {
        throw new Error(`Invalid numeric mark for ${uid} / ${assessment}`);
      }

      const safeId = assessment.replaceAll("/", "-").slice(0, 120);
      const ref = doc(db, "students", uid, "marks", safeId);
      batch.set(ref, {
        assessment,
        mark,
        max,
        feedback: row.feedback || "",
        updatedAt: serverTimestamp()
      }, { merge: true });

      batchCount++;
      total++;

      if (batchCount >= 400) {
        await batch.commit();
        batch = writeBatch(db);
        batchCount = 0;
      }
    }

    if (batchCount > 0) await batch.commit();
    $("csvMessage").textContent = `Imported ${total} mark records successfully.`;
  } catch (err) {
    $("csvMessage").textContent = err.message;
  }
});

function parseCsv(text) {
  const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map(x => x.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const vals = splitCsvLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
  });
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
