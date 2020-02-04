/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk');
const Request = require('sync-request');
const stringSimilarity = require('string-similarity');
const fs = require('fs');
const BeaconMap = require('./BeaconMap');

// const today = new Date().toLocaleDateString();
// const myUrl = "https://www.unibo.it/UniboWeb/Utils/OrarioLezioni/RestService.aspx?SearchType=OccupazioneAule&Data="+today+"&Edificio=EST_EXZUCC1";
const myUrl = "https://www.unibo.it/UniboWeb/Utils/OrarioLezioni/RestService.aspx?SearchType=OccupazioneAule&Data=29/11/2019&Edificio=EST_EXZUCC1";

// startBeaconID è sempre quello della torretta di Alexa
var startBeaconID;
const mapJson = JSON.parse(fs.readFileSync('./jsonOfTheMap.json').toString());
mapJson.buildings[0].nodes.forEach(node => {
  if (node.name[0] === "ingresso principale") {
    startBeaconID = node.beacon; 
  }
});

const right = "gira a destra, poi";
const left = "gira a sinistra, poi";
const straight = "vai dritto, poi";
const back = "torna indietro, poi";
const stairs = "prendi le scale";
const elevator = "prendi l'ascensore";

// =======================================================================================================================================================================

// tempor("laboratorio 2.2", "no");
// tempor("stanza 2003", "visiva");
// tempor("stanza 2003", "no");
// tempor("stanza 2003", "motoria");
// tempor("viroli", "motoria");
// tempor("aula 2.11", "no");
// tempor("aula 2.1", "no");
// tempor("aula 2.13", "no");

const GetNewFactHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speechOutput = 'Benvenuto nel Campus di Cesena! Cosa posso fare per te?';
    console.log(speechOutput);    
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .getResponse();
  },
};

const StartedPathFinderHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === "IntentRequest"
      && request.intent.name === "PathFinderIntent"
      && request.dialogState !== 'COMPLETED';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .addDelegateDirective()
      .getResponse();
  }
}

const CompletedPathFinderHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === "IntentRequest"
      && request.intent.name === "PathFinderIntent"
      && request.dialogState === 'COMPLETED';
  },
  handle(handlerInput) {
    const destination = handlerInput.requestEnvelope.request.intent.slots.destination.value;
    const disability = handlerInput.requestEnvelope.request.intent.slots.disability.value;
    var speechOutput = `Mi dispiace, ma non capisco`;

    const beaconsList = mapJson.buildings[0].beacons;
    const edges = mapJson.buildings[0].arcs;
    const nodes = mapJson.buildings[0].nodes;
    
    var finishBeacon;
    nodes.forEach(node => {
      if ((destination.includes("laboratorio")) && (destination.includes("."))) {
        const labNumber = destination.split(" ")[1];
        if ((node.name[0].includes("laboratorio")) && (node.name[0].includes(labNumber))) {
          finishBeacon = node.beacon;
        }
      } else if ((node.name[0] === destination) || (node.name[2] === destination)) {
        finishBeacon = node.beacon;
      }
    });

    // se finishBeacon è undefined, vuol dire che non l'ho trovato, allora provo a vedere se destination è inclusa in qualche nodo.
    // non l'ho fatto prima in quanto con destination = aula 2.1, mi tornava aula 2.13, perché prima di verificare node.name[0] === destination
    // verificava node.name[0].includes(destination).
    if (finishBeacon === undefined) {nishBeacon = node.beacon;
      nodes.forEach(node => {
        if (node.name[0].includes(destination)) {
          finishBeacon = node.beacon;
        }
      });
    }

    if (finishBeacon != undefined) {
      speechOutput = "";

      var beaconMap;
      if (disability.includes('motoria')) {
        beaconMap = new BeaconMap(beaconsList, edges, true);
      } else {
        if (disability.includes('visiva')) {
          speechOutput = "Forse sarebbe meglio che scaricassi l'app per cellulare. Detto questo, "
        }
        beaconMap = new BeaconMap(beaconsList, edges);
      }
      
      const path = beaconMap.getPath(startBeaconID, finishBeacon);

      // const indications = getRemainingDirections(path.edges, beaconsList);
      const indications = getRemainingDirections(path.edges, path.beacons, nodes);

      var previousIndication;
      indications.forEach(indication => {
        if (previousIndication === undefined || indication.includes("fino al livello numero")) {
          speechOutput = speechOutput + indication;
        } else if (!(indication === straight && previousIndication === straight)) {
          speechOutput = speechOutput + indication;
        }
        previousIndication = indication;
      });
    }
    return handlerInput.responseBuilder
      .speak(speechOutput)
      .getResponse();
  }
}

