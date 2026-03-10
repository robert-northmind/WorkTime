# Firebase — Cost Management

## Budget alert

Set up a budget alert in Google Cloud Console under **Billing → Budgets & alerts**. Note that budget alerts are notifications only — they do not stop usage automatically.

## How to shut off Firebase Storage if costs spike

### Option 1: Disable Storage via security rules (quick)

Deploy restrictive rules that block all reads and writes:

```bash
# Back up current rules
cp storage.rules storage.rules.bak

# Write deny-all rules
cat > storage.rules << 'EOF'
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
EOF

# Deploy
firebase deploy --only storage
```

To restore access later:

```bash
cp storage.rules.bak storage.rules
firebase deploy --only storage
```

### Option 2: Disable the Storage API entirely (nuclear)

Direct link (replace `YOUR_PROJECT_ID` with your Firebase project ID — found in `.firebaserc` or your hosting URL e.g. `YOUR_PROJECT_ID.web.app`):

```
https://console.cloud.google.com/apis/api/firebasestorage.googleapis.com/overview?project=YOUR_PROJECT_ID
```

Click **Disable API** on that page. Re-enable from the same page when ready.

### Option 3: Delete all stored files

1. Go to Firebase Console → **Storage**
2. Select all files in `profilePhotos/` and delete them

This stops ongoing download costs but doesn't prevent new uploads (combine with Option 1 for that).

## Free tier reference

Even on the Blaze (pay-as-you-go) plan, Firebase Storage includes a free tier:

- **5 GB** stored
- **1 GB/day** downloads
- **20K/day** upload operations
- **50K/day** download operations

For a personal project with profile photos, these limits are very unlikely to be exceeded under normal usage.
