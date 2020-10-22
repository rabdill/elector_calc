var redTotal = 0, blueTotal = 0;

// Add up all the currently decided states
_.forEach(states, function(state) {
  if(!state.winner) return;
  if(state.winner==="blue") {
    toappend = document.getElementById("blueStates");
    blueTotal += state.electors;
  }
  else {
    toappend = document.getElementById("redStates");
    redTotal += state.electors;
  }
  toappend.innerHTML += "<tr><td>" + state.name + "<td>" + state.electors + "</td></tr>"
});


// Print out the elector totals
displayTarget = document.getElementById("blueTotalDisplay");
displayTarget.innerHTML = blueTotal;
displayTarget = document.getElementById("redTotalDisplay");
displayTarget.innerHTML = redTotal;


// Print the undecided states into their columns
_.forEach(states, function(state) {
  if(state.winner) return;

  displayTarget = document.getElementById(state.category);
  displayTarget.innerHTML += "<tr><td><input type='checkbox' id='upset" + state.name + "'>" + state.name + "<td>" + state.electors + "</tr>";
});

if(blueTotal >= 270) setWinner("Joe Biden", blueTotal);
if(redTotal >= 270) setWinner("Donald Trump", redTotal);

function setWinner(winner, totalElectors) {
  document.getElementById("winner").innerHTML = winner.toUpperCase();
  switch(winner) {
    case "Donald Trump":
      loser = "Biden";
      break;
    case "Joe Biden":
      loser = "Trump";
      break;
  };
  document.getElementById("loser").innerHTML = loser;
  document.getElementById("victoryTotal").innerHTML = totalElectors;
  document.getElementById("victory").style = "";
}

// findElectors - figure out how many electors that state has
findElectors = function(candidate, corpus) {
  returning = 0;
  _.forEach(corpus, function(state) {
    if(state.winner === candidate) returning += state.electors;
  });
  return returning;
}

printResult = function(message) {
  document.getElementById("results").innerHTML += "<li>" + message;
};

