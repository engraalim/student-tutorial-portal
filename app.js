import { firebaseConfig, ADMIN_UID } from "./firebase-config.js";
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, sendEmailVerification, signOut, onAuthStateChanged,
  EmailAuthProvider, reauthenticateWithCredential, updatePassword, deleteUser
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs,
  query, orderBy, limit, addDoc, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = (id) => document.getElementById(id);
const ACADEMIC_EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.(edu|ac)(\.[a-z]{2})?$/i;

function isAcademicEmail(email) { return ACADEMIC_EMAIL_REGEX.test(String(email || "").trim()); }
function setMessage(el, text, success = false) { el.textContent = text || ""; el.classList.toggle("success", !!success); }
function friendlyAuthError(err) {
  const code = err?.code || "";
  if (code.includes("invalid-credential")) return "Incorrect email or password.";
  if (code.includes("email-already-in-use")) return "An account already exists for this email.";
  if (code.includes("weak-password")) return "Please use a stronger password.";
  if (code.includes("too-many-requests")) return "Too many attempts. Please try again later.";
  if (code.includes("requires-recent-login")) return "Please sign out and sign in again before changing the password.";
  return err?.message || "The request could not be completed.";
}
function hideAll() {
  $("authSection").classList.add("hidden");
  $("pendingSection").classList.add("hidden");
  $("studentDashboard").classList.add("hidden");
  $("adminDashboard").classList.add("hidden");
  $("logoutBtn").classList.add("hidden");
}
function showStatus(title, text, showVerification) {
  $("pendingSection").classList.remove("hidden");
  $("pendingTitle").textContent = title;
  $("pendingText").textContent = text;
  $("verifyEmailBox").classList.toggle("hidden", !showVerification);
}
function escapeHtml(v) {
  return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

$("showLoginBtn").addEventListener("click", () => {
  $("loginPanel").classList.remove("hidden"); $("registerPanel").classList.add("hidden");
  $("showLoginBtn").classList.add("active"); $("showRegisterBtn").classList.remove("active");
});
$("showRegisterBtn").addEventListener("click", () => {
  $("registerPanel").classList.remove("hidden"); $("loginPanel").classList.add("hidden");
  $("showRegisterBtn").classList.add("active"); $("showLoginBtn").classList.remove("active");
});

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault(); setMessage($("authMessage"), "");
  try { await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value); }
  catch (err) { setMessage($("authMessage"), friendlyAuthError(err)); }
});

$("resetPasswordBtn").addEventListener("click", async () => {
  const email = $("email").value.trim();
  if (!email) return setMessage($("authMessage"), "Enter your email first.");
  try { await sendPasswordResetEmail(auth, email); setMessage($("authMessage"), "Password reset email sent.", true); }
  catch (err) { setMessage($("authMessage"), friendlyAuthError(err)); }
});

$("logoutBtn").addEventListener("click", () => signOut(auth));

