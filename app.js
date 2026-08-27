import { firebaseConfig, ADMIN_UID } from "./firebase-config.js";

import {
  initializeApp,
  deleteApp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  deleteUser
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


/* =========================================================
   INITIALIZATION
========================================================= */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);

const ACADEMIC_EMAIL_REGEX =
  /^[^@\s]+@[^@\s]+\.(edu|ac)(\.[a-z]{2})?$/i;


/* =========================================================
   HELPERS
========================================================= */

function isAcademicEmail(email) {
  return ACADEMIC_EMAIL_REGEX.test(
    String(email || "").trim()
  );
}


function setMessage(element, text, success = false) {
  if (!element) return;

  element.textContent = text || "";
  element.classList.toggle("success", Boolean(success));
}


function friendlyAuthError(error) {
  const code = error?.code || "";

  if (code.includes("invalid-credential")) {
    return "Incorrect email or password.";
  }

  if (code.includes("email-already-in-use")) {
    return "An account already exists for this email.";
  }

  if (code.includes("weak-password")) {
    return "Please use a stronger password.";
  }

  if (code.includes("too-many-requests")) {
    return "Too many attempts. Please try again later.";
  }

  if (code.includes("requires-recent-login")) {
    return "Please sign out and sign in again before changing the password.";
  }

  if (code.includes("wrong-password")) {
    return "The current password is incorrect.";
  }

  if (code.includes("network-request-failed")) {
    return "Network error. Please check your internet connection.";
  }

  if (code.includes("permission-denied")) {
    return "Permission denied. Please check the live Firestore security rules.";
  }

  return error?.message || "The request could not be completed.";
}


function hideAll() {
  $("authSection")?.classList.add("hidden");
  $("pendingSection")?.classList.add("hidden");
  $("studentDashboard")?.classList.add("hidden");
  $("adminDashboard")?.classList.add("hidden");
  $("logoutBtn")?.classList.add("hidden");
}


function showStatus(title, text, showVerification = false) {
  $("pendingSection")?.classList.remove("hidden");

  if ($("pendingTitle")) {
    $("pendingTitle").textContent = title;
  }

  if ($("pendingText")) {
    $("pendingText").textContent = text;
  }

  $("verifyEmailBox")?.classList.toggle(
    "hidden",
    !showVerification
  );
}


function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* =========================================================
   SIGN-IN / REGISTER TABS
========================================================= */

$("showLoginBtn")?.addEventListener("click", () => {
  $("loginPanel")?.classList.remove("hidden");
  $("registerPanel")?.classList.add("hidden");

  $("showLoginBtn")?.classList.add("active");
  $("showRegisterBtn")?.classList.remove("active");
});


$("showRegisterBtn")?.addEventListener("click", () => {
  $("registerPanel")?.classList.remove("hidden");
  $("loginPanel")?.classList.add("hidden");

  $("showRegisterBtn")?.classList.add("active");
  $("showLoginBtn")?.classList.remove("active");
});


/* =========================================================
   SIGN IN
========================================================= */

$("loginForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  setMessage($("authMessage"), "");

  const email = $("email").value.trim().toLowerCase();
  const password = $("password").value;

  try {
    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
  }
  catch (error) {
    console.error("Sign-in error:", error);

    setMessage(
      $("authMessage"),
      friendlyAuthError(error)
    );
  }
});


/* =========================================================
   FORGOT PASSWORD
========================================================= */

$("resetPasswordBtn")?.addEventListener("click", async () => {
  const email = $("email").value.trim().toLowerCase();

  if (!email) {
    setMessage(
      $("authMessage"),
      "Enter your email first."
    );
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);

    setMessage(
      $("authMessage"),
      "Password reset email sent. Please check your inbox and, if you do not see it, check your Spam or Junk folder.",
      true
    );
  }
  catch (error) {
    console.error("Password-reset error:", error);

    setMessage(
      $("authMessage"),
      friendlyAuthError(error)
    );
  }
});


/* =========================================================
   SIGN OUT
========================================================= */

$("logoutBtn")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  }
  catch (error) {
    console.error("Sign-out error:", error);
  }
});


/* =========================================================
   SELF-REGISTRATION
========================================================= */

