/*
*   Game Engine
*/
require(['canvasPainter', 'playersManager', '../../sharedConstants'], function (canvasPainter, PlayersManager, Const) {

  var enumState = {
    Login: 0,
    WaitingRoom: 1,
    OnGame: 2,
    Ranking: 3,
    MainMenu: 4
  };

  var enumPanels = {
    Login: 'gs-login',
    Ranking: 'gs-ranking',
    HighScores: 'gs-highscores',
    Error: 'gs-error'
  };

  var _gameState = enumState.Login,
      _playerManager,
      _pipeList,
      _isCurrentPlayerReady = false,
      _userID = null,
      _lastTime = null,
      _rankingTimer,
      _ranking_time,
      _isTouchDevice = false,
      _socket,
      _infPanlTimer,
      _isNight = false;

  // Функция для получения username из Telegram WebApp
  function getTelegramUsername() {
    if (window.Telegram && window.Telegram.WebApp && 
        window.Telegram.WebApp.initDataUnsafe && 
        window.Telegram.WebApp.initDataUnsafe.user) {
      return window.Telegram.WebApp.initDataUnsafe.user.username || 
             ('Player_' + window.Telegram.WebApp.initDataUnsafe.user.id);
    }
    return document.getElementById('login-name').value || 'Player_1';
  }

  // Глобальная функция для запуска игры из меню
  window.startGame = function() {
    console.log("Starting the game...");
    
    // Правильно скрываем все меню и показываем только игровой экран
    document.querySelector('.login-page').style.display = 'none';
    document.querySelector('.mainMenu-page').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    
    // Скрываем все игровые панели, кроме загрузочной
    var inGamePanels = document.querySelectorAll('.inGamePanel');
    for (var i = 0; i < inGamePanels.length; i++) {
      inGamePanels[i].classList.remove('overlay');
    }
    
    // Показываем панель загрузки
    document.getElementById('gs-loader').classList.add('overlay');
    document.getElementById('gs-loader-text').innerHTML = 'Connecting to game...';
    
    // Инициализация игры, если еще не инициализирована
    if (!_socket) {
      startClient();
      
      // Автоматически запускаем процесс логина сразу после старта
      setTimeout(function() {
        // Используем сохраненное имя пользователя или получаем из Telegram
        const username = sessionStorage.getItem('playerName') || getTelegramUsername();
        console.log("Using username for game:", username);
        
        // Вызываем loadGameRoom только если сокет готов
        if (_socket && _socket.connected) {
          // Обновляем текст загрузки
          document.getElementById('gs-loader-text').innerHTML = 'Entering game...';
          
          // Вызываем функцию для входа в игровую комнату, но не показываем меню
          enterGameRoom(username);
          
          // Автоматически устанавливаем статус готовности через 1.5 секунды
          setTimeout(function() {
            if (_gameState === enumState.WaitingRoom && !_isCurrentPlayerReady) {
              console.log("Auto-setting player ready state to true");
              _isCurrentPlayerReady = true;
              _socket.emit('change_ready_state', true);
              _playerManager.getCurrentPlayer().updateReadyState(true);
              
              // Скрываем панель загрузки
              document.getElementById('gs-loader').classList.remove('overlay');
              
              // Показываем сообщение о готовности
              infoPanel(true, 'You are <strong>ready</strong>! Waiting for game to start...', 3000);
            }
          }, 1500);
        } else {
          console.log("Socket not ready yet, waiting for connection...");
          document.getElementById('gs-loader-text').innerHTML = 'Waiting for connection...';
          
          // Ждем пока сокет подключится и затем вызываем enterGameRoom
          var checkSocketInterval = setInterval(function() {
            if (_socket && _socket.connected) {
              clearInterval(checkSocketInterval);
              
              // Обновляем текст загрузки
              document.getElementById('gs-loader-text').innerHTML = 'Entering game...';
              
              // Вызываем функцию для входа в игровую комнату, но не показываем меню
              enterGameRoom(username);
              
              // Автоматически устанавливаем статус готовности через 1.5 секунды
              setTimeout(function() {
                if (_gameState === enumState.WaitingRoom && !_isCurrentPlayerReady) {
                  console.log("Auto-setting player ready state to true");
                  _isCurrentPlayerReady = true;
                  _socket.emit('change_ready_state', true);
                  _playerManager.getCurrentPlayer().updateReadyState(true);
                  
                  // Скрываем панель загрузки
                  document.getElementById('gs-loader').classList.remove('overlay');
                  
                  // Показываем сообщение о готовности
                  infoPanel(true, 'You are <strong>ready</strong>! Waiting for game to start...', 3000);
                }
              }, 1500);
            }
          }, 500);
        }
      }, 1000);
    } else {
      // Если сокет уже инициализирован, просто переходим в игру
      document.getElementById('gs-loader-text').innerHTML = 'Entering game...';
      
      // Получаем имя пользователя
      const username = sessionStorage.getItem('playerName') || getTelegramUsername();
      
      // Вызываем функцию для входа в игровую комнату, но не показываем меню
      enterGameRoom(username);
      
      // Автоматически устанавливаем статус готовности через 1.5 секунды
      setTimeout(function() {
        if (_gameState === enumState.WaitingRoom && !_isCurrentPlayerReady) {
          console.log("Auto-setting player ready state to true");
          _isCurrentPlayerReady = true;
          _socket.emit('change_ready_state', true);
          _playerManager.getCurrentPlayer().updateReadyState(true);
          
          // Скрываем панель загрузки
          document.getElementById('gs-loader').classList.remove('overlay');
          
          // Показываем сообщение о готовности
          infoPanel(true, 'You are <strong>ready</strong>! Waiting for game to start...', 3000);
        }
      }, 1500);
    }
  };

  function draw (currentTime, ellapsedTime) {

    // If player score is > 15, night !!
    if ((_gameState == enumState.OnGame) && (_playerManager.getCurrentPlayer().getScore() == 15))
      _isNight = true;

    canvasPainter.draw(currentTime, ellapsedTime, _playerManager, _pipeList, _gameState, _isNight);
  }

  requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;


  function gameLoop() {
    var now = new Date().getTime(),
        ellapsedTime = 0;

    // Call for next anim frame
    if (_gameState == enumState.OnGame)
      requestAnimationFrame(gameLoop);

    // Get time difference between the last call and now
    if (_lastTime) {
      ellapsedTime = now - _lastTime;
    }
    _lastTime = now;

    // Call draw with the ellapsed time between the last frame and the current one
    draw(now, ellapsedTime);
  }

  function lobbyLoop() {
    var now = new Date().getTime();

    // Call for next anim frame
    if (_gameState == enumState.WaitingRoom)
      requestAnimationFrame(lobbyLoop);

    // Call draw with the ellapsed time between the last frame and the current one
    draw(now, 0);
  }


  function startClient () {
    if (typeof io == 'undefined') {
      document.getElementById('gs-error-message').innerHTML = 'Cannot retrieve socket.io file at the address ' + Const.SOCKET_ADDR + '<br/><br/>Please check your network connection or try again later.';
      showHideMenu(enumPanels.Error, true);
      console.error('Cannot reach socket.io file! The library was not loaded correctly.');
      return;
    }

    console.log("Initializing player manager...");
    _playerManager = new PlayersManager();

    document.getElementById('gs-loader-text').innerHTML = 'Connecting to the server...';
    try {
      console.log('Attempting to connect to Socket.IO server at:', Const.SOCKET_ADDR);
      _socket = io.connect(Const.SOCKET_ADDR, { 
        reconnect: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        transports: ['websocket', 'polling']
      });
      
      // Add error handling for connection
      _socket.on('connect_error', function(error) {
        console.error('Connection error:', error);
        document.getElementById('gs-error-message').innerHTML = 'Error connecting to the server: ' + error.message;
        showHideMenu(enumPanels.Error, true);
      });
      
      _socket.on('connect', function() {
        console.log('Connection established :)');
        
        // Bind disconnect event
        _socket.on('disconnect', function() {
          document.getElementById('gs-error-message').innerHTML = 'Connection with the server lost';
          showHideMenu(enumPanels.Error, true);
          console.log('Connection with the server lost :( ');
        });

        // Check for player name in session
        if (typeof sessionStorage != 'undefined') {
          if ('playerName' in sessionStorage) {
            var savedName = sessionStorage.getItem('playerName');
            if (savedName && savedName !== 'Player_1') {
              console.log('Using saved player name:', savedName);
            }
          }
        }
        
        // Draw initial state
        draw(0, 0);
      });

      _socket.on('error', function(error) {
        console.error('Socket error:', error);
        document.getElementById('gs-error-message').innerHTML = 'Fail to connect the WebSocket to the server.<br/><br/>Please check the WS address.';
        showHideMenu(enumPanels.Error, true);
      });
      
    } catch (e) {
      console.error('Error connecting to Socket.IO:', e);
      document.getElementById('gs-error-message').innerHTML = 'Error connecting to the server: ' + e.message;
      showHideMenu(enumPanels.Error, true);
    }
  }

  function enterGameRoom(nickname) {
    // If nick is empty or if it has the default value, use the provided nickname
    var nick = nickname || getTelegramUsername();
    console.log("Entering game room with nickname:", nick);
    
    // Store it in sessionstorage if available
    if (typeof sessionStorage != 'undefined') {
      sessionStorage.setItem('playerName', nick);
    }

    // Убираем возможный старый обработчик
    if (_socket) {
      _socket.off('player_list');
      _socket.off('player_disconnect');
      _socket.off('new_player');
      _socket.off('player_ready_state');
      _socket.off('update_game_state');
      _socket.off('game_loop_update');
      _socket.off('ranking');
    }

    // Bind new socket events
    _socket.on('player_list', function (playersList) {
      console.log("Received player list:", playersList.length, "players");
      var nb = playersList.length,
          i;

      // Add this player in the list
      for (i = 0; i <nb; i++) {
        _playerManager.addPlayer(playersList[i], _userID);
      };

      // Redraw
      draw(0, 0);
    });
    _socket.on('player_disconnect', function (player) {
      _playerManager.removePlayer(player);
    });
    _socket.on('new_player', function (player) {
      _playerManager.addPlayer(player);
    });
    _socket.on('player_ready_state', function (playerInfos) {
      _playerManager.getPlayerFromId(playerInfos.id).updateFromServer(playerInfos);
    });
    _socket.on('update_game_state', function (gameState) {
      changeGameState(gameState);
      
      // Если состояние игры меняется на OnGame, делаем автоматический прыжок птички
      if (gameState === enumState.OnGame) {
        console.log("Game started! Auto-jumping to keep the bird alive");
        // Делаем начальный прыжок птички, чтобы она не упала сразу
        setTimeout(function() {
          _socket.emit('player_jump');
        }, 300);
        
        // Показываем инструкцию игроку
        infoPanel(true, 'Press <strong>space</strong> to fly!', 3000);
      }
    });
    
    _socket.on('game_loop_update', function (serverDatasUpdated) {
      _playerManager.updatePlayerListFromServer(serverDatasUpdated.players);
      _pipeList = serverDatasUpdated.pipes;
    });
    _socket.on('ranking', function (score) {
      displayRanking(score);
    });

    // Send nickname to the server
    console.log('Sending nickname to server:', nick);
    _socket.emit('say_hi', nick, function (serverState, uuid) {
      console.log("Got response from server. State:", serverState, "UUID:", uuid);
      _userID = uuid;
      changeGameState(serverState);

      // Display a message according to the game state
      if (serverState == enumState.OnGame) {
        infoPanel(true, '<strong>Please wait</strong> for the previous game to finish...');
      }
      else {
        // Display a little help text
        if (_isTouchDevice == false)
          infoPanel(true, 'Press <strong>space</strong> to get ready!', 3000);
        else
          infoPanel(true, '<strong>Tap</strong> to get ready!', 3000);
      }
    });

    // Get input - переделываем обработчик событий, чтобы он корректно работал
    var keyboardHandler = function(event) {
      if (event.keyCode == 32) { // Space key
        inputsManager();
        // Предотвращаем прокрутку страницы при нажатии пробела
        event.preventDefault();
      }
    };
    
    // Удаляем старые обработчики, если есть
    document.removeEventListener('keydown', keyboardHandler);
    
    // Добавляем новый обработчик
    if (_isTouchDevice == false) {
      document.addEventListener('keydown', keyboardHandler);
      console.log("Keyboard handler attached for space bar");
    }
    else {
      var evt = window.navigator.msPointerEnabled ? 'MSPointerDown' : 'touchstart';
      document.addEventListener(evt, inputsManager);
      console.log("Touch handler attached");
    }
    
    return true;
  }

  function loadGameRoom() {
    var nick = document.getElementById('login-name').value;
    console.log("Loading game room with nickname:", nick);

    // If nick is empty or if it has the default value, 
    if ((nick == '') || (nick == 'Player_1')) {
      // Проверяем, есть ли данные Telegram
      nick = getTelegramUsername();
      console.log("Got Telegram username:", nick);
      
      // Если все еще дефолтный ник, берем из sessionStorage или используем дефолтный
      if (nick === 'Player_1' && typeof sessionStorage !== 'undefined' && sessionStorage.getItem('playerName')) {
        nick = sessionStorage.getItem('playerName');
        console.log("Using stored name:", nick);
      }
      
      // Если все равно не получили имя, используем дефолтное
      if (nick === 'Player_1') {
        nick = 'Player_' + Math.floor(Math.random() * 1000);
        console.log("Using random name:", nick);
      }
    }
    
    // Входим в игровую комнату
    enterGameRoom(nick);

    // Hide login screen
    document.querySelector('.login-page').style.display = 'none';
    document.querySelector('.mainMenu-page').style.display = 'flex';
    document.getElementById('gameScreen').style.display = 'none';
    
    return true;
  }

  function displayRanking (score) {
    var nodeMedal = document.querySelector('.gs-ranking-medal'),
        nodeHS = document.getElementById('gs-highscores-scores'),
        i, nbHs;

    console.log(score);

    // Remove previous medals just in case
    nodeMedal.classList.remove('third');
    nodeMedal.classList.remove('second');
    nodeMedal.classList.remove('winner');

    // Display scores
    document.getElementById('gs-ranking-score').innerHTML = score.score;
    document.getElementById('gs-ranking-best').innerHTML = score.bestScore;
    document.getElementById('gs-ranking-pos').innerHTML = score.rank + ' / ' + score.nbPlayers;

    // Set medal !
    if (score.rank == 1)
      nodeMedal.classList.add('winner');
    else if (score.rank == 2)
      nodeMedal.classList.add('second');
    else if (score.rank == 3)
      nodeMedal.classList.add('third');

    // Display hish scores
    nodeHS.innerHTML = '';
    nbHs = score.highscores.length;
    for (i = 0; i < nbHs; i++) {
      nodeHS.innerHTML += '<li><span>#' + (i + 1) + '</span> ' + score.highscores[i].player + ' <strong>' + score.highscores[i].score + '</strong></li>';
    };

    // Show ranking
    showHideMenu(enumPanels.Ranking, true);

    // Display hish scores in a middle of the waiting time
    window.setTimeout(function () {
      showHideMenu(enumPanels.HighScores, true);
    },
    Const.TIME_BETWEEN_GAMES / 2);

    // reset graphics in case to prepare the next game
    canvasPainter.resetForNewGame();
    _isNight = false;
  }

  function changeGameState (gameState) {
    var strLog = 'Server just change state to ';

    _gameState = gameState;

    switch (_gameState) {
      case enumState.WaitingRoom:
        strLog += 'waiting in lobby';
        _isCurrentPlayerReady = false;
        lobbyLoop();
        break;

      case enumState.OnGame:
        strLog += 'on game !';
        gameLoop();
        break;

      case enumState.Ranking:
        strLog += 'display ranking';
        // Start timer for next game
        _ranking_time = Const.TIME_BETWEEN_GAMES / 1000;
        
        // Display the remaining time on the top bar
        infoPanel(true, 'Next game in <strong>' + _ranking_time + 's</strong>...');
        _rankingTimer = window.setInterval(function() {
            // Set seconds left
            infoPanel(true, 'Next game in <strong>' + (--_ranking_time) + 's</strong>...');
            
            // Stop timer if time is running up
            if (_ranking_time <= 0) {
              // Reset timer and remove top bar
              window.clearInterval(_rankingTimer);
              infoPanel(false);
              
              // Reset pipe list and hide ranking panel
              _pipeList = null;
              showHideMenu(enumPanels.Ranking, false);
            }
          },
          1000
        );
        break;
      
      default:
        console.log('Unknew game state [' + _gameState + ']');
        strLog += 'undefined state';
        break;
    }

    console.log(strLog);
  }

  function inputsManager (event) {
    switch (_gameState) {
      case enumState.WaitingRoom:
        _isCurrentPlayerReady = !_isCurrentPlayerReady;
        _socket.emit('change_ready_state', _isCurrentPlayerReady);
        _playerManager.getCurrentPlayer().updateReadyState(_isCurrentPlayerReady);
        // Добавляем визуальное отображение статуса готовности
        infoPanel(true, _isCurrentPlayerReady ? 'You are <strong>ready</strong>! Waiting for game to start...' : 'Press <strong>space</strong> to get ready!', 3000);
        console.log("Player ready state changed to:", _isCurrentPlayerReady);
        break;
      case enumState.OnGame:
        _socket.emit('player_jump');
        break;
      default:
        break;
    }
  }

  function showHideMenu (panelName, isShow) {
    var panel = document.getElementById(panelName),
        currentOverlayPanel = document.querySelector('.overlay');

    if (isShow) {
      if (currentOverlayPanel)
        currentOverlayPanel.classList.remove('overlay');
      panel.classList.add('overlay');
    }
    else {
      if (currentOverlayPanel)
        currentOverlayPanel.classList.remove('overlay');
    }
  }
  
  function infoPanel (isShow, htmlText, timeout) {
    var topBar   = document.getElementById('gs-info-panel');

    // Reset timer if there is one pending
    if (_infPanlTimer != null) {
      window.clearTimeout(_infPanlTimer);
      _infPanlTimer = null;
    }

    // Hide the bar
    if (isShow == false) {
      topBar.classList.remove('showTopBar');
    }
    else {
      // If a set is setted, print it
      if (htmlText)
        topBar.innerHTML = htmlText;
      // If a timeout is specified, close the bar after this time !
      if (timeout)
        _infPanlTimer = setTimeout(function() {
          infoPanel(false);
        }, timeout);

      // Don't forget to display the bar :)
      topBar.classList.add('showTopBar');
    }
  }

  // Detect touch event. If available, we will use touch events instead of space key
  if (window.navigator.msPointerEnabled)
    _isTouchDevice = true;
  else if ('ontouchstart' in window)
    _isTouchDevice = true;
  else
    _isTouchDevice = false;
  
  // Load ressources and Start the client !
  console.log('Client started, load ressources...');
  canvasPainter.loadRessources(function () {
    console.log('Ressources loaded, connect to server...');
    startClient();
  });

  // Start the game engine
  document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('login-button').onclick = loadGameRoom;
    
    // Bind button from mainMenu to start game
    document.getElementById('play-button').addEventListener('click', function() {
      document.querySelector('.mainMenu-page').style.display = 'none';
      document.getElementById('gameScreen').style.display = 'block';
      startClient();
    });

    // Check the device
    _isTouchDevice = 'ontouchstart' in document.documentElement;
  });

});