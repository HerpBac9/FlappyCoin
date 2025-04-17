/**
 * Module dependencies.
 */
var express = require('express'),
	routes 	= require('./routes'),
	https 	= require('https'),
	path 	= require('path'),
	Const   = require('./sharedConstants').constant,
	game 	= require('./game_files/game'),
	app = express();

const fs = require("fs"); // Добавляем импорт модуля fs

const options = {
	key: fs.readFileSync("./ssl/server.key"), // Путь к приватному ключу
	cert: fs.readFileSync("./ssl/server.crt"), // Путь к сертификату
  };

// Убедимся, что директория для данных существует
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Путь к файлу с данными пользователей Telegram
const telegramUsersPath = path.join(dataDir, 'telegramUsers.json');

// Если файл не существует, создаем его с пустым массивом
if (!fs.existsSync(telegramUsersPath)) {
    fs.writeFileSync(telegramUsersPath, JSON.stringify([], null, 2), 'utf8');
}

// all environments
app.set('port', Const.SERVER_PORT);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.birds);

// Route to get shared const file
app.get('/sharedConstants.js', function(req, res) {
    res.sendfile('sharedConstants.js');
});

// Обработчик для сохранения данных пользователя Telegram
app.post('/saveTelegramUser', function(req, res) {
    try {
        const userData = req.body;
        
        if (!userData || !userData.telegramId) {
            return res.status(400).json({ error: 'Invalid user data' });
        }
        
        // Читаем текущий список пользователей
        let users = [];
        try {
            users = JSON.parse(fs.readFileSync(telegramUsersPath, 'utf8'));
        } catch (err) {
            console.error('Error reading users file:', err);
            users = [];
        }
        
        // Проверяем, существует ли уже пользователь с таким telegramId
        const existingUserIndex = users.findIndex(user => user.telegramId === userData.telegramId);
        
        if (existingUserIndex !== -1) {
            // Обновляем существующего пользователя
            users[existingUserIndex] = {
                ...users[existingUserIndex],
                ...userData,
                lastLogin: new Date().toISOString()
            };
        } else {
            // Добавляем нового пользователя
            users.push({
                ...userData,
                firstLogin: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            });
        }
        
        // Сохраняем обновленный список пользователей
        fs.writeFileSync(telegramUsersPath, JSON.stringify(users, null, 2), 'utf8');
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving Telegram user:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

const server = https.createServer(options, app);

server.listen(Const.SERVER_PORT, function(){
	console.log('1. HTTPS Сервер запущен на порту', Const.SERVER_PORT);
	console.log('2. Инициализация игрового сервера...');
	game.startServer(server);
});