$("registerForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  setMessage($("registerMessage"), "");

  const studentId =
    $("registerStudentId").value.trim();

  const name =
    $("registerName").value.trim();

  const email =
    $("registerEmail").value.trim().toLowerCase();

  const course =
    $("registerCourse").value.trim();

  const password =
    $("registerPassword").value;

  const password2 =
    $("registerPassword2").value;


  if (!studentId || !name || !course) {
    setMessage(
      $("registerMessage"),
      "Please complete all registration fields."
    );
    return;
  }


  if (!isAcademicEmail(email)) {
    setMessage(
      $("registerMessage"),
      "Please use an institutional email ending in .edu, .ac, .edu.xx or .ac.xx."
    );
    return;
  }


  if (password.length < 8) {
    setMessage(
      $("registerMessage"),
      "Password must contain at least 8 characters."
    );
    return;
  }


  if (password !== password2) {
    setMessage(
      $("registerMessage"),
      "The two passwords do not match."
    );
    return;
  }


  let createdUser = null;

  try {
    const credential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    createdUser = credential.user;


    await setDoc(
      doc(db, "students", createdUser.uid),
      {
        studentId,
        name,
        email,
        course,
        status: "pending",
        registrationMethod: "self",
        createdAt: serverTimestamp(),
        approvedAt: null
      }
    );


    await sendEmailVerification(createdUser);


    /*
      Sign the newly registered student out so that:
      1. the success message remains visible;
      2. they verify their email first;
      3. they sign in again after tutor approval.
    */
    await signOut(auth);


    $("showLoginBtn")?.classList.remove("active");
    $("showRegisterBtn")?.classList.add("active");

    $("loginPanel")?.classList.add("hidden");
    $("registerPanel")?.classList.remove("hidden");


    $("registerForm").reset();

    if ($("registerCourse")) {
      $("registerCourse").value = "EEE XXXX";
    }


    setMessage(
      $("registerMessage"),
      "Registration submitted successfully. A verification email has been sent. Please check your inbox and, if you do not see it, check your Spam or Junk folder as well. Your account will remain pending until approved by the tutor.",
      true
    );
  }
  catch (error) {
    console.error("Registration error:", error);

    /*
      If Authentication was created but Firestore failed,
      remove the new Authentication user where possible.
    */
    if (createdUser) {
      try {
        await deleteUser(createdUser);
      }
      catch (rollbackError) {
        console.warn(
          "Could not roll back the new Authentication user:",
          rollbackError
        );
      }
    }


    setMessage(
      $("registerMessage"),
      friendlyAuthError(error)
    );
  }
});


/* =========================================================
   AUTH STATE
========================================================= */

onAuthStateChanged(auth, async (user) => {
  hideAll();


  if (!user) {
    $("authSection")?.classList.remove("hidden");
    return;
  }


  $("logoutBtn")?.classList.remove("hidden");


  try {
    await user.reload();


    /* ---------------- ADMIN ---------------- */

    if (user.uid === ADMIN_UID) {
      $("adminDashboard")?.classList.remove("hidden");

      await Promise.all([
        loadPendingStudents(),
        loadAdminStudents(),
        loadNotices("admin")
      ]);

      return;
    }


    /* ---------------- STUDENT PROFILE ---------------- */

    const profileSnap =
      await getDoc(
        doc(db, "students", user.uid)
      );


    if (!profileSnap.exists()) {
      showStatus(
        "Account not linked",
        "This login does not have a student profile. Please contact the tutor.",
        false
      );
      return;
    }


    const profile =
      profileSnap.data();


    if (!isAcademicEmail(profile.email || user.email || "")) {
      showStatus(
        "Institutional email required",
        "This portal accepts only institutional academic email addresses ending in .edu, .ac, .edu.xx or .ac.xx.",
        false
      );
      return;
    }


    /* ---------------- ACCOUNT STATUS ---------------- */

    if (profile.status === "rejected") {
      showStatus(
        "Registration not approved",
        "Your registration has not been approved. Please contact the tutor if you believe this is an error.",
        false
      );
      return;
    }


    if (profile.status === "disabled") {
      showStatus(
        "Account disabled",
        "This account has been disabled. Please contact the tutor.",
        false
      );
      return;
    }


    if (profile.status !== "approved") {
      showStatus(
        "Account awaiting approval",
        "Your registration has been received and is waiting for tutor approval. Please also verify your institutional email. If you do not see the verification email, please check your Spam or Junk folder.",
        !user.emailVerified
      );
      return;
    }


    /* ---------------- EMAIL VERIFICATION ---------------- */

    if (!user.emailVerified) {
      showStatus(
        "Verify your institutional email",
        "Your account has been approved, but you must verify your institutional email before accessing tutorial marks. Please check your inbox and, if you do not see the verification email, check your Spam or Junk folder.",
        true
      );
      return;
    }


    /* ---------------- APPROVED STUDENT ---------------- */

    $("studentDashboard")?.classList.remove("hidden");

    await Promise.all([
      loadStudentProfile(user.uid),
      loadStudentMarks(user.uid),
      loadNotices("student")
    ]);
  }
  catch (error) {
    console.error("Portal loading error:", error);

    showStatus(
      "Portal error",
      "The portal could not load your account. Please sign out and try again.",
      false
    );
  }
});