// ********************************
function blueSim() {
  // blank out the unordered list of determinations
  document.getElementById("results").innerHTML = "";

  simStates = JSON.parse(JSON.stringify(states)); // deep copy

  // process any specifically requested upsets
  redUpset = "<i>Simulating Trump upset in ";
  blueUpset = "<i>Simulating Biden upset in ";
  blueTossup = "<i>Simulating Biden winning toss-up in ";

  // flags for tracking who wins the upset:
  printRedUpset = false;
  printBlueUpset = false;
  printTossup = false;

  _.forEach(simStates, function(state) {
    // find out if the user checked the box
    upsetCheck = document.getElementById("upset" + state.name);
    if(upsetCheck && upsetCheck.checked) {
      // if so, figure out whom "upset" benefits in that context
      switch(state.category) {
        case "strong blue":
        case "probably blue":
        case "lean blue":
          state.winner = "red"
          redUpset += state.name + ", ";
          printRedUpset = true;
          break;
        case "strong red":
        case "probably red":
        case "lean red":
          state.winner = "blue";
          blueUpset += state.name + ", ";
          printBlueUpset = true;
          break;
        case "toss-up":
          state.winner = "blue";
          blueTossup += state.name + ", ";
          printTossup = true;
          break;
      }
    }
  });
  if(printRedUpset) printResult(redUpset + "</i>");
  if(printBlueUpset) printResult(blueUpset + "</i>");
  if(printTossup) printResult(blueTossup + "</i>");

  // after known results and requested upsets, check how we're doing:
  blueSimTotal = findElectors("blue", simStates);

  // if there are any "strong blue" states up in the air, give em to Clinton
  strongBlues = _.filter(simStates, {"category": "strong blue"});
  if(strongBlues.length > 0) {
    _.forEach(strongBlues, function(state) {
      if(!state.winner) state.winner = "blue";
    });

    blueSimTotal = findElectors("blue", simStates);
    printString = "With all remaining 'strong blue' states: <strong><span";
    if(blueSimTotal >= 270)  printString += " style=\"color: green;\""
    printString +=  ">" + blueSimTotal + "</span></strong> electoral votes"
    printResult(printString);
  }

  // if she still needs electors after the strong blues
  if(blueSimTotal < 270) {
    // if there are any "probably blue" states up in the air, give em to blue
    if(_.filter(simStates, {"category": "probably blue"}).length > 0) {
      _.forEach(_.filter(simStates, {"category": "probably blue"}), function(state) {
        if(!state.winner) state.winner = "blue";
      });

      blueSimTotal = findElectors("blue", simStates);
      printString = "With all remaining 'probably blue' states also: <strong><span";
      if(blueSimTotal >= 270)  printString += " style=\"color: green;\""
      printString +=  ">" + blueSimTotal + "</span></strong> electoral votes"
      printResult(printString);
    }
  }

  // if blue still needs electors after the strong and probably blues
  if(blueSimTotal < 270) {
    // if there are any "probably blue" states up in the air, give em to blue
    if(_.filter(simStates, {"category": "lean blue"}).length > 0) {
      _.forEach(_.filter(simStates, {"category": "lean blue"}), function(state) {
        if(!state.winner) state.winner = "blue";
      });

      blueSimTotal = findElectors("blue", simStates);
      printString = "With all remaining 'lean blue' states also: <strong><span";
      if(blueSimTotal >= 270)  printString += " style=\"color: green;\""
      printString +=  ">" + blueSimTotal + "</span></strong> electoral votes"
      printResult(printString);
    }
  }

  // if blue still needs electors after all the possible blues
  // figure out which toss-ups will do it
  if(blueSimTotal < 270) {
    needed = 270 - blueSimTotal;
    // get sorted list of available toss-ups
    sortedUpForGrabs = _.sortBy(_.filter(simStates, {"category": "toss-up"}), 'electors');
    sortedUpForGrabs = _.filter(sortedUpForGrabs, function(state) {return (state.winner===undefined || state.winner==="");});
    descendingForGrabs = _.reverse(sortedUpForGrabs);
    options = []
    _.forEach(descendingForGrabs, function(state) {
      total = state.electors;
      if(total >= needed) options.push(state);
      else {  // if one won't do it, keep grabbin' em
        combo = [state];
        total = state.electors;
        for(var i = 0; i < descendingForGrabs.length; i++) {
          if(descendingForGrabs[i] === state) continue;
          total += descendingForGrabs[i].electors;
          combo.push(descendingForGrabs[i]);
          if(total >= needed) {
            options.push(combo);
            combo = [state];  // try it again with the next one
            total = state.electors;
          }
        }
      }
    });
    if(options.length > 0) {
      // order all the combos by state size
      singleStateOptions = []
      for(var i=0; i < options.length; i++) {
        if(Array.isArray(options[i])) {
          options[i] = _.sortBy(options[i], ["electors", "name"]);
        } else {
          singleStateOptions.push(options[i]);
        }
      }

      // filter out any combos that require a state that's already
      // on the list by itself
      // for example: if "nevada" is on the list, "maine and nevada"
      //    doesn't need to be. we'd need nevada either way.
      for(var i=0; i < options.length; i++) {
        if(Array.isArray(options[i])) {
          for(var j = 0; j < options[i].length; j++) {
            if(_.includes(singleStateOptions, options[i][j])) {
              options[i] = "";
              break;
            }
          }
        }
      }

      alreadySaid = [];

      for(var i = 0; i < options.length; i++) {
        if(Array.isArray(options[i])) {
          statestring = ""
          for(var j = 0; j < options[i].length; j++) {
            statestring += options[i][j].name;
            if(j !== options[i].length - 1) statestring += " and "
          }
        } else {
          statestring = options[i].name;
        }
        // only print the combo if it's not a duplicate
        // and if it wasn't blanked out by checks above
        if(!_.includes(alreadySaid, statestring) && statestring !== undefined) {
          alreadySaid.push(statestring);
          printResult("Can pass 270 winning " + statestring);
        }
      }
    }
  }

  // also calculate combos using toss-ups AND 'lean reds'
  if(blueSimTotal < 270) {
    printResult("</li></ul><strong>Winning combos that include 'lean reds' and 'probably reds':</strong><ul>");
    needed = 270 - blueSimTotal;
    // get sorted list of available toss-ups or 'lean reds'
    sortedUpForGrabs = _.filter(simStates, {"category": "toss-up"});
    sortedUpForGrabs = _.concat(sortedUpForGrabs, _.filter(simStates, {"category": "lean red"}));
    sortedUpForGrabs = _.concat(sortedUpForGrabs, _.filter(simStates, {"category": "probably red"}));
    sortedUpForGrabs = _.sortBy(sortedUpForGrabs, 'electors');
    sortedUpForGrabs = _.filter(sortedUpForGrabs, function(state) {return (state.winner===undefined || state.winner==="");});
    descendingForGrabs = _.reverse(sortedUpForGrabs);
    options = []
    _.forEach(descendingForGrabs, function(state) {
      total = state.electors;
      if(total >= needed) options.push(state);
      else {  // if one won't do it, keep grabbin' em
        combo = [state];
        total = state.electors;
        for(var i = 0; i < descendingForGrabs.length; i++) {
          if(descendingForGrabs[i] === state) continue;
          total += descendingForGrabs[i].electors;
          combo.push(descendingForGrabs[i]);
          if(total >= needed) {
            options.push(combo);
            combo = [state];  // try it again with the next one
            total = state.electors;
          }
        }
      }
    });
    if(options.length > 0) {
      // order all the combos by state size
      singleStateOptions = []
      for(var i=0; i < options.length; i++) {
        if(Array.isArray(options[i])) {
          options[i] = _.sortBy(options[i], ["electors", "name"]);
        } else {
          singleStateOptions.push(options[i]);
        }
      }

      // filter out any combos that require a state that's already
      // on the list by itself
      // for example: if "nevada" is on the list, "maine and nevada"
      //    doesn't need to be. we'd need nevada either way.
      for(var i=0; i < options.length; i++) {
        if(Array.isArray(options[i])) {
          for(var j = 0; j < options[i].length; j++) {
            if(_.includes(singleStateOptions, options[i][j])) {
              options[i] = "";
              break;
            }
          }
        }
      }

      // filter out combos that use only toss-ups; they've been printed already
      for(var i=0; i < options.length; i++) {
        if(Array.isArray(options[i])) {
          hasTossUp = false;
          hasLeanRed = false;
          for(var j = 0; j < options[i].length; j++) {
            switch(options[i][j].category) {
              case "toss-up":
                hasTossUp = true;
                break;
              case "lean red":
                hasLeanRed = true;
                break;
            }
          }
          if(!hasLeanRed) options[i] = "";
        } else {
          if(options[i].category === "toss-up") options[i] = "";
        }
      }

      // print everything out:
      alreadySaid = [];
      // build the string listing the states for each combo
      for(var i = 0; i < options.length; i++) {
        if(Array.isArray(options[i])) {
          statestring = ""
          for(var j = 0; j < options[i].length; j++) {
            statestring += options[i][j].name;
            if(j !== options[i].length - 1) statestring += " and "
          }
        } else {
          statestring = options[i].name;
        }
        // only print the combo if it's not a duplicate
        // and if it wasn't blanked out by checks above
        if(!_.includes(alreadySaid, statestring) && statestring !== undefined) {
          alreadySaid.push(statestring);
          printResult(statestring);
        }
      }
    }
  }
} // end of blueSim()

blueSim();

// If the user changes a checkbox, run it again.
document.onclick = function(event) {
   console.log("Re-running simulation.");
   blueSim();
};
