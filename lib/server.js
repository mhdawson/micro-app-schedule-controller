// Copyright 2016 the project authors as listed in the AUTHORS file.
// All rights reserved. Use of this source code is governed by the
// license that can be found in the LICENSE file.
const mqtt = require('mqtt');
const path = require('path');
const socketio = require('socket.io');
const crontab = require('node-crontab');
const util = require('util');  
const fs = require('fs');

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
    } catch (e) {
      // we must not be connected to the mqtt server at this
      // point just log an error
      console.log("failed to publish message");
    }
  }

  eventSocket.on('connection', function(ioclient) {
    ioclient.on('button', function(buttonId) {
    });
  });

  mqttClient.on('connect',function() {
    // we don't listen for any mqtt data so don't need to setup subscrbe
  });

  // start the configured schedules 
  // needs to set so that we can update
  scheduledTasks = undefined; 
  var scheduleFile = path.join(__dirname, 'schedules.json');
  if (fs.existsSync(scheduleFile)) {
    scheduledTasks = JSON.parse(fs.readFileSync(scheduleFile));
  }
  for (var i = 0; i < scheduledTasks.length; i++) {
    crontab.scheduleJob(scheduledTasks[i].schedule, function(entry) {
    });
  }
};


if (require.main === module) {
  var microAppFramework = require('micro-app-framework');
  microAppFramework(path.join(__dirname), Server);
}


module.exports = Server;
