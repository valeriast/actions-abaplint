const fs = require('fs');

const files = process.env.CHANGEDFILES;

// Changed files format is something like this "test test1 test2" In order to get each one of them I split using space between
const filesArray = files.split(' ');

// Filtering to get only files that abaplint is able to lint
// TODO: Change it to not get specific files that crashes abaplint !unaccpetedextensions
acceptedfileextensions = /((clas.abap)|(ddls.asddls)|(clas.testclasses.abap)|(intf.abap))/;
const filteredfilesbyextension = filesArray.filter( item => acceptedfileextensions.test(item) );
// Changed files format is something like this src/filename, I need to fix the path to be able to find the file /src/filename
const fileswithfixedpath = filteredfilesbyextension.map( item => '/' + item )
// I then format it to pass to the json props separating each file with a comma
const transformedFiles = `{${fileswithfixedpath.join(',')}}` ;

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
      console.log('abaplint.json has been updated with only changed files.');
    });
  } catch (parseError) {
    console.error('Error parsing abaplint.json:', parseError);
  }
});