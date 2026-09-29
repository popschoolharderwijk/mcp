# Git Branching Strategy

## Branch Structure

```
main (protected)
  ↑
  └── lovable (development branch)
        ↑
        └── feature branches
```

## Branch Rules

- **`main`**: Protected, PRs only, no direct pushes
- **`lovable`**: Lovable AI works here; syncs with main via PRs
- Branch protection rules are active on `main`
