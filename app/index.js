/**
 * Main JS file for project.
 */

// Define globals that are added through the js.globals in
// the config.json file, here like this:
/* global $ */

// Utility functions, such as Pym integration, number formatting,
// and device checking

//import utilsFn from './utils.js';
//utilsFn({ });

// Utilize templates on the client.  Get the main content template.
import Content from '../templates/_index-content.svelte.html';

// Location of assets

const assets =
  '//static.startribune.com/news/projects/all/2018-school-test-scores/assets';

$(document).ready(() => {
  // Hack to get share back
  let $share = $('.share-placeholder').size()
    ? $('.share-placeholder')
      .children()
      .detach()
    : undefined;
  let attachShare = !$share
    ? undefined
    : () => {
      $('.share-placeholder').append($share);
    };

  // Get data for client
  window
    .fetch(`${assets}/data/scores-by-schools.json`)
    .then(response => {
      return response.json();
    })
    .then(scores => {
      window
        .fetch(`${assets}/data/districts.json`)
        .then(response => {
          return response.json();
        })
        .then(districts => {
          // console.log(scores);
          // console.log(districts);
          const app = new Content({
            hydrate: true,
            target: document.querySelector('.article-lcd-body-content'),
            data: {
              scoresBySchools: scores,
              districts,
              attachShare
            }
          });

          window.__app = app;
        })
        .catch(console.error);
    })
    .catch(console.error);
});
