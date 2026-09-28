import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRepositoryUrl, buildSystemBuildPrompt, buildContextBundle } from './prototype-context.mjs';

const brief={name:'Garden',entries:[{index:1,name:'Problem',value:'Planning is scattered'},{index:6,name:'First Product',shape:{fields:{outcome:'Plan one garden',essential:'One weekly plan'}}}],uncertainties:[{chapter:'Evidence',question:'Will people return?'}]};
const project={id:'p1',name:'Garden workspace',productName:'Sprout',subtitle:'A calmer garden plan'};
test('repository URLs are restricted to a GitHub owner and repository',()=>{assert.equal(normalizeRepositoryUrl('https://github.com/acme/garden.git'),'https://github.com/acme/garden');assert.equal(normalizeRepositoryUrl('https://gitlab.com/acme/garden'),'');});
test('system build prompt carries the product name and North Star without hiding uncertainty',()=>{const prompt=buildSystemBuildPrompt({project,brief,repositoryUrl:'https://github.com/acme/garden'});assert.match(prompt,/PRODUCT NAME: "Sprout"/);assert.match(prompt,/A calmer garden plan|Plan one garden/);assert.match(prompt,/Will people return/);assert.match(prompt,/github.com\/acme\/garden/);});
test('context bundle is portable and marks MCP as a connection boundary',()=>{const bundle=buildContextBundle({project,brief,readiness:{risks:['Trust'],deferred:['Payments']},repositoryUrl:'https://github.com/acme/garden',history:[{text:'Chose the smallest product'}]});assert.equal(bundle.format,'floppy-context-bundle');assert.equal(bundle.mcp.status,'ready-for-connection');assert.equal(bundle.project.repositoryUrl,'https://github.com/acme/garden');assert.equal(bundle.project.productName,'Sprout');assert.match(bundle.handoff.agentPrd,/Agent PRD/);});
