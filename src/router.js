/*
 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements.  See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership.  The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License.  You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied.  See the License for the
 specific language governing permissions and limitations
 under the License.
*/

"use strict";

const amqp   = require('rhea');
const { resolve } = require('path');

const QUERY_TIMEOUT_SECONDS = 5;

amqp.options.enable_sasl_external = true;

var shuttingDown = false;
var conn;
var myAddress;
var receiver;
var beaconSender;
var recordSender;
var beaconTimer;
var flushHandlers   = [];
var readyHandlers   = [];

const sendBeacon = function() {
    return new Promise((resolve, reject) => {
        if (beaconSender.credit > 0) {
            let dlv = beaconSender.send({
                to      : 'mc/sfe.all',
                subject : 'BEACON',
                application_properties : {
                    v          : 1,
                    sourceType : 'CONTROLLER',
                    address    : `mc/${myAddress}`,
                    direct     : myAddress,
                },
            });
        } else {
            console.log(`Can't send BEACON, credit starvation`);
        }
        resolve();
    });
}

const beacon = function() {
    return sendBeacon()
    .finally(() => beaconTimer = setTimeout(beacon, 1000 * 5));
}

exports.Start = function(address) {
    console.log(`[Router AMQP client module starting - address: ${address}]`);
    return new Promise((resolve, reject) => {
        flushHandlers.push(() => resolve());
        myAddress    = address;
        conn         = amqp.connect();
        receiver     = conn.open_receiver(address);
        beaconSender = conn.open_sender({
            target          : 'mc/sfe.all',
            snd_settle_mode : 1,
        });
        recordSender = conn.open_sender({
            target          : `mc/${address}`,
            snd_settle_mode : 1,
        });
    });
}

exports.Shutdown = function() {
    return new Promise((resolve, reject) => {
        shuttingDown = true;
        conn.close();
        resolve();
    })
}

exports.SendRecord = function(record) {
    if (recordSender.credit > 0) {
        recordSender.send({
            to      : `mc/${myAddress}`,
            subject : 'RECORD',
            body    : [ record ],
        });
    } else {
        console.log(`Can't send record update to mc/${myAddress} - Credit starvation`);
    }
}

exports.OnRouterReady = function(callback) {
    readyHandlers.push(callback);
}

exports.OnFlush = function(callback) {
    flushHandlers.push(callback);
}

amqp.on('connection_open', function(context) {
    console.log("AMQP connection to the router is open");
});

amqp.on('receiver_open', function(context) {
    console.log('Receiver open');
});

amqp.on('sendable', function (context) {
    if (beaconTimer === undefined) {
        console.log('Start beacon');
        beacon();
        readyHandlers.forEach(handler => handler());
    }
});

amqp.on('message', function (context) {
    let message = context.message;
    if (message.subject == 'FLUSH') {
        flushHandlers.forEach(handler => handler());
    }
});
