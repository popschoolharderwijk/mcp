# Git Branching Strategy

## Branch Structuur

```
main (protected)
  ↑
  └── lovable (development branch)
        ↑
        └── feature branches
```

## Branch Regels

- **`main`**: Protected, alleen via PRs, geen directe pushes
- **`lovable`**: Lovable AI werkt hier, syncs met main via PRs
- Branch protection rules actief op `main`
