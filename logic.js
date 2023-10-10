const childProcess = require("child_process");
const fs = require('fs');
const octokit = require('@octokit/rest')({
    baseUrl: process.env.GITHUB_API_URL,
});
let annotationTotal = 0;

function buildAnnotations() {
  const val = fs.readFileSync("/result.json", "utf-8");
  console.dir(val);
  const issues = JSON.parse(val);
  const annotations = []

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

    if (annotations.length === 500) {
      break; // only 1000 errors appear, but im limiting to 500 to not exceed api calls see https://docs.github.com/en/rest/checks/runs?apiVersion=2022-11-28
    }
  }

  annotationTotal = annotations.length
  return annotations;
}

function buildSummary() {
  const actual = childProcess.execSync(`abaplint --version`).toString();

  return "Max issues displayed are 500 (To increase this limit please open an issue in https://github.com/valeriast/actions-abaplint)." + "\n\n" +
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
  let annotationCount = 0
  let annotationlimit = annotations.length
  let statusCheck = "in_progress"
  let checkrunid = 0

  for(let i = 0 ; i < annotationTotal; i++) {
    annotationCount++
    annotationlimit--
    if (annotationlimit === 0 ){
      statusCheck = "completed"
    }
    if ((annotationCount === 50 && checkrunid === 0 ) || annotationlimit === 0  && checkrunid === 0){
      const create = await octokit.checks.create({
        owner: repo[0],
        repo: repo[1],
        name: 'results',
        status: statusCheck,
        conclusion: annotationTotal === 0 ? "success" : "failure",
        output: {
          title: annotationTotal === 0 ? "No issues found." : annotationTotal + " issues found.", 
          summary: summary, 
          annotations: annotations.splice(0,annotationCount)},
        completed_at: new Date().toISOString(),
        head_sha: process.env.GITHUB_SHA});
  
        annotationCount = 0
        checkrunid = create.data.id
    }else if ((annotationCount === 50 && checkrunid !== 1) || ( annotationlimit === 0  && checkrunid !== 0 )){
      const update = await octokit.checks.update({
        owner: repo[0],
        repo: repo[1],
        check_run_id: checkrunid, 
        status: statusCheck, 
        conclusion: annotationTotal === 0 ? "success" : "failure",
        output: {
          title: annotationTotal === 0 ? "No issues found." : annotationTotal + " issues found.",
          summary: summary,
          annotations: annotations.splice(0, annotationCount),
        }});
        annotationCount = 0
    }
  }
}
  
run().then(text => {
  process.exit();
}).catch(err => {
  console.dir(err);
  process.exit(1);
});