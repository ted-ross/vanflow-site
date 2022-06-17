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

const k8s = require('@kubernetes/client-node');
const fs  = require('fs');

var kc;
var client;
var v1Api;
var v1AppApi;
var serviceWatch;
var depWatch;
var namespace = 'default';

exports.Namespace = function() {
    return namespace;
}

exports.Start = function (in_cluster) {
    return new Promise((resolve, reject) => {
        kc = new k8s.KubeConfig();
        if (in_cluster) {
            kc.loadFromCluster();
        } else {
            kc.loadFromDefault();
        }
        client       = k8s.KubernetesObjectApi.makeApiClient(kc);
        v1Api        = kc.makeApiClient(k8s.CoreV1Api);
        v1AppApi     = kc.makeApiClient(k8s.AppsV1Api);
        serviceWatch = new k8s.Watch(kc);
        depWatch     = new k8s.Watch(kc);

        try {
            namespace = fs.readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/namespace', 'utf8')
            console.log(`Running in namespace: ${namespace}`);
        } catch (err) {
            console.log(`Unable to determine namespace, using ${namespace}`);
        }
        resolve();
    });
}

exports.LoadSecret = function(name) {
    return v1Api.readNamespacedSecret(name, namespace)
    .then(secret => secret.body);
}

exports.DeleteSecret = function(name) {
    return v1Api.deleteNamespacedSecret(name, namespace)
    .catch(err => `Error deleting secret ${err.stack}`);
}

exports.GetDeployments = function() {
    return v1AppApi.listNamespacedDeployment(namespace)
    .then(list => list.body.items);
}

exports.LoadDeployment = function(name) {
    return v1AppApi.readNamespacedDeployment(name, namespace)
    .then(dep => dep.body);
}

exports.DeleteDeployment = function(name) {
    return v1AppApi.deleteNamespacedDeployment(name, namespace)
    .catch(err => `Error deleting deployment ${err.stack}`);
}

exports.GetPods = function() {
    return v1Api.listNamespacedPod(namespace)
    .then(pods => pods.body.items);
}

exports.LoadPod = function(name) {
    return v1Api.readNamespacedPod(name, namespace)
    .then(pod => pod.body);
}
