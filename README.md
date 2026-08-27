# Student Tutorial Portal v2

## New features
- Student self-registration
- Tutor approval required before marks access
- Academic-email restriction: `.edu`, `.ac`, `.edu.xx`, `.ac.xx`
- Email verification
- Tutor-created approved student accounts
- Firebase password-setup/reset email
- Student password change
- Pending / approved / rejected / disabled status
- Existing marks, CSV import and notices

## Accepted examples
- student@mit.edu
- student@college.ac
- student@uow.edu.au
- student@ru.ac.bd
- student@cam.ac.uk

Rejected examples include Gmail, Yahoo, company.com, and fake.edu.com.

## Upgrade
1. Replace `index.html`, `styles.css`, `app.js`, `firebase-config.js`, and `firestore.rules` in the GitHub repo.
2. Firebase Console → Firestore Database → Rules → paste the new `firestore.rules` → Publish.
3. Firebase Authentication → Email/Password must remain enabled.
4. For each EXISTING student Firestore document, add `status = "approved"` before testing.
5. Existing students must verify their email before marks access under the new rules.

## Tutor-created account
Admin enters student ID, name, institutional email, course. The app creates a separate Firebase Auth account without logging the tutor out, saves an approved profile, and asks Firebase to send both an email-verification message and a password-reset/setup email. The student verifies the institutional email and then chooses their own password.

## Self-registration
Student registers with institutional email and password. Firestore profile is created with `status = "pending"`. Firebase sends a verification email. Marks are inaccessible until the tutor approves the profile AND the email is verified.

## Security note
Firestore rules strictly enforce academic email + approval for portal data access. Because Firebase Email/Password sign-up is a public client API when enabled, someone bypassing your frontend could technically create an unused Firebase Auth account with another domain; however, that account cannot create an accepted student profile or read portal data under these rules. Preventing even raw Auth-account creation by nonacademic domains requires server-side / Identity Platform enforcement.
