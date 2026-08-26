# Student Tutorial Portal

A starter portal for:

- Firebase Authentication sign-in
- Student-only access to individual tutorial marks
- Tutor/admin dashboard
- Student profile management
- CSV mark import
- Course notices
- Optional notice emails through a Firebase Cloud Function + Resend
- GitHub Pages-compatible frontend

## Important privacy warning

Do **not** upload marks, student lists, passwords, API secrets, or private CSV files to a public GitHub repository.

The browser contains only the frontend. Private marks belong in Firestore and access is enforced by `firestore.rules`.

Before using this with real students, confirm that your university permits assessment data to be stored in Firebase/Google Cloud and that the arrangement meets your institutional privacy, records-management, and assessment policies.

---

## 1. Create a Firebase project

Open Firebase Console and create a project.

Add a **Web App** to the project and copy the Firebase configuration.

Enable:

1. Authentication → Sign-in method → Email/Password
2. Firestore Database

---

## 2. Configure the frontend

Copy:

`firebase-config.example.js`

to:

`firebase-config.js`

Paste your Firebase Web App configuration.

Then create your own tutor/admin Firebase Authentication account.

Find your Firebase Authentication UID and put it in:

- `firebase-config.js`
- `firestore.rules`
- `functions/index.js` if using email

All three must use the same admin UID.

---

## 3. Publish Firestore security rules

In Firebase Console:

Firestore Database → Rules

Paste the contents of `firestore.rules`, after replacing:

`YOUR_ADMIN_FIREBASE_UID`

Publish the rules.

The rules enforce:

- A student can read only `/students/{their-own-auth-uid}`
- A student can read only marks underneath their own document
- Only the admin can write student profiles or marks
- Signed-in students can read notices
- Only the admin can publish/edit notices
- All other access is denied

---

## 4. Create student login accounts

In Firebase Console:

Authentication → Users → Add user

Create an Email/Password login for each student.

Copy each student's **Firebase UID**.

Log in as the admin and use **Add / update student** to create the corresponding Firestore profile.

The Firestore student document ID is the student's Firebase UID.

Example structure:

```text
students
  └── UID_ABC123
       ├── studentId: "1234567"
       ├── name: "Student Name"
       ├── email: "student@example.edu.au"
       ├── course: "EEE XXXX"
       └── marks
            ├── Tutorial 1
            └── Tutorial 2
```

---

## 5. Import tutorial marks

Use a CSV with these columns:

```csv
uid,assessment,mark,max,feedback
UID_ABC123,Tutorial 1,8.5,10,Good work
UID_ABC123,Tutorial 2,9,10,Strong solution
```

A sample file is included as `sample_marks.csv`.

Only use the import page while logged in as the admin.

---

## 6. Deploy the frontend on GitHub Pages

Create a GitHub repository, for example:

`student-tutorial-portal`

Upload these frontend files:

- `index.html`
- `styles.css`
- `app.js`
- `firebase-config.js`

Do **not** upload:

- marks CSV files containing real student data
- private student lists
- Firebase service account files
- email-service API keys

In GitHub:

Settings → Pages → Deploy from a branch → `main` → `/root`

Your URL will look like:

`https://YOUR-GITHUB-USERNAME.github.io/student-tutorial-portal/`

In Firebase Authentication settings, add your GitHub Pages domain to the list of authorized domains if required.

---

## 7. Optional email notices

The frontend can publish notices without the email function.

For email, the included `functions/` directory contains a Firebase Cloud Function template using Resend.

### Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
firebase init functions
```

Use the existing `functions` files from this project.

Set the email API key as a Firebase secret:

```bash
firebase functions:secrets:set RESEND_API_KEY
```

Then deploy:

```bash
firebase deploy --only functions
```

Replace:

- `YOUR_ADMIN_FIREBASE_UID`
- `YOUR_VERIFIED_SENDER@example.com`

in `functions/index.js`.

After deployment, copy the HTTPS function URL and paste it into:

`app.js`

at:

```js
const EMAIL_FUNCTION_URL = "YOUR_DEPLOYED_EMAIL_FUNCTION_URL";
```

Do not put the Resend API key in `app.js`, HTML, GitHub Pages, or Firestore.

---

## Recommended production improvements

Before using this for a real course, consider:

- University-approved authentication or SSO
- Restricting accounts to your institution's email domain
- Email verification
- Audit logs for mark changes
- Separate admin roles using Firebase custom claims
- Course/semester separation
- Individual assessment-release controls
- Export/backups
- Stronger CSV validation
- Accessibility testing
- Institutional approval for storage of student assessment data

## Local testing

Because the project uses ES modules, do not open `index.html` directly using `file://`.

Run a local HTTP server, for example:

```bash
python -m http.server 8000
```

Then visit:

`http://localhost:8000`

