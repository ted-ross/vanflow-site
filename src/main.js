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

const router     = require('./router.js');
const kube       = require('./kube.js');
const vanflow    = require('./vanflow.js');

const VERSION    = '0.1.0';
const STANDALONE = (process.env.VFC_STANDALONE || 'NO') == 'YES';

console.log(`VanFlow Site Controller version ${VERSION}`);
console.log(`Standalone : ${STANDALONE}`);

//
// This is the main program startup sequence.
//
exports.Main = function() {
    kube.Start(!STANDALONE)
    .then(() => kube.GetSiteId())
    .then(site_id => vanflow.Start(site_id))
    .then(address => router.Start(address))
    .then(() => console.log("[Initialization completed successfully]"))
    .catch(reason => {
        console.log(reason);
        console.log(`Initialization failed: ${reason.stack}`);
        process.exit(1);
    });
};

