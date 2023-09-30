const childProcess = require("child_process");
const fs = require('fs');
const octokit = require('@octokit/rest')({
    baseUrl: process.env.GITHUB_API_URL,
});
let annotationTotal = 0;
// const annotationGroup = 0

function buildAnnotations() {
  const val = fs.readFileSync("/result.json", "utf-8");
  console.dir(val);
  const issues = JSON.parse(val);
  const annotations = []
  // const annotations = [[]];
  // const issueCount = 0
  for(let issue of issues) {
     if (process.env.CHANGEDFILES.includes(issue.file.substring(2))) {
      annotations.push({
        path: issue.file.substring(2),
        start_line: issue.start.row,
        end_line: issue.end.row,
        title: issue.description,
        annotation_level: "failure",
        message: issue.key});
      if (annotations.length === 50) {
        break; // only 50 annotations allowed, see https://developer.github.com/v3/checks/runs/
      }
      // issueCount ++
    }

    // if ( issueCount === 50 ){
    //   issueCount = 0
    //   annotationGroup ++
    // }
  }
  annotationTotal = annotations.length
  return annotations;
}

function buildSummary() {
  // const issues = JSON.parse(fs.readFileSync("/result.json", "utf-8"));

  const actual = childProcess.execSync(`abaplint --version`).toString();

  const first = annotationTotal > 50 ? "(first 50 shown)" : "";
  return annotationTotal + " issues found"+ first + "\n\n" +
    "Installed @abaplint/cli@" + process.env.INPUT_VERSION + "\n\n" +
    "Actual " + actual + "\n\n" +
    "For additional features, faster feedback, and support use [abaplint.app](https://abaplint.app)";
}

async function run() {
  const annotations = buildAnnotations();
  const summary = buildSummary();

  octokit.authenticate({
    type: 'token',
    token: process.env.GITHUB_TOKEN,
  });

  const repo = process.env.GITHUB_REPOSITORY.split("/");
   for (var i = 0; i < 1; i++) {
    const create = await octokit.checks.create({
      owner: repo[0],
      repo: repo[1],
      name: "results",
      status: "completed",
      conclusion: annotations.length === 0 ? "success" : "failure",
      output: {title: "Summary", summary, annotations},
      completed_at: new Date().toISOString(),
      head_sha: process.env.GITHUB_SHA});
   }
}
run().then(text => {
  process.exit();
}).catch(err => {
  console.dir(err);
  process.exit(1);
});
