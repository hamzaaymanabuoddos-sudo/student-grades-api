# Git & GitHub workflow

```bash
git init                                   # start tracking (inside student-grades-api/)
git status                                 # what changed? .env and node_modules must NOT appear
git add .gitignore package.json schema.sql # stage files (or: git add .)
git commit -m "chore: project setup and database schema"
git log --oneline                          # history

git branch                                 # list branches
git switch -c feature/grades               # create + switch to a branch
# ...work, then:
git add src/ && git commit -m "feat: grade endpoints with course ownership check"
git switch main
git merge feature/grades                   # bring the feature into main
git branch -d feature/grades

# GitHub: create an EMPTY repo on github.com, then:
git branch -M main
git remote add origin https://github.com/<you>/student-grades-api.git
git push -u origin main
git fetch                                  # download remote changes without merging
git pull                                   # fetch + merge
```

Suggested commit sequence (one per phase): schema -> express setup -> db connection -> CRUD -> relationships -> auth -> authorization -> grades -> middleware/errors -> security -> transactions/stats -> docs.

Check before every commit: `git status` must not list `.env`. If you ever committed a secret, rotate it (change the secret); deleting the file later does not remove it from history.
