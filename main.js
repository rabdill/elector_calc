var trumpTotal = 0, clintonTotal = 0;

// Add up all the currently decided states
_.forEach(states, function(state) {
  if(!state.winner) return;
  if(state.winner==="clinton") {
    toappend = document.getElementById("clintonStates");
    clintonTotal += state.electors;
  }
  else /*if(state.winner==="Trump")*/ {
    toappend = document.getElementById("trumpStates");
    trumpTotal += state.electors;
  }
  // TODO: Add a CSS class to upsets (and toss-ups?)
  toappend.innerHTML += "<tr><td>" + state.name + "<td>" + state.electors + "</td></tr>"
});


// Print out the elector totals
displayTarget = document.getElementById("clintonTotalDisplay");
displayTarget.innerHTML = clintonTotal;
displayTarget = document.getElementById("trumpTotalDisplay");
displayTarget.innerHTML = trumpTotal;


// Print the undecided states into their columns
_.forEach(states, function(state) {
  if(state.winner) return;

  displayTarget = document.getElementById(state.category);
  displayTarget.innerHTML += "<tr><td><input type='checkbox' id='upset" + state.name + "'>" + state.name + "<td>" + state.electors + "</tr>";
});


// ************ Display if Clinton wins
if(clintonTotal >= 270) {
  document.getElementById("victoryTotal").innerHTML = clintonTotal;
  document.getElementById("victory").style="";
}





// ********************************
function clintonsim() {
  document.getElementById("results").innerHTML = "";

  printResult = function(message) {
    document.getElementById("results").innerHTML += "<li>" + message;
  };

  calculateElectors = function(candidate, corpus) {
    returning = 0;
    _.forEach(corpus, function(state) {
      if(state.winner === candidate) returning += state.electors;
    });
    return returning;
  }

  simStates = JSON.parse(JSON.stringify(states));

  // process any specifically requested upsets
  trumpUpset = "<i>Simulating Trump upset in ";
  clintonUpset = "<i>Simulating Clinton upset in ";
  clintonTossup = "<i>Simulating Clinton winning toss-up in ";
  printTrumpUpset = false;
  printClintonUpset = false;
  printTossup = false;
  _.forEach(simStates, function(state) {
    upsetCheck = document.getElementById("upset" + state.name);
    if(upsetCheck && upsetCheck.checked) {
      switch(state.category) {
        case "strong blue":
        case "probably blue":
          state.winner = "trump"
          trumpUpset += state.name + ", ";
          printTrumpUpset = true;
          break;
        case "strong red":
        case "probably red":
          state.winner = "clinton";
          clintonUpset += state.name + ", ";
          printClintonUpset = true;
          break;
        case "toss-up":
          state.winner = "clinton";
          clintonTossup += state.name + ", ";
          printTossup = true;
          break;
      }
    }
  });
  if(printTrumpUpset) printResult(trumpUpset + "</i>");
  if(printClintonUpset) printResult(clintonUpset + "</i>");
  if(printTossup) printResult(clintonTossup + "</i>");


  clintonSimTotal = calculateElectors("clinton", simStates);
  // if there are any "strong blue" states up in the air, give em to Clinton
  if(_.filter(simStates, {"category": "strong blue"}).length > 0) {
    _.forEach(_.filter(simStates, {"category": "strong blue"}), function(state) {
      if(!state.winner) state.winner = "clinton";
    });

    clintonSimTotal = calculateElectors("clinton", simStates);
    printString = "<span";
    printString = "With all remaining 'strong blue' states: <strong><span";
    if(clintonSimTotal >= 270)  printString += " style=\"color: green;\""
    printString +=  ">" + clintonSimTotal + "</span></strong> electoral votes"
    printResult(printString);
  }

  // if she still needs electors after the strong blues
  if(clintonSimTotal < 270) {
    // if there are any "probably blue" states up in the air, give em to Clinton
    if(_.filter(simStates, {"category": "probably blue"}).length > 0) {
      _.forEach(_.filter(simStates, {"category": "probably blue"}), function(state) {
        if(!state.winner) state.winner = "clinton";
      });

      function calculateElectors(candidate, corpus) {
        returning = 0;
        _.forEach(corpus, function(state) {
          if(state.winner === candidate) returning += state.electors;
        });
        return returning;
      }
      clintonSimTotal = calculateElectors("clinton", simStates);
      printString = "With all remaining 'probably blue' states also: <strong><span";
      if(clintonSimTotal >= 270)  printString += " style=\"color: green;\""
      printString +=  ">" + clintonSimTotal + "</span></strong> electoral votes"
      printResult(printString);
    }
  }

  // if she still needs electors after the probably blues,
  // figure out which toss-ups will do it
  if(clintonSimTotal < 270) {
    needed = 270 - clintonSimTotal;
    // get sorted list of available 'strong blues'
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


  // re-doing calculations with toss-ups AND 'probably reds'
  if(clintonSimTotal < 270) {
    printResult("</li></ul><strong>Winning combos that include 'probably reds':</strong><ul>");
    needed = 270 - clintonSimTotal;
    // get sorted list of available 'strong blues'
    sortedUpForGrabs = _.filter(simStates, {"category": "toss-up"});
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
          hasProbablyRed = false;
          for(var j = 0; j < options[i].length; j++) {
            switch(options[i][j].category) {
              case "toss-up":
                hasTossUp = true;
                break;
              case "probably red":
                hasProbablyRed = true;
                break;
            }
          }
          if(!hasProbablyRed) options[i] = "";
        } else {
          if(options[i].category === "toss-up") options[i] = "";
        }
      }

      // TODO: Filter out combos that incorporate other winning combos.
      // For example, if "NC, OH and FL" will win, it doesn't make sense to
      // also print "NC, OH, FL and ME."

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




} // end of clintonsim()

clintonsim();


document.onclick = function(event) {
   console.log("Re-running simulation.");
   clintonsim();
};
