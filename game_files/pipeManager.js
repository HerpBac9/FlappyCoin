var util          = require('util'),
    EventEmitter  = require('events').EventEmitter,
    Pipe          = require('./pipe'),
    enums         = require('./enums'),
    Const         = require('../sharedConstants').constant;

// ---- ПОЯСНЕНИЕ ПО УПРАВЛЕНИЮ ТРУБАМИ ----
//
// FIRST_PIPE_POSX - начальная позиция первой трубы по оси X
// Установим значение равным ширине экрана, чтобы трубы начинали появляться только с края экрана
// Было: Const.SCREEN_WIDTH + 100
var FIRST_PIPE_POSX           = Const.SCREEN_WIDTH;

// Позиция, при которой нужно создать новую трубу
var SPAWN_PIPE_ALERT          = Const.SCREEN_WIDTH;

// Максимальное количество труб для проверки столкновений
// Проверяем столкновения только с ближайшими 3 трубами для оптимизации
var MAX_PIPE_CHECK_COLLISION  = 3;

var _pipeList = new Array(),
    _socket = null;

function PipeManager () {
  // Наследуем от EventEmitter для отправки событий (например, когда нужна новая труба)
  EventEmitter.call(this);
};

util.inherits(PipeManager, EventEmitter);

// Установка сокета для передачи данных клиентам
PipeManager.prototype.setSocket = function (socket) {
  _socket = socket;
};

// Создание новой трубы
PipeManager.prototype.newPipe = function () {
  var newPipe,
      lastPos = FIRST_PIPE_POSX;

  // Если уже есть трубы, берем позицию последней трубы
  if (_pipeList.length > 0)
    lastPos = _pipeList[_pipeList.length - 1].getPipeObject().posX;

  // Создаем новую трубу, передавая позицию последней трубы
  newPipe = new Pipe(lastPos);
  _pipeList.push(newPipe);

  return (newPipe);
};

// Обновление позиций всех труб
PipeManager.prototype.updatePipes = function (time) {
  var nbPipes = _pipeList.length,
      i;

  // Если первая труба вышла за пределы экрана, удаляем ее
  if (_pipeList[0] && _pipeList[0].canBeDroped() == true) {
    _pipeList.shift();
    nbPipes--;
  }

  // Обновляем позиции всех труб
  for (i = 0; i < nbPipes; i++) {
    _pipeList[i].update(time);
  };

  // Если последняя труба достигла определенной позиции, сигнализируем о необходимости создания новой
  if (nbPipes > 0 && _pipeList[nbPipes - 1].getPipeObject().posX < SPAWN_PIPE_ALERT)
    this.emit('need_new_pipe');
};

// Получение списка всех труб для отрисовки
PipeManager.prototype.getPipeList = function () {
  var pipes = new Array(),
      nbPipes = _pipeList.length,
      i;

  for (i = 0; i < nbPipes; i++) {
      pipes.push(_pipeList[i].getPipeObject());
  };

  return (pipes);
};

// Получение списка труб, с которыми можно столкнуться
// Для оптимизации проверяем столкновения только с ближайшими трубами
PipeManager.prototype.getPotentialPipeHit = function () {
  var pipes = new Array(),
      nbPipes = _pipeList.length,
      i;

  // В многопользовательском режиме проверяем только первые 2 трубы
  // потому что остальные находятся слишком далеко от игроков
  if (nbPipes > MAX_PIPE_CHECK_COLLISION)
    nbPipes = MAX_PIPE_CHECK_COLLISION;

  for (i = 0; i < nbPipes; i++) {
    pipes.push(_pipeList[i].getPipeObject());
  };

  return (pipes);
};

// Очистка списка труб при перезапуске игры
PipeManager.prototype.flushPipeList = function () {
  _pipeList = new Array();
};


module.exports = PipeManager;