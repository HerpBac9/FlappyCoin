// Глобальный объект для игровых функций
window.FlappyCoin = window.FlappyCoin || {};

document.addEventListener('DOMContentLoaded', function() {
  // Проверка наличия Telegram WebApp
  let tgUser = null;
  if (window.Telegram && window.Telegram.WebApp) {
    const tgApp = window.Telegram.WebApp;
    tgApp.expand(); // Разворачиваем Web App на весь экран
    
    if (tgApp.initDataUnsafe && tgApp.initDataUnsafe.user) {
      tgUser = tgApp.initDataUnsafe.user;
      
      // Если есть пользователь Telegram, установим его имя в поле ввода
      const loginNameField = document.getElementById('login-name');
      if (loginNameField && tgUser.username) {
        loginNameField.value = tgUser.username;
      }
    }
  }
  
  // Обработчик нажатия на кнопку Login
  document.getElementById('login-button').addEventListener('click', function() {
    // Сохраняем данные пользователя на сервере только при нажатии кнопки Login
    if (tgUser) {
      fetch('/saveTelegramUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramId: tgUser.id,
          username: tgUser.username || document.getElementById('login-name').value,
          language: tgUser.language_code || 'en'
        })
      });
    }
    
    // Скрываем страницу логина и показываем главное меню
    document.querySelector('.login-page').style.display = 'none';
    document.querySelector('.mainMenu-page').style.display = 'flex';
  });
  
  // Обработчик нажатия на кнопку PLAY
  document.getElementById('play-button').addEventListener('click', function() {
    console.log("Play button clicked");
    
    // Сохраняем никнейм в сессию
    const loginName = document.getElementById('login-name').value;
    if (loginName && loginName !== 'Player_1') {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('playerName', loginName);
        console.log("Saved player name to session:", loginName);
      }
    }
    
    // Предотвращаем множественные нажатия на кнопку
    const playButton = document.getElementById('play-button');
    playButton.disabled = true;
    playButton.value = "STARTING...";
    
    try {
      // Запускаем игру через глобальную функцию startGame
      console.log("Calling startGame function");
      if (typeof window.startGame === 'function') {
        // Явно скрываем все меню и показываем игровой экран
        document.querySelector('.login-page').style.display = 'none';
        document.querySelector('.mainMenu-page').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'block';
        
        // Затем вызываем функцию startGame
        window.startGame();
      } else {
        throw new Error("startGame function not found");
      }
    } catch (error) {
      console.error("Error starting game:", error);
      // В случае ошибки разблокируем кнопку
      playButton.disabled = false;
      playButton.value = "PLAY";
      
      // Показываем сообщение об ошибке
      alert("Error starting game: " + error.message);
    }
  });
}); 