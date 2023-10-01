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
      break; // only 1000 checks run allowed, but im limiting to 500 to not exceed api calls see https://docs.github.com/en/rest/checks/runs?apiVersion=2022-11-28
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
  let needsUpdate = 0
  let statusCheck = "in_progress"
  let checkrunid = 0
  annotations = []
  for(let annotation of arrayannotation) {
    annotations.push(annotation)
    annotationCount++
    annotationlimit--
    if (annotationlimit === 0 ){
      statusCheck = "completed"
    }
    if ((annotationCount === 50 && needsUpdate === 0 )){
      const create = await octokit.checks.create({
        owner: repo[0],
        repo: repo[1],
        name: 'results',
        status: statusCheck,
        conclusion: annotations.length === 0 ? "success" : "failure",
        output: {title: "Summary" , summary, annotations},
        completed_at: new Date().toISOString(),
        head_sha: process.env.GITHUB_SHA});

        needsUpdate = 1
        annotations = []
        checkrunid = create.data.id
    }else if (annotationCount > 50 && needsUpdate === 1){
      const update = await octokit.checks.update({
        owner: repo[0],
        repo: repo[1],
        check_run_id: checkrunid, 
        status: statusCheck, 
        conclusion: annotations.length === 0 ? "success" : "failure",
        output: {
          title: "Updated Summary",
          summary: summary,
          annotations: annotations,
        }});
        annotations = []
    }
  }
}
  
run().then(text => {
  process.exit();
}).catch(err => {
  console.dir(err);
  process.exit(1);
});