// function tempor(destination, disability) {
//   var speechOutput = `Mi dispiace, ma non capisco`;
//   const beaconsList = mapJson.buildings[0].beacons;
//   const edges = mapJson.buildings[0].arcs;
//   const nodes = mapJson.buildings[0].nodes;
  
//   var finishBeacon;
//   nodes.forEach(node => {
//     if ((destination.includes("laboratorio")) && (destination.includes("."))) {
//       const labNumber = destination.split(" ")[1];
//       if ((node.name[0].includes("laboratorio")) && (node.name[0].includes(labNumber))) {
//         finishBeacon = node.beacon;
//       }
//     } else if ((node.name[0] === destination) || (node.name[2] === destination)) {
//       finishBeacon = node.beacon;
//     }
//   });

//   // se finishBeacon è undefined, vuol dire che non l'ho trovato, allora provo a vedere se destination è inclusa in qualche nodo.
//   // non l'ho fatto prima in quanto con destination = aula 2.1, mi tornava aula 2.13, perché prima di verificare node.name[0] === destination
//   // verificava node.name[0].includes(destination).
//   if (finishBeacon === undefined) {nishBeacon = node.beacon;
//     nodes.forEach(node => {
//       if (node.name[0].includes(destination)) {
//         finishBeacon = node.beacon;
//       }
//     });
//   }

//   if (finishBeacon != undefined) {
//     speechOutput = "";

//     var beaconMap;
//     if (disability.includes('motoria')) {
//       beaconMap = new BeaconMap(beaconsList, edges, true);
//     } else {
//       if (disability.includes('visiva')) {
//         speechOutput = "Forse sarebbe meglio che scaricassi l'app per cellulare. Detto questo, "
//       }
//       beaconMap = new BeaconMap(beaconsList, edges);
//     }
    
//     const path = beaconMap.getPath(startBeaconID, finishBeacon);

//     // const indications = getRemainingDirections(path.edges, beaconsList);
//     const indications = getRemainingDirections(path.edges, path.beacons, nodes);

//     var previousIndication;
//     indications.forEach(indication => {
//       if (previousIndication === undefined || indication.includes("fino al livello numero")) {
//         speechOutput = speechOutput + indication;
//       } else if (!(indication === straight && previousIndication === straight)) {
//         speechOutput = speechOutput + indication;
//       }
//       previousIndication = indication;
//     });
//   }
//   console.log(speechOutput);
// }

// funzione simile a quella di Giacomo Mambelli (mandata per email)
function getRemainingDirections(edges, beacons, nodes) {
  var previousEdge;
  const indications = [];
  edges.forEach(edge => {
    const names = nodes.find(node => node.beacon === edge.end).name;
    const goal = (names.length === 3) ? names[1] : names[0];
    if (previousEdge === undefined) {
      if (edge.degrees === '0') {
        indications.push(`dirigiti verso nord, ovvero supera la torretta e ${straight} arriva fino ${goal} e `);
      } else if (edge.degrees === '90') {
        indications.push(`dirigiti verso est, ovvero ${right} arriva fino ${goal} e `);
      } else if (edge.degrees === '180') {
        indications.push(`dirigiti verso sud, ovvero ${back} arriva fino ${goal} e `);
      } else if (edge.degrees === '270') {
        indications.push(`dirigiti verso ovest, ovvero ${left} arriva fino ${goal} e `);
      } 
    } else {
      getDegrees(previousEdge, edge, indications, goal)

      if (edge.type === "stairs") {
        indications.push(stairs);
        indications.push(" fino al livello numero " + beacons.find(item => item.id === edge.end).major + " e ");
      } else if (edge.type === "elevator") {
        indications.push(elevator);
        indications.push(" fino al livello numero " + beacons.find(item => item.id === edge.end).major + " e ");
      }
    }
    previousEdge = edge;
  });

  indications.push("sei arrivato!")
  return indications;
}

function getDegrees(previousEdge, edge, indications, goal) {
  if(previousEdge.degrees === edge.degrees) {
    // hanno gli stessi gradi rispetto al nord => sono nella stessa direzione
    indications.push(`${straight} arriva fino ${goal} e `);
  } else if(((parseInt(previousEdge.degrees) + 90) % 360) === parseInt(edge.degrees)) {
    // se c'è una differenza di esattamente 90°, allora devo girare a destra
    indications.push(`${right} arriva fino ${goal} e `);
  } else if(((parseInt(previousEdge.degrees) + 270) % 360) === parseInt(edge.degrees)) {
    // se c'è una differenza di esattamente 270°, allora devo girare a sinistra
    indications.push(`${left} arriva fino ${goal} e `);
  } else if(((parseInt(previousEdge.degrees) + 180) % 360) === parseInt(edge.degrees)) {
    // se c'è una differenza di esattamente 180°, allora devo tornare indietro (altrimenti devo finire le scale => non dico nulla)
    if(!(previousEdge.type === "stairs" && edge.type === "stairs")) {
      indications.push(`${back} arriva fino ${goal} e `);
    }
  }
}

const TimeTableHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === "IntentRequest"
      && request.intent.name === "TimeTableIntent";
  },
  handle(handlerInput) {
    const placeOrEvent = handlerInput.requestEnvelope.request.intent.slots.placeOrEvent.value.toLowerCase();
    
    if (placeOrEvent != undefined) {
      var speechOutput = "Non capisco, mi dispiace!";
      const res = Request('GET', myUrl);
      const body = res.getBody().toString('utf8');
      var informations = [];
      
      informations = getInformations(body, placeOrEvent);
  
      if (!informations[0]) {
        const similarDest = [];
        body.split("<Evento>").forEach(item => {
          if (!item.includes("?xml")) {
            var dest = item.split("<Descrizione>")[1].split("<")[0].toLowerCase();
            if(dest.includes(placeOrEvent)) {
              similarDest.push(dest);
            }
          }
        });

        if (similarDest.length != 0) {
          var indexOfBestMatch = 0;
          if (similarDest.length > 1) {
            const matches = stringSimilarity.findBestMatch(placeOrEvent, similarDest);
            indexOfBestMatch = matches.bestMatchIndex;
          }
          informations = getInformations(body, similarDest[indexOfBestMatch]);
        }
      }    
  
      if (informations[0]) {
        speechOutput = `${placeOrEvent} si trova a ${informations[3]}, inizia alle ${informations[1]} e finisce alle ${informations[2]}`;
      }
    }

    return handlerInput.responseBuilder
      .speak(speechOutput)
      .getResponse();
  }
}

function getInformations(body, destination) {
  const informations = [];
  var start;
  var finish;
  var place;
  var found = false;

  body.split("<Evento>").forEach(item => {
    if (!item.includes("?xml")) {
      const dest = item.split("<Descrizione>")[1].split("<")[0].toLowerCase();
      if (destination === dest) {
        found = true;
        informations.push(found);
        start = item.split("<OraInizio>")[1].split("<")[0];
        informations.push(start);
        finish = item.split("<OraFine>")[1].split("<")[0];
        informations.push(finish);
        place = item.split("<Descrizione>")[2].split("<")[0].toLowerCase();
        informations.push(place);
      } else if (item.split("<Docente ")[1] != undefined) {
        const prof = item.split("<Docente ")[1].split(">")[1].split("<")[0].toLowerCase();
        const arr = prof.split(" ");
        const profSurname = arr[arr.length - 1];
        if (destination === prof || destination === profSurname) {
          found = true;
          informations.push(found);
          start = item.split("<OraInizio>")[1].split("<")[0];
          informations.push(start);
          finish = item.split("<OraFine>")[1].split("<")[0];
          informations.push(finish);
          place = item.split("<Descrizione>")[2].split("<")[0].toLowerCase();
          informations.push(place);
        }
      }        
    }
  });
  return informations;
}

const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(HELP_MESSAGE)
      .reprompt(HELP_REPROMPT)
      .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.CancelIntent'
        || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Goodbye!')
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
    return handlerInput.responseBuilder
    .speak(`Sorry, an error occurred (Session ended): ${handlerInput.requestEnvelope.request.reason}`)
    .reprompt(`Sorry, an error occurred (Session ended): ${handlerInput.requestEnvelope.request.reason}`)
    .getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);
    return handlerInput.responseBuilder
      // .speak(`Sorry, an error occurred: ${error.message}`)
      .reprompt(`Sorry, an error occurred (Error handled): ${error.message}`)
      .speak(`Sorry, an error occurred (Error handled): ${handlerInput.requestEnvelope.request.intent}`)
      // .reprompt(`Sorry, an error occurred: ${handlerInput.requestEnvelope.request.intent.slots.destination.value}`)
      .getResponse();
  },
};

const HELP_MESSAGE = 'You can say tell me a space fact, or, you can say exit... What can I help you with?';
const HELP_REPROMPT = 'What can I help you with?';

const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
  .addRequestHandlers(
    GetNewFactHandler,
    StartedPathFinderHandler,
    CompletedPathFinderHandler,
    TimeTableHandler,
    HelpHandler,
    ExitHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
