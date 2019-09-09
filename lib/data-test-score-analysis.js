/**
 * Processer for raw test score data analysis.
 *
 * Note that this data is used to make the templates and
 * loaded in the browser, so keep minimal.
 */

// Depedencies
const _ = require('lodash');

// Top level vars
const TEST_CHANGE_YEAR = 2012;
const TEST_RECENT_YEAR = 2017;

// Main processing function
function parseData(data, set = 'schools') {
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
            //tested: parseNumber(subject[0].cntTested),
            // proLev01: parseNumber(subject[0].cntlev1),
            // proLev02: parseNumber(subject[0].cntlev2),
            // proLev03: parseNumber(subject[0].cntlev3),
            // proLev04: parseNumber(subject[0].cntlev4),
            //proficient: parseNumber(subject[0].numproficient),
            percentPro: parseNumber(subject[0].PctProf, true, 4),
            predictedPro: parseNumber(subject[0].predicted, true, 4),
            //residual: parseNumber(subject[0].residual, true, 4),
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
          //catPoverty: _.kebabCase(year[0].PovertyCategory),
          pctMinority: parseNumber(year[0].pctminority, true, 4),
          subjects: _.sortBy(subjects, 'subject')
        };
      });

      // New school object
      return {
        id: `${di}-${si}`,
        schoolId: si,
        name: s[0].SCHOOLNAME_NEW,
        pct_poverty_public: s[0].pct_poverty_public,
        // gradeMin:
        //   s[0] && s[0].grds.match(/^([0-9a-z]+)\s+to/i)
        //     ? s[0].grds.match(/^([0-9a-z]+)\s+to/i)[1]
        //     : undefined,
        // gradeMax:
        //   s[0] && s[0].grds.match(/to\s+([0-9a-z]+)$/i)
        //     ? s[0].grds.match(/to\s+([0-9a-z]+)$/i)[1]
        //     : undefined,
        // Classification?
        //class: s[0].Classification,
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

  // Sort
  districts = _.sortBy(districts, 'name');

  // Break apart into schools and districts
  let allSchools = [];
  let simpleDistricts = [];
  _.each(districts, d => {
    // Update schools
    let schools = d.schools.map(s => {
      s.district = d.id;
      // s.years = _.filter(s.years, y => y.year >= TEST_CHANGE_YEAR);
      s.years = s.years;
      return s;
    });
    schools = _.filter(schools, s => s.years && s.years.length);
    allSchools = allSchools.concat(schools);

    // Create totals for districts
    let aggregateDistrict = _.omit(d, ['schools']);
    aggregateDistrict.schools = schools.length;
    aggregateDistrict.recentY = TEST_RECENT_YEAR;
    aggregateDistrict.enrollment = _.sumBy(schools, s => {
      let f = _.find(s.years, { year: TEST_RECENT_YEAR });
      return f ? f.enrollment : 0;
    });

    aggregateDistrict.modeled = {};
    ['1', '2', '3'].forEach(cat => {
      aggregateDistrict.modeled[cat] = {};
      aggregateDistrict.modeled[cat].m = _.filter(schools, s => {
        let fy = _.find(s.years, { year: TEST_RECENT_YEAR });
        let fs = fy ? _.find(fy.subjects, { subject: 'm' }) : null;
        return fy && fs ? fs.oddsCategory === cat : false;
      }).length;
      aggregateDistrict.modeled[cat].r = _.filter(schools, s => {
        let fy = _.find(s.years, { year: TEST_RECENT_YEAR });
        let fs = fy ? _.find(fy.subjects, { subject: 'r' }) : null;
        return fy && fs ? fs.oddsCategory === cat : false;
      }).length;
    });
    simpleDistricts.push(aggregateDistrict);
  });

  return {
    schools: _.sortBy(allSchools, 'name'),
    districts: simpleDistricts
  }[set];
}

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

// Export a generator function
module.exports = set => {
  return data => {
    return parseData(data, set);
  };
};
