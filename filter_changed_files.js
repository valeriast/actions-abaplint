const fs = require('fs');

const files = process.env.CHANGEDFILES;

// Changed files format is something like this "test test1 test2" In order to get each one of them I split using space between
const filesArray = files.split(' ');

// Filtering to get only files that abaplint supports
blockedextensions = /((ddls.baseinfo))/;
const filteredfilesbyextension = filesArray.filter( item => !blockedextensions.test(item) );
// Changed files format is something like this src/filename, it fixes the path to be able to find the file /src/filename
const fileswithfixedpath = filteredfilesbyextension.map( item => '/' + item )
// I then format it to pass to the json props separating each file with a comma
let transformedFiles = ''
if (fileswithfixedpath.length > 1){
  transformedFiles = `{${fileswithfixedpath.join(',')}}` ;
}else{
  transformedFiles = fileswithfixedpath;
}


fs.readFile(`abaplint.json`, 'utf8', (err, data) => {
  if (err) {
    console.error(err);
    return;
  }

  try {  
    const config = JSON.parse(data);
    config.global.files = transformedFiles; 
    const modifiedConfig = JSON.stringify(config, null, 2);
    fs.writeFile('abaplint.json', modifiedConfig, 'utf8', (err) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log('abaplint.json has been updated with only changed files.' + transformedFiles);
    });
  } catch (parseError) {
    console.error('Error parsing abaplint.json:', parseError);
  }
});
