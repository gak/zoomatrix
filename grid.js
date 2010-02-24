var gl;
var drawTimer;

function log(a) {

  l = $('#log');
  l.html(l.html() + a + '<br>');

}

function clearLog() {

  l = $('#log');
  l.html('');

}

function glGrid(w, h) {
 
  this.width = w;
  this.height = h;

  // 5 vertices * 4 colour elements
  this.colors = new WebGLFloatArray(w * h * 5 * 4);

  // camera
  this.posX = 0;
  this.posY = 0;
  
}

// 100 x 30 = 86fps in minefield
// 100 x 30 = 14fps in chrome

var grid = new glGrid(30, 30);

var fps = new FpsTimer();
fps.update();
 
function initGL(canvas) {
  try {
    gl = canvas.getContext("experimental-webgl");
  } catch(e) {
  }
  if (!gl) {
    alert("Could not initialise WebGL, sorry :-(");
  }
}


function getShader(gl, id) {
  var shaderScript = document.getElementById(id);
  if (!shaderScript) {
    return null;
  }

  var str = "";
  var k = shaderScript.firstChild;
  while (k) {
    if (k.nodeType == 3) {
      str += k.textContent;
    }
    k = k.nextSibling;
  }

  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, str);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }

  return shader;
}


var shaderProgram;
function initShaders() {
  var fragmentShader = getShader(gl, "shader-fs");
  var vertexShader = getShader(gl, "shader-vs");

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Could not initialise shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
}


var mvMatrix;

function loadIdentity() {
  mvMatrix = Matrix.I(4);
}


function multMatrix(m) {
  mvMatrix = mvMatrix.x(m);
}


function mvTranslate(v) {
  var m = Matrix.Translation($V([v[0], v[1], v[2]])).ensure4x4();
  multMatrix(m);
}


var pMatrix;
function perspective(fovy, aspect, znear, zfar) {
  pMatrix = makePerspective(fovy, aspect, znear, zfar);
}


function setMatrixUniforms() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, new WebGLFloatArray(pMatrix.flatten()));
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, new WebGLFloatArray(mvMatrix.flatten()));
}



var squareVertexPositionBuffer;
var squareVertexColorBuffer;


function initVertexBuffers() {

  squareVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);

  vertices = [];
  verts = 0;

  for (var x = 0; x < grid.width; x++) {

    for (var y = 0; y < grid.height; y++) {

      vertices = vertices.concat([

        x + 0, y + 0, 0,
        x + 1, y + 0, 0,
        x + 0, y + 1, 0,
        x + 1, y + 1, 0,
        x + 1, y + 1, 0,

      ]);
  
      verts += 5;

    }

  }

  gl.bufferData(gl.ARRAY_BUFFER, new WebGLFloatArray(vertices), gl.STATIC_DRAW);
  squareVertexPositionBuffer.itemSize = 3;
  squareVertexPositionBuffer.numItems = verts;

}

function initColorBuffers() {

  squareVertexColorBuffer = gl.createBuffer();
  squareVertexColorBuffer.itemSize = 4;
  squareVertexColorBuffer.numItems = squareVertexPositionBuffer.numItems;
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexColorBuffer);

}

function updateColorBuffers() {

  for (var i = 0; i < grid.colors.length; i++) {

    if (i % 4 == 3)
      grid.colors[i] = 1;
    else
      grid.colors[i] = Math.random() * i / grid.colors.length;

  }
  
  gl.bufferData(gl.ARRAY_BUFFER, grid.colors, gl.DYNAMIC_DRAW);

}

function drawScene() {
  
  updateColorBuffers();
  
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  perspective(90, 1.0, 0.1, 100.0);
  loadIdentity();

  mvTranslate([-grid.width / 2 + grid.posX, -grid.height / 2 + grid.posY, -30.0]);

  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, squareVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexColorBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, squareVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems);

  fps.update();

}

var mouseDown = false;
var lastMouseX = null;
var lastMouseY = null;

function handleMouseDown(event) {
  mouseDown = true;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;
}

function handleMouseUp(event) {
  mouseDown = false;
}

function handleMouseMove(event) {

  if (!mouseDown) {
    return;
  }
  var newX = event.clientX;
  var newY = event.clientY;

  diffX = lastMouseX - newX;
  diffY = lastMouseY - newY;

  lastMouseX = newX
  lastMouseY = newY;

  grid.posX -= diffX * 0.4;
  grid.posY += diffY * 0.4;

}

function webGLStart() {

  var canvas = document.getElementById("canvas");
  initGL(canvas);
  initShaders();
  initVertexBuffers();
  initColorBuffers();
  updateColorBuffers();

  canvas.onmousedown = handleMouseDown;
  document.onmouseup = handleMouseUp;
  document.onmousemove = handleMouseMove;

  gl.clearColor(0.5, 0.6, 0.5, 1.0);

  gl.clearDepth(1.0);

  gl.disable(gl.DEPTH_TEST);

  startDrawInterval();

}


function pause() {

  if (drawTimer) {

    clearInterval(drawTimer);
    drawTimer = 0;

  } else {

    startDrawInterval();

  }

}

function startDrawInterval() {

  drawTimer = setInterval(drawScene, 0);

}