/* =========================================================
   EMAIL VERIFICATION
========================================================= */

$("resendVerificationBtn")?.addEventListener("click", async () => {
  const user = auth.currentUser;

  if (!user) return;

  try {
    await sendEmailVerification(user);

    alert(
      "Verification email sent. Please check your inbox and, if you do not see it, check your Spam or Junk folder."
    );
  }
  catch (error) {
    console.error("Verification-email error:", error);
    alert(friendlyAuthError(error));
  }
});


$("refreshVerificationBtn")?.addEventListener("click", async () => {
  const user = auth.currentUser;

  if (!user) return;

  try {
    await user.reload();
    await user.getIdToken(true);
    window.location.reload();
  }
  catch (error) {
    console.error("Verification-refresh error:", error);
    alert(friendlyAuthError(error));
  }
});


/* =========================================================
   STUDENT PROFILE
========================================================= */

async function loadStudentProfile(uid) {
  const target = $("studentProfile");

  if (!target) return;

  const snap =
    await getDoc(
      doc(db, "students", uid)
    );


  if (!snap.exists()) {
    target.innerHTML =
      "<p>No student profile is linked to this login.</p>";
    return;
  }


  const student =
    snap.data();


  target.innerHTML = `
    <p>
      <strong>${escapeHtml(student.name || "")}</strong>
    </p>

    <p>
      Student ID:
      ${escapeHtml(student.studentId || "")}
    </p>

    <p>
      Course:
      ${escapeHtml(student.course || "")}
    </p>

    <p>
      Email:
      ${escapeHtml(student.email || "")}
    </p>

    <p>
      Status:
      <span class="status-pill">
        ${escapeHtml(student.status || "")}
      </span>
    </p>
  `;
}


/* =========================================================
   STUDENT MARKS
========================================================= */

async function loadStudentMarks(uid) {
  const body =
    $("studentMarksBody");

  if (!body) return;

  body.innerHTML = "";


  const snap =
    await getDocs(
      collection(
        db,
        "students",
        uid,
        "marks"
      )
    );


  const rows = [];

  snap.forEach((item) => {
    rows.push({
      id: item.id,
      ...item.data()
    });
  });


  rows.sort((a, b) =>
    String(a.assessment || a.id)
      .localeCompare(
        String(b.assessment || b.id)
      )
  );


  if (rows.length === 0) {
    body.innerHTML =
      `<tr>
        <td colspan="4">
          No marks have been published yet.
        </td>
      </tr>`;
    return;
  }


  for (const mark of rows) {
    const tr =
      document.createElement("tr");

    tr.innerHTML = `
      <td>${escapeHtml(mark.assessment || mark.id)}</td>
      <td>${escapeHtml(String(mark.mark ?? ""))}</td>
      <td>${escapeHtml(String(mark.max ?? ""))}</td>
      <td>${escapeHtml(mark.feedback || "")}</td>
    `;

    body.appendChild(tr);
  }
}


/* =========================================================
   CHANGE PASSWORD
========================================================= */

