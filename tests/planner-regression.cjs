const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
class Element {
  constructor() { this.children=[]; this.attrs={}; this.classList={add(){},remove(){}}; }
  setAttribute(k,v){this.attrs[k]=String(v);} append(...e){this.children.push(...e);}
  addEventListener(){} removeEventListener(){} querySelector(){return new Element();}
  set innerHTML(v){this.children=[];} setPointerCapture(){}
  createSVGPoint(){return {x:0,y:0,matrixTransform(){return this;}};}
  getScreenCTM(){return {inverse(){}};}
}
const elements = new Map();
const context={document:{getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id);},createElement(){return new Element();},createElementNS(){return new Element();}},window:{addEventListener(){}},crypto:{randomUUID:()=>String(Math.random())},setTimeout(){},clearTimeout(){}};
vm.createContext(context);
const html=fs.readFileSync('index.html','utf8').replace(/\r\n/g,'\n');
const script=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].find(m=>m[1].includes('function slotsOf'))[1];
vm.runInContext(script.replace('      render();\n    })();','      globalThis.api={state,geometry,axisOf,grooveCenter,slotsOf,lengthForSlots,compartments,supportsOf,snapSupport,draw,beginDraw,moveDraw,endDraw,beginMove,moveDivider,endMove,beginBodyGesture,moveBodyGesture,endBodyGesture}; render();\n    })();'),context);
const a=context.api;
const center=k=>a.grooveCenter(k);
const event=(x,y)=>{const g=a.geometry();return {clientX:g.x+x*g.scale,clientY:g.y+y*g.scale,button:0,pointerId:1,preventDefault(){}};};
for(const cells of [1,2,6,20]){
  a.state.xCells=cells;a.state.yCells=cells;a.state.dividers=[];a.draw();
  const n=7*cells-2,L=42*cells-9;
  const grooves=elements.get('planner').children.find(e=>e.attrs['data-part']==='grooves').children;
  for(const side of ['top','bottom','left','right'])assert.equal(grooves.filter(e=>e.attrs['data-side']===side).length,n);
  for(const k of [1,n]){
    a.beginDraw(event(0,center(k)));a.moveDraw(event(L,center(k)));a.endDraw();
    const d=a.state.dividers.at(-1);assert.equal(d.y1,center(k));assert.equal(a.slotsOf(d),n);assert.equal(a.lengthForSlots(a.slotsOf(d)),6*n+5);
  }
}
a.state.xCells=2;a.state.yCells=2;
const v=(id,k,y2=75)=>({id,orientation:'V',x1:center(k),x2:center(k),y1:0,y2});
a.state.dividers=[v('a',4),v('b',8)];
const regions=a.compartments(a.geometry());
assert.deepEqual(Array.from(regions,c=>c.wSlots),[3,3,4]);
assert.equal(regions.reduce((s,c)=>s+c.wSlots,0)+2,12);
for(const [x1,x2,n]of[[0,center(4),3],[center(4),center(8),3],[center(8),75,4],[center(4),center(5),0],[0,center(1),0],[center(12),75,0]]){
 const d={orientation:'H',x1,x2};assert.equal(a.slotsOf(d),n);assert.equal(a.slotsOf({...d,x1:x2,x2:x1}),n);
}
a.state.dividers=[v('short',4,center(4))];
assert.equal(a.supportsOf('H',null,60).length,2);
assert.equal(a.supportsOf('H',null,center(2)).length,3);
assert.notEqual(a.snapSupport('H',center(4),null,60).mm,center(4));
a.state.dividers=[v('parent',4),{id:'child',orientation:'H',x1:0,x2:center(4),y1:center(6),y2:center(6)}];
a.beginMove(event(center(4),center(6)),a.state.dividers[0]);a.moveDivider(event(center(5),center(6)));a.endMove();
assert.equal(a.state.dividers[1].x2,center(5));
a.state.dividers=[{id:'anchor',orientation:'H',x1:0,x2:75,y1:center(6),y2:center(6)}];
a.beginBodyGesture(event(center(4),center(6)),a.state.dividers[0]);a.moveBodyGesture(event(center(4),0));a.endBodyGesture();
assert.equal(a.state.dividers[1].x1,center(4));assert.equal(a.state.dividers[1].y1,0);assert.equal(a.state.dividers[1].y2,center(6));
console.log('PASS: grooves 5/12/40/138; full spans; 12-slot split 3|3|4; zero slots; reversed endpoints; partial supports; moving attached ends; branch alignment.');
