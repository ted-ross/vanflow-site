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

const kube   = require('./kube.js');
const router = require('./router.js');

const RTYPE_SITE    = 0;
const RTYPE_PROCESS = 7;

const ATTR_RECORD_TYPE   = 0;
const ATTR_IDENTITY      = 1;
const ATTR_PARENT        = 2;
const ATTR_START_TIME    = 3;
const ATTR_END_TIME      = 4;
const ATTR_LOCATION      = 9;
const ATTR_PROVIDER      = 10;
const ATTR_PLATFORM      = 11;
const ATTR_NAMESPACE     = 12;
const ATTR_NAME          = 30;
const ATTR_IMAGE_NAME    = 20;
const ATTR_IMAGE_VERSION = 21;
const ATTR_SOURCE_HOST   = 14;
const ATTR_SOURCE_PORT   = 17;

var siteRecord     = {}; // object
var processRecords = {}; // name => object
var sourceId;
var pollTimer;
var nextRecordId   = 1;

const siteId = parseInt(process.env.VFC_SITE_ID || '0', 10);

const createSiteRecord = function() {
    siteRecord = {
        [ATTR_RECORD_TYPE] : RTYPE_SITE,
        [ATTR_IDENTITY]    : [siteId, '', 0],
        [ATTR_NAMESPACE]   : kube.Namespace(),
        [ATTR_NAME]        : process.env.VFC_SITE_NAME || '',
    };
}

const controllerAddress = function() {
    sourceId = (Math.random() + 1).toString(36).substring(2,7);
    return `sfe.${siteId}:${sourceId}:0`;
}

const addProcess = function(pod) {
    processRecords[pod.metadata.name] = {
        [ATTR_RECORD_TYPE] : RTYPE_PROCESS,
        [ATTR_IDENTITY]    : [siteId, sourceId, nextRecordId],
        [ATTR_PARENT]      : [siteId, '', 0],
        [ATTR_NAME]        : pod.metadata.name,
        [ATTR_IMAGE_NAME]  : pod.spec.containers[0].image,
        [ATTR_SOURCE_HOST] : pod.status.podIP,
    };
    nextRecordId += 1;
    router.SendRecord(processRecords[pod.metadata.name])
}

const deleteProcess = function(podname) {

}

const pollPods = function() {
    kube.GetPods()
    .then(pods => {
        pods.forEach(pod => {
            let name = pod.metadata.name;
            if (processRecords[name] === undefined) {
                addProcess(pod);
            }
        });
    })
    .catch(reason => console.log(reason))
    .finally(() => setTimeout(pollPods, 5000));
}

const onReady = function() {
    router.SendRecord(siteRecord);
    pollPods();
}

const onFlush = function() {
    console.log('Received FLUSH');
    router.SendRecord(siteRecord);
    for (const [key, value] of Object.entries(processRecords)) {
        router.SendRecord(value);
    }
}

exports.Start = function () {
    return new Promise((resolve, reject) => {
        console.log(`[VanFlow module starting - Site ID: ${siteId}]`);
        createSiteRecord();
        router.OnRouterReady(onReady);
        router.OnFlush(onFlush);
        resolve(controllerAddress());
    });
}

