# actions-abaplint

It's based on https://github.com/abaplint/actions-abaplint.

The purpose is to create annotation only for changed files.

### Usage

```yml
name: lint

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    name: Abaplint
    steps:
      - uses: actions/checkout@v2
        with:
          fetch-depth: 0

      - name: Get changed files
        id: changed-files
        uses: tj-actions/changed-files@v14.6

      - name: abaplint
        uses: valeriast/actions-abaplint@main
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CHANGEDFILES: ${{ steps.changed-files.outputs.all_changed_files }}
```

The GITHUB_TOKEN is used to push back the results via the [Checks API](https://developer.github.com/v3/checks/)

A specific version can be chosen by setting the `version` attribute, if not set, `@abaplint/cli@latest` will be used
```
      with:
        version: '2.36.5'
```
