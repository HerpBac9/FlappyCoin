// В начале файла
const DEBUG = true;

function debug(...args) {
  if (DEBUG) {
    console.log('[DEBUG]', ...args);
  }
}

// Изменим настройки подключения
_socket = io(Const.SOCKET_ADDR, {
  withCredentials: true,
  transports: ['polling', 'websocket'], // Возвращаем оба транспорта
  secure: true,
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
}); 

function changeGameState(gameState) {
  console.log('Changing game state to:', gameState);
  _gameState = gameState;

  // Очищаем предыдущие состояния
  clearInterval(_rankingTimer);
  _rankingTimer = null;
  _lastTime = null;

  switch (_gameState) {
    case enumState.WaitingRoom:
      _isCurrentPlayerReady = false;
      lobbyLoop();
      break;

    case enumState.OnGame:
      gameLoop();
      break;

    case enumState.Ranking:
      handleRankingState();
      break;
  }
} 

function inputsManager(event) {
  if (!_playerManager || !_playerManager.getCurrentPlayer()) {
    console.error('Player not initialized');
    return;
  }

  switch (_gameState) {
    case enumState.WaitingRoom:
      _isCurrentPlayerReady = !_isCurrentPlayerReady;
      _playerManager.getCurrentPlayer().updateReadyState(_isCurrentPlayerReady);
      _socket.emit('change_ready_state', _isCurrentPlayerReady);
      console.log('Ready state changed:', _isCurrentPlayerReady);
      break;

    case enumState.OnGame:
      _socket.emit('player_jump');
      console.log('Jump emitted');
      break;
  }
} 

// Используем в ключевых местах
_socket.on('connect', function() {
  debug('Socket connected');
  // ...
});

_socket.on('game_loop_update', function(data) {
  debug('Game update received', data);
  // ...
}); 

function loadGameRoom() {
  const playerName = getTelegramUsername();
  const playerNameInput = document.getElementById('player-name');
  
  if (!playerNameInput.value || playerNameInput.value === 'Player_1') {
    playerNameInput.value = playerName;
  }

  console.log('Initializing game room for:', playerNameInput.value);
  
  _socket.emit('say_hi', playerNameInput.value, function(serverState, uuid) {
    if (!uuid) {
      console.error('Invalid server response');
      return;
    }
    
    _userID = uuid;
    console.log('Player ID received:', _userID);
    
    // Инициализируем обработчики только после получения ID
    initializeEventHandlers();
    changeGameState(serverState);
  });
}

function initializeEventHandlers() {
  _socket.on('player_list', handlePlayerList);
  _socket.on('new_player', handleNewPlayer);
  _socket.on('player_disconnect', handlePlayerDisconnect);
  _socket.on('player_ready_state', handlePlayerReadyState);
  _socket.on('game_loop_update', handleGameUpdate);
  _socket.on('ranking', handleRanking);
} 