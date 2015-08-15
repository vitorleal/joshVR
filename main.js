// watchify main.js -o dist.js -v -d
var mirror = require('./editor');
var rend = require('./renderer.js');
var ui = require('./controls');
var debounce = require('debounce');

var parser = new DOMParser;
var ctx = {
  gui: null,
  raf: null,
};

var counter = 0;
function rebuild () {
  console.log('rebuuild!');
  if (mirror.writeBackCausedUpdate()) return;
  destroyCtx();
  var content = mirror.doc.getValue();
  var doc = parser.parseFromString(content, 'application/xml');
  // Start descent from the scene tag, not the XMLDocument parent
  if (!doc.children.length) throw new Error('no child nodes');
  // TODO: this could be nicer
  mirror.cb = mirror.writeBack(doc);
  var scene = rend.initScene();
  ctx.gui = ui.buildUI();
  recursiveDescend(doc.children[0], scene, ctx.gui);
  (function render () {
    ctx.raf = requestAnimationFrame(render);
    rend.render();
  })();
  setTimeout(function () {
    rend.fixUpCanvas();
  }, 0);
};

function destroyCtx () {
  counter = 0;
  rend.destroy();
  if (ctx.gui) {
    ctx.gui.destroy();
    ctx.gui = null;
  }
  if (ctx.raf) {
    cancelAnimationFrame(ctx.raf);
    ctx.raf = null;
  }
};

// pre order depth first
function recursiveDescend (node, scene, gui) {
   //console.log(node, node.tagName);
   // TODO: DRY
   if (node.tagName === 'cube') {
     var mesh = rend.addToScene(scene, node);
     gui = gui.addFolder(node.tagName + counter++);
     ui.addTransforms(gui, node, mesh, mirror.cb);
   } else if (node.tagName === 'sphere') {
     var mesh = rend.addToScene(scene, node);
     gui = gui.addFolder(node.tagName + counter++);
     ui.addTransforms(gui, node, mesh, mirror.cb);
   } else if (node.tagName === 'group') {
     var group = rend.createGroup(scene, node);
     scene = group;
     gui = gui.addFolder(node.tagName + counter++);
     ui.addTransforms(gui, node, group, mirror.cb);
   }
   for (var i = 0, len = node.children.length; i < len; ++i) {
     recursiveDescend(node.children[i], scene, gui);
   }
};

mirror.doc.on('changes', debounce(rebuild, 1000));
rebuild();

