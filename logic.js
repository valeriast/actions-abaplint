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
    }
  }
  annotationTotal = annotations.length
  return annotations;
}

function buildSummary() {
  const actual = childProcess.execSync(`abaplint --version`).toString();

  return annotationTotal + " issues found in total (all finding groups)"+ "\n\n" +
    "What are finding groups? Github Actions has a limit of 50 annotations per API call." + "\n\n" +
    "In order to overcome the limitation we create a finding group for each 50 issues found so all annotations will be displayed in files changed tab." + "\n\n" +
    "Installed @abaplint/cli@" + process.env.INPUT_VERSION + "\n\n" +
    "Actual " + actual + "\n\n" +
    "For additional features, faster feedback, and support use [abaplint.app](https://abaplint.app)";
}

async function run() {
  let annotations = buildAnnotations();
  const summary = buildSummary();

  octokit.authenticate({
    type: 'token',
    token: process.env.GITHUB_TOKEN,
  });

  const repo = process.env.GITHUB_REPOSITORY.split("/");
  let arrayannotation = annotations
  let annotationCount = 0
  let annotationlimit = annotations.length
  let group = 1
  annotations = []
  for(let annotation of arrayannotation) {
    annotations.push(annotation)
    annotationCount++
    annotationlimit--
    if (annotationCount === 50 || annotationlimit === 0){
      const create = await octokit.checks.create({
        owner: repo[0],
        repo: repo[1],
        name: 'Finding group: ' + group,
        status: "completed",
        conclusion: annotations.length === 0 ? "success" : "failure",
        output: {title: "Summary" , summary, annotations},
        completed_at: new Date().toISOString(),
        head_sha: process.env.GITHUB_SHA});

        annotations = []
        annotationCount = 0
        group++
    }
    
  }

}
run().then(text => {
  process.exit();
}).catch(err => {
  console.dir(err);
  process.exit(1);
});
