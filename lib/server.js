// Copyright 2016 the project authors as listed in the AUTHORS file.
// All rights reserved. Use of this source code is governed by the
// license that can be found in the LICENSE file.
const mqtt = require('mqtt');
const path = require('path');
const socketio = require('socket.io');
const crontab = require('node-crontab');
const util = require('util');
const fs = require('fs');
const eventLog = require('./eventLog.js');
const suncalc = require('suncalc');

const PAGE_WIDTH = 500;
const PAGE_HEIGHT = 300;

// this is filled in later as the socket io connection is established
var eventSocket;

var Server = function() {
}


Server.getDefaults = function() {
  return { 'title': 'Scheduler' };
}

var replacements;
Server.getTemplateReplacments = function() {
  if (replacements === undefined) {
    var config = Server.config;

    replacements = [{ 'key': '<DASHBOARD_TITLE>', 'value': config.title },
                    { 'key': '<UNIQUE_WINDOW_ID>', 'value': config.title },
                    { 'key': '<PAGE_WIDTH>', 'value': PAGE_WIDTH },
                    { 'key': '<PAGE_HEIGHT>', 'value': PAGE_HEIGHT }];

  }
  return replacements;
}

Server.startServer = function(server) {
  var config = Server.config;
  eventSocket = socketio.listen(server);

  // setup mqtt
  var mqttOptions;
  if (config.mqttServerUrl.indexOf('mqtts') > -1) {
    mqttOptions = { key: fs.readFileSync(path.join(__dirname, 'mqttclient', '/client.key')),
                    cert: fs.readFileSync(path.join(__dirname, 'mqttclient', '/client.cert')),
                    ca: fs.readFileSync(path.join(__dirname, 'mqttclient', '/ca.cert')),
                    checkServerIdentity: function() { return undefined }
    }
  }

  var mqttClient = mqtt.connect(config.mqttServerUrl, mqttOptions);

  var sendCommand = function(command) {
    try {
      mqttClient.publish(command.topic, command.message);
      eventLog.logMessage(config, 'Schedule event, topic[' + command.topic + '] message [' + command.message + ']', eventLog.LOG_INFO);
    } catch (e) {
      // we must not be connected to the mqtt server at this
      // point just log an error
      eventLog.logMessage(config, 'failed to publish message', eventLog.LOG_WARN);
    }
  }

  eventSocket.on('connection', function(ioclient) {
    ioclient.on('button', function(buttonId) {
    });
  });

  mqttClient.on('connect', function() {
    // we don't listen for any mqtt data so don't need to setup subscrbe
  });

  var runScheduledEntry = function(scheduledTask) {
      // if the time was randomized then factor that in
    var randval = scheduledTask.rand;
    var randtime = 0;
    if (randval != undefined) {
      randtime = Math.round(Math.random() * randval * 60 * 1000);
    }

    setTimeout(function() {
      var commands = scheduledTask.commands;
      for( var j = 0; j < commands.length; j++) {
        setTimeout(function(command) {
          sendCommand(command);
        }.bind(undefined, commands[j]), commands[j].delay);
      }
    }, randtime);
  }

  var runOneTimeJob = function(date, scheduledTask) {
    var currentDate = new Date()
    var delta = date.getTime() - currentDate.getTime();
    if (delta >= (-3000 * 60)) {
      // provided we have not passed the scheduled time by more than
      // 3 minutes
      setTimeout(() => runScheduledEntry(scheduledTask), delta);
    }
  }

  // start the configured schedules
  // needs to set so that we can update
  scheduledTasks = undefined;
  var scheduleFile = path.join(__dirname, 'schedules.json');
  if (fs.existsSync(scheduleFile)) {
    scheduledTasks = JSON.parse(fs.readFileSync(scheduleFile));
  }

  for (var i = 0; i < scheduledTasks.length; i++) {
    // check if this is a special type
    if (scheduledTasks[i].schedule.indexOf(' ') === -1) {
      // since there is no space it is not a crontab entry
      // assume it is a suncalc value (ex sunset, sunrise etc)
      if (config.location != undefined) {
        var scheduleFunc = function(scheduledTask) {
          var suntimes = suncalc.getTimes(new Date(), config.location.lat,
                           config.location.lon)
          runOneTimeJob(suntimes[scheduledTask.schedule], scheduledTask);
        }

        // set up crontab entry to schedule for each day.
        crontab.scheduleJob("1 0 * * *", function(scheduledTask) {
          scheduleFunc(scheduledTask);
        }.bind(undefined, scheduledTasks[i]));

        // schedule for today
        scheduleFunc(scheduledTasks[i]);
      };
    } else {
      crontab.scheduleJob(scheduledTasks[i].schedule, function(scheduledTask) {
        runScheduledEntry(scheduledTask);
      }.bind(undefined, scheduledTasks[i]));
    }
  }
};


if (require.main === module) {
  var microAppFramework = require('micro-app-framework');
  microAppFramework(path.join(__dirname), Server);
}


module.exports = Server;