$("changePasswordForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  setMessage(
    $("passwordMessage"),
    ""
  );


  const user =
    auth.currentUser;


  if (!user || !user.email) {
    setMessage(
      $("passwordMessage"),
      "No signed-in user."
    );
    return;
  }


  const currentPassword =
    $("currentPassword").value;

  const newPassword =
    $("newPassword").value;

  const newPassword2 =
    $("newPassword2").value;


  if (newPassword.length < 8) {
    setMessage(
      $("passwordMessage"),
      "New password must contain at least 8 characters."
    );
    return;
  }


  if (newPassword !== newPassword2) {
    setMessage(
      $("passwordMessage"),
      "The new passwords do not match."
    );
    return;
  }


  try {
    const credential =
      EmailAuthProvider.credential(
        user.email,
        currentPassword
      );


    await reauthenticateWithCredential(
      user,
      credential
    );


    await updatePassword(
      user,
      newPassword
    );


    event.target.reset();


    setMessage(
      $("passwordMessage"),
      "Password changed successfully.",
      true
    );
  }
  catch (error) {
    console.error("Password-change error:", error);

    setMessage(
      $("passwordMessage"),
      friendlyAuthError(error)
    );
  }
});


/* =========================================================
   NOTICES
========================================================= */

async function loadNotices(mode) {
  const target =
    mode === "admin"
      ? $("adminNotices")
      : $("studentNotices");


  if (!target) return;

  target.innerHTML = "";


  const noticesQuery =
    query(
      collection(db, "notices"),
      orderBy("createdAt", "desc"),
      limit(20)
    );


  const snap =
    await getDocs(noticesQuery);


  if (snap.empty) {
    target.innerHTML =
      "<p>No notices yet.</p>";
    return;
  }


  snap.forEach((item) => {
    const notice =
      item.data();

    const element =
      document.createElement("div");

    element.className =
      "notice";


    const date =
      notice.createdAt?.toDate
        ? notice.createdAt.toDate().toLocaleString()
        : "";


    element.innerHTML = `
      <h4>${escapeHtml(notice.title || "Notice")}</h4>
      <p>${escapeHtml(notice.message || "")}</p>
      <p class="muted">${escapeHtml(date)}</p>
    `;


    target.appendChild(element);
  });
}


$("noticeForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await addDoc(
      collection(db, "notices"),
      {
        title:
          $("noticeTitle").value.trim(),

        message:
          $("noticeMessage").value.trim(),

        createdAt:
          serverTimestamp()
      }
    );


    event.target.reset();


    await loadNotices("admin");
  }
  catch (error) {
    console.error("Notice error:", error);

    alert(
      "The notice could not be published."
    );
  }
});


/* =========================================================
   ADMIN: PENDING REGISTRATIONS
========================================================= */

async function loadPendingStudents() {
  const body =
    $("pendingStudentsBody");

  if (!body) return;

  body.innerHTML = "";


  const snap =
    await getDocs(
      collection(db, "students")
    );


  const pending = [];


  snap.forEach((item) => {
    const student =
      item.data();

    if (student.status === "pending") {
      pending.push({
        uid: item.id,
        ...student
      });
    }
  });


  if (pending.length === 0) {
    body.innerHTML =
      `<tr>
        <td colspan="5">
          No pending registrations.
        </td>
      </tr>`;
    return;
  }


  pending.forEach((student) => {
    const tr =
      document.createElement("tr");

    tr.innerHTML = `
      <td>${escapeHtml(student.studentId || "")}</td>
      <td>${escapeHtml(student.name || "")}</td>
      <td>${escapeHtml(student.email || "")}</td>
      <td>${escapeHtml(student.course || "")}</td>

      <td>
        <div class="action-buttons">

          <button
            class="approve-button approve-student"
            type="button"
            data-uid="${escapeHtml(student.uid)}"
          >
            Approve
          </button>

          <button
            class="danger-button reject-student"
            type="button"
            data-uid="${escapeHtml(student.uid)}"
          >
            Reject
          </button>

        </div>
      </td>
    `;

    body.appendChild(tr);
  });


  body
    .querySelectorAll(".approve-student")
    .forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          await setStudentStatus(
            button.dataset.uid,
            "approved"
          );
        }
      );
    });


  body
    .querySelectorAll(".reject-student")
    .forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          await setStudentStatus(
            button.dataset.uid,
            "rejected"
          );
        }
      );
    });
}


