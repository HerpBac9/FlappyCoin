var path = require('path');
var Const = require('../sharedConstants').constant;

/*
 * Маршрутизация для статических HTML файлов
 */

// Путь к директории с публичными файлами
var publicPath = path.join(__dirname, '../public');

// Основной маршрут - редирект на главную страницу игры
exports.index = function(req, res){
  res.redirect('/');
};

// Обработчик для сохранения пользователя Telegram
exports.saveTelegramUser = function(req, res) {
  // Получаем данные пользователя из запроса
  var userData = req.body;
  
  // Здесь можно добавить логику сохранения в базу данных
  console.log('Сохранен пользователь Telegram:', userData);
  
  // Отправляем успешный ответ
  res.json({ success: true });
};

// Возвращаем константы для клиента
exports.getConstants = function(req, res) {
  res.json({ 
    socketAddress: Const.SOCKET_ADDR 
  });
};

exports.birds = function(req, res){
  res.render('birds', { title: 'Birds.js', wsAddress: Const.SOCKET_ADDR });
};