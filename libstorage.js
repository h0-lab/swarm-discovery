"use strict";
const _ = require('lodash');
const isc = require('ip-subnet-calculator');

let nodes = {}; // Nodes list
let networks = []; // Networks list
let ips = {}; // Ips for autonetwork feature

function cleanAll() {
  nodes = {};
  ips = {};
  networks = [];
}

function getNodeByName(name) {
  return _.find(nodes, {name: name[0]});

  for (let i in nodes) {
    if (nodes[i].name && nodes[i].name === name) {
      return nodes[i];
    }
  }
  return false;
}

function getNode(id) {
  return nodes[id];
}

function addNode(data,time) {
  let ip = null;
  nodes[data.Id] = {
    name: data.Name.slice(1).toLowerCase(),
    netNames: _.mapValues(data.NetworkSettings.Networks, 'Aliases'),
    binds: _(data.NetworkSettings.Ports).map(v=>v && v.map(v1=>(ip = v1.HostIp) + ':' + v1.HostPort)).flatten().compact().value(),
    ips: _.mapValues(data.NetworkSettings.Networks, 'IPAddress'),
    added: time || (Date.now() - 1e3) * 1e6
  };
  nodes[data.Id].ip = ip;

  _.reduce(nodes[data.Id].netNames, (c, v, k)=>(ips[k] || (ips[k] = {})) && v && v.forEach(i=>
    (ips[k][i] || (ips[k][i] = {ip: [], p: 0})) && ips[k][i].ip.push(nodes[data.Id].ips[k])
  ), 0);

  return nodes[data.Id];
}

function removeNode(id) {
  _.reduce(nodes[id].netNames, (c, v, k)=>v && v.forEach(i=>
    !ips[k][i].ip.splice(ips[k][i].ip.indexOf(nodes[id].ips[k]), 1) ||
    ips[k][i].ip.length || !(delete ips[k][i]) ||
    Object.keys(ips[k]).length || (delete ips[k])
  ), 0);

  delete nodes[id];
}

function getObject(net, name) {
  return ips[net] && ips[net][name];
}

function prepareNetworks(nets) {
  return nets.IPAM.Config.map(net=> {
    let tmp = net.Subnet.split('/');
    tmp = isc.calculateSubnetMask(tmp[0], tmp[1]);
    return {
      ipLow: tmp.ipLow,
      ipHigh: tmp.ipHigh,
      netId: nets.Id,
      name: nets.Name,
      ip: null
    };
  })
}
function setNetworkIp(net, ip) {
  let ind = _.findIndex(networks, {netId: net});
  ~ind ? networks[ind].ip = ip : false;
}
function addNetwork(nets) {
  networks.push(...nets);
}
function removeNetwork(netId) {
  networks = _.reject(networks, {netId: netId});
}
function getNetByIp(ip) {
  ip = isc.toDecimal(ip);
  return _.find(networks, net=>net.ipLow < ip && ip < net.ipHigh);
}
function getNetworks(){
  return networks;
}

module.exports = {
  cleanAll,
  getNodeByName,
  getNode,
  addNode,
  removeNode,
  getObject,
  prepareNetworks,
  setNetworkIp,
  addNetwork,
  removeNetwork,
  getNetByIp,
  getNetworks
};