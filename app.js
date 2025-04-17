/**
 * Основной файл приложения Flappy Coin
 */

var express = require('express');
var http = require('http');
var path = require('path');
var bodyParser = require('body-parser');

var routes = require('./routes');
var Const = require('./sharedConstants').constant;

var app = express();

// Настройка всех сред
app.set('port', process.env.PORT || 3000);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Маршруты API
app.post('/saveTelegramUser', routes.saveTelegramUser);
app.get('/constants', routes.getConstants);

// Создаем HTTP сервер
var server = http.createServer(app);

// Настройка WebSocket сервера
var io = require('socket.io')(server);

// Обработка WebSocket соединений
io.on('connection', function(socket) {
  console.log('Новое соединение установлено');
  
  // Здесь можно добавить обработчики событий для игровой логики
  
  socket.on('disconnect', function() {
    console.log('Соединение закрыто');
  });
});

// Запуск сервера
server.listen(app.get('port'), function() {
  console.log('Flappy Coin сервер запущен на порту ' + app.get('port'));
}); 