async function setStudentStatus(uid, status) {
  try {
    await updateDoc(
      doc(db, "students", uid),
      {
        status,

        approvedAt:
          status === "approved"
            ? serverTimestamp()
            : null
      }
    );


    await Promise.all([
      loadPendingStudents(),
      loadAdminStudents()
    ]);
  }
  catch (error) {
    console.error(
      "Student-status error:",
      error
    );

    alert(
      "The student status could not be updated."
    );
  }
}


/* =========================================================
   ADMIN: CREATE APPROVED STUDENT

   Uses a secondary Firebase application so creating the
   student does not replace the tutor's current sign-in.
========================================================= */

$("adminCreateStudentForm")?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    setMessage(
      $("adminCreateMessage"),
      ""
    );


    const studentId =
      $("adminStudentId").value.trim();

    const name =
      $("adminStudentName").value.trim();

    const email =
      $("adminStudentEmail").value.trim().toLowerCase();

    const course =
      $("adminStudentCourse").value.trim();


    if (!isAcademicEmail(email)) {
      setMessage(
        $("adminCreateMessage"),
        "Please use an institutional email ending in .edu, .ac, .edu.xx or .ac.xx."
      );
      return;
    }


    /*
      This temporary password is random and is never displayed
      or emailed. The student receives a Firebase password-reset
      email and chooses their own password.
    */
    const temporaryPassword =
      "Tmp!" +
      crypto.randomUUID()
        .replaceAll("-", "")
        .slice(0, 18) +
      "7a";


    let secondaryApp = null;
    let secondaryUser = null;


    try {
      secondaryApp =
        initializeApp(
          firebaseConfig,
          `studentCreator-${Date.now()}`
        );


      const secondaryAuth =
        getAuth(secondaryApp);


      const credential =
        await createUserWithEmailAndPassword(
          secondaryAuth,
          email,
          temporaryPassword
        );


      secondaryUser =
        credential.user;


      /*
        IMPORTANT:
        The Firestore write below uses the PRIMARY Firestore
        instance, therefore it is performed using the tutor/admin
        authentication context.
      */
      await setDoc(
        doc(
          db,
          "students",
          secondaryUser.uid
        ),
        {
          studentId,
          name,
          email,
          course,

          status: "approved",

          registrationMethod:
            "tutor-created",

          createdAt:
            serverTimestamp(),

          approvedAt:
            serverTimestamp()
        }
      );


      await sendEmailVerification(
        secondaryUser
      );


      await sendPasswordResetEmail(
        auth,
        email
      );


      await signOut(
        secondaryAuth
      );


      event.target.reset();

      if ($("adminStudentCourse")) {
        $("adminStudentCourse").value =
          "EEE XXXX";
      }


      setMessage(
        $("adminCreateMessage"),
        `Account created for ${email}. Verification and password-setup emails have been sent. Ask the student to check the Spam or Junk folder if necessary.`,
        true
      );


      await loadAdminStudents();
  }
  catch (error) {
      console.error(
        "Admin-create-student error:",
        error
      );


      if (secondaryUser) {
        try {
          await deleteUser(
            secondaryUser
          );
        }
        catch (rollbackError) {
          console.warn(
            "Unable to roll back the Authentication account:",
            rollbackError
          );
        }
      }


      setMessage(
        $("adminCreateMessage"),
        friendlyAuthError(error)
      );
    }
    finally {
      if (secondaryApp) {
        try {
          await deleteApp(
            secondaryApp
          );
        }
        catch (cleanupError) {
          console.warn(
            "Secondary Firebase cleanup error:",
            cleanupError
          );
        }
      }
    }
  }
);


/* =========================================================
   ADMIN: ALL STUDENTS
========================================================= */

async function loadAdminStudents() {
  const body =
    $("adminStudentsBody");

  if (!body) return;

  body.innerHTML = "";


  const snap =
    await getDocs(
      collection(db, "students")
    );


  if (snap.empty) {
    body.innerHTML =
      `<tr>
        <td colspan="6">
          No students added yet.
        </td>
      </tr>`;
    return;
  }


  snap.forEach((item) => {
    const student =
      item.data();

    const tr =
      document.createElement("tr");


    tr.innerHTML = `
      <td>
        <code>${escapeHtml(item.id)}</code>
      </td>

      <td>
        ${escapeHtml(student.studentId || "")}
      </td>

      <td>
        ${escapeHtml(student.name || "")}
      </td>

      <td>
        ${escapeHtml(student.email || "")}
      </td>

      <td>
        ${escapeHtml(student.course || "")}
      </td>

      <td>
        <span class="status-pill">
          ${escapeHtml(student.status || "")}
        </span>
      </td>
    `;


    body.appendChild(tr);
  });
}


