# actions-abaplint

It's based on https://github.com/abaplint/actions-abaplint.

The purpose is to create annotations only for changed files in a Pull request. This action also overcomes the 50 annotations GitHub limit, it displays around 500 annotation.

### Usage
Example using git diff command to retrieve changed file

:warning: In step Get Changed Files remember to change origin/main to origin/master if that's your case.
```yml
name: Abaplint

on: [push]

jobs:
  workflow:
    runs-on: ubuntu-latest
    outputs:
     all: ${{steps.changes.outputs.all}}
     current: ${{steps.getbranchname.outputs.current}}
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        with:
          ref: ${{ github.event.pull_request.head.sha }}
          fetch-depth: 0
      - name: Get Current Branch name
        id: getbranchname
        run: |
          {
            echo 'current<<EOF'
            echo $(git branch --show-current)
            echo EOF
          } >> "$GITHUB_OUTPUT"
      - name: Get changed files
        id: changes
        run: |
          {
            echo 'all<<EOF'
            echo $(git diff --diff-filter=ACMRTUXB --name-only origin/master..${{steps.getbranchname.outputs.current}} --)
            echo EOF
          } >> "$GITHUB_OUTPUT"
      - name: abaplint
        uses: valeriast/actions-abaplint@main
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CHANGEDFILES: ${{ steps.changes.outputs.all }}
```
The GITHUB_TOKEN is used to push back the results via the [Checks API](https://developer.github.com/v3/checks/)

A specific version can be chosen by setting the `version` attribute, if not set, `@abaplint/cli@latest` will be used
```
      with:
        version: '2.36.5'
```