$("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault(); setMessage($("registerMessage"), "");
  const studentId = $("registerStudentId").value.trim();
  const name = $("registerName").value.trim();
  const email = $("registerEmail").value.trim().toLowerCase();
  const course = $("registerCourse").value.trim();
  const password = $("registerPassword").value;
  const password2 = $("registerPassword2").value;
  if (!isAcademicEmail(email)) return setMessage($("registerMessage"), "Use an institutional email ending in .edu, .ac, .edu.xx or .ac.xx.");
  if (password !== password2) return setMessage($("registerMessage"), "The two passwords do not match.");
  let createdUser = null;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    createdUser = cred.user;
    await setDoc(doc(db, "students", createdUser.uid), {
      studentId, name, email, course, status: "pending", registrationMethod: "self", createdAt: serverTimestamp(), approvedAt: null
    });
    await sendEmailVerification(createdUser);
    setMessage(
  $("registerMessage"),
  "Registration submitted. A verification email has been sent. Please check your inbox and, if you do not see it, check your Spam or Junk folder as well. Your account will remain pending until approved by the tutor.",
  true
);

onAuthStateChanged(auth, async (user) => {
  hideAll();
  if (!user) { $("authSection").classList.remove("hidden"); return; }
  $("logoutBtn").classList.remove("hidden");
  try {
    await user.reload();
    if (user.uid === ADMIN_UID) {
      $("adminDashboard").classList.remove("hidden");
      await Promise.all([loadPendingStudents(), loadAdminStudents(), loadNotices("admin")]);
      return;
    }
    const profileSnap = await getDoc(doc(db, "students", user.uid));
    if (!profileSnap.exists()) return showStatus("Account not linked", "This login does not have a student profile. Please contact the tutor.", false);
    const profile = profileSnap.data();
    if (!isAcademicEmail(profile.email || user.email || "")) return showStatus("Institutional email required", "This portal accepts only academic email addresses ending in .edu, .ac, .edu.xx or .ac.xx.", false);
    if (profile.status !== "approved") {
      const title = profile.status === "rejected" ? "Registration not approved" : profile.status === "disabled" ? "Account disabled" : "Account awaiting approval";
      const text = profile.status === "rejected" ? "Your registration has not been approved. Please contact the tutor if you believe this is an error." : profile.status === "disabled" ? "This account has been disabled. Please contact the tutor." : "Your registration has been received and is waiting for tutor approval.";
      return showStatus(title, text, !user.emailVerified);
    }
    if (!user.emailVerified) return showStatus("Verify your institutional email", "Your account is approved, but you must verify your institutional email before accessing marks.", true);
    $("studentDashboard").classList.remove("hidden");
    await Promise.all([loadStudentProfile(user.uid), loadStudentMarks(user.uid), loadNotices("student")]);
  } catch (err) {
    console.error(err); showStatus("Portal error", "The portal could not load your account. Please sign out and try again.", false);
  }
});

$("resendVerificationBtn").addEventListener("click", async () => {
  try { await sendEmailVerification(auth.currentUser); alert("Verification email sent."); }
  catch (err) { alert(friendlyAuthError(err)); }
});
$("refreshVerificationBtn").addEventListener("click", async () => {
  if (!auth.currentUser) return; await auth.currentUser.reload(); await auth.currentUser.getIdToken(true); window.location.reload();
});

async function loadStudentProfile(uid) {
  const snap = await getDoc(doc(db, "students", uid)); const s = snap.data();
  $("studentProfile").innerHTML = `<p><strong>${escapeHtml(s.name || "")}</strong></p><p>Student ID: ${escapeHtml(s.studentId || "")}</p><p>Course: ${escapeHtml(s.course || "")}</p><p>Email: ${escapeHtml(s.email || "")}</p><p>Status: <span class="status-pill">${escapeHtml(s.status || "")}</span></p>`;
}

async function loadStudentMarks(uid) {
  const body = $("studentMarksBody"); body.innerHTML = "";
  const snap = await getDocs(collection(db, "students", uid, "marks")); const rows = [];
  snap.forEach(d => rows.push({id:d.id, ...d.data()})); rows.sort((a,b)=>String(a.assessment||a.id).localeCompare(String(b.assessment||b.id)));
  if (!rows.length) { body.innerHTML = `<tr><td colspan="4">No marks have been published yet.</td></tr>`; return; }
  rows.forEach(m => { const tr=document.createElement("tr"); tr.innerHTML=`<td>${escapeHtml(m.assessment||m.id)}</td><td>${escapeHtml(String(m.mark??""))}</td><td>${escapeHtml(String(m.max??""))}</td><td>${escapeHtml(m.feedback||"")}</td>`; body.appendChild(tr); });
}

$("changePasswordForm").addEventListener("submit", async (e) => {
  e.preventDefault(); setMessage($("passwordMessage"), ""); const user=auth.currentUser;
  const currentPassword=$("currentPassword").value, newPassword=$("newPassword").value, newPassword2=$("newPassword2").value;
  if (newPassword !== newPassword2) return setMessage($("passwordMessage"), "The new passwords do not match.");
  try {
    const credential=EmailAuthProvider.credential(user.email,currentPassword);
    await reauthenticateWithCredential(user,credential); await updatePassword(user,newPassword);
    e.target.reset(); setMessage($("passwordMessage"), "Password changed successfully.", true);
  } catch(err){ setMessage($("passwordMessage"), friendlyAuthError(err)); }
});

async function loadNotices(mode) {
  const target = mode === "admin" ? $("adminNotices") : $("studentNotices"); target.innerHTML="";
  const q=query(collection(db,"notices"),orderBy("createdAt","desc"),limit(20)); const snap=await getDocs(q);
  if(snap.empty){ target.innerHTML="<p>No notices yet.</p>"; return; }
  snap.forEach(d=>{ const n=d.data(), el=document.createElement("div"); el.className="notice"; const date=n.createdAt?.toDate?n.createdAt.toDate().toLocaleString():""; el.innerHTML=`<h4>${escapeHtml(n.title||"Notice")}</h4><p>${escapeHtml(n.message||"")}</p><p class="muted">${escapeHtml(date)}</p>`; target.appendChild(el); });
}

$("noticeForm").addEventListener("submit", async(e)=>{ e.preventDefault(); await addDoc(collection(db,"notices"),{title:$("noticeTitle").value.trim(),message:$("noticeMessage").value.trim(),createdAt:serverTimestamp()}); e.target.reset(); await loadNotices("admin"); });

async function loadPendingStudents(){
  const body=$("pendingStudentsBody"); body.innerHTML=""; const snap=await getDocs(collection(db,"students")); const pending=[];
  snap.forEach(d=>{const s=d.data(); if(s.status==="pending") pending.push({uid:d.id,...s});});
  if(!pending.length){body.innerHTML=`<tr><td colspan="5">No pending registrations.</td></tr>`;return;}
  pending.forEach(s=>{const tr=document.createElement("tr");tr.innerHTML=`<td>${escapeHtml(s.studentId||"")}</td><td>${escapeHtml(s.name||"")}</td><td>${escapeHtml(s.email||"")}</td><td>${escapeHtml(s.course||"")}</td><td><div class="action-buttons"><button class="approve-button approve-student" data-uid="${escapeHtml(s.uid)}">Approve</button><button class="danger-button reject-student" data-uid="${escapeHtml(s.uid)}">Reject</button></div></td>`;body.appendChild(tr);});
  body.querySelectorAll(".approve-student").forEach(b=>b.addEventListener("click",()=>setStudentStatus(b.dataset.uid,"approved")));
  body.querySelectorAll(".reject-student").forEach(b=>b.addEventListener("click",()=>setStudentStatus(b.dataset.uid,"rejected")));
}
async function setStudentStatus(uid,status){ await updateDoc(doc(db,"students",uid),{status,approvedAt:status==="approved"?serverTimestamp():null}); await Promise.all([loadPendingStudents(),loadAdminStudents()]); }

$("adminCreateStudentForm").addEventListener("submit", async(e)=>{
  e.preventDefault(); setMessage($("adminCreateMessage"),"");
  const studentId=$("adminStudentId").value.trim(), name=$("adminStudentName").value.trim(), email=$("adminStudentEmail").value.trim().toLowerCase(), course=$("adminStudentCourse").value.trim();
  if(!isAcademicEmail(email)) return setMessage($("adminCreateMessage"),"Use an institutional email ending in .edu, .ac, .edu.xx or .ac.xx.");
  const temporaryPassword="Tmp!"+crypto.randomUUID().replaceAll("-","").slice(0,16)+"7a";
  let secondaryApp=null, secondaryUser=null;
  try{
    secondaryApp=initializeApp(firebaseConfig,`studentCreator-${Date.now()}`); const secondaryAuth=getAuth(secondaryApp);
    const cred=await createUserWithEmailAndPassword(secondaryAuth,email,temporaryPassword); secondaryUser=cred.user;
    await setDoc(doc(db,"students",secondaryUser.uid),{studentId,name,email,course,status:"approved",registrationMethod:"tutor-created",createdAt:serverTimestamp(),approvedAt:serverTimestamp()});
    await sendEmailVerification(secondaryUser);
    await sendPasswordResetEmail(auth,email);
    await signOut(secondaryAuth);
    e.target.reset(); $("adminStudentCourse").value="EEE XXXX"; setMessage($("adminCreateMessage"),`Account created for ${email}. Firebase verification and password-setup emails sent.`,true); await loadAdminStudents();
  }catch(err){ if(secondaryUser){try{await deleteUser(secondaryUser);}catch(_){}} setMessage($("adminCreateMessage"),friendlyAuthError(err)); }
  finally{ if(secondaryApp){try{await deleteApp(secondaryApp);}catch(_){}} }
});

async function loadAdminStudents(){
  const body=$("adminStudentsBody");body.innerHTML="";const snap=await getDocs(collection(db,"students"));
  if(snap.empty){body.innerHTML=`<tr><td colspan="6">No students added yet.</td></tr>`;return;}
  snap.forEach(d=>{const s=d.data(),tr=document.createElement("tr");tr.innerHTML=`<td><code>${escapeHtml(d.id)}</code></td><td>${escapeHtml(s.studentId||"")}</td><td>${escapeHtml(s.name||"")}</td><td>${escapeHtml(s.email||"")}</td><td>${escapeHtml(s.course||"")}</td><td><span class="status-pill">${escapeHtml(s.status||"")}</span></td>`;body.appendChild(tr);});
}

$("importCsvBtn").addEventListener("click",async()=>{
  setMessage($("csvMessage"),"");const file=$("csvInput").files[0];if(!file)return setMessage($("csvMessage"),"Choose a CSV file first.");
  try{
    const rows=parseCsv(await file.text());if(!rows.length)throw new Error("CSV contains no data rows.");
    for(const k of ["uid","assessment","mark","max","feedback"])if(!(k in rows[0]))throw new Error(`Missing CSV column: ${k}`);
    let batch=writeBatch(db),batchCount=0,total=0;
    for(const row of rows){const uid=row.uid.trim(),assessment=row.assessment.trim();if(!uid||!assessment)continue;const mark=Number(row.mark),max=Number(row.max);if(!Number.isFinite(mark)||!Number.isFinite(max))throw new Error(`Invalid numeric mark for ${uid} / ${assessment}`);const studentSnap=await getDoc(doc(db,"students",uid));if(!studentSnap.exists())throw new Error(`No student profile exists for UID ${uid}.`);const safeId=assessment.replaceAll("/","-").slice(0,120);batch.set(doc(db,"students",uid,"marks",safeId),{assessment,mark,max,feedback:row.feedback||"",updatedAt:serverTimestamp()},{merge:true});batchCount++;total++;if(batchCount>=400){await batch.commit();batch=writeBatch(db);batchCount=0;}}
    if(batchCount>0)await batch.commit();setMessage($("csvMessage"),`Imported ${total} mark records successfully.`,true);
  }catch(err){setMessage($("csvMessage"),err.message);}
});

function parseCsv(text){const lines=text.replace(/\r/g,"").split("\n").filter(x=>x.trim()!=="");if(lines.length<2)return[];const headers=splitCsvLine(lines[0]).map(x=>x.trim().toLowerCase());return lines.slice(1).map(line=>{const vals=splitCsvLine(line);return Object.fromEntries(headers.map((h,i)=>[h,vals[i]??""]));});}
function splitCsvLine(line){const out=[];let cur="",quoted=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(quoted&&line[i+1]==='"'){cur+='"';i++;}else quoted=!quoted;}else if(ch===","&&!quoted){out.push(cur);cur="";}else cur+=ch;}out.push(cur);return out;}
