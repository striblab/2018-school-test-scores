/**
 * Processer for raw test score data analysis.
 *
 * Note that this data is used to make the templates and
 * loaded in the browser, so keep minimal.
 */

// Depedencies
const _ = require('lodash');

// Main processing function
module.exports = function(data) {
  // Group by district
  let districts = _.groupBy(data, d => {
    return `${d.districtnumber}-${d.districttype}`;
  });

  // Go through each district
  districts = _.map(districts, (d, di) => {
    // Make schools list
    let schools = _.groupBy(d, 'schoolnumber');
    schools = _.map(schools, (s, si) => {
      // Make years
      let years = _.groupBy(s, 'datayr');
      years = _.map(years, year => {
        let numberYear =
          year[0].datayr && year[0].datayr.match(/^([0-9]+)\s+/)
            ? parseInt(year[0].datayr.match(/^([0-9]+)\s+/)[1], 10) + 2000
            : undefined;

        if (!numberYear) {
          console.error(year[0]);
          throw new Error('Unable to find year from data.');
        }

        // Make each subject
        let subjects = _.groupBy(year, 'subject');
        subjects = _.map(subjects, subject => {
          return {
            subject: subject[0].subject.toLowerCase(),
            id: `${di}-${si}-${numberYear}-${s[0].subject.toLowerCase()}`,
            tested: parseNumber(subject[0].cntTested),
            // proLev01: parseNumber(subject[0].cntlev1),
            // proLev02: parseNumber(subject[0].cntlev2),
            // proLev03: parseNumber(subject[0].cntlev3),
            // proLev04: parseNumber(subject[0].cntlev4),
            proficient: parseNumber(subject[0].numproficient),
            percentPro: parseNumber(subject[0].PctProf, true, 4),
            predictedPro: parseNumber(subject[0].predicted, true, 4),
            residual: parseNumber(subject[0].residual, true, 4),
            notes: _.kebabCase(subject[0].Notes),
            oddsCategory: subject[0].categorynum
          };
        });

        // New year object
        return {
          id: `${di}-${si}-${numberYear}`,
          year: numberYear,
          enrollment: parseNumber(year[0].k12enrollment),
          pctPoverty: parseNumber(year[0].PctPoverty, true, 4),
          catPoverty: _.kebabCase(year[0].PovertyCategory),
          pctMinority: parseNumber(year[0].pctminority, true, 4),
          subjects: _.sortBy(subjects, 'subject')
        };
      });

      // New school object
      return {
        id: `${di}-${si}`,
        schoolId: si,
        name: s[0].SCHOOLNAME_NEW,
        gradeMin:
          s[0] && s[0].grds.match(/^([0-9a-z]+)\s+to/i)
            ? s[0].grds.match(/^([0-9a-z]+)\s+to/i)[1]
            : undefined,
        gradeMax:
          s[0] && s[0].grds.match(/to\s+([0-9a-z]+)$/i)
            ? s[0].grds.match(/to\s+([0-9a-z]+)$/i)[1]
            : undefined,
        // Classification?
        class: s[0].Classification,
        type: s[0].SchoolType,
        county: s[0].SchoolLocationCountyName,
        years: _.sortBy(years, 'year').reverse()
      };
    });

    // Make new district object
    return {
      id: di,
      name: d[0].districtname_new,
      metro: parseBoolean(d[0].Metro7county),
      location: _.kebabCase(d[0].Location),
      schools: _.sortBy(schools, 'name')
    };
  });

  return _.sortBy(districts, 'name');
};

// Parse boolean
function parseBoolean(input) {
  if (_.isBoolean(input)) {
    return input;
  }

  if (_.isString(input)) {
    return !input
      ? false
      : input.match(/^(yes|true|y|0)$/i)
        ? true
        : input.match(/^(no|false|n|1)$/i)
          ? false
          : undefined;
  }

  return !!input;
}

// Parse number
function parseNumber(input, isFloat = false, round = 2) {
  if (_.isNumber(input)) {
    return input;
  }

  if (_.isString(input)) {
    let p = isFloat ? parseFloat(input) : parseInt(input, 10);
    p =
      isFloat && !_.isNaN(p)
        ? Math.round(p * Math.pow(10, round)) / Math.pow(10, round)
        : p;
    return _.isNaN(p) ? undefined : p;
  }

  return undefined;
}
