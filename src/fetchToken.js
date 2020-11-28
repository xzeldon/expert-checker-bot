require('dotenv').config({ path: './config.env' });
const querystring = require('querystring');
const puppeteer = require('puppeteer');

/*
  Обработки каких-либо ошибок нет! (Изначально писалось для личного использования).
  Может запрашивать капчу.Если хотите следить за тем, что конкретно происходит,
  в 11 строке вместо headless: true указываем headless: false
*/
const fetchToken = async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] }); // Запускаем Хромиум
  const page = await browser.newPage(); // Создаём новую вкладку
  await page.goto('https://oauth.vk.com/authorize?client_id=7171491&scope=0&redirect_uri=https://oauth.vk.com/blank.html&display=page&response_type=token&revoke=1'); // Переходим на страницу получения токена от Карточки экспертов
  await page.type('[name="email"]', process.env.VK_LOGIN); // Вводим логин
  await page.type('[name="pass"]', process.env.VK_PASSWORD); // Вводим пароль
  await page.click('[id="install_allow"]'); // Нажимаем на кнопку "Войти"
  await page.waitForNavigation(); // Ждем переадресации
  await page.click('[class="flat_button fl_r button_indent"]'); // Соглашаемся на предоставление данных приложению Карточки эксперта
  const tokenUrl = page.url(); // Получаем URL адрес
  const parsedUrl = querystring.parse(tokenUrl); // Парсим параметры URL
  const token = Object.values(parsedUrl)[0]; // Воруем токен :D
  browser.close();
  return token; // Возвращаем токен
};

module.exports = {
  fetchToken
};
