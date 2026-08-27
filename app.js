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
   FIREBASE INITIALIZATION
========================================================= */

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

const $ = (id) => document.getElementById(id);


/* =========================================================
   ACADEMIC EMAIL VALIDATION

   Accepted examples:

   name@mit.edu
   name@college.ac

   name@uow.edu.au
   name@university.edu.bd

   name@university.ac.au
   name@ru.ac.bd
========================================================= */

const ACADEMIC_EMAIL_REGEX =
  /^[^@\s]+@[^@\s]+\.(edu|ac)(\.[a-z]{2})?$/i;


function isAcademicEmail(email) {

  return ACADEMIC_EMAIL_REGEX.test(
    String(email || "").trim()
  );

}


/* =========================================================
   GENERAL HELPERS
========================================================= */

function setMessage(
  element,
  text,
  success = false
) {

  if (!element) {
    return;
  }

  element.textContent = text || "";

  element.classList.toggle(
    "success",
    Boolean(success)
  );

}


function friendlyAuthError(err) {

  const code = err?.code || "";

  if (
    code.includes("invalid-credential")
  ) {
    return "Incorrect email or password.";
  }

  if (
    code.includes("email-already-in-use")
  ) {
    return "An account already exists for this email.";
  }

  if (
    code.includes("weak-password")
  ) {
    return "Please use a stronger password.";
  }

  if (
    code.includes("too-many-requests")
  ) {
    return "Too many attempts. Please try again later.";
  }

  if (
    code.includes("requires-recent-login")
  ) {
    return "Please sign out and sign in again before changing the password.";
  }

  if (
    code.includes("wrong-password")
  ) {
    return "The current password is incorrect.";
  }

  if (
    code.includes("network-request-failed")
  ) {
    return "Network error. Please check your internet connection.";
  }

  return (
    err?.message ||
    "The request could not be completed."
  );

}


/* =========================================================
   HIDE ALL MAIN SECTIONS
========================================================= */

function hideAll() {

  $("authSection")?.classList.add("hidden");

  $("pendingSection")?.classList.add("hidden");

  $("studentDashboard")?.classList.add("hidden");

  $("adminDashboard")?.classList.add("hidden");

  $("logoutBtn")?.classList.add("hidden");

}


/* =========================================================
   STATUS PAGE
========================================================= */

