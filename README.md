# micro-app-schedule-controller

micro-app to control lights and other devices
based on a schedule.

Current the GUI only provides 2 pages. One that
shows the entries configured and one that shows
the contents of the log.  

It is intended that the GUI will allow the
scheduled entries to be configured but currently
it is display only:

![schedules](https://github.com/mhdawson/micro-app-schedule-controller/blob/master/pictures/schedules.jpg?raw=true)
![log](https://github.com/mhdawson/micro-app-schedule-controller/blob/master/pictures/log.jpg?raw=true)

# Usage

After installation modify ../lib/config.json to match
your configuration.

The configuration entries that must be updated include:

* title - title for the remote (optional)
* serverPort - port on which the server listens for connections
* mqttServerUrl - url of the mqtt server to connect to. This can
  either start with tcp:// or mqtts://. If it starts with mqtts://
  there must be a subdirectory in the lib directory called mqttclient
  which contains ca.cert, client.cert, client.key which contain
  the key and associated certificates for a client which
  is authorized to connect to the mqtt server.
* eventLogPrefix - directory in which log will be written
* location - object with lat and lon fields that specify
  the location to be used in order to determine suntimes
* windowsSize - object with x and y specifying the size of the
  window for the GUI.

A sample file is as follows:

```
{
  "title": "Scheduler",
  "serverPort": 3000,
  "mqttServerUrl": "tcp://10.1.1.186:1883",
  "eventLogPrefix": "/home/user1/controller/micro-app-schedule-controller",
  "location": { "lat": 45.4215, "lon": -75.6972 },
  "windowSize": {"x": 320, "y": 274 }
}
```

In addition to the configuration in the config.json file, the
scheduled entries are configured in the file called
schedules.json.  It is intended that this file be configurable
through the GUI at some point but for now it is manually edited
and the GUI has one page which shows the entries configured.  The
format of the file is an array of objects with the following fields:

* label - the label assigned to the schedule entry
* schedule - a cron string specifying the time for the schedule entry
  to be invoked, or one of sunset or sunrise.
* rand - optional randomization to the time specified in minutes.
  A random amount between 0 and the value specified will be added
  to the time for when the entry will be invoked.
* commands - an array of command objects as described below.

The format of the objects in the array of commands is as follows:

* delay - delay in milliseconds after the schedule entry is invoked
  that the command will run.
* topic - the mqtt topic that will be posted to when the command is
  run.
* message - the message that will be posted to the topic when the
  command is run.

A sample shedules.json file is as follows:

```
[ { "label": "livingOn", "schedule": "sunset", "rand": 15, "commands": [ { "delay": 0, "topic": "house/x10", "message": "A,1,1" } ] },
  { "label": "allLights", "schedule": "15 23 * * *", "rand": 30, "commands": [ {                 "topic": "house/x10", "message": "A,1,0" },
                                                                               { "delay": 5000,  "topic": "house/x10", "message": "A,2,0" },
                                                                               { "delay": 10000, "topic": "house/x10", "message": "A,5,0" } ] }
]

```




# Installation

Simply run:

```
npm install micro-app-schedule-controller
```

# Running

To run the schedule-controller micro-app, add node.js to your
path (currently requires 4.x or better) and then run:

```
npm start
```

# Key dependencies

## micro-app-framework
As a micro-app the micro-app-ping-monitor app depends on the micro-app-framework:

* [micro-app-framework npm](https://www.npmjs.com/package/micro-app-framework)
* [micro-app-framework github](https://github.com/mhdawson/micro-app-framework)

See the documentation on the micro-app-framework for more information
on general configuration options (in addition to those documented in
this readme) that are availble (ex using tls,
authentication, serverPort, etc).
