var Const = require('../sharedConstants').constant;

function Pipe (lastPipePosX) {
  // ---- ПОДРОБНОЕ ОБЪЯСНЕНИЕ СОЗДАНИЯ ТРУБЫ ----
  //
  // Класс Pipe создает новую трубу и определяет её начальные координаты.
  // 
  // 1. this._pipeTinyObject - основной объект трубы, который содержит:
  //    - id: уникальный идентификатор трубы (время создания)
  //    - posX: горизонтальная позиция трубы. Вычисляется как позиция предыдущей трубы + расстояние между трубами
  //           ВАЖНО: начинаем отрисовку труб за пределами экрана, а не сразу на экране
  //    - posY: вертикальная позиция трубы (центр разрыва). 
  //           Случайное значение между MIN_PIPE_HEIGHT и (MAX_PIPE_HEIGHT - HEIGHT_BETWEEN_PIPES)
  //
  // Исправлено: Первая труба создается за пределами экрана (точно Const.SCREEN_WIDTH),
  // а остальные на расстоянии DISTANCE_BETWEEN_PIPES от предыдущей
  
  this._pipeTinyObject = {
    id:   new Date().getTime(),
    // Если lastPipePosX не определен (первая труба), помещаем её точно за правой границей экрана
    posX: (lastPipePosX === undefined) ? Const.SCREEN_WIDTH : (lastPipePosX + Const.DISTANCE_BETWEEN_PIPES),
    posY: Math.floor(Math.random() * ((Const.MAX_PIPE_HEIGHT - Const.HEIGHT_BETWEEN_PIPES)- Const.MIN_PIPE_HEIGHT + 1) + Const.MIN_PIPE_HEIGHT)
  };
};
 
// Обновление позиции трубы на основе прошедшего времени и скорости уровня
Pipe.prototype.update = function (timeLapse) {
  // Перемещение трубы влево с учетом времени и скорости игры
  this._pipeTinyObject.posX -= Math.floor(timeLapse * Const.LEVEL_SPEED);
};

// Проверка, вышла ли труба за пределы экрана слева (может быть удалена)
Pipe.prototype.canBeDroped = function () {
  // Если правый край трубы (posX + ширина) вышел за левую границу экрана (< 0)
  if (this._pipeTinyObject.posX + Const.PIPE_WIDTH < 0)
    return (true);
  return (false);
};

// Получение объекта трубы для передачи в другие части программы
Pipe.prototype.getPipeObject = function () {
  return (this._pipeTinyObject);
};

module.exports = Pipe;