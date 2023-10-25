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
      annotations.push({
        path: issue.file.substring(2),
        start_line: issue.start.row,
        end_line: issue.end.row,
        title: issue.description,
        annotation_level: "failure",
        message: `https://rules.abaplint.org/${issue.key}`
      });

    if (annotations.length === 500) {
      break; // only 1000 errors appear, but im limiting to 500 to not make many api calls.
    }
  }

  annotationTotal = annotations.length
  return annotations;
}

function buildSummary() {
  const actual = childProcess.execSync(`abaplint --version`).toString();

  return "Max issues displayed are 500 (To increase this limit please open an issue at https://github.com/valeriast/actions-abaplint)." + "\n\n" +
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

  let checkrunid = 0
  const batchSize = 50;
  if ( annotations.length > 0){
    await octokit.checks.create({
      owner: repo[0],
      repo: repo[1],
      name: 'results',
      status: "in_progress",
      conclusion: "failure",
      output: {
        title: annotationTotal + " issues found.",
        summary: summary,
        annotations: annotations.length >= 50 ? annotations.splice(0, batchSize) : annotations.splice(0, annotations.length),
      },
      completed_at: new Date().toISOString(),
      head_sha: process.env.GITHUB_SHA,
    }).then((create) => {
      checkrunid = create.data.id;
    }).catch((error) => {
      console.log('API create call error: ', error)
    })

    while (annotations.length > 0) {
      try {
        const update = await octokit.checks.update({
          owner: repo[0],
          repo: repo[1],
          check_run_id: checkrunid,
          status: "in_progress",
          conclusion: "failure",
          output: {
            title: annotationTotal + " issues found.",
            summary: summary,
            annotations: annotations.length >= 50 ? annotations.splice(0, batchSize) : annotations.splice(0, annotations.length),
          },
        });
      }catch (error){
        console.log('API update request error', error);
        process.exit(1);
      }
    }
  }

}
run().then(text => {
  process.exit();
}).catch(err => {
  console.dir(err);
  process.exit(1);
});