function showStatus(
  title,
  text,
  showVerification
) {

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


/* =========================================================
   HTML ESCAPING
========================================================= */

function escapeHtml(value) {

  return String(value)

    .replaceAll("&", "&amp;")

    .replaceAll("<", "&lt;")

    .replaceAll(">", "&gt;")

    .replaceAll('"', "&quot;")

    .replaceAll("'", "&#039;");

}


/* =========================================================
   LOGIN / REGISTER TABS
========================================================= */

$("showLoginBtn")?.addEventListener(
  "click",
  () => {

    $("loginPanel")?.classList.remove("hidden");

    $("registerPanel")?.classList.add("hidden");

    $("showLoginBtn")?.classList.add("active");

    $("showRegisterBtn")?.classList.remove("active");

  }
);


$("showRegisterBtn")?.addEventListener(
  "click",
  () => {

    $("registerPanel")?.classList.remove("hidden");

    $("loginPanel")?.classList.add("hidden");

    $("showRegisterBtn")?.classList.add("active");

    $("showLoginBtn")?.classList.remove("active");

  }
);


/* =========================================================
   LOGIN
========================================================= */

$("loginForm")?.addEventListener(
  "submit",
  async (e) => {

    e.preventDefault();

    setMessage(
      $("authMessage"),
      ""
    );

    const email =
      $("email").value.trim();

    const password =
      $("password").value;

    try {

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    }
    catch (err) {

      console.error(err);

      setMessage(
        $("authMessage"),
        friendlyAuthError(err)
      );

    }

  }
);


/* =========================================================
   FORGOT PASSWORD
========================================================= */

$("resetPasswordBtn")?.addEventListener(
  "click",
  async () => {

    const email =
      $("email").value
        .trim()
        .toLowerCase();

    if (!email) {

      setMessage(
        $("authMessage"),
        "Enter your email first."
      );

      return;

    }

    try {

      await sendPasswordResetEmail(
        auth,
        email
      );

      setMessage(
        $("authMessage"),
        "Password reset email sent. Please check your inbox and Spam or Junk folder.",
        true
      );

    }
    catch (err) {

      console.error(err);

      setMessage(
        $("authMessage"),
        friendlyAuthError(err)
      );

    }

  }
);


/* =========================================================
   LOGOUT
========================================================= */

$("logoutBtn")?.addEventListener(
  "click",
  async () => {

    await signOut(auth);

  }
);


/* =========================================================
   STUDENT SELF-REGISTRATION
========================================================= */

$("registerForm")?.addEventListener(
  "submit",
  async (e) => {

    e.preventDefault();

    setMessage(
      $("registerMessage"),
      ""
    );


    const studentId =
      $("registerStudentId").value.trim();


    const name =
      $("registerName").value.trim();


    const email =
      $("registerEmail").value
        .trim()
        .toLowerCase();


    const course =
      $("registerCourse").value.trim();


    const password =
      $("registerPassword").value;


    const password2 =
      $("registerPassword2").value;


    /* Academic email check */

    if (!isAcademicEmail(email)) {

      setMessage(
        $("registerMessage"),
        "Please use an institutional email ending in .edu, .ac, .edu.xx or .ac.xx."
      );

      return;

    }


    /* Password confirmation */

    if (password !== password2) {

      setMessage(
        $("registerMessage"),
        "The two passwords do not match."
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


    let createdUser = null;


    try {

      /* -----------------------------------------------
         Create Firebase Authentication user
      ------------------------------------------------ */

      const credential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );


      createdUser = credential.user;


      /* -----------------------------------------------
         Create PENDING Firestore student profile
      ------------------------------------------------ */

      await setDoc(
        doc(
          db,
          "students",
          createdUser.uid
        ),
        {

          studentId: studentId,

          name: name,

          email: email,

          course: course,

          status: "pending",

          registrationMethod: "self",

          createdAt: serverTimestamp(),

          approvedAt: null

        }
      );


      /* -----------------------------------------------
         Send verification email
      ------------------------------------------------ */

      await sendEmailVerification(
        createdUser
      );


      setMessage(
        $("registerMessage"),
        "Registration submitted successfully. A verification email has been sent. Please check your inbox and, if you do not see it, check your Spam or Junk folder as well. Your account will remain pending until approved by the tutor.",
        true
      );


    }
    catch (err) {

      console.error(err);


      /*
       If Authentication succeeded but Firestore failed,
       try to remove the newly-created Authentication
       account so the student can register again.
      */

      if (createdUser) {

        try {

          await deleteUser(
            createdUser
          );

        }
        catch (deleteError) {

          console.warn(
            "Could not roll back Firebase user:",
            deleteError
          );

        }

      }


      setMessage(
        $("registerMessage"),
        friendlyAuthError(err)
      );

    }

  }
);


/* =========================================================
   AUTHENTICATION STATE
========================================================= */

onAuthStateChanged(
  auth,
  async (user) => {

    hideAll();


    /* -----------------------------------------------
       Not logged in
    ------------------------------------------------ */

    if (!user) {

      $("authSection")?.classList.remove(
        "hidden"
      );

      return;

    }


    $("logoutBtn")?.classList.remove(
      "hidden"
    );


    try {

      /*
       Reload Firebase Authentication user so
       emailVerified is current.
      */

      await user.reload();


      /* =================================================
         ADMIN
      ================================================= */

      if (
        user.uid === ADMIN_UID
      ) {

        $("adminDashboard")?.classList.remove(
          "hidden"
        );


        await Promise.all([

          loadPendingStudents(),

          loadAdminStudents(),

          loadNotices("admin")

        ]);


        return;

      }


      /* =================================================
         STUDENT PROFILE
      ================================================= */

      const profileReference =
        doc(
          db,
          "students",
          user.uid
        );


      const profileSnap =
        await getDoc(
          profileReference
        );


      /* No linked student profile */

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


      /* =================================================
         CHECK ACADEMIC EMAIL
      ================================================= */

      const profileEmail =
        profile.email ||
        user.email ||
        "";


      if (
        !isAcademicEmail(
          profileEmail
        )
      ) {

        showStatus(

          "Institutional email required",

          "This portal accepts only institutional academic email addresses ending in .edu, .ac, .edu.xx or .ac.xx.",

          false

        );

        return;

      }


      /* =================================================
         PENDING / REJECTED / DISABLED
      ================================================= */

      if (
        profile.status !== "approved"
      ) {

        let title;

        let text;


        /* Rejected */

        if (
          profile.status === "rejected"
        ) {

          title =
            "Registration not approved";

          text =
            "Your registration has not been approved. Please contact the tutor if you believe this is an error.";

        }


        /* Disabled */

        else if (
          profile.status === "disabled"
        ) {

          title =
            "Account disabled";

          text =
            "This account has been disabled. Please contact the tutor.";

        }


        /* Pending */

        else {

          title =
            "Account awaiting approval";

          text =
            "Your registration has been received and is waiting for tutor approval. Please also verify your institutional email. If you do not see the verification email, please check your Spam or Junk folder.";

        }


        showStatus(

          title,

          text,

          !user.emailVerified

        );


        return;

      }


      /* =================================================
         APPROVED BUT EMAIL NOT VERIFIED
      ================================================= */

      if (
        !user.emailVerified
      ) {

        showStatus(

          "Verify your institutional email",

          "Your account has been approved, but you must verify your institutional email before accessing tutorial marks. Please check your inbox and, if you do not see the verification email, check your Spam or Junk folder.",

          true

        );


        return;

      }


      /* =================================================
         APPROVED STUDENT
      ================================================= */

      $("studentDashboard")?.classList.remove(
        "hidden"
      );


      await Promise.all([

        loadStudentProfile(
          user.uid
        ),

        loadStudentMarks(
          user.uid
        ),

        loadNotices(
          "student"
        )

      ]);


    }
    catch (err) {

      console.error(
        "Portal loading error:",
        err
      );


      showStatus(

        "Portal error",

        "The portal could not load your account. Please sign out and try again.",

        false

      );

    }

  }
);


/* =========================================================
   RESEND EMAIL VERIFICATION
========================================================= */

$("resendVerificationBtn")?.addEventListener(
  "click",
  async () => {

    if (
      !auth.currentUser
    ) {

      return;

    }


    try {

      await sendEmailVerification(
        auth.currentUser
      );


      alert(
        "Verification email sent. Please check your inbox and Spam or Junk folder."
      );

    }
    catch (err) {

      console.error(err);

      alert(
        friendlyAuthError(err)
      );

    }

  }
);


/* =========================================================
   REFRESH EMAIL VERIFICATION
========================================================= */

$("refreshVerificationBtn")?.addEventListener(
  "click",
  async () => {

    if (
      !auth.currentUser
    ) {

      return;

    }


    try {

      await auth.currentUser.reload();


      await auth.currentUser.getIdToken(
        true
      );


      window.location.reload();

    }
    catch (err) {

      console.error(err);

      alert(
        friendlyAuthError(err)
      );

    }

  }
);


/* =========================================================
   LOAD STUDENT PROFILE
========================================================= */

async function loadStudentProfile(
  uid
) {

  const snap =
    await getDoc(
      doc(
        db,
        "students",
        uid
      )
    );


  const target =
    $("studentProfile");


  if (!target) {
    return;
  }


  if (!snap.exists()) {

    target.innerHTML =
      "<p>No student profile is linked to this login.</p>";

    return;

  }


  const student =
    snap.data();


  target.innerHTML = `

    <p>
      <strong>
        ${escapeHtml(student.name || "")}
      </strong>
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
   LOAD STUDENT MARKS
========================================================= */

async function loadStudentMarks(
  uid
) {

  const body =
    $("studentMarksBody");


  if (!body) {
    return;
  }


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


  snap.forEach(
    (documentSnapshot) => {

      rows.push({

        id:
          documentSnapshot.id,

        ...documentSnapshot.data()

      });

    }
  );


  rows.sort(
    (a, b) =>

      String(
        a.assessment ||
        a.id
      ).localeCompare(

        String(
          b.assessment ||
          b.id
        )

      )
  );


  if (
    rows.length === 0
  ) {

    body.innerHTML = `

      <tr>

        <td colspan="4">

          No marks have been published yet.

        </td>

      </tr>

    `;


    return;

  }


  for (
    const markRecord of rows
  ) {

    const row =
      document.createElement(
        "tr"
      );


    row.innerHTML = `

      <td>
        ${escapeHtml(
          markRecord.assessment ||
          markRecord.id
        )}
      </td>

      <td>
        ${escapeHtml(
          String(
            markRecord.mark ?? ""
          )
        )}
      </td>

      <td>
        ${escapeHtml(
          String(
            markRecord.max ?? ""
          )
        )}
      </td>

      <td>
        ${escapeHtml(
          markRecord.feedback ||
          ""
        )}
      </td>

    `;


    body.appendChild(
      row
    );

  }

}


/* =========================================================
   CHANGE PASSWORD
========================================================= */

$("changePasswordForm")?.addEventListener(
  "submit",
  async (e) => {

    e.preventDefault();


    setMessage(
      $("passwordMessage"),
      ""
    );


    const user =
      auth.currentUser;


    if (
      !user ||
      !user.email
    ) {

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


    if (
      newPassword !==
      newPassword2
    ) {

      setMessage(
        $("passwordMessage"),
        "The new passwords do not match."
      );

      return;

    }


    if (
      newPassword.length < 8
    ) {

      setMessage(
        $("passwordMessage"),
        "New password must contain at least 8 characters."
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


      e.target.reset();


      setMessage(
        $("passwordMessage"),
        "Password changed successfully.",
        true
      );


    }
    catch (err) {

      console.error(err);


      setMessage(
        $("passwordMessage"),
        friendlyAuthError(err)
      );

    }

  }
);


/* =========================================================
   LOAD NOTICES
========================================================= */

async function loadNotices(
  mode
) {

  const target =
    mode === "admin"
      ? $("adminNotices")
      : $("studentNotices");


  if (!target) {
    return;
  }


  target.innerHTML = "";


  const noticesQuery =
    query(

      collection(
        db,
        "notices"
      ),

      orderBy(
        "createdAt",
        "desc"
      ),

      limit(20)

    );


  const snap =
    await getDocs(
      noticesQuery
    );


  if (
    snap.empty
  ) {

    target.innerHTML =
      "<p>No notices yet.</p>";

    return;

  }


  snap.forEach(
    (documentSnapshot) => {

      const notice =
        documentSnapshot.data();


      const element =
        document.createElement(
          "div"
        );


      element.className =
        "notice";


      const date =
        notice.createdAt?.toDate

          ? notice.createdAt
              .toDate()
              .toLocaleString()

          : "";


      element.innerHTML = `

        <h4>
          ${escapeHtml(
            notice.title ||
            "Notice"
          )}
        </h4>

        <p>
          ${escapeHtml(
            notice.message ||
            ""
          )}
        </p>

        <p class="muted">
          ${escapeHtml(date)}
        </p>

      `;


      target.appendChild(
        element
      );

    }
  );

}


/* =========================================================
   ADMIN: PUBLISH NOTICE
========================================================= */

$("noticeForm")?.addEventListener(
  "submit",
  async (e) => {

    e.preventDefault();


    try {

      await addDoc(

        collection(
          db,
          "notices"
        ),

        {

          title:
            $("noticeTitle").value.trim(),

          message:
            $("noticeMessage").value.trim(),

          createdAt:
            serverTimestamp()

        }

      );


      e.target.reset();


      await loadNotices(
        "admin"
      );


    }
    catch (err) {

      console.error(
        "Notice publishing error:",
        err
      );


      alert(
        "Could not publish the notice."
      );

    }

  }
);


/* =========================================================
   ADMIN: LOAD PENDING STUDENTS
========================================================= */

async function loadPendingStudents() {

  const body =
    $("pendingStudentsBody");


  if (!body) {
    return;
  }


  body.innerHTML = "";


  const snap =
    await getDocs(
      collection(
        db,
        "students"
      )
    );


  const pending = [];


  snap.forEach(
    (documentSnapshot) => {

      const student =
        documentSnapshot.data();


      if (
        student.status ===
        "pending"
      ) {

        pending.push({

          uid:
            documentSnapshot.id,

          ...student

        });

      }

    }
  );


  if (
    pending.length === 0
  ) {

    body.innerHTML = `

      <tr>

        <td colspan="5">

          No pending registrations.

        </td>

      </tr>

    `;


    return;

  }


  pending.forEach(
    (student) => {

      const row =
        document.createElement(
          "tr"
        );


      row.innerHTML = `

        <td>
          ${escapeHtml(
            student.studentId ||
            ""
          )}
        </td>

        <td>
          ${escapeHtml(
            student.name ||
            ""
          )}
        </td>

        <td>
          ${escapeHtml(
            student.email ||
            ""
          )}
        </td>

        <td>
          ${escapeHtml(
            student.course ||
            ""
          )}
        </td>

        <td>

          <div class="action-buttons">

            <button
              class="approve-button approve-student"
              data-uid="${escapeHtml(student.uid)}"
            >
              Approve
            </button>

            <button
              class="danger-button reject-student"
              data-uid="${escapeHtml(student.uid)}"
            >
              Reject
            </button>

          </div>

        </td>

      `;


      body.appendChild(
        row
      );

    }
  );


  body
    .querySelectorAll(
      ".approve-student"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          async () => {

            await setStudentStatus(
              button.dataset.uid,
              "approved"
            );

          }
        );

      }
    );


  body
    .querySelectorAll(
      ".reject-student"
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          async () => {

            await setStudentStatus(
              button.dataset.uid,
              "rejected"
            );

          }
        );

      }
    );

}


/* =========================================================
   ADMIN: APPROVE / REJECT STUDENT
========================================================= */

async function setStudentStatus(
  uid,
  status
) {

  try {

    await updateDoc(

      doc(
        db,
        "students",
        uid
      ),

      {

        status: status,

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
  catch (err) {

    console.error(
      "Student status update error:",
      err
    );


    alert(
      "Unable to update the student's status."
    );

  }

}


/* =========================================================
   ADMIN: CREATE APPROVED STUDENT

   A secondary Firebase application is used so that creating
   a student does NOT log the tutor/admin out.
========================================================= */

$("adminCreateStudentForm")?.addEventListener(
  "submit",
  async (e) => {

    e.preventDefault();


    setMessage(
      $("adminCreateMessage"),
      ""
    );


    const studentId =
      $("adminStudentId").value.trim();


    const name =
      $("adminStudentName").value.trim();


    const email =
      $("adminStudentEmail").value
        .trim()
        .toLowerCase();


    const course =
      $("adminStudentCourse").value.trim();


    if (
      !isAcademicEmail(email)
    ) {

      setMessage(
        $("adminCreateMessage"),
        "Please use an institutional email ending in .edu, .ac, .edu.xx or .ac.xx."
      );

      return;

    }


    /*
     Internal random temporary password.

     Neither tutor nor student needs to know this.
     Student receives Firebase password setup/reset email.
    */

    const temporaryPassword =

      "Tmp!" +

      crypto
        .randomUUID()
        .replaceAll("-", "")
        .slice(0, 16) +

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
        getAuth(
          secondaryApp
        );


      const credential =
        await createUserWithEmailAndPassword(

          secondaryAuth,

          email,

          temporaryPassword

        );


      secondaryUser =
        credential.user;


      /* Create approved Firestore profile */

      await setDoc(

        doc(
          db,
          "students",
          secondaryUser.uid
        ),

        {

          studentId: studentId,

          name: name,

          email: email,

          course: course,

          status: "approved",

          registrationMethod:
            "tutor-created",

          createdAt:
            serverTimestamp(),

          approvedAt:
            serverTimestamp()

        }

      );


      /* Send email verification */

      await sendEmailVerification(
        secondaryUser
      );


      /*
       Send Firebase password setup/reset email.
      */

      await sendPasswordResetEmail(
        auth,
        email
      );


      await signOut(
        secondaryAuth
      );


      e.target.reset();


      if (
        $("adminStudentCourse")
      ) {

        $("adminStudentCourse").value =
          "EEE XXXX";

      }


      setMessage(

        $("adminCreateMessage"),

        `Account created for ${email}. Verification and password-setup emails have been sent. Ask the student to check the Spam or Junk folder if the emails are not visible.`,

        true

      );


      await loadAdminStudents();


    }
    catch (err) {

      console.error(
        "Admin student creation error:",
        err
      );


      /*
       Roll back Authentication account if possible
       when profile creation fails.
      */

      if (
        secondaryUser
      ) {

        try {

          await deleteUser(
            secondaryUser
          );

        }
        catch (deleteError) {

          console.warn(
            "Unable to roll back student Authentication account:",
            deleteError
          );

        }

      }


      setMessage(

        $("adminCreateMessage"),

        friendlyAuthError(err)

      );

    }
    finally {

      if (
        secondaryApp
      ) {

        try {

          await deleteApp(
            secondaryApp
          );

        }
        catch (cleanupError) {

          console.warn(
            "Secondary Firebase app cleanup error:",
            cleanupError
          );

        }

      }

    }

  }
);


/* =========================================================
   ADMIN: LOAD ALL STUDENTS
========================================================= */

async function loadAdminStudents() {

  const body =
    $("adminStudentsBody");


  if (!body) {
    return;
  }


  body.innerHTML = "";


  const snap =
    await getDocs(
      collection(
        db,
        "students"
      )
    );


  if (
    snap.empty
  ) {

    body.innerHTML = `

      <tr>

        <td colspan="6">

          No students added yet.

        </td>

      </tr>

    `;


    return;

  }


  snap.forEach(
    (documentSnapshot) => {

      const student =
        documentSnapshot.data();


      const row =
        document.createElement(
          "tr"
        );


      row.innerHTML = `

        <td>
          <code>
            ${escapeHtml(
              documentSnapshot.id
            )}
          </code>
        </td>

        <td>
          ${escapeHtml(
            student.studentId ||
            ""
          )}
        </td>

        <td>
          ${escapeHtml(
            student.name ||
            ""
          )}
        </td>

        <td>
          ${escapeHtml(
            student.email ||
            ""
          )}
        </td>

        <td>
          ${escapeHtml(
            student.course ||
            ""
          )}
        </td>

        <td>
          <span class="status-pill">
            ${escapeHtml(
              student.status ||
              ""
            )}
          </span>
        </td>

      `;


      body.appendChild(
        row
      );

    }
  );

}


/* =========================================================
   ADMIN: CSV MARK IMPORT
========================================================= */

$("importCsvBtn")?.addEventListener(
  "click",
  async () => {

    setMessage(
      $("csvMessage"),
      ""
    );


    const file =
      $("csvInput").files[0];


    if (!file) {

      setMessage(
        $("csvMessage"),
        "Choose a CSV file first."
      );

      return;

    }


    try {

      const text =
        await file.text();


      const rows =
        parseCsv(text);


      if (
        rows.length === 0
      ) {

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


      for (
        const column of requiredColumns
      ) {

        if (
          !(column in rows[0])
        ) {

          throw new Error(
            `Missing CSV column: ${column}`
          );

        }

      }


      let batch =
        writeBatch(db);


      let batchCount = 0;

      let total = 0;


      for (
        const row of rows
      ) {

        const uid =
          row.uid.trim();


        const assessment =
          row.assessment.trim();


        if (
          !uid ||
          !assessment
        ) {

          continue;

        }


        const mark =
          Number(
            row.mark
          );


        const maximum =
          Number(
            row.max
          );


        if (
          !Number.isFinite(mark) ||
          !Number.isFinite(maximum)
        ) {

          throw new Error(

            `Invalid numeric mark for ${uid} / ${assessment}`

          );

        }


        /* Check student exists */

        const studentSnap =
          await getDoc(

            doc(
              db,
              "students",
              uid
            )

          );


        if (
          !studentSnap.exists()
        ) {

          throw new Error(

            `No student profile exists for UID ${uid}.`

          );

        }


        const safeAssessmentId =

          assessment

            .replaceAll(
              "/",
              "-"
            )

            .slice(
              0,
              120
            );


        const markReference =
          doc(

            db,

            "students",

            uid,

            "marks",

            safeAssessmentId

          );


        batch.set(

          markReference,

          {

            assessment:
              assessment,

            mark:
              mark,

            max:
              maximum,

            feedback:
              row.feedback ||
              "",

            updatedAt:
              serverTimestamp()

          },

          {
            merge: true
          }

        );


        batchCount++;

        total++;


        /*
         Keep comfortably below Firestore
         batch operation limit.
        */

        if (
          batchCount >= 400
        ) {

          await batch.commit();


          batch =
            writeBatch(db);


          batchCount = 0;

        }

      }


      if (
        batchCount > 0
      ) {

        await batch.commit();

      }


      setMessage(

        $("csvMessage"),

        `Imported ${total} mark records successfully.`,

        true

      );


    }
    catch (err) {

      console.error(
        "CSV import error:",
        err
      );


      setMessage(

        $("csvMessage"),

        err.message

      );

    }

  }
);


/* =========================================================
   CSV PARSER
========================================================= */

function parseCsv(
  text
) {

  const lines =

    text

      .replace(
        /\r/g,
        ""
      )

      .split(
        "\n"
      )

      .filter(
        (line) =>
          line.trim() !== ""
      );


  if (
    lines.length < 2
  ) {

    return [];

  }


  const headers =

    splitCsvLine(
      lines[0]
    )

      .map(
        (header) =>
          header
            .trim()
            .toLowerCase()
      );


  return lines
    .slice(1)
    .map(
      (line) => {

        const values =
          splitCsvLine(
            line
          );


        return Object.fromEntries(

          headers.map(

            (header, index) => [

              header,

              values[index] ??
              ""

            ]

          )

        );

      }
    );

}


/* =========================================================
   CSV LINE SPLITTER
========================================================= */

function splitCsvLine(
  line
) {

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


    if (
      character === '"'
    ) {

      if (
        quoted &&
        line[i + 1] === '"'
      ) {

        current += '"';

        i++;

      }

      else {

        quoted =
          !quoted;

      }

    }

    else if (
      character === "," &&
      !quoted
    ) {

      output.push(
        current
      );

      current = "";

    }

    else {

      current +=
        character;

    }

  }


  output.push(
    current
  );


  return output;

}