/* =========================================================
   ADMIN: CSV IMPORT
========================================================= */

$("importCsvBtn")?.addEventListener("click", async () => {
  setMessage(
    $("csvMessage"),
    ""
  );


  const file =
    $("csvInput")?.files?.[0];


  if (!file) {
    setMessage(
      $("csvMessage"),
      "Choose a CSV file first."
    );
    return;
  }


  try {
    const rows =
      parseCsv(
        await file.text()
      );


    if (rows.length === 0) {
      throw new Error(
        "CSV contains no data rows."
      );
    }


    const requiredColumns = [
      "uid",
      "assessment",
      "mark",
      "max",
      "feedback"
    ];


    for (const column of requiredColumns) {
      if (!(column in rows[0])) {
        throw new Error(
          `Missing CSV column: ${column}`
        );
      }
    }


    let batch =
      writeBatch(db);

    let batchCount = 0;
    let total = 0;


    for (const row of rows) {
      const uid =
        row.uid.trim();

      const assessment =
        row.assessment.trim();


      if (!uid || !assessment) {
        continue;
      }


      const mark =
        Number(row.mark);

      const maximum =
        Number(row.max);


      if (
        !Number.isFinite(mark) ||
        !Number.isFinite(maximum)
      ) {
        throw new Error(
          `Invalid numeric mark for ${uid} / ${assessment}`
        );
      }


      const studentSnap =
        await getDoc(
          doc(db, "students", uid)
        );


      if (!studentSnap.exists()) {
        throw new Error(
          `No student profile exists for UID ${uid}.`
        );
      }


      const safeId =
        assessment
          .replaceAll("/", "-")
          .slice(0, 120);


      batch.set(
        doc(
          db,
          "students",
          uid,
          "marks",
          safeId
        ),
        {
          assessment,
          mark,
          max: maximum,
          feedback: row.feedback || "",
          updatedAt: serverTimestamp()
        },
        {
          merge: true
        }
      );


      batchCount++;
      total++;


      if (batchCount >= 400) {
        await batch.commit();

        batch =
          writeBatch(db);

        batchCount = 0;
      }
    }


    if (batchCount > 0) {
      await batch.commit();
    }


    setMessage(
      $("csvMessage"),
      `Imported ${total} mark records successfully.`,
      true
    );
  }
  catch (error) {
    console.error(
      "CSV-import error:",
      error
    );

    setMessage(
      $("csvMessage"),
      error.message
    );
  }
});


/* =========================================================
   CSV HELPERS
========================================================= */

function parseCsv(text) {
  const lines =
    text
      .replace(/\r/g, "")
      .split("\n")
      .filter(
        (line) =>
          line.trim() !== ""
      );


  if (lines.length < 2) {
    return [];
  }


  const headers =
    splitCsvLine(lines[0])
      .map(
        (header) =>
          header
            .trim()
            .toLowerCase()
      );


  return lines
    .slice(1)
    .map((line) => {
      const values =
        splitCsvLine(line);

      return Object.fromEntries(
        headers.map(
          (header, index) => [
            header,
            values[index] ?? ""
          ]
        )
      );
    });
}


function splitCsvLine(line) {
  const output = [];

  let current = "";
  let quoted = false;


  for (
    let i = 0;
    i < line.length;
    i++
  ) {
    const character =
      line[i];


    if (character === '"') {
      if (
        quoted &&
        line[i + 1] === '"'
      ) {
        current += '"';
        i++;
      }
      else {
        quoted = !quoted;
      }
    }
    else if (
      character === "," &&
      !quoted
    ) {
      output.push(current);
      current = "";
    }
    else {
      current += character;
    }
  }


  output.push(current);

  return output;
}


/* =========================================================
   STARTUP CONFIRMATION
========================================================= */

console.log(
  "Student Tutorial Portal app.js loaded successfully."
);
