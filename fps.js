function FpsTimer() {

  this.lastTs = 0;
  this.recent = Array();
  this.samples = 1000;

};

FpsTimer.prototype.ts = function () {

  return (new Date()).getTime();

};

FpsTimer.prototype.fps = function () {

  newTs = this.ts();
  dt = newTs - this.lastTs;
  isFirst = !this.lastTs;
  this.lastTs = newTs;
  if (isFirst)
    return;
 
  f = 1000. / dt;
  if (f == Infinity) f = 0;
  var length = this.recent.unshift(f);

  if (length > this.samples) {
    this.recent.pop();
    length --;
  }

  var total = 0;
  $.each(this.recent, function(i, v) {
    total += v;
  });
  return parseInt(total / length);

}

FpsTimer.prototype.update = function () {

  $('#fps').html('FPS: ' + this.fps());

}


