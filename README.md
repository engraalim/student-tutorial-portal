# Corrected Student Tutorial Portal

This package fixes the JavaScript startup problem and keeps:

- Sign in
- Register tab
- Self-registration
- `.edu`, `.ac`, `.edu.xx`, `.ac.xx` restriction
- Firebase email verification
- Tutor approval / rejection
- Tutor-created approved accounts
- Password setup/reset email
- Student password change
- Student marks
- Notices
- CSV mark import

## Replace these files in GitHub

Replace the files in your `student-tutorial-portal` repository with:

- `index.html`
- `app.js`
- `firebase-config.js`
- `styles.css`
- `firestore.rules`

## Very important

Updating `firestore.rules` in GitHub does NOT update the live Firebase rules.

After uploading the files:

1. Firebase Console
2. Firestore Database
3. Rules
4. Replace the live rules with `firestore.rules`
5. Publish

## After GitHub deployment

Hard-refresh:

- Windows: Ctrl + F5
- Mac: Cmd + Shift + R

The browser Console should show:

`Student Tutorial Portal app.js loaded successfully.`

If this line appears, `app.js` is running.
